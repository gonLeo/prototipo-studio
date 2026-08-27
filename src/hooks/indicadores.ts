import {
  agendamentoRepositorio,
  alunaRepositorio,
  carteiraRepositorio,
  comissaoRepositorio,
  justificativaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  solicitacaoCancelamentoRepositorio,
  usuarioRepositorio,
  vendaRepositorio,
} from '../services/repositorios';
import { hojeISO, somarDias } from '../utils/data';
import { lerCarteira } from '../utils/creditos';
import { sessaoOcorreEm } from '../utils/grade';
import { chamadasPendentes } from './chamadaDeAulas';
import { limiaresFinalizando } from './carteiraDeCreditos';
import type { PeriodoDeApuracao } from './comissoes';

/**
 * Painéis e indicadores (M14).
 *
 * Leitura pura: nada aqui grava. Os números saem dos mesmos registros que
 * as telas de operação usam, para que painel e listagem nunca divirjam.
 */

/** Janela usada na projeção de ocupação. */
const DIAS_DE_PROJECAO = 30;

export interface PendenciasDeAcao {
  solicitacoesDeCancelamento: number;
  justificativas: number;
  chamadasNaoFinalizadas: number;
  vendasPendentes: number;
  /** Soma de tudo — se for zero, não há nada exigindo ação agora. */
  total: number;
}

/**
 * Bloco de pendências (RF-PNL-03). É a primeira coisa do painel
 * administrativo por decisão de UX do escopo: o que exige ação vem antes
 * dos indicadores, para que solicitação e justificativa não fiquem paradas.
 */
export async function pendenciasDeAcao(): Promise<PendenciasDeAcao> {
  const [solicitacoes, justificativas, vendas, pendentesDeChamada] = await Promise.all([
    solicitacaoCancelamentoRepositorio.listar(),
    justificativaRepositorio.listar(),
    vendaRepositorio.listar(),
    chamadasPendentes(),
  ]);

  const pendencias = {
    solicitacoesDeCancelamento: solicitacoes.filter((s) => s.situacao === 'pendente').length,
    justificativas: justificativas.filter((j) => j.situacao === 'pendente').length,
    chamadasNaoFinalizadas: pendentesDeChamada.length,
    vendasPendentes: vendas.filter((v) => v.situacao === 'pendente').length,
  };

  return {
    ...pendencias,
    total:
      pendencias.solicitacoesDeCancelamento +
      pendencias.justificativas +
      pendencias.chamadasNaoFinalizadas +
      pendencias.vendasPendentes,
  };
}

export interface PacoteAVencer {
  carteiraId: string;
  alunaId: string;
  nomeAluna: string;
  dataValidade: string;
  diasRestantes: number;
  creditosDisponiveis: number;
  /** Por que a carteira está em "Finalizando": poucos créditos ou vencimento próximo. */
  motivo: 'poucos_creditos' | 'vencimento_proximo';
}

export interface CreditosEmCirculacao {
  vendidos: number;
  utilizados: number;
  reservados: number;
  disponiveis: number;
}

export interface IndicadoresAdministrativos {
  alunasComPacoteAtivo: number;
  alunasSemPacoteAtivo: number;
  alunasBolsistas: number;
  receitaConfirmada: number;
  receitaPendente: number;
  /** Valor de tabela não faturado nas bolsas concedidas (RF-BOL-08). */
  isentoPorBolsa: number;
  aulasRealizadas: number;
  comissaoGerada: number;
  creditosEmCirculacao: CreditosEmCirculacao;
  pacotesAVencer: PacoteAVencer[];
}

/** Visão consolidada do período (RF-PNL-01). */
export async function indicadoresAdministrativos(periodo: PeriodoDeApuracao): Promise<IndicadoresAdministrativos> {
  const [alunas, usuarios, carteiras, vendas, pacotes, comissoes, agendamentos, ocorrencias, limiares] =
    await Promise.all([
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
    carteiraRepositorio.listar(),
    vendaRepositorio.listar(),
    pacoteRepositorio.listar(),
    comissaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    limiaresFinalizando(),
  ]);

  const hoje = hojeISO();

  const noPeriodo = (data: string | undefined) =>
    data !== undefined && data >= periodo.dataInicio && data <= periodo.dataFim;

  const vendasDoPeriodo = vendas.filter((v) => noPeriodo(v.data));
  const receitaConfirmada = vendasDoPeriodo
    .filter((v) => v.situacao === 'confirmada' && !v.bolsa)
    .reduce((soma, v) => soma + v.valor, 0);
  const receitaPendente = vendasDoPeriodo
    .filter((v) => v.situacao === 'pendente')
    .reduce((soma, v) => soma + v.valor, 0);

  const datasDeOcorrencia = new Map(ocorrencias.map((o) => [o.id, o.data]));
  const aulasRealizadas = agendamentos.filter(
    (a) => a.situacao === 'realizado' && noPeriodo(datasDeOcorrencia.get(a.ocorrenciaSessaoId)),
  ).length;

  const comissaoGerada = comissoes.filter((c) => noPeriodo(c.dataAula)).reduce((soma, c) => soma + c.valor, 0);

  // Carteira vigente é a que está ativa e ainda não venceu — a situação é
  // derivada, e não lida do registro, para o painel não depender de a
  // rotina de carteiras ter rodado (RF-CRE-10).
  const vigentes = carteiras.filter((c) => c.situacao === 'ativa' && !lerCarteira(c, hoje, limiares).encerrada);
  const alunasComCarteira = new Set(vigentes.map((c) => c.alunaId));

  const creditosEmCirculacao: CreditosEmCirculacao = {
    vendidos: vigentes.reduce((soma, c) => soma + c.creditosTotais, 0),
    utilizados: vigentes.reduce((soma, c) => soma + c.creditosUtilizados, 0),
    reservados: vigentes.reduce((soma, c) => soma + c.creditosReservados, 0),
    disponiveis: vigentes.reduce((soma, c) => soma + lerCarteira(c, hoje, limiares).disponiveis, 0),
  };

  // REL-02: carteiras com validade próxima ou poucos créditos, para ação
  // de renovação. É o mesmo limiar que dispara o status Finalizando.
  const pacotesAVencer: PacoteAVencer[] = vigentes
    .map((carteira) => ({ carteira, leitura: lerCarteira(carteira, hoje, limiares) }))
    .filter(({ leitura }) => leitura.motivoFinalizando !== undefined)
    .map(({ carteira, leitura }) => {
      const aluna = alunas.find((a) => a.id === carteira.alunaId);
      return {
        carteiraId: carteira.id,
        alunaId: carteira.alunaId,
        nomeAluna: usuarios.find((u) => u.id === aluna?.usuarioId)?.nome ?? 'Aluna removida',
        dataValidade: carteira.dataValidade,
        diasRestantes: leitura.diasParaVencer,
        creditosDisponiveis: leitura.disponiveis,
        motivo: leitura.motivoFinalizando!,
      };
    })
    .sort((a, b) => a.dataValidade.localeCompare(b.dataValidade));

  const bolsistas = alunas.filter((a) => a.bolsista);

  // RF-BOL-08: o valor mensal não faturado é o preço de tabela do pacote
  // concedido, que na venda de bolsa fica registrado como zero.
  const isentoPorBolsa = vendasDoPeriodo
    .filter((v) => v.bolsa)
    .reduce((soma, v) => soma + (pacotes.find((p) => p.id === v.pacoteId)?.valor ?? 0), 0);

  return {
    alunasComPacoteAtivo: alunasComCarteira.size,
    alunasSemPacoteAtivo: alunas.filter((a) => a.origem === 'direta' && !alunasComCarteira.has(a.id)).length,
    alunasBolsistas: bolsistas.length,
    receitaConfirmada,
    receitaPendente,
    isentoPorBolsa,
    aulasRealizadas,
    comissaoGerada,
    creditosEmCirculacao,
    pacotesAVencer,
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
