import type { DiaSemana, HorarioFuncionamento, Sessao } from '../types/domain';
import { diaSemanaDe } from './data';
import { DIAS_SEMANA, estaDentroDoFuncionamento } from './horarioFuncionamento';

/**
 * Regras puras da grade de horários (M5). Ficam fora do hook porque são
 * decisões de negócio testáveis isoladamente e reaproveitadas pelo
 * calendário de exceções (M6) e, adiante, pelo agendamento (M7).
 *
 * A recorrência não é materializada: uma `Sessao` guarda dias da semana +
 * faixa de horário + vigência, e as datas concretas são derivadas sob
 * demanda por `sessaoOcorreEm`. `OcorrenciaSessao` só existe no banco
 * quando aquela data específica desvia da recorrência (cancelamento,
 * troca de professora) ou precisa ser referenciada por um agendamento.
 */

/** Faixa informada no formulário: um conjunto de dias com um mesmo horário. */
export interface FaixaHorario {
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
}

/** Dados de uma sessão candidata, antes de existir no banco. */
export interface SessaoCandidata extends FaixaHorario {
  id?: string;
  professoraId: string;
  espacoId?: string;
  dataInicio: string;
  dataTermino?: string;
}

const DATA_INFINITA = '9999-12-31';

export function intervalosDeHorarioSobrepoem(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  return aInicio < bFim && bInicio < aFim;
}

/** Duas vigências (data de início + término opcional) coexistem em algum momento. */
export function vigenciasSobrepoem(
  aInicio: string,
  aTermino: string | undefined,
  bInicio: string,
  bTermino: string | undefined,
): boolean {
  return aInicio <= (bTermino ?? DATA_INFINITA) && bInicio <= (aTermino ?? DATA_INFINITA);
}

/** A sessão recorrente acontece nesta data específica? */
export function sessaoOcorreEm(sessao: Sessao, dataISO: string): boolean {
  if (sessao.situacao !== 'ativo') return false;
  if (dataISO < sessao.dataInicio) return false;
  if (sessao.dataTermino && dataISO > sessao.dataTermino) return false;
  return sessao.diasSemana.includes(diaSemanaDe(dataISO));
}

/**
 * Dias da semana em que a candidata colide com uma sessão já existente:
 * exige dia em comum, horários sobrepostos e vigências sobrepostas — duas
 * sessões no mesmo dia e horário mas em períodos disjuntos não conflitam.
 */
export function diasEmConflito(candidata: SessaoCandidata, existente: Sessao): DiaSemana[] {
  if (existente.id === candidata.id) return [];
  if (existente.situacao !== 'ativo') return [];
  if (!vigenciasSobrepoem(candidata.dataInicio, candidata.dataTermino, existente.dataInicio, existente.dataTermino)) {
    return [];
  }
  if (
    !intervalosDeHorarioSobrepoem(
      candidata.horarioInicio,
      candidata.horarioFim,
      existente.horarioInicio,
      existente.horarioFim,
    )
  ) {
    return [];
  }
  return candidata.diasSemana.filter((dia) => existente.diasSemana.includes(dia));
}

export function rotuloDoDia(dia: DiaSemana): string {
  return DIAS_SEMANA.find((d) => d.valor === dia)?.rotulo ?? dia;
}

export function rotularDias(dias: DiaSemana[]): string {
  const ordenados = DIAS_SEMANA.filter((d) => dias.includes(d.valor)).map((d) => d.rotulo);
  return ordenados.join(', ');
}

/**
 * Valida uma faixa isoladamente (RF-GRD-02: cada faixa é validada
 * individualmente) contra o horário de funcionamento do studio (RF-GRD-05).
 * Devolve a mensagem do primeiro problema encontrado, ou `undefined`.
 */
export function validarFaixaContraFuncionamento(
  faixa: FaixaHorario,
  horarioFuncionamento: HorarioFuncionamento,
): string | undefined {
  if (faixa.diasSemana.length === 0) return 'Selecione ao menos um dia da semana.';
  if (!faixa.horarioInicio || !faixa.horarioFim) return 'Informe o horário de início e de término.';
  if (faixa.horarioInicio >= faixa.horarioFim) return 'O horário de início deve ser anterior ao de término.';

  for (const dia of faixa.diasSemana) {
    if (horarioFuncionamento[dia].length === 0) {
      return `O studio não abre ${rotuloDoDia(dia).toLowerCase()}.`;
    }
    if (!estaDentroDoFuncionamento(horarioFuncionamento, dia, faixa.horarioInicio, faixa.horarioFim)) {
      const faixasDoDia = horarioFuncionamento[dia].map((b) => `${b.inicio}–${b.fim}`).join(', ');
      return `${rotuloDoDia(dia)}: o studio funciona das ${faixasDoDia}. A sessão precisa caber dentro de um desses intervalos.`;
    }
  }
  return undefined;
}
