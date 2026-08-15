import {
  agendamentoRepositorio,
  contratoRepositorio,
  notificacaoRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
} from '../services/repositorios';
import type { Agendamento, OcorrenciaSessao, Sessao } from '../types/domain';
import { hojeISO, somarDias, formatarDataBR } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';

/**
 * Regras de cancelamento de aula pelo studio, compartilhadas pela exclusão
 * de sessão (RF-GRD-08) e pelo calendário de exceções (RF-EXC-04): ambas
 * cancelam os agendamentos futuros, devolvem o crédito à aluna com prazo
 * adicional de vigência e disparam notificação.
 *
 * Não é um hook React — é a camada de domínio que os hooks de tela
 * consomem. Fica em `src/hooks/` por ser regra de negócio (ver README).
 */

/** Prazo extra de vigência concedido quando o studio cancela (parâmetro RF-CFG-05). */
async function diasAdicionaisPorCancelamento(): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const parametro = parametros.find((p) => p.chave === 'dias_adicionais_cancelamento_studio');
  return Number(parametro?.valor ?? 0);
}

/**
 * Busca a ocorrência daquela sessão na data, criando-a se ainda não existir.
 *
 * A recorrência é derivada, não materializada: só gravamos uma
 * `OcorrenciaSessao` quando aquela data precisa existir como registro
 * próprio — por ter sido cancelada, por ter troca de professora ou (a
 * partir do M7) por receber um agendamento.
 */
export async function garantirOcorrencia(sessao: Sessao, data: string): Promise<OcorrenciaSessao> {
  const ocorrencias = await ocorrenciaSessaoRepositorio.listar();
  const existente = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
  if (existente) return existente;

  return ocorrenciaSessaoRepositorio.criar({
    sessaoId: sessao.id,
    data,
    professoraEfetivaId: sessao.professoraId,
    situacao: 'ativa',
  });
}

/** Agendamentos ainda ativos de uma ocorrência já materializada. */
async function agendamentosAtivosDa(ocorrenciaId: string): Promise<Agendamento[]> {
  const agendamentos = await agendamentoRepositorio.listar();
  return agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrenciaId && a.situacao === 'ativo');
}

/**
 * Cancela uma data específica de uma sessão: marca a ocorrência como
 * cancelada, cancela os agendamentos ativos, devolve o crédito de cada
 * aluna afetada (saldo + dias adicionais de vigência) e registra a
 * notificação. Devolve quantas alunas foram afetadas.
 */
export async function cancelarOcorrencia(
  sessao: Sessao,
  data: string,
  motivo: string,
  autorId: string,
): Promise<number> {
  const ocorrencia = await garantirOcorrencia(sessao, data);
  await ocorrenciaSessaoRepositorio.atualizar(ocorrencia.id, {
    situacao: 'cancelada',
    motivoCancelamento: motivo,
  });
  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'OcorrenciaSessao',
    operacao: 'cancelamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: ocorrencia.situacao },
    valorNovo: { situacao: 'cancelada', motivoCancelamento: motivo },
  });

  const agendamentos = await agendamentosAtivosDa(ocorrencia.id);
  if (agendamentos.length === 0) return 0;

  const diasAdicionais = await diasAdicionaisPorCancelamento();
  const contratos = await contratoRepositorio.listar();

  for (const agendamento of agendamentos) {
    await agendamentoRepositorio.atualizar(agendamento.id, {
      situacao: 'cancelado',
      origemCancelamento: 'studio',
    });

    // Aula cancelada pelo studio nunca consome crédito da aluna: devolve a
    // aula ao saldo e estende a vigência do ciclo pelo prazo parametrizado.
    const contrato = contratos.find((c) => c.alunaId === agendamento.alunaId && c.situacao === 'ativo');
    if (contrato && !agendamento.experimental) {
      await contratoRepositorio.atualizar(contrato.id, {
        saldoAulas: contrato.saldoAulas + 1,
        diasAdicionaisConcedidos: contrato.diasAdicionaisConcedidos + diasAdicionais,
        dataVencimentoCiclo: somarDias(contrato.dataVencimentoCiclo, diasAdicionais),
      });
    }

    await notificacaoRepositorio.criar({
      destinatarioId: agendamento.alunaId,
      evento: 'aula_cancelada_pelo_studio',
      canal: 'email',
      conteudo: `Sua aula de ${formatarDataBR(data)} foi cancelada. Motivo: ${motivo}. O crédito voltou ao seu saldo${
        diasAdicionais > 0 ? ` e a validade do pacote foi estendida em ${diasAdicionais} dias` : ''
      }.`,
      dataEnvio: new Date().toISOString(),
      situacaoEnvio: 'enviada',
    });
  }

  return agendamentos.length;
}

/**
 * Quantas alunas têm agendamento ativo em datas futuras de uma sessão —
 * usado nas prévias de impacto antes de alterar ou excluir (RF-GRD-07/08).
 */
export async function contarAlunasAfetadasNaSessao(sessaoId: string): Promise<number> {
  const [ocorrencias, agendamentos] = await Promise.all([
    ocorrenciaSessaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
  ]);
  const hoje = hojeISO();
  const idsFuturos = ocorrencias.filter((o) => o.sessaoId === sessaoId && o.data >= hoje).map((o) => o.id);
  return agendamentos.filter((a) => idsFuturos.includes(a.ocorrenciaSessaoId) && a.situacao === 'ativo').length;
}

/** Cancela todas as datas futuras de uma sessão. Usado ao excluir/encerrar. */
export async function cancelarOcorrenciasFuturasDaSessao(
  sessao: Sessao,
  motivo: string,
  autorId: string,
  aPartirDe = hojeISO(),
): Promise<number> {
  const ocorrencias = await ocorrenciaSessaoRepositorio.listar();
  const futuras = ocorrencias.filter(
    (o) => o.sessaoId === sessao.id && o.data >= aPartirDe && o.situacao === 'ativa',
  );

  let afetadas = 0;
  for (const ocorrencia of futuras) {
    afetadas += await cancelarOcorrencia(sessao, ocorrencia.data, motivo, autorId);
  }
  return afetadas;
}

/**
 * Cancela os agendamentos de uma aluna dentro de um período, devolvendo o
 * crédito ao saldo. Usado quando o contrato é pausado ou encerrado
 * (RF-CTR-04/07): a aluna não pode ocupar vaga em datas que não poderá
 * frequentar, e as aulas já agendadas voltam para o saldo dela.
 *
 * `dataFim` em branco significa "daqui para a frente, sem limite".
 */
export async function cancelarAgendamentosDaAlunaNoPeriodo(params: {
  alunaId: string;
  dataInicio: string;
  dataFim?: string;
  motivo: string;
}): Promise<number> {
  const { alunaId, dataInicio, dataFim, motivo } = params;
  const [agendamentos, ocorrencias, contratos] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    contratoRepositorio.listar(),
  ]);

  const noPeriodo = agendamentos.filter((agendamento) => {
    if (agendamento.alunaId !== alunaId || agendamento.situacao !== 'ativo') return false;
    const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
    if (!ocorrencia) return false;
    return ocorrencia.data >= dataInicio && (!dataFim || ocorrencia.data <= dataFim);
  });

  const contrato = contratos.find((c) => c.alunaId === alunaId && c.situacao !== 'encerrado');

  for (const agendamento of noPeriodo) {
    await agendamentoRepositorio.atualizar(agendamento.id, {
      situacao: 'cancelado',
      origemCancelamento: 'administracao',
    });
    if (contrato && !agendamento.experimental) {
      await contratoRepositorio.atualizar(contrato.id, {
        saldoAulas: contrato.saldoAulas + 1,
      });
    }
    await notificacaoRepositorio.criar({
      destinatarioId: alunaId,
      evento: 'agendamento_cancelado_pela_administracao',
      canal: 'email',
      conteudo: `Seu agendamento foi cancelado. Motivo: ${motivo}. A aula voltou para o seu saldo.`,
      dataEnvio: new Date().toISOString(),
      situacaoEnvio: 'enviada',
    });
  }

  return noPeriodo.length;
}

/**
 * Aulas efetivamente realizadas por uma aluna dentro de um intervalo —
 * base do recálculo de saldo na alteração de plano (RF-PLN-04).
 */
export async function contarAulasRealizadasNoPeriodo(
  alunaId: string,
  dataInicio: string,
  dataFim: string,
): Promise<number> {
  const [agendamentos, ocorrencias] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);

  return agendamentos.filter((agendamento) => {
    if (agendamento.alunaId !== alunaId || agendamento.situacao !== 'realizado') return false;
    const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
    return ocorrencia !== undefined && ocorrencia.data >= dataInicio && ocorrencia.data <= dataFim;
  }).length;
}

/**
 * Prévia de impacto de uma data de exceção (RF-EXC-03): quais sessões
 * ocorrem naquela data e quantas alunas seriam afetadas.
 */
export async function previaDeImpactoNaData(data: string): Promise<{
  sessoes: Sessao[];
  alunasAfetadas: number;
}> {
  const [sessoes, ocorrencias, agendamentos] = await Promise.all([
    sessaoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
  ]);

  const doDia = sessoes.filter((s) => sessaoOcorreEm(s, data));
  const idsOcorrenciasDoDia = ocorrencias
    .filter((o) => o.data === data && o.situacao === 'ativa' && doDia.some((s) => s.id === o.sessaoId))
    .map((o) => o.id);
  const alunasAfetadas = agendamentos.filter(
    (a) => idsOcorrenciasDoDia.includes(a.ocorrenciaSessaoId) && a.situacao === 'ativo',
  ).length;

  return { sessoes: doDia, alunasAfetadas };
}
