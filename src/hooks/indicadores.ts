import {
  agendamentoRepositorio,
  alunaRepositorio,
  cobrancaRepositorio,
  comissaoRepositorio,
  contratoRepositorio,
  justificativaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  solicitacaoCancelamentoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Cobranca } from '../types/domain';
import { diferencaEmDias, hojeISO, somarDias } from '../utils/data';
import { estaEmAberto, valorAtualizadoDaCobranca } from '../utils/financeiro';
import { sessaoOcorreEm } from '../utils/grade';
import { chamadasPendentes } from './chamadaDeAulas';
import type { PeriodoDeApuracao } from './comissoes';

/**
 * Painéis e indicadores (M14).
 *
 * Leitura pura: nada aqui grava. Os números saem dos mesmos registros que
 * as telas de operação usam, para que painel e listagem nunca divirjam.
 */

/** Janela usada em "contratos a vencer" e na projeção de ocupação. */
const DIAS_DE_PROJECAO = 30;

export interface PendenciasDeAcao {
  solicitacoesDeCancelamento: number;
  justificativas: number;
  chamadasNaoFinalizadas: number;
  cobrancasEmAtraso: number;
  /** Soma de tudo — se for zero, não há nada exigindo ação agora. */
  total: number;
}

/**
 * Bloco de pendências (RF-PNL-03). É a primeira coisa do painel
 * administrativo por decisão de UX do escopo: o que exige ação vem antes
 * dos indicadores, para que solicitação e justificativa não fiquem paradas.
 */
export async function pendenciasDeAcao(): Promise<PendenciasDeAcao> {
  const [solicitacoes, justificativas, cobrancas, pendentesDeChamada] = await Promise.all([
    solicitacaoCancelamentoRepositorio.listar(),
    justificativaRepositorio.listar(),
    cobrancaRepositorio.listar(),
    chamadasPendentes(),
  ]);

  const pendencias = {
    solicitacoesDeCancelamento: solicitacoes.filter((s) => s.situacao === 'pendente').length,
    justificativas: justificativas.filter((j) => j.situacao === 'pendente').length,
    chamadasNaoFinalizadas: pendentesDeChamada.length,
    cobrancasEmAtraso: cobrancas.filter((c) => c.situacao === 'atrasada' || c.situacao === 'falha').length,
  };

  return {
    ...pendencias,
    total:
      pendencias.solicitacoesDeCancelamento +
      pendencias.justificativas +
      pendencias.chamadasNaoFinalizadas +
      pendencias.cobrancasEmAtraso,
  };
}

export interface ContratoAVencer {
  contratoId: string;
  alunaId: string;
  nomeAluna: string;
  dataTermino: string;
  diasRestantes: number;
}

export interface IndicadoresAdministrativos {
  alunasAtivas: number;
  alunasInadimplentes: number;
  receitaRecebida: number;
  aReceber: number;
  aulasRealizadas: number;
  comissaoGerada: number;
  contratosAVencer: ContratoAVencer[];
}

/** Visão consolidada do período (RF-PNL-01). */
export async function indicadoresAdministrativos(periodo: PeriodoDeApuracao): Promise<IndicadoresAdministrativos> {
  const [alunas, usuarios, contratos, cobrancas, comissoes, agendamentos, ocorrencias] = await Promise.all([
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
    contratoRepositorio.listar(),
    cobrancaRepositorio.listar(),
    comissaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);

  const hoje = hojeISO();
  const limiteDeVencimento = somarDias(hoje, DIAS_DE_PROJECAO);

  const noPeriodo = (data: string | undefined) =>
    data !== undefined && data >= periodo.dataInicio && data <= periodo.dataFim;

  const receitaRecebida = cobrancas
    .filter((c) => c.situacao === 'paga' && noPeriodo(c.dataQuitacao))
    .reduce((soma, c) => soma + valorAtualizadoDaCobranca(c), 0);

  const aReceber = cobrancas
    .filter((c: Cobranca) => estaEmAberto(c))
    .reduce((soma, c) => soma + valorAtualizadoDaCobranca(c), 0);

  const datasDeOcorrencia = new Map(ocorrencias.map((o) => [o.id, o.data]));
  const aulasRealizadas = agendamentos.filter(
    (a) => a.situacao === 'realizado' && noPeriodo(datasDeOcorrencia.get(a.ocorrenciaSessaoId)),
  ).length;

  const comissaoGerada = comissoes.filter((c) => noPeriodo(c.dataAula)).reduce((soma, c) => soma + c.valor, 0);

  const contratosAVencer: ContratoAVencer[] = contratos
    .filter(
      (c) =>
        c.situacao !== 'encerrado' &&
        c.dataTerminoContrato >= hoje &&
        c.dataTerminoContrato <= limiteDeVencimento,
    )
    .map((contrato) => {
      const aluna = alunas.find((a) => a.id === contrato.alunaId);
      return {
        contratoId: contrato.id,
        alunaId: contrato.alunaId,
        nomeAluna: usuarios.find((u) => u.id === aluna?.usuarioId)?.nome ?? 'Aluna removida',
        dataTermino: contrato.dataTerminoContrato,
        diasRestantes: diferencaEmDias(hoje, contrato.dataTerminoContrato),
      };
    })
    .sort((a, b) => a.dataTermino.localeCompare(b.dataTermino));

  return {
    alunasAtivas: alunas.filter((a) => a.situacao === 'ativa').length,
    alunasInadimplentes: alunas.filter((a) => a.situacao === 'inadimplente').length,
    receitaRecebida,
    aReceber,
    aulasRealizadas,
    comissaoGerada,
    contratosAVencer,
  };
}

export type FaixaDeOcupacao = 'lotada' | 'saudavel' | 'baixa';

export interface OcupacaoDaSessao {
  sessaoId: string;
  modalidade: string;
  professora: string;
  horario: string;
  capacidade: number;
  /** Média de alunas por ocorrência na janela analisada. */
  mediaDeAlunas: number;
  percentual: number;
  ocorrenciasAnalisadas: number;
  faixa: FaixaDeOcupacao;
}

/**
 * Ocupação por sessão (RF-PNL-02).
 *
 * Olha as próximas ocorrências de cada sessão da grade e calcula a média de
 * alunas sobre a capacidade. Turma lotada indica candidata a nova turma;
 * baixa procura indica horário a promover — que é exatamente a decisão que
 * o escopo quer apoiar.
 */
export async function ocupacaoDasSessoes(dias = DIAS_DE_PROJECAO): Promise<OcupacaoDaSessao[]> {
  const [sessoes, ocorrencias, agendamentos, modalidades, professoras, usuarios] = await Promise.all([
    sessaoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  const hoje = hojeISO();
  const limite = somarDias(hoje, dias);

  return sessoes
    .filter((sessao) => sessao.situacao === 'ativo')
    .map((sessao) => {
      let ocorrenciasAnalisadas = 0;
      let totalDeAlunas = 0;

      for (let data = hoje; data <= limite; data = somarDias(data, 1)) {
        if (!sessaoOcorreEm(sessao, data)) continue;

        const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
        if (ocorrencia?.situacao === 'cancelada') continue;

        ocorrenciasAnalisadas += 1;
        totalDeAlunas += ocorrencia
          ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
          : 0;
      }

      const mediaDeAlunas = ocorrenciasAnalisadas === 0 ? 0 : totalDeAlunas / ocorrenciasAnalisadas;
      const percentual = sessao.capacidade === 0 ? 0 : Math.round((mediaDeAlunas / sessao.capacidade) * 100);
      const professora = professoras.find((p) => p.id === sessao.professoraId);

      return {
        sessaoId: sessao.id,
        modalidade: modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade removida',
        professora: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
        horario: `${sessao.horarioInicio}–${sessao.horarioFim}`,
        capacidade: sessao.capacidade,
        mediaDeAlunas: Math.round(mediaDeAlunas * 10) / 10,
        percentual,
        ocorrenciasAnalisadas,
        faixa: (percentual >= 100 ? 'lotada' : percentual >= 40 ? 'saudavel' : 'baixa') as FaixaDeOcupacao,
      };
    })
    .sort((a, b) => b.percentual - a.percentual);
}
