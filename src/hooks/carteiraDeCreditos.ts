import {
  alunaRepositorio,
  carteiraRepositorio,
  categoriaAulaRepositorio,
  movimentoCreditoRepositorio,
  notificacaoRepositorio,
  pacoteRepositorio,
  parametroRepositorio,
  registroAuditoriaRepositorio,
  vendaRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type {
  Aluna,
  Carteira,
  MovimentoCredito,
  Pacote,
  TipoMovimentoCredito,
  Venda,
} from '../types/domain';
import { formatarDataBR, hojeISO, somarDias } from '../utils/data';
import {
  calcularPreviaDeCompra,
  creditosDisponiveis,
  explicarFinalizando,
  formatarCreditos,
  lerCarteira,
  LIMIARES_PADRAO,
  type LimiaresFinalizando,
} from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';

/**
 * Carteira de créditos (M3) — o núcleo do modelo comercial.
 *
 * Camada de domínio, não um hook React: consumida pelos hooks de tela, no
 * mesmo padrão de `cancelamentoDeAulas.ts`.
 *
 * O saldo é sempre reconstituível a partir de `MovimentoCredito`
 * (RNF-07): nenhuma operação altera os totais da carteira sem gravar o
 * movimento correspondente, e é por isso que toda escrita aqui passa por
 * `aplicarMovimento`.
 */

const NOME_CATEGORIA_REGULAR = 'Aula regular';

async function parametroNumerico(chave: string, padrao: number): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const parametro = parametros.find((p) => p.chave === chave);
  const valor = Number(parametro?.valor);
  return Number.isFinite(valor) ? valor : padrao;
}

/** Limiares configuráveis do status Finalizando (seção 4.3.3 do escopo). */
export async function limiaresFinalizando(): Promise<LimiaresFinalizando> {
  const [creditos, dias] = await Promise.all([
    parametroNumerico('limiar_finalizando_creditos', LIMIARES_PADRAO.creditos),
    parametroNumerico('limiar_finalizando_dias', LIMIARES_PADRAO.dias),
  ]);
  return { creditos, dias };
}

/**
 * Custo em créditos da aula regular (RF-CFG-05). A grade só oferta aulas
 * regulares — workshop e aula particular são criados pela administração
 * (M9) e têm o custo lido da própria categoria da aula.
 */
export async function custoDaAulaRegular(): Promise<number> {
  const categorias = await categoriaAulaRepositorio.listar();
  const regular =
    categorias.find((c) => c.nome.toLowerCase() === NOME_CATEGORIA_REGULAR.toLowerCase() && c.situacao === 'ativo') ??
    categorias.find((c) => !c.excepcional && c.situacao === 'ativo');
  return regular?.custoEmCreditos ?? 1;
}

// --- Leitura -------------------------------------------------------------

/**
 * Carteiras da aluna, da mais recente para a mais antiga. Inclui as
 * encerradas: o histórico de pacotes é permanente (RF-HIS-01).
 */
export async function carteirasDaAluna(alunaId: string): Promise<Carteira[]> {
  const carteiras = await carteiraRepositorio.listar();
  return carteiras
    .filter((c) => c.alunaId === alunaId)
    .sort((a, b) => (b.dataAtivacao ?? '').localeCompare(a.dataAtivacao ?? '') || b.id.localeCompare(a.id));
}

/**
 * Carteira vigente da aluna (RF-CRE-15) — no máximo uma.
 *
 * O encerramento por vencimento é **derivado**, não lido do registro:
 * carregar uma tela nunca escreve no banco (ver README), então uma carteira
 * cuja validade passou já é tratada como encerrada aqui, mesmo antes de a
 * rotina de carteiras gravar a situação.
 */
export async function carteiraVigenteDaAluna(alunaId: string, hoje = hojeISO()): Promise<Carteira | undefined> {
  const limiares = await limiaresFinalizando();
  const carteiras = await carteirasDaAluna(alunaId);
  return carteiras.find((c) => c.situacao === 'ativa' && !lerCarteira(c, hoje, limiares).encerrada);
}

export async function extratoDaCarteira(carteiraId: string): Promise<MovimentoCredito[]> {
  const movimentos = await movimentoCreditoRepositorio.listar();
  return movimentos
    .filter((m) => m.carteiraId === carteiraId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

export async function extratoDaAluna(alunaId: string): Promise<MovimentoCredito[]> {
  const [carteiras, movimentos] = await Promise.all([
    carteirasDaAluna(alunaId),
    movimentoCreditoRepositorio.listar(),
  ]);
  const ids = new Set(carteiras.map((c) => c.id));
  return movimentos.filter((m) => ids.has(m.carteiraId)).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

// --- Movimentação --------------------------------------------------------

interface DadosMovimento {
  carteira: Carteira;
  tipo: TipoMovimentoCredito;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
  unidade?: 'creditos' | 'dias';
}

/**
 * Aplica um movimento à carteira e grava o registro correspondente
 * (RF-CRE-08). É o único caminho de escrita dos totais: assim o extrato
 * nunca fica dessincronizado do saldo.
 */
async function aplicarMovimento(
  dados: DadosMovimento,
  alteracao: Partial<Pick<Carteira, 'creditosTotais' | 'creditosUtilizados' | 'creditosReservados' | 'dataValidade'>>,
): Promise<Carteira> {
  const { carteira, tipo, quantidade, origem, referenciaId, autorId, unidade } = dados;

  const atualizada = await carteiraRepositorio.atualizar(carteira.id, alteracao);

  await movimentoCreditoRepositorio.criar({
    carteiraId: carteira.id,
    tipo,
    quantidade,
    unidade,
    origem,
    referenciaId,
    autorId,
    dataHora: new Date().toISOString(),
  });

  return atualizada;
}

/** RF-CRE-03: o agendamento bloqueia o crédito, mas ainda não o consome. */
export async function reservarCreditos(params: {
  carteira: Carteira;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, quantidade, origem, referenciaId, autorId } = params;

  if (quantidade <= 0) return carteira;
  if (creditosDisponiveis(carteira) < quantidade) {
    throw new RegraNegocioError(
      `Saldo insuficiente: esta aula custa ${formatarCreditos(quantidade)} e restam ${formatarCreditos(creditosDisponiveis(carteira))}.`,
    );
  }

  return aplicarMovimento(
    { carteira, tipo: 'reserva', quantidade, origem, referenciaId, autorId },
    { creditosReservados: carteira.creditosReservados + quantidade },
  );
}

/** RF-CRE-04: cancelamento dentro do prazo devolve o crédito ao disponível. */
export async function liberarReserva(params: {
  carteira: Carteira;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, quantidade, origem, referenciaId, autorId } = params;
  if (quantidade <= 0) return carteira;

  return aplicarMovimento(
    { carteira, tipo: 'liberacao', quantidade, origem, referenciaId, autorId },
    { creditosReservados: Math.max(0, carteira.creditosReservados - quantidade) },
  );
}

/**
 * RF-CRE-05: a reserva vira consumo na presença confirmada, no
 * cancelamento fora do prazo e na ausência sem justificativa aprovada.
 */
export async function consumirReserva(params: {
  carteira: Carteira;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, quantidade, origem, referenciaId, autorId } = params;
  if (quantidade <= 0) return carteira;

  return aplicarMovimento(
    { carteira, tipo: 'consumo', quantidade, origem, referenciaId, autorId },
    {
      creditosReservados: Math.max(0, carteira.creditosReservados - quantidade),
      creditosUtilizados: carteira.creditosUtilizados + quantidade,
    },
  );
}

/**
 * Consumo imediato, sem passar pelo estado de reserva (RN-13) — é assim
 * que a alocação em aula excepcional funciona (M9).
 */
export async function consumirDireto(params: {
  carteira: Carteira;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, quantidade, origem, referenciaId, autorId } = params;
  if (quantidade <= 0) return carteira;

  if (creditosDisponiveis(carteira) < quantidade) {
    throw new RegraNegocioError(
      `Saldo insuficiente: seriam necessários ${formatarCreditos(quantidade)} e restam ${formatarCreditos(creditosDisponiveis(carteira))}.`,
    );
  }

  return aplicarMovimento(
    { carteira, tipo: 'consumo', quantidade, origem, referenciaId, autorId },
    { creditosUtilizados: carteira.creditosUtilizados + quantidade },
  );
}

/**
 * Devolve ao disponível um crédito que já tinha sido consumido — é o que
 * a justificativa aprovada faz (RF-JUS-04) e o que o cancelamento de
 * alocação em aula excepcional fará (RF-AEX-07).
 */
export async function estornarConsumo(params: {
  carteira: Carteira;
  quantidade: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, quantidade, origem, referenciaId, autorId } = params;
  if (quantidade <= 0) return carteira;

  return aplicarMovimento(
    { carteira, tipo: 'estorno', quantidade, origem, referenciaId, autorId },
    { creditosUtilizados: Math.max(0, carteira.creditosUtilizados - quantidade) },
  );
}

// --- Compra e ativação ---------------------------------------------------

/**
 * Aplica uma compra confirmada à carteira da aluna (RF-CRE-13/14/15).
 *
 * Carteira vigente ativa: os créditos somam e passa a valer uma validade
 * única, a mais distante entre a atual e a do pacote (PA-10). Carteira
 * encerrada ou inexistente: nasce uma carteira nova, sem herdar nada.
 *
 * A carteira nasce **ativa**: só se chega aqui com o pagamento confirmado,
 * e é a confirmação do pagamento que ativa (RF-CRE-01). Termo e anamnese
 * pendentes não seguram os créditos — geram o alerta do RF-ALU-08.
 */
export async function aplicarCompra(params: {
  aluna: Aluna;
  pacote: Pacote;
  venda: Venda;
  autorId: string;
  hoje?: string;
}): Promise<Carteira> {
  const { aluna, pacote, venda, autorId, hoje = hojeISO() } = params;

  const vigente = await carteiraVigenteDaAluna(aluna.id, hoje);

  // Os créditos vêm da **venda**, não do catálogo: é lá que ficam
  // congelados os números da compra (RF-PAC-01) e é lá que o benefício de
  // conversão já foi somado (RF-EXP-08). Ler o pacote de novo aqui
  // descartaria o bônus e usaria um catálogo que pode ter mudado desde
  // que a venda ficou pendente.
  const creditosDaCompra = venda.creditos;
  const previa = calcularPreviaDeCompra({
    carteiraVigente: vigente,
    pacote: { ...pacote, creditos: creditosDaCompra },
    hoje,
  });

  // O extrato precisa explicar por que entraram mais créditos do que o
  // pacote anuncia; sem isso, a concessão parece divergir do catálogo.
  const origemDaConcessao =
    venda.beneficioConversao?.tipo === 'credito_adicional'
      ? `Compra do pacote ${pacote.nome} + ${formatarCreditos(venda.beneficioConversao.quantidade)} de bônus da aula experimental`
      : `Compra do pacote ${pacote.nome}`;

  let carteira: Carteira;

  if (vigente) {
    carteira = await aplicarMovimento(
      {
        carteira: vigente,
        tipo: 'concessao',
        quantidade: creditosDaCompra,
        origem: origemDaConcessao,
        referenciaId: venda.id,
        autorId,
      },
      {
        creditosTotais: vigente.creditosTotais + creditosDaCompra,
        dataValidade: previa.validadeResultante,
      },
    );
    await carteiraRepositorio.atualizar(carteira.id, { pacoteId: pacote.id });
    carteira = { ...carteira, pacoteId: pacote.id };
  } else {
    carteira = await carteiraRepositorio.criar({
      alunaId: aluna.id,
      pacoteId: pacote.id,
      creditosTotais: creditosDaCompra,
      creditosUtilizados: 0,
      creditosReservados: 0,
      dataAtivacao: hoje,
      dataValidade: previa.validadeResultante,
      situacao: 'ativa',
      bolsa: venda.bolsa,
    });

    await movimentoCreditoRepositorio.criar({
      carteiraId: carteira.id,
      tipo: 'concessao',
      quantidade: creditosDaCompra,
      origem: origemDaConcessao,
      referenciaId: venda.id,
      autorId,
      dataHora: new Date().toISOString(),
    });
  }

  await vendaRepositorio.atualizar(venda.id, {
    carteiraId: carteira.id,
    // PA-09: reembolsar uma renovação antecipada devolve só esta compra, e
    // os créditos que já estavam na carteira voltam com a validade
    // original. Ela precisa ficar registrada agora, antes de ser
    // substituída pela validade única.
    validadeAnteriorDaCarteira: vigente?.dataValidade,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Carteira',
    operacao: vigente ? 'renovacao_antecipada' : 'ativacao_de_carteira',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      carteiraId: carteira.id,
      pacote: pacote.nome,
      creditos: creditosDaCompra,
      beneficioConversao: venda.beneficioConversao,
      validade: previa.validadeResultante,
      validadeMantida: previa.validadeMantida,
    },
  });

  await notificar({
    destinatario: { tipo: 'aluna', id: aluna.id },
    evento: 'compra_confirmada',
    conteudo:
      `Compra do pacote ${pacote.nome} confirmada: ${formatarCreditos(creditosDaCompra)}. ` +
      `Saldo disponível: ${formatarCreditos(creditosDisponiveis(carteira))}. ` +
      `Validade até ${formatarDataBR(carteira.dataValidade)}.`,
  });

  return carteira;
}

// --- Ajuste administrativo (RF-CRE-09) -----------------------------------

export type TipoAjuste = 'conceder' | 'estornar' | 'prorrogar';

export const ROTULOS_AJUSTE: Record<TipoAjuste, string> = {
  conceder: 'Conceder créditos',
  estornar: 'Estornar créditos utilizados',
  prorrogar: 'Prorrogar validade',
};

/**
 * Ajuste administrativo da carteira (RF-CRE-09): conceder crédito,
 * estornar utilizado e prorrogar validade — inclusive de carteira já
 * encerrada, que é justamente o caso em que a administração precisa
 * resolver uma situação concreta. Sempre com motivo e autor registrados.
 */
export async function ajustarCarteira(params: {
  carteira: Carteira;
  tipo: TipoAjuste;
  /** Créditos em `conceder`/`estornar`; dias em `prorrogar`. */
  quantidade: number;
  motivo: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, tipo, quantidade, motivo, autorId } = params;

  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do ajuste.');
  if (quantidade <= 0) throw new RegraNegocioError('Informe uma quantidade maior que zero.');
  if (tipo === 'estornar' && quantidade > carteira.creditosUtilizados) {
    throw new RegraNegocioError(
      `Esta carteira tem ${formatarCreditos(carteira.creditosUtilizados)} utilizados — não é possível estornar mais que isso.`,
    );
  }

  const descricao = `${ROTULOS_AJUSTE[tipo]}: ${motivo.trim()}`;
  let atualizada: Carteira;

  if (tipo === 'conceder') {
    atualizada = await aplicarMovimento(
      { carteira, tipo: 'ajuste', quantidade, origem: descricao, autorId },
      { creditosTotais: carteira.creditosTotais + quantidade },
    );
  } else if (tipo === 'estornar') {
    atualizada = await aplicarMovimento(
      { carteira, tipo: 'estorno', quantidade, origem: descricao, autorId },
      { creditosUtilizados: Math.max(0, carteira.creditosUtilizados - quantidade) },
    );
  } else {
    atualizada = await aplicarMovimento(
      { carteira, tipo: 'ajuste', quantidade, origem: descricao, autorId, unidade: 'dias' },
      { dataValidade: somarDias(carteira.dataValidade, quantidade) },
    );
  }

  // Prorrogar ou conceder crédito reabre uma carteira que estava encerrada:
  // é exatamente o caso previsto no RF-CRE-09 ("inclusive de carteira já
  // encerrada"), e sem isso o ajuste ficaria sem efeito prático.
  if (carteira.situacao !== 'ativa') {
    // Os créditos que o vencimento tinha dado por perdidos voltam a valer:
    // o encerramento só registra a expiração no extrato, sem tirá-los dos
    // totais, então ao reabrir eles reaparecem no saldo. Sem a linha de
    // estorno abaixo, o extrato somaria −N e o saldo diria +N — e o saldo
    // deixaria de ser reconstituível pelo histórico (RNF-07).
    const movimentos = await movimentoCreditoRepositorio.listar();
    const expirados = movimentos
      .filter((m) => m.carteiraId === carteira.id && m.tipo === 'expiracao')
      .reduce((soma, m) => soma + m.quantidade, 0);
    if (expirados > 0) {
      await movimentoCreditoRepositorio.criar({
        carteiraId: carteira.id,
        tipo: 'estorno',
        quantidade: expirados,
        origem: 'Reabertura da carteira: créditos dados por perdidos no vencimento voltam ao saldo',
        autorId,
        dataHora: new Date().toISOString(),
      });
    }

    // `null`, e não `undefined`: o JSON do PATCH omite chaves indefinidas,
    // e a carteira reaberta seguiria com "encerrada em" e o motivo antigo.
    atualizada = await carteiraRepositorio.atualizar(carteira.id, {
      situacao: 'ativa',
      motivoEncerramento: null as unknown as undefined,
      dataEncerramento: null as unknown as undefined,
    });
  }

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Carteira',
    operacao: `ajuste_${tipo}`,
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: {
      creditosTotais: carteira.creditosTotais,
      creditosUtilizados: carteira.creditosUtilizados,
      dataValidade: carteira.dataValidade,
    },
    valorNovo: { quantidade, motivo: motivo.trim() },
  });

  return atualizada;
}

/** Prorroga a validade da carteira por cancelamento de aula pelo studio (RF-CPR-07, RF-EXC-04, PA-11). */
export async function prorrogarPorCancelamentoDoStudio(params: {
  carteira: Carteira;
  dias: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, dias, origem, referenciaId, autorId } = params;
  if (dias <= 0) return carteira;

  return aplicarMovimento(
    { carteira, tipo: 'ajuste', quantidade: dias, origem, referenciaId, autorId, unidade: 'dias' },
    { dataValidade: somarDias(carteira.dataValidade, dias) },
  );
}

/**
 * Acerta a prorrogação de um trancamento que durou menos (ou mais) do que
 * o previsto. A quantidade pode ser negativa: o extrato precisa mostrar
 * que os dias concedidos na concessão foram devolvidos.
 */
export async function ajustarProrrogacao(params: {
  carteira: Carteira;
  dias: number;
  origem: string;
  referenciaId?: string;
  autorId: string;
}): Promise<Carteira> {
  const { carteira, dias, origem, referenciaId, autorId } = params;
  if (dias === 0) return carteira;

  return aplicarMovimento(
    { carteira, tipo: 'ajuste', quantidade: dias, origem, referenciaId, autorId, unidade: 'dias' },
    { dataValidade: somarDias(carteira.dataValidade, dias) },
  );
}

// --- Rotina de carteiras -------------------------------------------------

export interface ResumoRotinaCarteiras {
  encerradasPorConsumo: number;
  encerradasPorVencimento: number;
  creditosExpirados: number;
  bolsasRenovadas: number;
  /** Avisos de "Finalizando" enviados nesta passagem (RF-NOT-08). */
  avisosDeFinalizando: number;
}

/**
 * Encerramento automático das carteiras (RF-CRE-10) e renovação automática
 * da bolsista (RF-BOL-03).
 *
 * No sistema real isso roda sozinho todo dia. No protótipo é uma ação
 * explícita da administração, pelo mesmo motivo registrado no README:
 * carregar uma tela nunca escreve no banco. As telas exibem a situação
 * **derivada** por `lerCarteira`, então uma carteira vencida já aparece
 * como expirada mesmo antes de a rotina rodar — o que a rotina faz é
 * consolidar o registro, anular os créditos remanescentes e conceder a
 * carteira nova da bolsista.
 */
export async function processarRotinaDeCarteiras(params: {
  autorId: string;
  hoje?: string;
}): Promise<ResumoRotinaCarteiras> {
  const { autorId, hoje = hojeISO() } = params;

  const [carteiras, alunas, pacotes, limiares] = await Promise.all([
    carteiraRepositorio.listar(),
    alunaRepositorio.listar(),
    pacoteRepositorio.listar(),
    limiaresFinalizando(),
  ]);

  const resumo: ResumoRotinaCarteiras = {
    encerradasPorConsumo: 0,
    encerradasPorVencimento: 0,
    creditosExpirados: 0,
    bolsasRenovadas: 0,
    avisosDeFinalizando: 0,
  };

  const notificacoes = await notificacaoRepositorio.listar();

  for (const carteira of carteiras) {
    if (carteira.situacao !== 'ativa') continue;

    const leitura = lerCarteira(carteira, hoje, limiares);

    // RF-NOT-08: a carteira entrou em "Finalizando" e a aluna precisa
    // saber. O status é derivado na leitura, então quem dispara o aviso é
    // a rotina — carregar a tela não escreve nada, nem notificação.
    if (!leitura.encerrada && leitura.motivoFinalizando) {
      // A comparação é só por evento e carteira. O `destinatarioId` da
      // notificação é o id da **usuária**, não o da aluna — casar por ele
      // aqui nunca daria certo, e a carteira já identifica a aluna.
      const jaAvisada = notificacoes.some(
        (n) => n.evento === 'pacote_finalizando' && n.referenciaId === carteira.id,
      );
      if (!jaAvisada) {
        await notificar({
          destinatario: { tipo: 'aluna', id: carteira.alunaId },
          evento: 'pacote_finalizando',
          referenciaId: carteira.id,
          conteudo: `${explicarFinalizando(leitura.motivoFinalizando, leitura)} Renove seu pacote em "Meu pacote" para não ficar sem créditos.`,
        });
        resumo.avisosDeFinalizando += 1;
      }
    }

    if (!leitura.encerrada) continue;

    const porVencimento = leitura.situacaoCalculada === 'expirada';
    const remanescentes = porVencimento ? leitura.disponiveis : 0;

    // RN-03: créditos remanescentes em carteira expirada são perdidos. O
    // registro fica no extrato para que o saldo continue reconstituível.
    if (remanescentes > 0) {
      await movimentoCreditoRepositorio.criar({
        carteiraId: carteira.id,
        tipo: 'expiracao',
        quantidade: remanescentes,
        origem: `Créditos perdidos no vencimento de ${formatarDataBR(carteira.dataValidade)}`,
        autorId,
        dataHora: new Date().toISOString(),
      });
      resumo.creditosExpirados += remanescentes;
    }

    await carteiraRepositorio.atualizar(carteira.id, {
      situacao: leitura.situacaoCalculada,
      motivoEncerramento: porVencimento ? 'vencimento' : 'consumo_total',
      dataEncerramento: hoje,
    });

    if (porVencimento) resumo.encerradasPorVencimento += 1;
    else resumo.encerradasPorConsumo += 1;

    // RF-NOT-09: o encerramento é comunicado com o motivo, e os créditos
    // perdidos no vencimento entram na mensagem — é a informação que a
    // aluna vai cobrar depois.
    await notificar({
      destinatario: { tipo: 'aluna', id: carteira.alunaId },
      evento: 'pacote_encerrado',
      referenciaId: carteira.id,
      conteudo: porVencimento
        ? `Seu pacote venceu em ${formatarDataBR(carteira.dataValidade)}.` +
          (remanescentes > 0 ? ` ${formatarCreditos(remanescentes)} não utilizados foram perdidos.` : '') +
          ' Adquira um novo pacote em "Meu pacote" para voltar a agendar.'
        : 'Você utilizou todos os créditos do seu pacote. Adquira um novo em "Meu pacote" para continuar agendando.',
    });

    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'Carteira',
      operacao: 'encerramento_automatico',
      autorId,
      dataHora: new Date().toISOString(),
      valorNovo: {
        carteiraId: carteira.id,
        motivo: porVencimento ? 'vencimento' : 'consumo_total',
        creditosPerdidos: remanescentes,
      },
    });

    // RF-BOL-03: a carteira da bolsista é reposta automaticamente com o
    // mesmo pacote concedido, sem cobrança e sem ação da aluna.
    const aluna = alunas.find((a) => a.id === carteira.alunaId);
    if (aluna?.bolsista) {
      const pacote = pacotes.find((p) => p.id === (aluna.pacoteConcedidoId ?? carteira.pacoteId));
      if (pacote) {
        await concederCarteiraDeBolsa({ aluna, pacote, autorId, hoje });
        resumo.bolsasRenovadas += 1;
      }
    }
  }

  return resumo;
}

/**
 * Concede uma carteira de bolsa (RF-BOL-02): venda de valor zero, sem
 * gateway, e carteira ativada na sequência. A venda existe para que a
 * concessão apareça no histórico de compras da aluna e no indicador de
 * valor não faturado (RF-BOL-08).
 */
export async function concederCarteiraDeBolsa(params: {
  aluna: Aluna;
  pacote: Pacote;
  autorId: string;
  hoje?: string;
}): Promise<Carteira> {
  const { aluna, pacote, autorId, hoje = hojeISO() } = params;

  const venda = await vendaRepositorio.criar({
    alunaId: aluna.id,
    tipo: 'pacote',
    pacoteId: pacote.id,
    creditos: pacote.creditos,
    validadeDias: pacote.validadeDias,
    valor: 0,
    formaPagamento: 'manual',
    data: hoje,
    situacao: 'confirmada',
    bolsa: true,
    observacao: `Bolsa integral — valor de tabela ${pacote.valor.toFixed(2)} não faturado.`,
  });

  return aplicarCompra({ aluna, pacote, venda, autorId, hoje });
}
