import {
  aulaExcepcionalRepositorio,
  categoriaProfessoraRepositorio,
  chamadaRepositorio,
  comissaoRepositorio,
  fechamentoComissaoRepositorio,
  historicoCategoriaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { CategoriaProfessora, Comissao, FechamentoComissao } from '../types/domain';
import { hojeISO, primeiroDiaDoMes, quintoDiaUtil, ultimoDiaDoMes } from '../utils/data';
import { RegraNegocioError } from './useModalidades';
import { formatarMoeda } from '../utils/creditos';

/**
 * Comissão e fechamento (M11).
 *
 * A comissão nasce na finalização da chamada (M10) e é atribuída a quem
 * **conduziu** a aula — em caso de substituição, à substituta (RF-COM-04),
 * o que já vem resolvido pela `professoraEfetivaId` da ocorrência.
 */

export interface PeriodoDeApuracao {
  ano: number;
  /** 0-11. */
  mes: number;
  dataInicio: string;
  dataFim: string;
}

/** RF-COM-05: apuração mensal, do primeiro ao último dia do mês. */
export function periodoDoMes(ano: number, mes: number): PeriodoDeApuracao {
  return {
    ano,
    mes,
    dataInicio: primeiroDiaDoMes(ano, mes),
    dataFim: ultimoDiaDoMes(ano, mes),
  };
}

export function periodoAtual(): PeriodoDeApuracao {
  const hoje = hojeISO();
  return periodoDoMes(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1);
}

/** Data prevista de pagamento: quinto dia útil do mês seguinte ao apurado. */
export function dataPrevistaDePagamento(periodo: PeriodoDeApuracao): string {
  const mesSeguinte = periodo.mes === 11 ? 0 : periodo.mes + 1;
  const ano = periodo.mes === 11 ? periodo.ano + 1 : periodo.ano;
  return quintoDiaUtil(ano, mesSeguinte);
}

/**
 * Categoria vigente de uma professora **na data da aula** (RF-COM-01).
 *
 * Usa o histórico de categoria, não a categoria atual: se a professora
 * mudou de categoria depois, a aula antiga continua valendo o que valia
 * quando foi dada — é isso que torna a troca de categoria não retroativa
 * (RF-PRO-03).
 */
export async function categoriaVigenteNaData(
  professoraId: string,
  data: string,
): Promise<CategoriaProfessora | undefined> {
  const [historico, categorias, professoras] = await Promise.all([
    historicoCategoriaRepositorio.listar(),
    categoriaProfessoraRepositorio.listar(),
    professoraRepositorio.listar(),
  ]);

  const vigencias = historico
    .filter((h) => h.professoraId === professoraId && h.dataInicioVigencia <= data)
    .sort((a, b) => b.dataInicioVigencia.localeCompare(a.dataInicioVigencia));

  const categoriaId = vigencias[0]?.categoriaId ?? professoras.find((p) => p.id === professoraId)?.categoriaId;
  return categorias.find((c) => c.id === categoriaId);
}

/**
 * Fechamento que cobre uma data, se existir. Serve para saber se uma
 * correção cai em período já fechado (RF-COM-11).
 */
export async function fechamentoQueCobre(data: string): Promise<FechamentoComissao | undefined> {
  const fechamentos = await fechamentoComissaoRepositorio.listar();
  return fechamentos.find((f) => f.dataInicio <= data && data <= f.dataFim && f.situacao !== 'aberto');
}

/**
 * Lança a comissão de uma **aula regular** (RF-COM-01): usa o valor por
 * aula da categoria vigente da professora na data.
 *
 * **Sessão sem nenhuma presença não gera comissão** (RF-COM-03). A decisão
 * sobre eventual pagamento é da administração, que vê a aula destacada no
 * fechamento por `sessoesSemPresencaNoPeriodo`. Gerar o lançamento e
 * esperar que alguém o remova depois inverteria o requisito: o padrão
 * passaria a ser pagar.
 *
 * Quando a data já pertence a um período fechado, o lançamento entra como
 * **ajuste** e fica sem período: ele será absorvido pelo próximo
 * fechamento, preservando o anterior (RF-COM-11).
 */
export async function lancarComissao(params: {
  chamadaId: string;
  professoraId: string;
  dataAula: string;
  presencas: number;
  autorId: string;
}): Promise<{ comissao: Comissao | undefined; ehAjuste: boolean; semPresencas: boolean }> {
  const { chamadaId, professoraId, dataAula, presencas, autorId } = params;

  const categoria = await categoriaVigenteNaData(professoraId, dataAula);
  if (!categoria) {
    throw new RegraNegocioError(
      'Não há categoria vigente para esta professora na data da aula — verifique o cadastro dela.',
    );
  }

  const existentes = await comissaoRepositorio.listar();
  const jaLancada = existentes.find((c) => c.chamadaId === chamadaId && c.situacao === 'gerada');
  if (jaLancada) return { comissao: jaLancada, ehAjuste: false, semPresencas: false };

  // RF-COM-03: ninguém compareceu, não há comissão a gerar.
  if (presencas === 0) {
    return { comissao: undefined, ehAjuste: false, semPresencas: true };
  }

  const fechamento = await fechamentoQueCobre(dataAula);
  const ehAjuste = fechamento !== undefined;

  const comissao = await comissaoRepositorio.criar({
    chamadaId,
    professoraId,
    categoriaAplicadaId: categoria.id,
    // O nome da categoria já costuma trazer a palavra ("Categoria I"), então
    // prefixar de novo produziria "Categoria Categoria I" na conferência.
    baseDeCalculo: `${categoria.nome} — ${formatarMoeda(categoria.valorPorAula)} por aula regular`,
    valor: categoria.valorPorAula,
    dataAula,
    presencas,
    situacao: ehAjuste ? 'ajuste' : 'gerada',
  });

  if (ehAjuste) {
    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'Comissao',
      operacao: 'ajuste_em_periodo_fechado',
      autorId,
      dataHora: new Date().toISOString(),
      valorNovo: { chamadaId, dataAula, valor: categoria.valorPorAula, fechamentoAnterior: fechamento?.id },
    });
  }

  return { comissao, ehAjuste, semPresencas: false };
}

/**
 * Lança as comissões de uma **aula excepcional** (RF-COM-01, RF-AEX-12).
 *
 * Não usa a categoria da professora: o valor é o que foi informado para
 * cada uma no cadastro da aula. São tantos lançamentos quantas forem as
 * professoras vinculadas — e aula sem professora vinculada não gera
 * comissão nenhuma.
 *
 * A regra do RF-COM-03 — sessão sem presenças não gera comissão — **não
 * se aplica aqui**. Ela fala de "sessão", que no escopo é a aula da grade
 * recorrente (M5), e o RF-AEX-12 condiciona o lançamento da excepcional à
 * finalização da chamada, não ao comparecimento: o valor foi combinado
 * individualmente para aquela aula, que a professora conduziu.
 */
export async function lancarComissoesDaAulaExcepcional(params: {
  chamadaId: string;
  aulaExcepcionalId: string;
  nomeAula: string;
  professoras: Array<{ professoraId: string; valorComissao: number }>;
  dataAula: string;
  presencas: number;
  autorId: string;
}): Promise<{ comissoes: Comissao[]; ehAjuste: boolean }> {
  const { chamadaId, aulaExcepcionalId, nomeAula, professoras, dataAula, presencas, autorId } = params;

  const existentes = await comissaoRepositorio.listar();
  const jaLancadas = existentes.filter((c) => c.chamadaId === chamadaId);
  if (jaLancadas.length > 0) return { comissoes: jaLancadas, ehAjuste: false };

  const fechamento = await fechamentoQueCobre(dataAula);
  const ehAjuste = fechamento !== undefined;

  const comissoes: Comissao[] = [];

  for (const vinculo of professoras) {
    if (vinculo.valorComissao <= 0) continue;

    comissoes.push(
      await comissaoRepositorio.criar({
        chamadaId,
        professoraId: vinculo.professoraId,
        aulaExcepcionalId,
        baseDeCalculo: `Valor informado no cadastro de "${nomeAula}" — ${formatarMoeda(vinculo.valorComissao)}`,
        valor: vinculo.valorComissao,
        dataAula,
        presencas,
        situacao: ehAjuste ? 'ajuste' : 'gerada',
      }),
    );
  }

  if (ehAjuste && comissoes.length > 0) {
    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'Comissao',
      operacao: 'ajuste_em_periodo_fechado',
      autorId,
      dataHora: new Date().toISOString(),
      valorNovo: { chamadaId, dataAula, aulaExcepcionalId, lancamentos: comissoes.length },
    });
  }

  return { comissoes, ehAjuste };
}

/* ------------------------------------------------------------------ */
/* Detalhamento e conferência (RF-COM-08, REL-07)                       */
/* ------------------------------------------------------------------ */

export type TipoDeAulaDaComissao = 'regular' | 'excepcional';

export interface LinhaDeComissao extends Comissao {
  tipoDeAula: TipoDeAulaDaComissao;
  descricaoAula: string;
  nomeProfessora: string;
}

/**
 * Descreve cada lançamento para conferência antes do pagamento
 * (RF-COM-08), separando aula regular de aula excepcional (REL-07).
 *
 * A descrição sai daqui, e não da tela, porque as duas origens são
 * resolvidas por caminhos diferentes — a regular pela ocorrência de
 * sessão, a excepcional pelo cadastro da aula — e a tela que só conhecia
 * o primeiro exibia a excepcional como "Aula ·", sem nome nem horário.
 */
export async function detalharComissoes(comissoes: Comissao[]): Promise<LinhaDeComissao[]> {
  const [chamadas, ocorrencias, sessoes, modalidades, excepcionais, professoras, usuarios] = await Promise.all([
    chamadaRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    sessaoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    aulaExcepcionalRepositorio.listar(),
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  return comissoes.map((comissao) => {
    const professora = professoras.find((p) => p.id === comissao.professoraId);
    const nomeProfessora = usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida';

    if (comissao.aulaExcepcionalId) {
      const aula = excepcionais.find((a) => a.id === comissao.aulaExcepcionalId);
      return {
        ...comissao,
        tipoDeAula: 'excepcional' as const,
        descricaoAula: aula ? `${aula.nome} · ${aula.horarioInicio}` : 'Aula excepcional removida',
        nomeProfessora,
      };
    }

    const chamada = chamadas.find((c) => c.id === comissao.chamadaId);
    const ocorrencia = ocorrencias.find((o) => o.id === chamada?.ocorrenciaSessaoId);
    const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
    const modalidade = modalidades.find((m) => m.id === sessao?.modalidadeId);

    return {
      ...comissao,
      tipoDeAula: 'regular' as const,
      descricaoAula: sessao ? `${modalidade?.nome ?? 'Modalidade'} · ${sessao.horarioInicio}` : 'Aula removida',
      nomeProfessora,
    };
  });
}

export interface SessaoSemPresenca {
  chamadaId: string;
  sessaoId: string;
  data: string;
  descricaoAula: string;
  professoraId: string;
  nomeProfessora: string;
  /** Quantas alunas estavam agendadas e não compareceram. */
  ausencias: number;
}

/**
 * Sessões finalizadas no período **sem nenhuma presença** (RF-COM-03).
 *
 * Elas não geraram comissão, e por isso não aparecem em lugar nenhum do
 * fechamento — a professora esteve no studio e a aula sumiria da
 * conferência. Ficam destacadas para a administração decidir sobre
 * pagamento manual.
 *
 * A aula excepcional fica de fora: ela gera comissão independentemente de
 * presença (ver `lancarComissoesDaAulaExcepcional`).
 */
export async function sessoesSemPresencaNoPeriodo(periodo: PeriodoDeApuracao): Promise<SessaoSemPresenca[]> {
  const [chamadas, registros, ocorrencias, sessoes, modalidades, professoras, usuarios] = await Promise.all([
    chamadaRepositorio.listar(),
    registroPresencaRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    sessaoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  const linhas: SessaoSemPresenca[] = [];

  for (const chamada of chamadas) {
    if (chamada.situacao !== 'finalizada' || !chamada.ocorrenciaSessaoId) continue;

    const ocorrencia = ocorrencias.find((o) => o.id === chamada.ocorrenciaSessaoId);
    if (!ocorrencia || ocorrencia.data < periodo.dataInicio || ocorrencia.data > periodo.dataFim) continue;

    const daChamada = registros.filter((r) => r.chamadaId === chamada.id);
    if (daChamada.length === 0 || daChamada.some((r) => r.situacao === 'presente')) continue;

    const sessao = sessoes.find((s) => s.id === ocorrencia.sessaoId);
    const professoraId = chamada.professoraId ?? ocorrencia.professoraEfetivaId;
    const professora = professoras.find((p) => p.id === professoraId);

    linhas.push({
      chamadaId: chamada.id,
      sessaoId: ocorrencia.sessaoId,
      data: ocorrencia.data,
      descricaoAula: sessao
        ? `${modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade'} · ${sessao.horarioInicio}`
        : 'Aula removida',
      professoraId: professoraId ?? '',
      nomeProfessora: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
      ausencias: daChamada.length,
    });
  }

  return linhas.sort((a, b) => a.data.localeCompare(b.data));
}

/** Remove a comissão de uma chamada que deixou de ser válida (chamada reaberta). */
export async function estornarComissaoDaChamada(chamadaId: string): Promise<void> {
  const comissoes = await comissaoRepositorio.listar();
  for (const comissao of comissoes.filter((c) => c.chamadaId === chamadaId && !c.periodoFechamentoId)) {
    await comissaoRepositorio.remover(comissao.id);
  }
}

export interface TotalPorProfessora {
  professoraId: string;
  nome: string;
  aulas: number;
  total: number;
  comissoes: Comissao[];
}

/**
 * Comissões em aberto de um período: as geradas dentro dele mais os
 * ajustes de períodos já fechados que ainda não foram pagos.
 */
export async function comissoesEmAberto(periodo: PeriodoDeApuracao): Promise<Comissao[]> {
  const comissoes = await comissaoRepositorio.listar();
  return comissoes.filter((comissao) => {
    if (comissao.periodoFechamentoId) return false;
    if (comissao.situacao === 'ajuste') return true;
    return comissao.dataAula >= periodo.dataInicio && comissao.dataAula <= periodo.dataFim;
  });
}

/** Fecha o período (RF-COM-07): vincula as comissões e trava novos lançamentos. */
export async function fecharPeriodo(params: {
  periodo: PeriodoDeApuracao;
  autorId: string;
}): Promise<FechamentoComissao> {
  const { periodo, autorId } = params;

  const fechamentos = await fechamentoComissaoRepositorio.listar();
  if (fechamentos.some((f) => f.dataInicio === periodo.dataInicio && f.situacao !== 'aberto')) {
    throw new RegraNegocioError('Este período já foi fechado.');
  }

  const emAberto = await comissoesEmAberto(periodo);
  if (emAberto.length === 0) {
    throw new RegraNegocioError('Não há comissões a fechar neste período.');
  }

  const totalGeral = emAberto.reduce((soma, comissao) => soma + comissao.valor, 0);

  const fechamento = await fechamentoComissaoRepositorio.criar({
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    totalGeral,
    situacao: 'fechado',
    dataFechamento: hojeISO(),
    autorId,
  });

  for (const comissao of emAberto) {
    await comissaoRepositorio.atualizar(comissao.id, { periodoFechamentoId: fechamento.id });
  }

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'FechamentoComissao',
    operacao: 'fechamento_de_periodo',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { periodo: `${periodo.dataInicio} a ${periodo.dataFim}`, totalGeral, comissoes: emAberto.length },
  });

  return fechamento;
}

/** RF-COM-09: registra o pagamento do período fechado. */
export async function marcarFechamentoComoPago(params: {
  fechamento: FechamentoComissao;
  /** Nome do arquivo do comprovante de transferência (RF-COM-09). Opcional. */
  comprovante?: string;
  autorId: string;
}): Promise<void> {
  const { fechamento, comprovante, autorId } = params;

  if (fechamento.situacao === 'pago') throw new RegraNegocioError('Este fechamento já está marcado como pago.');
  if (fechamento.situacao === 'aberto') throw new RegraNegocioError('Feche o período antes de registrar o pagamento.');

  await fechamentoComissaoRepositorio.atualizar(fechamento.id, {
    situacao: 'pago',
    dataPagamento: hojeISO(),
    // Mesmo tratamento do anexo da justificativa: guardamos o nome
    // informado como referência, e o upload fica para a API real.
    comprovante: comprovante?.trim() ? `anexo-simulado://${comprovante.trim()}` : undefined,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'FechamentoComissao',
    operacao: 'registro_de_pagamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { fechamentoId: fechamento.id, dataPagamento: hojeISO(), comprovante: comprovante?.trim() },
  });
}

/** Nome do arquivo do comprovante, sem o prefixo do anexo simulado. */
export function nomeDoComprovante(fechamento: FechamentoComissao): string | undefined {
  return fechamento.comprovante?.replace('anexo-simulado://', '');
}
