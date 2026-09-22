import {
  chamadaRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Chamada, OcorrenciaSessao, Sessao } from '../types/domain';
import { hojeISO, somarDias } from '../utils/data';
import { rotularDias, sessaoOcorreEm } from '../utils/grade';
import type { PeriodoDeApuracao } from './comissoes';
import { periodoDoMes } from './comissoes';

/**
 * Indicadores de professora (RF-PNL-07, REL-14).
 *
 * Dois números, apurados por período mensal:
 *
 * - **Frequência da professora** — aulas efetivamente conduzidas sobre
 *   aulas atribuídas. Atribuída é toda ocorrência da grade em que ela é a
 *   professora daquela data; conduzida é a que virou chamada finalizada por
 *   ela. Substituição conta para quem conduziu, não para a titular, e as
 *   aulas canceladas pelo studio saem do denominador: a professora não
 *   deixou de dar uma aula que não existiu.
 * - **Retenção** — alunas que frequentaram no período anterior e voltaram
 *   no atual, sobre as que frequentaram no anterior. Apurada por turma
 *   (sessão) e por professora.
 *
 * Só a administração vê (decisão D3): o painel da professora continua sendo
 * o do RF-PNL-04, com as aulas e os ganhos dela.
 *
 * Camada de domínio, não um hook React.
 */

export interface IndicadorDaProfessora {
  professoraId: string;
  nome: string;
  aulasAtribuidas: number;
  aulasConduzidas: number;
  /** Conduzidas ÷ atribuídas, em pontos percentuais. `undefined` sem aulas atribuídas. */
  frequencia: number | undefined;
  alunasNoPeriodoAnterior: number;
  alunasQueVoltaram: number;
  /** `undefined` quando não havia alunas no período anterior — não há o que reter. */
  retencao: number | undefined;
}

export interface IndicadorDaTurma {
  sessaoId: string;
  nomeModalidade: string;
  diasEHorario: string;
  nomeProfessora: string;
  alunasNoPeriodoAnterior: number;
  alunasQueVoltaram: number;
  retencao: number | undefined;
}

export interface IndicadoresDeProfessoras {
  periodo: PeriodoDeApuracao;
  periodoAnterior: PeriodoDeApuracao;
  professoras: IndicadorDaProfessora[];
  turmas: IndicadorDaTurma[];
}

/** Mês anterior ao período, para a comparação de retenção. */
export function periodoAnteriorA(periodo: PeriodoDeApuracao): PeriodoDeApuracao {
  return periodo.mes === 0 ? periodoDoMes(periodo.ano - 1, 11) : periodoDoMes(periodo.ano, periodo.mes - 1);
}

function porcentagem(parte: number, total: number): number | undefined {
  if (total === 0) return undefined;
  return Math.round((parte / total) * 100);
}

/**
 * Ocorrências de uma sessão dentro do período, materializadas ou não.
 *
 * A recorrência é derivada (ver `utils/grade`): a maioria das datas não
 * existe como registro, então a projeção precisa percorrer o calendário —
 * é a mesma conta que a grade da aluna faz.
 */
function datasDaSessaoNoPeriodo(sessao: Sessao, periodo: PeriodoDeApuracao, hoje: string): string[] {
  const datas: string[] = [];
  // Só conta o que já aconteceu: uma aula de amanhã não foi "deixada de
  // conduzir".
  const fim = periodo.dataFim < hoje ? periodo.dataFim : hoje;
  for (let data = periodo.dataInicio; data <= fim; data = somarDias(data, 1)) {
    if (data < sessao.dataInicio) continue;
    if (sessao.dataTermino && data > sessao.dataTermino) continue;
    if (sessaoOcorreEm(sessao, data)) datas.push(data);
  }
  return datas;
}

function chamadaFinalizadaDa(
  ocorrenciaId: string | undefined,
  chamadas: Chamada[],
): Chamada | undefined {
  if (!ocorrenciaId) return undefined;
  return chamadas.find((c) => c.ocorrenciaSessaoId === ocorrenciaId && c.situacao === 'finalizada');
}

/** Alunas com presença registrada numa turma dentro de um período. */
function alunasPresentesNaTurma(params: {
  sessaoId: string;
  periodo: PeriodoDeApuracao;
  ocorrencias: OcorrenciaSessao[];
  chamadas: Chamada[];
  presencas: Array<{ chamadaId: string; alunaId: string; situacao: string }>;
}): Set<string> {
  const { sessaoId, periodo, ocorrencias, chamadas, presencas } = params;

  const idsDeChamada = ocorrencias
    .filter((o) => o.sessaoId === sessaoId && o.data >= periodo.dataInicio && o.data <= periodo.dataFim)
    .map((o) => chamadaFinalizadaDa(o.id, chamadas)?.id)
    .filter((id): id is string => id !== undefined);

  return new Set(
    presencas.filter((p) => idsDeChamada.includes(p.chamadaId) && p.situacao === 'presente').map((p) => p.alunaId),
  );
}

export async function indicadoresDeProfessoras(periodo: PeriodoDeApuracao): Promise<IndicadoresDeProfessoras> {
  const anterior = periodoAnteriorA(periodo);
  const hoje = hojeISO();

  const [professoras, usuarios, sessoes, modalidades, ocorrencias, chamadas, presencas, excecoes] = await Promise.all([
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
    sessaoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    chamadaRepositorio.listar(),
    registroPresencaRepositorio.listar(),
    excecaoCalendarioRepositorio.listar(),
  ]);

  const datasSemStudio = new Set(excecoes.map((e) => e.data));
  const nomeDe = (professoraId: string) =>
    usuarios.find((u) => u.id === professoras.find((p) => p.id === professoraId)?.usuarioId)?.nome ??
    'Professora removida';

  // --- frequência: atribuídas e conduzidas por professora ----------------
  const atribuidas = new Map<string, number>();
  const conduzidas = new Map<string, number>();

  for (const sessao of sessoes) {
    for (const data of datasDaSessaoNoPeriodo(sessao, periodo, hoje)) {
      if (datasSemStudio.has(data)) continue;

      const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
      if (ocorrencia?.situacao === 'cancelada') continue;

      // Quem estava escalada naquela data: a substituta, quando houve troca.
      const titularDaData = ocorrencia?.professoraEfetivaId ?? sessao.professoraId;
      atribuidas.set(titularDaData, (atribuidas.get(titularDaData) ?? 0) + 1);

      const chamada = chamadaFinalizadaDa(ocorrencia?.id, chamadas);
      if (chamada) {
        const quemConduziu = chamada.professoraId ?? titularDaData;
        conduzidas.set(quemConduziu, (conduzidas.get(quemConduziu) ?? 0) + 1);
      }
    }
  }

  // --- retenção por turma -------------------------------------------------
  const turmas: IndicadorDaTurma[] = sessoes.map((sessao) => {
    const noAnterior = alunasPresentesNaTurma({
      sessaoId: sessao.id,
      periodo: anterior,
      ocorrencias,
      chamadas,
      presencas,
    });
    const noAtual = alunasPresentesNaTurma({ sessaoId: sessao.id, periodo, ocorrencias, chamadas, presencas });
    const voltaram = [...noAnterior].filter((alunaId) => noAtual.has(alunaId)).length;

    return {
      sessaoId: sessao.id,
      nomeModalidade: modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade removida',
      diasEHorario: `${rotularDias(sessao.diasSemana)} · ${sessao.horarioInicio}`,
      nomeProfessora: nomeDe(sessao.professoraId),
      alunasNoPeriodoAnterior: noAnterior.size,
      alunasQueVoltaram: voltaram,
      retencao: porcentagem(voltaram, noAnterior.size),
    };
  });

  // --- retenção por professora: união das turmas dela ---------------------
  const lista: IndicadorDaProfessora[] = professoras.map((professora) => {
    const suasSessoes = sessoes.filter((s) => s.professoraId === professora.id);

    const noAnterior = new Set<string>();
    const noAtual = new Set<string>();
    for (const sessao of suasSessoes) {
      for (const alunaId of alunasPresentesNaTurma({
        sessaoId: sessao.id,
        periodo: anterior,
        ocorrencias,
        chamadas,
        presencas,
      })) {
        noAnterior.add(alunaId);
      }
      for (const alunaId of alunasPresentesNaTurma({
        sessaoId: sessao.id,
        periodo,
        ocorrencias,
        chamadas,
        presencas,
      })) {
        noAtual.add(alunaId);
      }
    }
    const voltaram = [...noAnterior].filter((alunaId) => noAtual.has(alunaId)).length;

    const totalAtribuidas = atribuidas.get(professora.id) ?? 0;
    const totalConduzidas = conduzidas.get(professora.id) ?? 0;

    return {
      professoraId: professora.id,
      nome: nomeDe(professora.id),
      aulasAtribuidas: totalAtribuidas,
      aulasConduzidas: totalConduzidas,
      frequencia: porcentagem(totalConduzidas, totalAtribuidas),
      alunasNoPeriodoAnterior: noAnterior.size,
      alunasQueVoltaram: voltaram,
      retencao: porcentagem(voltaram, noAnterior.size),
    };
  });

  return {
    periodo,
    periodoAnterior: anterior,
    professoras: lista.sort((a, b) => a.nome.localeCompare(b.nome)),
    turmas: turmas.sort((a, b) => a.nomeModalidade.localeCompare(b.nomeModalidade)),
  };
}

/** Média de frequência do período — o número do cartão-resumo do painel. */
export function frequenciaMedia(indicadores: IndicadoresDeProfessoras): number | undefined {
  const comAulas = indicadores.professoras.filter((p) => p.frequencia !== undefined);
  if (comAulas.length === 0) return undefined;
  const atribuidas = comAulas.reduce((soma, p) => soma + p.aulasAtribuidas, 0);
  const conduzidas = comAulas.reduce((soma, p) => soma + p.aulasConduzidas, 0);
  return porcentagem(conduzidas, atribuidas);
}
