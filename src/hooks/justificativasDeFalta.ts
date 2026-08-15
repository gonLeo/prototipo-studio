import {
  agendamentoRepositorio,
  contratoRepositorio,
  justificativaRepositorio,
  notificacaoRepositorio,
  ocorrenciaSessaoRepositorio,
} from '../services/repositorios';
import type { Justificativa } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../utils/data';
import { RegraNegocioError } from './useModalidades';
import { prazoDeJustificativaEmDias } from './agendamentoDeAulas';

/**
 * Justificativa de falta (M8.2).
 *
 * Só faz sentido para aula que a aluna perdeu de fato — cancelamento
 * abaixo da antecedência mínima ou falta registrada. Se o crédito já
 * voltou ao saldo, não há o que justificar.
 */

/** RF-JUS-02: o prazo é contado da data da aula e é configurável. */
export async function prazoParaJustificar(dataAula: string): Promise<{ dentroDoPrazo: boolean; prazoDias: number; diasDecorridos: number }> {
  const prazoDias = await prazoDeJustificativaEmDias();
  const diasDecorridos = diferencaEmDias(dataAula, hojeISO());
  return { dentroDoPrazo: diasDecorridos >= 0 && diasDecorridos <= prazoDias, prazoDias, diasDecorridos };
}

export async function enviarJustificativa(params: {
  agendamentoId: string;
  alunaId: string;
  dataAula: string;
  texto: string;
  nomeAnexo?: string;
}): Promise<Justificativa> {
  const { agendamentoId, alunaId, dataAula, texto, nomeAnexo } = params;

  if (!texto.trim()) throw new RegraNegocioError('Descreva o motivo da falta.');

  const { dentroDoPrazo, prazoDias } = await prazoParaJustificar(dataAula);
  if (!dentroDoPrazo) {
    throw new RegraNegocioError(
      `O prazo para justificar é de ${prazoDias} dias após a aula, e ele já passou para esta data.`,
    );
  }

  const existentes = await justificativaRepositorio.listar();
  if (existentes.some((j) => j.agendamentoId === agendamentoId)) {
    throw new RegraNegocioError('Já existe uma justificativa enviada para esta aula.');
  }

  return justificativaRepositorio.criar({
    agendamentoId,
    alunaId,
    texto: texto.trim(),
    // O upload real fica para a API; aqui guardamos o nome informado como
    // referência do comprovante anexado.
    anexoUrl: nomeAnexo ? `anexo-simulado://${nomeAnexo}` : undefined,
    situacao: 'pendente',
    data: hojeISO(),
  });
}

/**
 * Análise da justificativa (RF-JUS-04/05): aprovar devolve o crédito ao
 * saldo, recusar mantém o desconto. Nos dois casos a aluna é notificada e
 * o parecer fica visível no histórico dela.
 */
export async function analisarJustificativa(params: {
  justificativa: Justificativa;
  aprovada: boolean;
  parecer: string;
  autorId: string;
}): Promise<void> {
  const { justificativa, aprovada, parecer, autorId } = params;

  if (justificativa.situacao !== 'pendente') {
    throw new RegraNegocioError('Esta justificativa já foi analisada.');
  }
  if (!parecer.trim()) throw new RegraNegocioError('Escreva o parecer da análise.');

  await justificativaRepositorio.atualizar(justificativa.id, {
    situacao: aprovada ? 'aprovada' : 'recusada',
    parecer: parecer.trim(),
    autorAnaliseId: autorId,
  });

  let novoSaldo: number | undefined;
  if (aprovada) {
    const [agendamentos, contratos] = await Promise.all([
      agendamentoRepositorio.listar(),
      contratoRepositorio.listar(),
    ]);
    const agendamento = agendamentos.find((a) => a.id === justificativa.agendamentoId);
    const contrato = contratos.find((c) => c.alunaId === justificativa.alunaId && c.situacao !== 'encerrado');

    if (contrato && agendamento && !agendamento.experimental) {
      novoSaldo = contrato.saldoAulas + 1;
      await contratoRepositorio.atualizar(contrato.id, { saldoAulas: novoSaldo });
    }
  }

  await notificacaoRepositorio.criar({
    destinatarioId: justificativa.alunaId,
    evento: aprovada ? 'justificativa_aprovada' : 'justificativa_recusada',
    canal: 'email',
    conteudo: aprovada
      ? `Sua justificativa foi aprovada. ${novoSaldo !== undefined ? `O crédito voltou ao seu saldo (${novoSaldo} aula(s)).` : ''} Parecer: ${parecer.trim()}`
      : `Sua justificativa foi recusada e a aula segue consumida. Parecer: ${parecer.trim()}`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });
}

/** Data da aula de uma justificativa, para exibir na fila de análise. */
export async function mapearDatasDasJustificativas(
  justificativas: Justificativa[],
): Promise<Record<string, string>> {
  const [agendamentos, ocorrencias] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);

  const datas: Record<string, string> = {};
  for (const justificativa of justificativas) {
    const agendamento = agendamentos.find((a) => a.id === justificativa.agendamentoId);
    const ocorrencia = ocorrencias.find((o) => o.id === agendamento?.ocorrenciaSessaoId);
    if (ocorrencia) datas[justificativa.id] = formatarDataBR(ocorrencia.data);
  }
  return datas;
}
