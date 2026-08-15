import {
  alunaRepositorio,
  cobrancaRepositorio,
  contratoRepositorio,
  historicoBolsaRepositorio,
  historicoPlanoRepositorio,
  notificacaoRepositorio,
  pacoteRepositorio,
  pausaRepositorio,
  registroAuditoriaRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Aluna, Cobranca, Contrato, Pacote, TipoContrato, TipoPausa, Usuario } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO, somarDias, somarMeses } from '../utils/data';
import {
  calcularDatasDoContrato,
  ehIsencaoTotal,
  formatarMoeda,
  inicioDoCicloCorrente,
  saldoAposRenovacao,
  valorComBolsa,
} from '../utils/contrato';
import { RegraNegocioError } from './useModalidades';
import { cancelarAgendamentosDaAlunaNoPeriodo, contarAulasRealizadasNoPeriodo } from './cancelamentoDeAulas';

/**
 * Regras de contrato da aluna (M3): matrícula, renovação de ciclo,
 * alteração de plano, bolsa, pausas e encerramento.
 *
 * Não é um hook React — é a camada de domínio consumida pelos hooks de
 * tela, no mesmo padrão de `cancelamentoDeAulas.ts`.
 */

export interface DadosCadastraisAluna {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  contatoEmergencia: string;
}

export interface DadosContratacao {
  pacoteId: string;
  tipo: TipoContrato;
  dataPrimeiraCobranca: string;
  percentualBolsa: number;
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

/**
 * Cria o contrato de uma aluna a partir do pacote escolhido (RF-ALU-02,
 * RF-PAC-03/04/05): o ciclo vence no dia da entrada e o saldo já nasce
 * creditado com as aulas do pacote.
 */
async function criarContrato(
  alunaId: string,
  pacote: Pacote,
  contratacao: DadosContratacao,
): Promise<Contrato> {
  const { dataVencimentoCiclo, dataTerminoContrato } = calcularDatasDoContrato(
    contratacao.dataPrimeiraCobranca,
    contratacao.tipo,
    pacote,
  );

  return contratoRepositorio.criar({
    alunaId,
    pacoteId: pacote.id,
    tipo: contratacao.tipo,
    dataInicio: contratacao.dataPrimeiraCobranca,
    dataVencimentoCiclo,
    dataTerminoContrato,
    saldoAulas: pacote.aulasPorCiclo,
    diasAdicionaisConcedidos: 0,
    situacao: 'ativo',
    percentualBolsa: contratacao.percentualBolsa,
  });
}

function mensagemDeAcesso(pacote: Pacote, contratacao: DadosContratacao, precisaAceitar: boolean): string {
  const valor = valorComBolsa(pacote.valorMensal, contratacao.percentualBolsa);
  const linhaValor = ehIsencaoTotal(contratacao.percentualBolsa)
    ? 'Você é isenta de mensalidade — nenhuma cobrança será gerada.'
    : `Mensalidade de ${formatarMoeda(valor)}, com primeira cobrança em ${formatarDataBR(contratacao.dataPrimeiraCobranca)}.`;

  return [
    `Bem-vinda ao studio! Seu pacote "${pacote.nome}" foi ativado com ${pacote.aulasPorCiclo} aulas creditadas.`,
    linhaValor,
    precisaAceitar
      ? 'Acesse o sistema com o link enviado para assinar o termo de aceite e preencher a ficha de anamnese — o agendamento é liberado logo depois.'
      : 'Seu acesso ao agendamento já está liberado.',
  ].join(' ');
}

/**
 * Matrícula pela administração (RF-ALU-01/02/03). A aluna nasce
 * "aguardando aceite": o acesso ao agendamento só abre quando ela assina o
 * termo e preenche a anamnese (RF-ALU-08).
 */
export async function matricularAlunaPelaAdministracao(params: {
  dados: DadosCadastraisAluna;
  contratacao: DadosContratacao;
  autorId: string;
}): Promise<{ aluna: Aluna; usuario: Usuario; contrato: Contrato }> {
  const { dados, contratacao, autorId } = params;

  await validarIdentificacaoUnica(dados.email, dados.cpf);

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contratacao.pacoteId);
  if (!pacote) throw new RegraNegocioError('Selecione um pacote válido.');
  if (contratacao.percentualBolsa < 0 || contratacao.percentualBolsa > 100) {
    throw new RegraNegocioError('O percentual de bolsa deve ficar entre 0% e 100%.');
  }

  const usuario = await usuarioRepositorio.criar({
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    cpf: dados.cpf.trim(),
    situacao: 'aguardando_aceite',
    perfis: ['aluna'],
  });

  const aluna = await alunaRepositorio.criar({
    usuarioId: usuario.id,
    telefone: dados.telefone.trim(),
    dataNascimento: dados.dataNascimento,
    contatoEmergencia: dados.contatoEmergencia.trim(),
    origem: 'direta',
    situacao: 'aguardando_aceite',
    bolsista: contratacao.percentualBolsa > 0,
    percentualBolsa: contratacao.percentualBolsa,
  });

  const contrato = await criarContrato(aluna.id, pacote, contratacao);

  await notificacaoRepositorio.criar({
    destinatarioId: usuario.id,
    evento: 'acesso_de_primeiro_login',
    canal: 'email',
    conteudo: mensagemDeAcesso(pacote, contratacao, true),
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: 'matricula_administrativa',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { alunaId: aluna.id, pacote: pacote.nome, percentualBolsa: contratacao.percentualBolsa },
  });

  return { aluna, usuario, contrato };
}

/**
 * Auto-matrícula pelo site (RF-ALU-04): termo, anamnese e pagamento fazem
 * parte do próprio fluxo, então a aluna já entra ativa — o acesso é
 * liberado sem aprovação manual.
 */
export async function matricularAlunaPeloSite(params: {
  dados: DadosCadastraisAluna;
  contratacao: Omit<DadosContratacao, 'percentualBolsa'>;
}): Promise<{ aluna: Aluna; usuario: Usuario; contrato: Contrato }> {
  const { dados, contratacao } = params;

  await validarIdentificacaoUnica(dados.email, dados.cpf);

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contratacao.pacoteId);
  if (!pacote) throw new RegraNegocioError('Selecione um pacote válido.');

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
    situacao: 'ativa',
    // Bolsa é exclusiva do cadastro administrativo (RF-BOL-01).
    bolsista: false,
    percentualBolsa: 0,
  });

  const contrato = await criarContrato(aluna.id, pacote, { ...contratacao, percentualBolsa: 0 });

  await notificacaoRepositorio.criar({
    destinatarioId: usuario.id,
    evento: 'matricula_concluida_pelo_site',
    canal: 'email',
    conteudo: mensagemDeAcesso(pacote, { ...contratacao, percentualBolsa: 0 }, false),
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  return { aluna, usuario, contrato };
}

/**
 * Registra o pagamento da primeira cobrança do contrato, feito pela aluna
 * no primeiro acesso.
 *
 * Bolsista com isenção total não gera cobrança nenhuma (RF-BOL-03): nesse
 * caso nada é criado e a função devolve `undefined` — é o que faz o passo
 * de pagamento ser pulado no primeiro acesso.
 *
 * O gateway real entra no M11 (Fase 6); aqui a cobrança já nasce quitada,
 * com a marcação de que a transação foi simulada.
 */
export async function registrarPagamentoDaPrimeiraCobranca(contrato: Contrato): Promise<Cobranca | undefined> {
  const percentual = contrato.percentualBolsa ?? 0;
  if (ehIsencaoTotal(percentual)) return undefined;

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contrato.pacoteId);
  if (!pacote) throw new RegraNegocioError('O pacote deste contrato não existe mais.');

  const cobrancas = await cobrancaRepositorio.listar();
  const jaPaga = cobrancas.find(
    (c) => c.contratoId === contrato.id && c.dataVencimento === contrato.dataInicio && c.situacao === 'paga',
  );
  if (jaPaga) return jaPaga;

  const cobranca = await cobrancaRepositorio.criar({
    contratoId: contrato.id,
    valorBruto: pacote.valorMensal,
    percentualBolsa: percentual,
    valorLiquido: valorComBolsa(pacote.valorMensal, percentual),
    multa: 0,
    juros: 0,
    dataVencimento: contrato.dataInicio,
    situacao: 'paga',
    dataQuitacao: hojeISO(),
    identificadorGateway: 'simulado-no-prototipo',
  });

  await notificacaoRepositorio.criar({
    destinatarioId: contrato.alunaId,
    evento: 'pagamento_confirmado',
    canal: 'email',
    conteudo: `Recebemos o pagamento de ${formatarMoeda(cobranca.valorLiquido)} referente ao seu pacote. Seu acesso ao agendamento está liberado.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  return cobranca;
}

/**
 * Renovação do ciclo (RF-PAC-07/08). No sistema real roda sozinha na data
 * de vencimento; no protótipo é disparada pela administração na ficha da
 * aluna, aplicando exatamente a mesma regra — inclusive a transferência
 * das aulas não realizadas para o novo ciclo.
 */
export async function renovarCiclo(contrato: Contrato, autorId: string): Promise<Contrato> {
  if (contrato.situacao !== 'ativo') {
    throw new RegraNegocioError('Só é possível renovar o ciclo de um contrato ativo.');
  }

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contrato.pacoteId);
  if (!pacote) throw new RegraNegocioError('O pacote deste contrato não existe mais.');

  const novoVencimento = somarMeses(contrato.dataVencimentoCiclo, 1);
  if (novoVencimento > contrato.dataTerminoContrato) {
    throw new RegraNegocioError(
      `A vigência do contrato termina em ${formatarDataBR(contrato.dataTerminoContrato)} — encerre ou contrate um novo pacote em vez de renovar o ciclo.`,
    );
  }

  const atualizado = await contratoRepositorio.atualizar(contrato.id, {
    saldoAulas: saldoAposRenovacao(contrato.saldoAulas, pacote),
    dataVencimentoCiclo: novoVencimento,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Contrato',
    operacao: 'renovacao_de_ciclo',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { saldoAulas: contrato.saldoAulas, dataVencimentoCiclo: contrato.dataVencimentoCiclo },
    valorNovo: { saldoAulas: saldoAposRenovacao(contrato.saldoAulas, pacote), dataVencimentoCiclo: novoVencimento },
  });

  return atualizado;
}

/** Aulas já realizadas no ciclo corrente — base do recálculo de saldo. */
export async function aulasRealizadasNoCicloCorrente(contrato: Contrato): Promise<number> {
  return contarAulasRealizadasNoPeriodo(
    contrato.alunaId,
    inicioDoCicloCorrente(contrato),
    contrato.dataVencimentoCiclo,
  );
}

/**
 * Alteração de plano (RF-PLN-01/03/04/05/07): efeito imediato, saldo
 * recalculado, vigência preservada e registro completo no histórico.
 */
export async function alterarPlano(params: {
  contrato: Contrato;
  pacoteNovoId: string;
  saldoAulasResultante: number;
  diferencaApurada: number;
  valorConsumido: number;
  autorId: string;
}): Promise<void> {
  const { contrato, pacoteNovoId, saldoAulasResultante, diferencaApurada, valorConsumido, autorId } = params;

  if (contrato.situacao !== 'ativo') {
    throw new RegraNegocioError('Só é possível alterar o plano de um contrato ativo.');
  }
  if (pacoteNovoId === contrato.pacoteId) {
    throw new RegraNegocioError('Escolha um pacote diferente do atual.');
  }

  await contratoRepositorio.atualizar(contrato.id, {
    pacoteId: pacoteNovoId,
    saldoAulas: saldoAulasResultante,
    // RF-PLN-05: a data de término do contrato não se move.
  });

  await historicoPlanoRepositorio.criar({
    contratoId: contrato.id,
    pacoteAnteriorId: contrato.pacoteId,
    pacoteNovoId,
    valorProporcionalApurado: valorConsumido,
    diferencaCobrada: diferencaApurada,
    saldoAnterior: contrato.saldoAulas,
    saldoResultante: saldoAulasResultante,
    autorId,
    data: hojeISO(),
  });

  await notificacaoRepositorio.criar({
    destinatarioId: contrato.alunaId,
    evento: 'plano_alterado',
    canal: 'email',
    conteudo:
      diferencaApurada >= 0
        ? `Seu plano foi alterado. Diferença de ${formatarMoeda(diferencaApurada)} cobrada nesta alteração. Novo saldo: ${saldoAulasResultante} aulas.`
        : `Seu plano foi alterado. Crédito de ${formatarMoeda(Math.abs(diferencaApurada))} será aplicado na próxima cobrança. Novo saldo: ${saldoAulasResultante} aulas.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });
}

/**
 * Concessão, alteração ou revogação de bolsa (RF-BOL-07/08).
 *
 * O novo percentual passa a valer **a partir do próximo ciclo**, sem
 * efeito retroativo: por isso ele é gravado na aluna (percentual vigente)
 * e o contrato mantém o percentual aplicado no ciclo corrente até a
 * próxima renovação.
 */
export async function alterarBolsa(params: {
  aluna: Aluna;
  percentualNovo: number;
  motivo: string;
  autorId: string;
}): Promise<void> {
  const { aluna, percentualNovo, motivo, autorId } = params;

  if (percentualNovo < 0 || percentualNovo > 100) {
    throw new RegraNegocioError('O percentual de bolsa deve ficar entre 0% e 100%.');
  }
  if (!motivo.trim()) {
    throw new RegraNegocioError('Registre o motivo da concessão, alteração ou revogação.');
  }

  const percentualAnterior = aluna.percentualBolsa ?? 0;

  await alunaRepositorio.atualizar(aluna.id, {
    bolsista: percentualNovo > 0,
    percentualBolsa: percentualNovo,
  });

  const contratos = await contratoRepositorio.listar();
  const contrato = contratos.find((c) => c.alunaId === aluna.id && c.situacao !== 'encerrado');
  if (contrato) {
    await historicoBolsaRepositorio.criar({
      contratoId: contrato.id,
      percentualAnterior,
      percentualNovo,
      motivo: motivo.trim(),
      autorId,
      data: hojeISO(),
    });
  }
}

/**
 * Trancamento (semestral) ou suspensão (mensal) — RF-CTR-01/03/04/05.
 *
 * Nos dois casos a validade do ciclo é empurrada pelo tempo de pausa e o
 * agendamento fica bloqueado, com as aulas já marcadas no período
 * canceladas e o crédito devolvido. A diferença é a cobrança: trancamento
 * pausa, suspensão mantém — o que se reflete na situação do contrato.
 */
export async function pausarContrato(params: {
  contrato: Contrato;
  aluna: Aluna;
  tipo: TipoPausa;
  dataInicio: string;
  dataTerminoPrevista: string;
  motivo: string;
  autorId: string;
}): Promise<{ agendamentosCancelados: number }> {
  const { contrato, aluna, tipo, dataInicio, dataTerminoPrevista, motivo, autorId } = params;

  if (contrato.situacao !== 'ativo') {
    throw new RegraNegocioError('Só é possível pausar um contrato ativo.');
  }
  if (dataTerminoPrevista < dataInicio) {
    throw new RegraNegocioError('A data de retorno não pode ser anterior ao início da pausa.');
  }
  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo da pausa.');

  if (tipo === 'trancamento' && contrato.tipo !== 'semestral') {
    throw new RegraNegocioError('Trancamento se aplica a contratos semestrais. Use suspensão para contratos mensais.');
  }
  if (tipo === 'suspensao' && contrato.tipo !== 'mensal') {
    throw new RegraNegocioError('Suspensão se aplica a contratos mensais. Use trancamento para contratos semestrais.');
  }

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contrato.pacoteId);
  const diasCongelados = Math.max(0, diferencaEmDias(dataInicio, dataTerminoPrevista));
  if (pacote && pacote.limiteDiasPausa > 0 && diasCongelados > pacote.limiteDiasPausa) {
    throw new RegraNegocioError(
      `O pacote "${pacote.nome}" permite no máximo ${pacote.limiteDiasPausa} dias de pausa, e o período informado tem ${diasCongelados}.`,
    );
  }

  await pausaRepositorio.criar({
    contratoId: contrato.id,
    tipo,
    dataInicio,
    dataTerminoPrevista,
    diasCongelados,
    motivo: motivo.trim(),
    autorId,
  });

  await contratoRepositorio.atualizar(contrato.id, {
    situacao: tipo === 'trancamento' ? 'trancado' : 'suspenso',
    dataVencimentoCiclo: somarDias(contrato.dataVencimentoCiclo, diasCongelados),
    diasAdicionaisConcedidos: contrato.diasAdicionaisConcedidos + diasCongelados,
  });

  await alunaRepositorio.atualizar(aluna.id, {
    situacao: tipo === 'trancamento' ? 'trancada' : 'suspensa',
  });

  const agendamentosCancelados = await cancelarAgendamentosDaAlunaNoPeriodo({
    alunaId: aluna.id,
    dataInicio,
    dataFim: dataTerminoPrevista,
    motivo: tipo === 'trancamento' ? 'Contrato trancado no período' : 'Contrato suspenso no período',
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Contrato',
    operacao: tipo,
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { dataInicio, dataTerminoPrevista, diasCongelados, motivo: motivo.trim() },
  });

  return { agendamentosCancelados };
}

/** Retorno da pausa (RF-CTR-02): a validade volta a correr e o ciclo é retomado. */
export async function retornarDePausa(params: {
  contrato: Contrato;
  aluna: Aluna;
  autorId: string;
}): Promise<void> {
  const { contrato, aluna, autorId } = params;

  if (contrato.situacao !== 'trancado' && contrato.situacao !== 'suspenso') {
    throw new RegraNegocioError('Este contrato não está pausado.');
  }

  const pausas = await pausaRepositorio.listar();
  const pausaAberta = pausas
    .filter((p) => p.contratoId === contrato.id && !p.dataRetornoEfetiva)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))[0];

  if (pausaAberta) {
    await pausaRepositorio.atualizar(pausaAberta.id, { dataRetornoEfetiva: hojeISO() });
  }

  await contratoRepositorio.atualizar(contrato.id, { situacao: 'ativo' });
  await alunaRepositorio.atualizar(aluna.id, { situacao: 'ativa' });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Contrato',
    operacao: 'retorno_de_pausa',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { dataRetorno: hojeISO() },
  });
}

/**
 * Encerramento do contrato (RF-CTR-07/08): a aluna perde o acesso ao
 * agendamento, as aulas futuras são canceladas e o cadastro permanece no
 * histórico. O motivo fica em campo estruturado para o relatório de
 * motivos de saída.
 */
export const MOTIVOS_ENCERRAMENTO = [
  'Solicitação da aluna',
  'Mudança de cidade',
  'Motivo financeiro',
  'Motivo de saúde',
  'Inadimplência',
  'Término da vigência',
  'Outro',
] as const;

export async function encerrarContrato(params: {
  contrato: Contrato;
  aluna: Aluna;
  motivo: string;
  autorId: string;
}): Promise<{ agendamentosCancelados: number }> {
  const { contrato, aluna, motivo, autorId } = params;

  if (contrato.situacao === 'encerrado') {
    throw new RegraNegocioError('Este contrato já está encerrado.');
  }
  if (!motivo.trim()) throw new RegraNegocioError('Selecione o motivo do encerramento.');

  await contratoRepositorio.atualizar(contrato.id, { situacao: 'encerrado' });
  await alunaRepositorio.atualizar(aluna.id, { situacao: 'encerrada' });

  const agendamentosCancelados = await cancelarAgendamentosDaAlunaNoPeriodo({
    alunaId: aluna.id,
    dataInicio: hojeISO(),
    motivo: 'Contrato encerrado',
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Contrato',
    operacao: 'encerramento',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: contrato.situacao },
    valorNovo: { situacao: 'encerrado', motivo: motivo.trim() },
  });

  await notificacaoRepositorio.criar({
    destinatarioId: aluna.id,
    evento: 'contrato_encerrado',
    canal: 'email',
    conteudo: `Seu contrato foi encerrado. Motivo: ${motivo.trim()}. Seu histórico permanece no studio e você pode voltar contratando um novo pacote.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  return { agendamentosCancelados };
}

/**
 * Reativação (RF-CTR-09): a aluna com contrato encerrado volta contratando
 * um novo pacote, e o histórico anterior é preservado — o contrato antigo
 * continua existindo, encerrado.
 */
export async function reativarAluna(params: {
  aluna: Aluna;
  contratacao: DadosContratacao;
  autorId: string;
}): Promise<Contrato> {
  const { aluna, contratacao, autorId } = params;

  const contratos = await contratoRepositorio.listar();
  if (contratos.some((c) => c.alunaId === aluna.id && c.situacao !== 'encerrado')) {
    throw new RegraNegocioError('Esta aluna já tem um contrato em andamento — altere o plano em vez de criar outro.');
  }

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contratacao.pacoteId);
  if (!pacote) throw new RegraNegocioError('Selecione um pacote válido.');

  const contrato = await criarContrato(aluna.id, pacote, contratacao);

  await alunaRepositorio.atualizar(aluna.id, {
    situacao: 'ativa',
    bolsista: contratacao.percentualBolsa > 0,
    percentualBolsa: contratacao.percentualBolsa,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: 'reativacao',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { contratoId: contrato.id, pacote: pacote.nome },
  });

  return contrato;
}
