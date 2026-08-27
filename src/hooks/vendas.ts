import {
  alunaRepositorio,
  pacoteRepositorio,
  parametroRepositorio,
  reembolsoRepositorio,
  registroAuditoriaRepositorio,
  usuarioRepositorio,
  vendaRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import { cobrarNoGateway, linkDePagamento } from '../services/gatewayPagamento';
import type { Aluna, FormaPagamento, Pacote, Reembolso, SituacaoVenda, Venda } from '../types/domain';
import { formatarDataBR, hojeISO } from '../utils/data';
import { formatarCreditos, formatarMoeda, rotuloFormaPagamento } from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';
import { aplicarCompra } from './carteiraDeCreditos';

/**
 * Vendas e pagamentos (M12).
 *
 * Todo pagamento é único, no ato da compra (RF-VEN-01/02): não existe
 * cobrança recorrente, mensalidade, régua de inadimplência, multa ou
 * juros. A venda nasce pendente e só ativa a carteira quando o gateway
 * confirma (RF-VEN-03).
 *
 * Camada de domínio, não um hook React.
 */

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string; parcelavel: boolean }[] = [
  { valor: 'cartao_avista', rotulo: 'Cartão de crédito à vista', parcelavel: false },
  { valor: 'cartao_parcelado', rotulo: 'Cartão de crédito parcelado', parcelavel: true },
  { valor: 'pix', rotulo: 'Pix à vista', parcelavel: false },
];

export const PARCELAS_DISPONIVEIS = [2, 3, 4, 5, 6, 10, 12];

async function valorDaAulaExperimental(): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const valor = Number(parametros.find((p) => p.chave === 'valor_aula_experimental')?.valor);
  return Number.isFinite(valor) ? valor : 30;
}

// --- Venda de pacote -----------------------------------------------------

export interface ResultadoVenda {
  venda: Venda;
  confirmada: boolean;
  mensagem: string;
}

/**
 * Compra de pacote (RF-VEN-01). A venda é criada pendente, o gateway é
 * acionado e só a confirmação aplica os créditos à carteira — entre a
 * compra e a confirmação a aluna não agenda (RF-VEN-03).
 */
export async function registrarVendaDePacote(params: {
  aluna: Aluna;
  pacote: Pacote;
  formaPagamento: FormaPagamento;
  parcelas?: number;
  autorId: string;
  /** Só no protótipo: força a recusa do gateway simulado. */
  simularFalha?: boolean;
  /**
   * Cria a venda sem acionar o gateway. É o caso do cadastro pela
   * administração: a compra fica registrada e pendente, e quem paga é a
   * aluna no primeiro acesso (RF-VEN-03).
   */
  manterPendente?: boolean;
  hoje?: string;
}): Promise<ResultadoVenda> {
  const {
    aluna,
    pacote,
    formaPagamento,
    parcelas,
    autorId,
    simularFalha = false,
    manterPendente = false,
    hoje = hojeISO(),
  } = params;

  if (formaPagamento === 'cartao_parcelado' && (!parcelas || parcelas < 2)) {
    throw new RegraNegocioError('Informe em quantas parcelas a compra será feita.');
  }

  const venda = await vendaRepositorio.criar({
    alunaId: aluna.id,
    tipo: 'pacote',
    pacoteId: pacote.id,
    // Créditos, validade e valor ficam congelados na venda: alterar o
    // catálogo depois não pode mudar uma compra já feita (RF-PAC-01).
    creditos: pacote.creditos,
    validadeDias: pacote.validadeDias,
    valor: pacote.valor,
    formaPagamento,
    parcelas: formaPagamento === 'cartao_parcelado' ? parcelas : undefined,
    data: hoje,
    situacao: 'pendente',
    bolsa: false,
    simularFalhaGateway: simularFalha,
  });

  if (manterPendente) {
    return { venda, confirmada: false, mensagem: 'Venda registrada e aguardando pagamento.' };
  }

  return confirmarPagamentoDaVenda({ venda, autorId, hoje });
}

/**
 * Aciona o gateway para uma venda pendente. Serve tanto para a primeira
 * tentativa quanto para a retomada de uma venda que ficou pendente.
 */
export async function confirmarPagamentoDaVenda(params: {
  venda: Venda;
  autorId: string;
  hoje?: string;
}): Promise<ResultadoVenda> {
  const { venda, autorId, hoje = hojeISO() } = params;

  if (venda.situacao === 'confirmada') {
    return { venda, confirmada: true, mensagem: 'Esta venda já está confirmada.' };
  }
  if (venda.situacao !== 'pendente') {
    throw new RegraNegocioError('Só é possível confirmar o pagamento de uma venda pendente.');
  }

  const retorno = await cobrarNoGateway({
    referencia: venda.id,
    valor: venda.valor,
    formaPagamento: venda.formaPagamento,
    parcelas: venda.parcelas,
    forcarFalha: venda.simularFalhaGateway,
  });

  if (!retorno.sucesso) {
    return { venda, confirmada: false, mensagem: retorno.mensagem };
  }

  const confirmada = await vendaRepositorio.atualizar(venda.id, {
    situacao: 'confirmada',
    identificadorGateway: retorno.identificador,
  });

  if (venda.tipo === 'pacote' && venda.pacoteId) {
    const [alunas, pacotes] = await Promise.all([alunaRepositorio.listar(), pacoteRepositorio.listar()]);
    const aluna = alunas.find((a) => a.id === venda.alunaId);
    const pacote = pacotes.find((p) => p.id === venda.pacoteId);
    if (aluna && pacote) {
      await aplicarCompra({ aluna, pacote, venda: confirmada, autorId, hoje });
    }
  }

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Venda',
    operacao: 'confirmacao_de_pagamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: 'pendente' },
    valorNovo: { situacao: 'confirmada', identificadorGateway: retorno.identificador, valor: venda.valor },
  });

  return { venda: confirmada, confirmada: true, mensagem: retorno.mensagem };
}

/**
 * Venda registrada fora do gateway (RF-VEN-04) — dinheiro, transferência,
 * maquininha do studio. Já nasce confirmada, porque o pagamento aconteceu
 * fora do sistema e quem registra está atestando isso.
 */
export async function registrarVendaManual(params: {
  aluna: Aluna;
  pacote: Pacote;
  valor: number;
  data: string;
  observacao: string;
  autorId: string;
}): Promise<Venda> {
  const { aluna, pacote, valor, data, observacao, autorId } = params;

  if (valor < 0) throw new RegraNegocioError('O valor não pode ser negativo.');
  if (!observacao.trim()) throw new RegraNegocioError('Descreva como o pagamento foi recebido.');

  const venda = await vendaRepositorio.criar({
    alunaId: aluna.id,
    tipo: 'pacote',
    pacoteId: pacote.id,
    creditos: pacote.creditos,
    validadeDias: pacote.validadeDias,
    valor,
    formaPagamento: 'manual',
    data,
    situacao: 'confirmada',
    bolsa: false,
    observacao: observacao.trim(),
  });

  await aplicarCompra({ aluna, pacote, venda, autorId, hoje: data });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Venda',
    operacao: 'registro_manual_de_venda',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { vendaId: venda.id, alunaId: aluna.id, valor, observacao: observacao.trim() },
  });

  return venda;
}

/** RF-VEN-05: venda ainda não confirmada pode ser cancelada, com motivo. */
export async function cancelarVenda(params: { venda: Venda; motivo: string; autorId: string }): Promise<Venda> {
  const { venda, motivo, autorId } = params;

  if (venda.situacao !== 'pendente') {
    throw new RegraNegocioError('Só é possível cancelar uma venda que ainda não foi confirmada.');
  }
  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do cancelamento.');

  const cancelada = await vendaRepositorio.atualizar(venda.id, {
    situacao: 'cancelada',
    motivoCancelamento: motivo.trim(),
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Venda',
    operacao: 'cancelamento_de_venda',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: 'pendente' },
    valorNovo: { situacao: 'cancelada', motivo: motivo.trim() },
  });

  return cancelada;
}

/** Reenvia à aluna o link de pagamento de uma venda pendente. */
export async function reenviarLinkDePagamento(venda: Venda): Promise<void> {
  if (venda.situacao !== 'pendente') {
    throw new RegraNegocioError('Só faz sentido reenviar o link de uma venda pendente.');
  }

  await notificar({
    destinatario: { tipo: 'aluna', id: venda.alunaId },
    evento: 'link_de_pagamento_reenviado',
    conteudo: `Link para concluir o pagamento de ${formatarMoeda(venda.valor)}: ${linkDePagamento(venda.id)}`,
  });
}

/** Só no protótipo: liga ou desliga a recusa simulada do gateway para esta venda. */
export async function alternarSimulacaoDeFalha(venda: Venda): Promise<Venda> {
  return vendaRepositorio.atualizar(venda.id, { simularFalhaGateway: !venda.simularFalhaGateway });
}

// --- Aula experimental ---------------------------------------------------

/**
 * Cobrança da aula experimental (RF-EXP-04/05): valor único, à parte, sem
 * pacote e sem consumo de créditos. A vaga só é confirmada com o
 * pagamento aprovado.
 */
export async function venderAulaExperimental(params: {
  alunaId: string;
  formaPagamento?: FormaPagamento;
  autorId: string;
  hoje?: string;
  simularFalha?: boolean;
}): Promise<{ venda: Venda; confirmada: boolean; mensagem: string }> {
  const { alunaId, formaPagamento = 'pix', autorId, hoje = hojeISO(), simularFalha = false } = params;

  const valor = await valorDaAulaExperimental();

  const venda = await vendaRepositorio.criar({
    alunaId,
    tipo: 'aula_experimental',
    creditos: 0,
    validadeDias: 0,
    valor,
    formaPagamento,
    data: hoje,
    situacao: 'pendente',
    bolsa: false,
    observacao: 'Aula experimental — cobrada à parte, sem consumo de créditos.',
    simularFalhaGateway: simularFalha,
  });

  const retorno = await cobrarNoGateway({
    referencia: venda.id,
    valor,
    formaPagamento,
    forcarFalha: simularFalha,
  });

  if (!retorno.sucesso) {
    return { venda, confirmada: false, mensagem: retorno.mensagem };
  }

  const confirmada = await vendaRepositorio.atualizar(venda.id, {
    situacao: 'confirmada',
    identificadorGateway: retorno.identificador,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Venda',
    operacao: 'pagamento_de_aula_experimental',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { vendaId: venda.id, alunaId, valor },
  });

  return { venda: confirmada, confirmada: true, mensagem: retorno.mensagem };
}

// --- Consulta ------------------------------------------------------------

/** RF-VEN-06: histórico de compras da aluna. */
export async function historicoDeComprasDaAluna(alunaId: string): Promise<Venda[]> {
  const vendas = await vendaRepositorio.listar();
  return vendas.filter((v) => v.alunaId === alunaId).sort((a, b) => b.data.localeCompare(a.data));
}

export interface VendaDetalhada extends Venda {
  nomeAluna: string;
  nomePacote: string;
  /**
   * Quanto foi de fato devolvido, quando houve reembolso. Diferente de
   * `valor`, que é o preço pago: o reembolso desconta os créditos já
   * utilizados (RF-REE-02), então mostrar o valor do pacote numa venda
   * reembolsada informaria a quantia errada.
   */
  valorReembolsado?: number;
}

export async function listarVendasDetalhadas(): Promise<VendaDetalhada[]> {
  const [vendas, alunas, usuarios, pacotes, reembolsos] = await Promise.all([
    vendaRepositorio.listar(),
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
    pacoteRepositorio.listar(),
    reembolsoRepositorio.listar(),
  ]);

  return vendas
    .map((venda) => {
      const aluna = alunas.find((a) => a.id === venda.alunaId);
      const usuario = usuarios.find((u) => u.id === aluna?.usuarioId);
      const pacote = pacotes.find((p) => p.id === venda.pacoteId);
      const reembolso = reembolsos.find((r) => r.vendaId === venda.id);
      return {
        ...venda,
        nomeAluna: usuario?.nome ?? 'Aluna removida',
        nomePacote: venda.tipo === 'aula_experimental' ? 'Aula experimental' : (pacote?.nome ?? 'Pacote removido'),
        valorReembolsado: reembolso?.valorReembolsado,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

export interface ResumoDeVendas {
  confirmado: number;
  pendente: number;
  cancelado: number;
  /** Soma do que foi efetivamente devolvido, não do preço das vendas reembolsadas. */
  reembolsado: number;
  /** Valor de tabela não faturado nas concessões de bolsa (RF-BOL-08). */
  isentoPorBolsa: number;
  quantidade: Record<SituacaoVenda, number>;
}

/**
 * RF-VEN-07: visão consolidada do período por situação.
 *
 * O total reembolsado sai dos registros de reembolso, e não do valor das
 * vendas marcadas como reembolsadas: o reembolso desconta os créditos já
 * utilizados, então os dois números quase nunca coincidem.
 */
export function resumirVendas(
  vendas: Venda[],
  pacotes: Pacote[] = [],
  reembolsos: Reembolso[] = [],
): ResumoDeVendas {
  const resumo: ResumoDeVendas = {
    confirmado: 0,
    pendente: 0,
    cancelado: 0,
    reembolsado: reembolsos.reduce((soma, r) => soma + r.valorReembolsado, 0),
    isentoPorBolsa: 0,
    quantidade: { pendente: 0, confirmada: 0, cancelada: 0, reembolsada: 0 },
  };

  for (const venda of vendas) {
    resumo.quantidade[venda.situacao] += 1;

    if (venda.bolsa) {
      const pacote = pacotes.find((p) => p.id === venda.pacoteId);
      resumo.isentoPorBolsa += pacote?.valor ?? 0;
      continue;
    }

    if (venda.situacao === 'confirmada') resumo.confirmado += venda.valor;
    else if (venda.situacao === 'pendente') resumo.pendente += venda.valor;
    else if (venda.situacao === 'cancelada') resumo.cancelado += venda.valor;
  }

  return resumo;
}

/** Texto do e-mail de confirmação de compra (RF-NOT-02). */
export function descreverVenda(venda: Venda, nomePacote: string): string {
  const forma = rotuloFormaPagamento(venda.formaPagamento, venda.parcelas);
  if (venda.tipo === 'aula_experimental') {
    return `Aula experimental — ${formatarMoeda(venda.valor)} · ${forma} · ${formatarDataBR(venda.data)}`;
  }
  return `${nomePacote} — ${formatarCreditos(venda.creditos)}, validade de ${venda.validadeDias} dias · ${formatarMoeda(venda.valor)} · ${forma} · ${formatarDataBR(venda.data)}`;
}
