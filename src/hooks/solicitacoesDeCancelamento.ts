import {
  agendamentoRepositorio,
  notificacaoRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  solicitacaoCancelamentoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { SolicitacaoCancelamento } from '../types/domain';
import { formatarDataBR, hojeISO } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import { cancelarOcorrencia, garantirOcorrencia } from './cancelamentoDeAulas';

/**
 * Cancelamento solicitado pela professora (M8.3).
 *
 * A professora não cancela a aula: ela **solicita**, e a sessão continua
 * ativa até a administração decidir (RF-CPR-01). A administração pode
 * designar substituta — e aí a aula acontece — ou cancelar de fato,
 * devolvendo o crédito às alunas com prazo adicional de vigência.
 */

export async function solicitarCancelamento(params: {
  sessaoId: string;
  data: string;
  professoraSolicitanteId: string;
  motivo: string;
}): Promise<SolicitacaoCancelamento> {
  const { sessaoId, data, professoraSolicitanteId, motivo } = params;

  if (!motivo.trim()) throw new RegraNegocioError('Descreva o motivo da solicitação.');
  if (data < hojeISO()) throw new RegraNegocioError('Não é possível solicitar cancelamento de uma data passada.');

  const sessoes = await sessaoRepositorio.listar();
  const sessao = sessoes.find((s) => s.id === sessaoId);
  if (!sessao) throw new RegraNegocioError('Esta sessão não existe mais.');
  if (!sessaoOcorreEm(sessao, data)) {
    throw new RegraNegocioError('Esta sessão não acontece na data escolhida.');
  }

  const existentes = await solicitacaoCancelamentoRepositorio.listar();
  if (existentes.some((s) => s.sessaoId === sessaoId && s.data === data && s.situacao === 'pendente')) {
    throw new RegraNegocioError('Já existe uma solicitação pendente para esta aula.');
  }

  return solicitacaoCancelamentoRepositorio.criar({
    sessaoId,
    data,
    professoraSolicitanteId,
    motivo: motivo.trim(),
    situacao: 'pendente',
  });
}

/** Quantas alunas seriam afetadas por uma solicitação (RF-CPR-02). */
export async function alunasAfetadasPelaSolicitacao(solicitacao: SolicitacaoCancelamento): Promise<number> {
  const [ocorrencias, agendamentos] = await Promise.all([
    ocorrenciaSessaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
  ]);
  const ocorrencia = ocorrencias.find((o) => o.sessaoId === solicitacao.sessaoId && o.data === solicitacao.data);
  if (!ocorrencia) return 0;
  return agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length;
}

async function notificarAlunasDaOcorrencia(ocorrenciaId: string, evento: string, conteudo: string): Promise<number> {
  const agendamentos = await agendamentoRepositorio.listar();
  const ativos = agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrenciaId && a.situacao === 'ativo');

  for (const agendamento of ativos) {
    await notificacaoRepositorio.criar({
      destinatarioId: agendamento.alunaId,
      evento,
      canal: 'email',
      conteudo,
      dataEnvio: new Date().toISOString(),
      situacaoEnvio: 'enviada',
    });
  }
  return ativos.length;
}

/**
 * Aprovação com substituta (RF-CPR-03): a aula acontece normalmente, com
 * outra professora. Nada é devolvido às alunas — só a troca é comunicada.
 *
 * A professora efetiva fica registrada **na ocorrência**, não na sessão:
 * a substituição vale só para aquela data, e é dela que o M10 vai tirar a
 * comissão daquela aula.
 */
export async function aprovarComSubstituta(params: {
  solicitacao: SolicitacaoCancelamento;
  professoraSubstitutaId: string;
  autorId: string;
}): Promise<{ alunasNotificadas: number }> {
  const { solicitacao, professoraSubstitutaId, autorId } = params;

  if (solicitacao.situacao !== 'pendente') throw new RegraNegocioError('Esta solicitação já foi analisada.');
  if (professoraSubstitutaId === solicitacao.professoraSolicitanteId) {
    throw new RegraNegocioError('A substituta precisa ser diferente da professora que solicitou.');
  }

  const sessoes = await sessaoRepositorio.listar();
  const sessao = sessoes.find((s) => s.id === solicitacao.sessaoId);
  if (!sessao) throw new RegraNegocioError('Esta sessão não existe mais.');

  const ocorrencia = await garantirOcorrencia(sessao, solicitacao.data);
  await ocorrenciaSessaoRepositorio.atualizar(ocorrencia.id, {
    professoraEfetivaId: professoraSubstitutaId,
  });

  const [professoras, usuarios] = await Promise.all([
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);
  const substituta = professoras.find((p) => p.id === professoraSubstitutaId);
  const nomeSubstituta = usuarios.find((u) => u.id === substituta?.usuarioId)?.nome ?? 'outra professora';

  const alunasNotificadas = await notificarAlunasDaOcorrencia(
    ocorrencia.id,
    'troca_de_professora',
    `Sua aula de ${formatarDataBR(solicitacao.data)} às ${sessao.horarioInicio} será conduzida por ${nomeSubstituta}. A aula acontece normalmente.`,
  );

  await solicitacaoCancelamentoRepositorio.atualizar(solicitacao.id, {
    situacao: 'aprovada_substituicao',
    professoraSubstitutaId,
    autorDecisaoId: autorId,
    dataDecisao: hojeISO(),
  });

  await notificacaoRepositorio.criar({
    destinatarioId: solicitacao.professoraSolicitanteId,
    evento: 'solicitacao_aprovada_com_substituta',
    canal: 'email',
    conteudo: `Sua solicitação para ${formatarDataBR(solicitacao.data)} foi aprovada. ${nomeSubstituta} assume a aula.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  return { alunasNotificadas };
}

/**
 * Aprovação sem substituta (RF-CPR-04/07): a aula daquela data é
 * cancelada, e cada aluna agendada recebe o crédito de volta com os dias
 * adicionais de vigência — a mesma regra usada pelo calendário de
 * exceções, reaproveitada de `cancelamentoDeAulas`.
 */
export async function aprovarComCancelamento(params: {
  solicitacao: SolicitacaoCancelamento;
  autorId: string;
}): Promise<{ alunasAfetadas: number }> {
  const { solicitacao, autorId } = params;

  if (solicitacao.situacao !== 'pendente') throw new RegraNegocioError('Esta solicitação já foi analisada.');

  const sessoes = await sessaoRepositorio.listar();
  const sessao = sessoes.find((s) => s.id === solicitacao.sessaoId);
  if (!sessao) throw new RegraNegocioError('Esta sessão não existe mais.');

  const alunasAfetadas = await cancelarOcorrencia(
    sessao,
    solicitacao.data,
    `Aula cancelada pelo studio: ${solicitacao.motivo}`,
    autorId,
  );

  await solicitacaoCancelamentoRepositorio.atualizar(solicitacao.id, {
    situacao: 'aprovada_cancelamento',
    autorDecisaoId: autorId,
    dataDecisao: hojeISO(),
  });

  await notificacaoRepositorio.criar({
    destinatarioId: solicitacao.professoraSolicitanteId,
    evento: 'solicitacao_aprovada_com_cancelamento',
    canal: 'email',
    conteudo: `Sua solicitação para ${formatarDataBR(solicitacao.data)} foi aprovada e a aula foi cancelada.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });

  return { alunasAfetadas };
}

/** Recusa (RF-CPR-05): a sessão é mantida e a professora é avisada. */
export async function recusarSolicitacao(params: {
  solicitacao: SolicitacaoCancelamento;
  motivoDaRecusa: string;
  autorId: string;
}): Promise<void> {
  const { solicitacao, motivoDaRecusa, autorId } = params;

  if (solicitacao.situacao !== 'pendente') throw new RegraNegocioError('Esta solicitação já foi analisada.');
  if (!motivoDaRecusa.trim()) throw new RegraNegocioError('Explique o motivo da recusa para a professora.');

  await solicitacaoCancelamentoRepositorio.atualizar(solicitacao.id, {
    situacao: 'recusada',
    autorDecisaoId: autorId,
    dataDecisao: hojeISO(),
  });

  await notificacaoRepositorio.criar({
    destinatarioId: solicitacao.professoraSolicitanteId,
    evento: 'solicitacao_recusada',
    canal: 'email',
    conteudo: `Sua solicitação de cancelamento para ${formatarDataBR(solicitacao.data)} foi recusada. Motivo: ${motivoDaRecusa.trim()}. A aula segue na grade.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });
}
