import {
  agendamentoRepositorio,
  alunaRepositorio,
  carteiraRepositorio,
  ocorrenciaSessaoRepositorio,
  registroAuditoriaRepositorio,
  trancamentoRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { Aluna, Carteira, Trancamento } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO, somarDias } from '../utils/data';
import { creditosDisponiveis, formatarCreditos } from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';
import { cancelarAgendamentosDaAlunaNoPeriodo } from './cancelamentoDeAulas';
import { ajustarProrrogacao, prorrogarPorCancelamentoDoStudio } from './carteiraDeCreditos';

/**
 * Trancamento da carteira (M3, seção 4.3.6).
 *
 * Recurso exclusivo do perfil de administração (RF-TRA-01, RF-PER-03),
 * concedido caso a caso a partir da solicitação da aluna. O sistema não
 * impõe teto de dias nem tabela por pacote (RF-TRA-03): o controle é o
 * critério de quem concede, e toda concessão fica registrada com autor e
 * motivo.
 *
 * Camada de domínio, não um hook React.
 */

export interface PreviaTrancamento {
  diasDeTrancamento: number;
  creditosCongelados: number;
  validadeAtual: string;
  /** Validade depois da prorrogação automática (RF-TRA-02). */
  validadeProjetada: string;
  /** Aulas agendadas dentro do período, que serão canceladas (RF-TRA-04). */
  aulasQueSeraoCanceladas: Array<{ agendamentoId: string; data: string; creditos: number }>;
}

/**
 * Prévia do efeito do trancamento (RF-TRA-05), exibida antes de confirmar:
 * saldo congelado, validade atual, validade projetada no retorno e as
 * aulas que serão canceladas.
 */
export async function calcularPreviaDeTrancamento(params: {
  carteira: Carteira;
  alunaId: string;
  dataInicio: string;
  dataTerminoPrevista: string;
}): Promise<PreviaTrancamento> {
  const { carteira, alunaId, dataInicio, dataTerminoPrevista } = params;

  const diasDeTrancamento = Math.max(0, diferencaEmDias(dataInicio, dataTerminoPrevista));

  const [agendamentos, ocorrencias] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);

  const aulasQueSeraoCanceladas = agendamentos
    .filter((a) => a.alunaId === alunaId && a.situacao === 'ativo')
    .map((a) => ({
      agendamentoId: a.id,
      data: ocorrencias.find((o) => o.id === a.ocorrenciaSessaoId)?.data ?? '',
      creditos: a.creditosReservados ?? 0,
    }))
    .filter((a) => a.data >= dataInicio && a.data <= dataTerminoPrevista)
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    diasDeTrancamento,
    creditosCongelados: creditosDisponiveis(carteira),
    validadeAtual: carteira.dataValidade,
    validadeProjetada: somarDias(carteira.dataValidade, diasDeTrancamento),
    aulasQueSeraoCanceladas,
  };
}

/** Trancamentos anteriores da aluna, apoio à decisão da administração (RF-TRA-07). */
export async function trancamentosDaAluna(alunaId: string): Promise<Trancamento[]> {
  const lista = await trancamentoRepositorio.listar();
  return lista.filter((t) => t.alunaId === alunaId).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
}

export async function trancamentoEmCurso(carteiraId: string): Promise<Trancamento | undefined> {
  const lista = await trancamentoRepositorio.listar();
  return lista.find((t) => t.carteiraId === carteiraId && t.situacao === 'em_curso');
}

/**
 * Concede o trancamento (RF-TRA-01/02/04/06).
 *
 * A prorrogação da validade é aplicada **na concessão**, pelos dias
 * previstos, e não só no retorno. O RF-TRA-02 fala em congelar a contagem;
 * como a validade aqui é uma data, congelar significa empurrá-la — e
 * empurrar já na concessão evita que a carteira expire no meio da pausa,
 * que é justamente o que o requisito quer impedir. O acerto pelo retorno
 * real acontece em `registrarRetorno`.
 */
export async function concederTrancamento(params: {
  carteira: Carteira;
  aluna: Aluna;
  dataInicio: string;
  dataTerminoPrevista: string;
  motivo: string;
  autorId: string;
}): Promise<{ trancamento: Trancamento; agendamentosCancelados: number }> {
  const { carteira, aluna, dataInicio, dataTerminoPrevista, motivo, autorId } = params;

  if (aluna.situacao === 'trancada') {
    throw new RegraNegocioError('Esta aluna já está com a carteira trancada.');
  }
  if (carteira.situacao !== 'ativa') {
    throw new RegraNegocioError('Só é possível trancar uma carteira ativa.');
  }
  if (dataTerminoPrevista < dataInicio) {
    throw new RegraNegocioError('A data de retorno não pode ser anterior ao início do trancamento.');
  }
  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do trancamento.');

  const previa = await calcularPreviaDeTrancamento({
    carteira,
    alunaId: aluna.id,
    dataInicio,
    dataTerminoPrevista,
  });

  const trancamento = await trancamentoRepositorio.criar({
    carteiraId: carteira.id,
    alunaId: aluna.id,
    dataInicio,
    dataTerminoPrevista,
    diasProrrogados: previa.diasDeTrancamento,
    motivo: motivo.trim(),
    autorId,
    dataConcessao: hojeISO(),
    situacao: 'em_curso',
  });

  if (previa.diasDeTrancamento > 0) {
    await prorrogarPorCancelamentoDoStudio({
      carteira,
      dias: previa.diasDeTrancamento,
      origem: `Trancamento de ${formatarDataBR(dataInicio)} a ${formatarDataBR(dataTerminoPrevista)}`,
      referenciaId: trancamento.id,
      autorId,
    });
  }

  // RF-TRA-04: durante o trancamento a aluna não visualiza a grade nem
  // agenda; as aulas já marcadas para o período são canceladas e os
  // créditos reservados voltam ao saldo disponível.
  await alunaRepositorio.atualizar(aluna.id, { situacao: 'trancada' });

  const agendamentosCancelados = await cancelarAgendamentosDaAlunaNoPeriodo({
    alunaId: aluna.id,
    dataInicio,
    dataFim: dataTerminoPrevista,
    motivo: 'Pacote trancado no período',
    autorId,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Carteira',
    operacao: 'trancamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      carteiraId: carteira.id,
      dataInicio,
      dataTerminoPrevista,
      diasProrrogados: previa.diasDeTrancamento,
      motivo: motivo.trim(),
      agendamentosCancelados,
    },
  });

  await notificar({
    destinatario: { tipo: 'aluna', id: aluna.id },
    evento: 'pacote_trancado',
    conteudo:
      `Seu pacote foi trancado de ${formatarDataBR(dataInicio)} a ${formatarDataBR(dataTerminoPrevista)}. ` +
      `${formatarCreditos(previa.creditosCongelados)} ficam congelados e a validade foi prorrogada para ` +
      `${formatarDataBR(previa.validadeProjetada)}. Durante o período não é possível agendar.`,
  });

  return { trancamento, agendamentosCancelados };
}

/**
 * Registra o retorno da aluna (RF-TRA-02).
 *
 * A prorrogação já foi aplicada na concessão pelos dias previstos. Aqui o
 * sistema acerta a diferença: retorno antecipado devolve os dias que não
 * foram usados, retorno atrasado acrescenta os dias a mais. Assim a
 * prorrogação corresponde ao tempo em que a carteira ficou de fato
 * trancada, e não ao que se previu.
 */
export async function registrarRetorno(params: {
  trancamento: Trancamento;
  aluna: Aluna;
  autorId: string;
  dataRetorno?: string;
}): Promise<{ diasAjustados: number; diasProrrogadosFinal: number }> {
  const { trancamento, aluna, autorId, dataRetorno = hojeISO() } = params;

  if (trancamento.situacao !== 'em_curso') {
    throw new RegraNegocioError('Este trancamento já foi encerrado.');
  }
  if (dataRetorno < trancamento.dataInicio) {
    throw new RegraNegocioError('A data de retorno não pode ser anterior ao início do trancamento.');
  }

  const diasReais = Math.max(0, diferencaEmDias(trancamento.dataInicio, dataRetorno));
  const diasAjustados = diasReais - trancamento.diasProrrogados;

  const carteiras = await carteiraRepositorio.listar();
  const carteira = carteiras.find((c) => c.id === trancamento.carteiraId);

  if (carteira && diasAjustados !== 0) {
    await ajustarProrrogacao({
      carteira,
      dias: diasAjustados,
      origem:
        diasAjustados < 0
          ? `Retorno em ${formatarDataBR(dataRetorno)}: ${Math.abs(diasAjustados)} dia(s) devolvidos do trancamento previsto`
          : `Retorno em ${formatarDataBR(dataRetorno)}: ${diasAjustados} dia(s) a mais de trancamento`,
      referenciaId: trancamento.id,
      autorId,
    });
  }

  await trancamentoRepositorio.atualizar(trancamento.id, {
    situacao: 'encerrado',
    dataRetornoEfetiva: dataRetorno,
    diasProrrogados: diasReais,
  });

  await alunaRepositorio.atualizar(aluna.id, { situacao: 'ativa' });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Carteira',
    operacao: 'retorno_de_trancamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { diasProrrogados: trancamento.diasProrrogados },
    valorNovo: { dataRetorno, diasProrrogados: diasReais, ajuste: diasAjustados },
  });

  await notificar({
    destinatario: { tipo: 'aluna', id: aluna.id },
    evento: 'retorno_de_trancamento',
    conteudo:
      `Seu retorno foi registrado em ${formatarDataBR(dataRetorno)} e o agendamento está liberado. ` +
      `A validade dos seus créditos foi prorrogada em ${diasReais} dia(s), o tempo em que o pacote ficou trancado.`,
  });

  return { diasAjustados, diasProrrogadosFinal: diasReais };
}
