import {
  alunaRepositorio,
  pacoteRepositorio,
  registroAuditoriaRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { Aluna, FormaPagamento, Pacote, Usuario, Venda } from '../types/domain';
import { formatarCreditos, formatarMoeda } from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';
import { carteiraVigenteDaAluna, concederCarteiraDeBolsa } from './carteiraDeCreditos';
import { confirmarPagamentoDaVenda, registrarVendaDePacote } from './vendas';

/**
 * Cadastro de alunas (M2) e a compra que abre o acesso (M3 + M12).
 *
 * Camada de domínio, não um hook React — consumida pelos hooks de tela, no
 * mesmo padrão de `cancelamentoDeAulas.ts`.
 */

export interface DadosCadastraisAluna {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  contatoEmergencia: string;
}

export interface DadosDaCompra {
  pacoteId: string;
  formaPagamento: FormaPagamento;
  parcelas?: number;
}

/**
 * E-mail e CPF identificam uma única pessoa no sistema (RF-ALU-01). A
 * mensagem de erro aponta o cadastro existente em vez de só recusar, para
 * que a administração consiga localizá-lo.
 */
export async function validarIdentificacaoUnica(
  email: string,
  cpf: string,
  ignorarUsuarioId?: string,
): Promise<void> {
  const usuarios = await usuarioRepositorio.listar();

  const porEmail = usuarios.find(
    (u) => u.id !== ignorarUsuarioId && u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (porEmail) {
    throw new RegraNegocioError(
      `Este e-mail já pertence a "${porEmail.nome}". Localize o cadastro existente em vez de criar um novo.`,
    );
  }

  const porCpf = usuarios.find((u) => u.id !== ignorarUsuarioId && u.cpf === cpf.trim());
  if (porCpf) {
    throw new RegraNegocioError(
      `Este CPF já pertence a "${porCpf.nome}". Localize o cadastro existente em vez de criar um novo.`,
    );
  }
}

async function buscarPacote(pacoteId: string): Promise<Pacote> {
  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === pacoteId);
  if (!pacote) throw new RegraNegocioError('Selecione um pacote válido.');
  return pacote;
}

/**
 * Texto do e-mail de acesso (RF-NOT-01).
 *
 * `aguardaPagamento` distingue quem ainda precisa pagar para receber os
 * créditos (cadastro administrativo sem bolsa) de quem já os tem. O termo e
 * a anamnese aparecem como pendência a concluir, nunca como condição para
 * agendar (RF-ALU-08).
 */
function mensagemDeAcesso(params: {
  pacote: Pacote;
  bolsista: boolean;
  aguardaPagamento: boolean;
  pendencias?: string;
}): string {
  const { pacote, bolsista, aguardaPagamento, pendencias } = params;

  const linhaValor = bolsista
    ? 'Você é bolsista — nenhuma cobrança será gerada, e seu pacote é renovado automaticamente.'
    : `Valor do pacote: ${formatarMoeda(pacote.valor)}, em pagamento único.`;

  return [
    `Bem-vinda ao studio! O pacote "${pacote.nome}" está reservado para você, com ${formatarCreditos(pacote.creditos)} e validade de ${pacote.validadeDias} dias.`,
    linhaValor,
    aguardaPagamento
      ? 'Acesse o sistema com o link enviado e confirme o pagamento: seus créditos são liberados na confirmação.'
      : 'Seus créditos já estão disponíveis para agendamento.',
    pendencias ? `Ficou pendente: ${pendencias}. Conclua pelo seu painel quando puder — isso não impede o agendamento.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Cadastro pela administração (RF-ALU-01/02/03, fluxo 6.3).
 *
 * A aluna entra com o acesso liberado e com termo e anamnese pendentes —
 * pendência que gera alerta, não bloqueio (RF-ALU-08). Bolsista recebe a
 * carteira ativa de imediato, sem cobrança (RF-BOL-02); as demais ficam
 * com a venda pendente, e a carteira nasce quando o pagamento é
 * confirmado, no primeiro acesso (RF-CRE-01).
 */
export async function cadastrarAlunaPelaAdministracao(params: {
  dados: DadosCadastraisAluna;
  pacoteId: string;
  bolsista: boolean;
  autorId: string;
}): Promise<{ aluna: Aluna; usuario: Usuario; venda?: Venda }> {
  const { dados, pacoteId, bolsista, autorId } = params;

  await validarIdentificacaoUnica(dados.email, dados.cpf);
  const pacote = await buscarPacote(pacoteId);

  const usuario = await usuarioRepositorio.criar({
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    cpf: dados.cpf.trim(),
    // O acesso da aluna nunca fica bloqueado (RF-ALU-08); quem espera o
    // aceite para entrar é a professora (RF-PRO-04).
    situacao: 'ativo',
    perfis: ['aluna'],
  });

  const aluna = await alunaRepositorio.criar({
    usuarioId: usuario.id,
    telefone: dados.telefone.trim(),
    dataNascimento: dados.dataNascimento,
    contatoEmergencia: dados.contatoEmergencia.trim(),
    origem: 'direta',
    // Termo e anamnese ainda não existem: a aluna nasce com a pendência do
    // RF-ALU-08, que `sincronizarSituacaoDeAceite` limpa quando ela concluir.
    situacao: 'aguardando_aceite',
    bolsista,
    pacoteConcedidoId: bolsista ? pacote.id : undefined,
  });

  let venda: Venda | undefined;

  if (bolsista) {
    await concederCarteiraDeBolsa({ aluna, pacote, autorId });
  } else {
    // A venda fica pendente: a carteira só é ativada depois da confirmação
    // do pagamento, que a aluna conclui no primeiro acesso (RF-VEN-03).
    const resultado = await registrarVendaDePacote({
      aluna,
      pacote,
      formaPagamento: 'pix',
      autorId,
      manterPendente: true,
    });
    venda = resultado.venda;
  }

  await notificar({
    destinatario: { tipo: 'usuario', id: usuario.id },
    evento: 'acesso_de_primeiro_login',
    conteudo: mensagemDeAcesso({
      pacote,
      bolsista,
      aguardaPagamento: !bolsista,
      pendencias: 'o aceite do termo e a ficha de anamnese',
    }),
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: 'cadastro_administrativo',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { alunaId: aluna.id, pacote: pacote.nome, bolsista },
  });

  return { aluna, usuario, venda };
}

/**
 * Matrícula pelo site (RF-ALU-04, fluxo 6.1).
 *
 * O pagamento vem antes do termo e da anamnese: confirmada a compra, a
 * carteira é ativada e o acesso liberado (RF-CRE-01). Termo, anamnese e
 * primeira aula são passos seguintes, que a interessada pode pular — por
 * isso a aluna nasce com a pendência do RF-ALU-08, limpa conforme ela
 * concluir cada um, ali mesmo ou depois pelo painel.
 */
export async function matricularAlunaPeloSite(params: {
  dados: DadosCadastraisAluna;
  compra: DadosDaCompra;
}): Promise<{ aluna: Aluna; usuario: Usuario; venda: Venda }> {
  const { dados, compra } = params;

  await validarIdentificacaoUnica(dados.email, dados.cpf);
  const pacote = await buscarPacote(compra.pacoteId);

  const usuario = await usuarioRepositorio.criar({
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    cpf: dados.cpf.trim(),
    situacao: 'ativo',
    perfis: ['aluna'],
  });

  const aluna = await alunaRepositorio.criar({
    usuarioId: usuario.id,
    telefone: dados.telefone.trim(),
    dataNascimento: dados.dataNascimento,
    contatoEmergencia: dados.contatoEmergencia.trim(),
    origem: 'direta',
    // Termo e anamnese vêm depois do pagamento e podem ser pulados.
    situacao: 'aguardando_aceite',
    // Bolsa é exclusiva do cadastro administrativo (RF-BOL-01).
    bolsista: false,
  });

  const { venda, confirmada, mensagem } = await registrarVendaDePacote({
    aluna,
    pacote,
    formaPagamento: compra.formaPagamento,
    parcelas: compra.parcelas,
    autorId: usuario.id,
  });

  if (!confirmada) {
    throw new RegraNegocioError(`O pagamento não foi aprovado: ${mensagem}`);
  }

  await notificar({
    destinatario: { tipo: 'usuario', id: usuario.id },
    evento: 'matricula_concluida_pelo_site',
    conteudo: mensagemDeAcesso({ pacote, bolsista: false, aguardaPagamento: false }),
  });

  return { aluna, usuario, venda };
}

/**
 * Compra de pacote por uma aluna que já existe (RF-CRE-13/14).
 *
 * Serve tanto para quem tem carteira ativa — caso em que os créditos são
 * somados e a validade passa a ser única — quanto para quem está sem
 * pacote ativo, inclusive a interessada que veio da aula experimental
 * (RF-EXP-07). Não existe "reativação": a carteira nova simplesmente
 * nasce, e o histórico anterior permanece (RF-HIS-01).
 */
export async function comprarPacoteParaAluna(params: {
  aluna: Aluna;
  compra: DadosDaCompra;
  autorId: string;
}): Promise<{ venda: Venda; confirmada: boolean; mensagem: string }> {
  const { aluna, compra, autorId } = params;

  const pacote = await buscarPacote(compra.pacoteId);

  return registrarVendaDePacote({
    aluna,
    pacote,
    formaPagamento: compra.formaPagamento,
    parcelas: compra.parcelas,
    autorId,
  });
}

/**
 * Concessão, alteração e revogação de bolsa (RF-BOL-01/05/06).
 *
 * Na Fase 1 a bolsa é sempre integral (RF-BOL-02) — o que a administração
 * escolhe é o pacote concedido. A revogação vale a partir do encerramento
 * da carteira vigente, sem efeito retroativo: por isso ela não mexe na
 * carteira em curso, só impede a renovação automática seguinte.
 */
export async function alterarBolsa(params: {
  aluna: Aluna;
  bolsista: boolean;
  pacoteConcedidoId?: string;
  motivo: string;
  autorId: string;
}): Promise<Aluna> {
  const { aluna, bolsista, pacoteConcedidoId, motivo, autorId } = params;

  if (!motivo.trim()) {
    throw new RegraNegocioError('Registre o motivo da concessão, alteração ou revogação.');
  }
  if (bolsista && !pacoteConcedidoId) {
    throw new RegraNegocioError('Escolha o pacote que será concedido à bolsista.');
  }

  const pacote = bolsista && pacoteConcedidoId ? await buscarPacote(pacoteConcedidoId) : undefined;

  const atualizada = await alunaRepositorio.atualizar(aluna.id, {
    bolsista,
    pacoteConcedidoId: bolsista ? pacoteConcedidoId : undefined,
  });

  // RF-BOL-06: toda concessão, alteração ou revogação registra autor,
  // data, pacote e motivo.
  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: bolsista ? 'concessao_de_bolsa' : 'revogacao_de_bolsa',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { bolsista: aluna.bolsista, pacoteConcedidoId: aluna.pacoteConcedidoId },
    valorNovo: { bolsista, pacoteConcedidoId, motivo: motivo.trim() },
  });

  // Concessão a quem está sem pacote ativo já entrega a carteira: esperar
  // o encerramento de uma carteira que não existe deixaria a bolsa sem
  // efeito nenhum.
  if (bolsista && pacote) {
    const vigente = await carteiraVigenteDaAluna(aluna.id);
    if (!vigente) {
      await concederCarteiraDeBolsa({ aluna: atualizada, pacote, autorId });
    }
  }

  return atualizada;
}

/**
 * Conclui o pagamento pendente do primeiro acesso (RF-VEN-03).
 *
 * É aqui que a carteira da aluna cadastrada pela administração sem bolsa
 * nasce e já fica ativa: `confirmarPagamentoDaVenda` aplica a compra
 * (RF-CRE-01). Termo e anamnese pendentes não interferem.
 */
export async function quitarVendaDoPrimeiroAcesso(params: {
  venda: Venda;
  autorId: string;
}): Promise<void> {
  const { venda, autorId } = params;

  const { confirmada, mensagem } = await confirmarPagamentoDaVenda({ venda, autorId });

  if (!confirmada) throw new RegraNegocioError(`O pagamento não foi aprovado: ${mensagem}`);
}
