import {
  agendamentoRepositorio,
  alunaRepositorio,
  chamadaRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  registroAuditoriaRepositorio,
  registroPresencaRepositorio,
  reservaConvenioRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { Chamada, RegistroPresenca, Sessao } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../utils/data';
import { RegraNegocioError } from './useModalidades';
import { carteiraVigenteDaAluna, consumirReserva } from './carteiraDeCreditos';
import { garantirOcorrencia } from './cancelamentoDeAulas';
import { categoriaVigenteNaData, estornarComissaoDaChamada, lancarComissao } from './comissoes';

/**
 * Presença e chamada (M9).
 *
 * A chamada existe por ocorrência de sessão. Ela nasce aberta com todas as
 * alunas agendadas marcadas como presentes (RF-PRE-03) — a professora só
 * precisa apontar as ausências —, e ao ser finalizada consolida os
 * registros e gera a comissão da aula (RF-PRE-04).
 */

export interface AlunaNaChamada {
  agendamentoId: string;
  alunaId: string;
  nome: string;
  origemConvenio: boolean;
  /** RF-EXP-06: a aluna experimental aparece identificada como tal. */
  experimental: boolean;
  /**
   * RF-CNV-09: check-in do aplicativo do convênio já validado. Quando
   * falta, a professora ainda pode marcar presença (RF-CNV-10) — o
   * registro vale para o controle interno de ocupação e não gera repasse.
   */
  checkinConvenio: boolean;
  presente: boolean;
}

export async function prazoDeCorrecaoEmDias(): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const parametro = parametros.find((p) => p.chave === 'prazo_correcao_chamada_dias');
  const valor = Number(parametro?.valor);
  return Number.isFinite(valor) ? valor : 3;
}

/**
 * A professora pode editar a chamada enquanto estiver dentro do prazo
 * configurado (RF-PRE-05/06). Fora dele, só a administração ajusta, com
 * justificativa registrada.
 */
export async function podeProfessoraEditar(dataAula: string): Promise<{ pode: boolean; prazoDias: number }> {
  const prazoDias = await prazoDeCorrecaoEmDias();
  const diasDecorridos = diferencaEmDias(dataAula, hojeISO());
  return { pode: diasDecorridos >= 0 && diasDecorridos <= prazoDias, prazoDias };
}

/**
 * Carrega a chamada de uma aula para exibição — **sem gravar nada**.
 *
 * Abrir a tela não pode criar registro: além de ser efeito colateral
 * indevido numa leitura, o React executa o efeito duas vezes em
 * desenvolvimento (StrictMode), o que duplicaria a chamada e deixaria a
 * tela segurando um id que o banco talvez nem tenha. A chamada só nasce
 * quando a professora finaliza — aí é ação explícita dela.
 *
 * `chamada` volta indefinida quando a aula ainda não teve chamada aberta.
 */
export async function carregarChamada(params: {
  sessao: Sessao;
  data: string;
}): Promise<{ chamada: Chamada | undefined; alunas: AlunaNaChamada[] }> {
  const { sessao, data } = params;

  const [ocorrencias, chamadas, agendamentos, registros, reservas, { alunasPorId }] = await Promise.all([
    ocorrenciaSessaoRepositorio.listar(),
    chamadaRepositorio.listar(),
    agendamentoRepositorio.listar(),
    registroPresencaRepositorio.listar(),
    reservaConvenioRepositorio.listar(),
    carregarNomesDeAlunas(),
  ]);

  const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
  if (ocorrencia?.situacao === 'cancelada') {
    throw new RegraNegocioError('Esta aula foi cancelada — não há chamada a fazer.');
  }

  // Sem ocorrência materializada não há agendamento nenhum: nada a chamar.
  if (!ocorrencia) return { chamada: undefined, alunas: [] };

  const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === ocorrencia.id);

  // RF-PRE-02: só quem tem agendamento válido aparece; quem cancelou, não.
  const daOcorrencia = agendamentos.filter(
    (a) => a.ocorrenciaSessaoId === ocorrencia.id && (a.situacao === 'ativo' || a.situacao === 'realizado'),
  );

  const alunas: AlunaNaChamada[] = daOcorrencia.map((agendamento) => {
    const registro = chamada
      ? registros.find((r) => r.chamadaId === chamada.id && r.alunaId === agendamento.alunaId)
      : undefined;
    const dados = alunasPorId[agendamento.alunaId];
    const reserva = reservas.find(
      (r) => r.ocorrenciaSessaoId === ocorrencia.id && r.alunaId === agendamento.alunaId && r.situacao === 'confirmada',
    );
    return {
      agendamentoId: agendamento.id,
      alunaId: agendamento.alunaId,
      nome: dados?.nome ?? 'Aluna removida',
      origemConvenio: dados?.origemConvenio ?? false,
      experimental: agendamento.experimental,
      checkinConvenio: reserva?.checkinValidado ?? false,
      // RF-PRE-03: presente por padrão até alguém dizer o contrário.
      presente: registro ? registro.situacao === 'presente' : true,
    };
  });

  return { chamada, alunas: alunas.sort((a, b) => a.nome.localeCompare(b.nome)) };
}

/**
 * Busca a chamada da aula, criando-a se ainda não existir. Chamada só a
 * partir de uma ação explícita (finalizar/corrigir), nunca no
 * carregamento da tela.
 *
 * Resolver sempre pela ocorrência, e não por um id guardado na tela,
 * também torna a operação segura se a página estiver aberta desde antes
 * de um "Resetar protótipo".
 */
async function garantirChamada(sessao: Sessao, data: string): Promise<Chamada> {
  const ocorrencia = await garantirOcorrencia(sessao, data);
  if (ocorrencia.situacao === 'cancelada') {
    throw new RegraNegocioError('Esta aula foi cancelada — não há chamada a fazer.');
  }

  const chamadas = await chamadaRepositorio.listar();
  const existente = chamadas.find((c) => c.ocorrenciaSessaoId === ocorrencia.id);
  if (existente) return existente;

  return chamadaRepositorio.criar({
    ocorrenciaSessaoId: ocorrencia.id,
    // Quem conduziu a aula, não quem é titular da sessão: é essa
    // professora que recebe a comissão (RF-COM-03).
    professoraId: ocorrencia.professoraEfetivaId,
    situacao: 'aberta',
  });
}

async function carregarNomesDeAlunas(): Promise<{
  alunasPorId: Record<string, { nome: string; origemConvenio: boolean }>;
}> {
  const [alunas, usuarios] = await Promise.all([alunaRepositorio.listar(), usuarioRepositorio.listar()]);

  const alunasPorId: Record<string, { nome: string; origemConvenio: boolean }> = {};
  for (const aluna of alunas) {
    alunasPorId[aluna.id] = {
      nome: usuarios.find((u) => u.id === aluna.usuarioId)?.nome ?? 'Aluna removida',
      origemConvenio: aluna.origem === 'convenio',
    };
  }
  return { alunasPorId };
}

export interface ResultadoFinalizacao {
  valorComissao: number;
  presentes: number;
  ausentes: number;
  ehAjuste: boolean;
}

/**
 * Finaliza a chamada (RF-PRE-04): grava os registros de presença, marca os
 * agendamentos como realizados, **converte os créditos reservados em
 * utilizados** e lança a comissão da professora que conduziu a aula.
 */
export async function finalizarChamada(params: {
  sessao: Sessao;
  dataAula: string;
  alunas: AlunaNaChamada[];
  autorId: string;
}): Promise<ResultadoFinalizacao> {
  const { sessao, alunas, dataAula, autorId } = params;

  const chamada = await garantirChamada(sessao, dataAula);
  if (chamada.situacao === 'finalizada') {
    throw new RegraNegocioError('Esta chamada já foi finalizada. Use a correção para alterá-la.');
  }

  await gravarRegistrosDePresenca({ chamada, dataAula, alunas, autorId });

  await chamadaRepositorio.atualizar(chamada.id, {
    situacao: 'finalizada',
    dataHoraFinalizacao: new Date().toISOString(),
  });

  const { ehAjuste } = await lancarComissao({
    chamadaId: chamada.id,
    professoraId: chamada.professoraId,
    dataAula,
    autorId,
  });

  const categoria = await categoriaVigenteNaData(chamada.professoraId, dataAula);
  const presentes = alunas.filter((a) => a.presente).length;

  return {
    valorComissao: categoria?.valorPorAula ?? 0,
    presentes,
    ausentes: alunas.length - presentes,
    ehAjuste,
  };
}

async function gravarRegistrosDePresenca(params: {
  chamada: Chamada;
  dataAula: string;
  alunas: AlunaNaChamada[];
  autorId: string;
}): Promise<void> {
  const { chamada, dataAula, alunas, autorId } = params;
  const [registros, agendamentos] = await Promise.all([
    registroPresencaRepositorio.listar(),
    agendamentoRepositorio.listar(),
  ]);

  for (const aluna of alunas) {
    const situacao: RegistroPresenca['situacao'] = aluna.presente ? 'presente' : 'ausente';
    const existente = registros.find((r) => r.chamadaId === chamada.id && r.alunaId === aluna.alunaId);

    if (existente) {
      await registroPresencaRepositorio.atualizar(existente.id, { situacao, dataHora: new Date().toISOString() });
    } else {
      await registroPresencaRepositorio.criar({
        chamadaId: chamada.id,
        alunaId: aluna.alunaId,
        situacao,
        // O check-in vem validado do aplicativo do parceiro (RF-CNV-06). A
        // presença marcada aqui sem check-in vale para o controle interno
        // de ocupação e não gera repasse (RF-CNV-10).
        checkinConvenio: aluna.checkinConvenio,
        dataHora: new Date().toISOString(),
        autorId,
      });
    }

    // RF-CRE-05: presença confirmada e ausência sem justificativa aprovada
    // convertem a reserva em consumo. A conversão acontece uma única vez —
    // a correção da chamada reescreve a presença, mas não cobra de novo. O
    // crédito só volta por justificativa aprovada (RF-JUS-04).
    const agendamento = agendamentos.find((a) => a.id === aluna.agendamentoId);
    const jaConsumido = agendamento?.situacao === 'realizado';
    const creditos = agendamento?.creditosReservados ?? 0;

    if (agendamento && !jaConsumido && creditos > 0) {
      const carteira = await carteiraVigenteDaAluna(aluna.alunaId);
      if (carteira) {
        await consumirReserva({
          carteira,
          quantidade: creditos,
          origem: `Aula realizada em ${formatarDataBR(dataAula)}`,
          referenciaId: agendamento.id,
          autorId,
        });
      }
    }

    await agendamentoRepositorio.atualizar(aluna.agendamentoId, { situacao: 'realizado' });
  }
}

/**
 * Correção de chamada já finalizada (RF-PRE-05/06).
 *
 * Dentro do prazo, a própria professora corrige. Fora dele, só a
 * administração, e a justificativa é obrigatória — ela fica na trilha de
 * auditoria. Se a aula pertence a período já fechado, a comissão
 * recalculada entra como ajuste no período seguinte (RF-COM-10).
 */
export async function corrigirChamada(params: {
  sessao: Sessao;
  dataAula: string;
  alunas: AlunaNaChamada[];
  autorId: string;
  ehAdministracao: boolean;
  justificativa?: string;
}): Promise<ResultadoFinalizacao> {
  const { sessao, alunas, dataAula, autorId, ehAdministracao, justificativa } = params;

  const chamada = await garantirChamada(sessao, dataAula);
  const { pode, prazoDias } = await podeProfessoraEditar(dataAula);
  if (!pode && !ehAdministracao) {
    throw new RegraNegocioError(
      `O prazo de ${prazoDias} dias para corrigir esta chamada já passou. Peça o ajuste à administração.`,
    );
  }
  if (!pode && ehAdministracao && !justificativa?.trim()) {
    throw new RegraNegocioError('Registre a justificativa do ajuste fora do prazo.');
  }

  await gravarRegistrosDePresenca({ chamada, dataAula, alunas, autorId });

  // A comissão é recalculada do zero: estorna a anterior (se ainda não foi
  // paga) e lança de novo pela categoria vigente na data da aula.
  await estornarComissaoDaChamada(chamada.id);
  const { ehAjuste } = await lancarComissao({
    chamadaId: chamada.id,
    professoraId: chamada.professoraId,
    dataAula,
    autorId,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Chamada',
    operacao: ehAdministracao && !pode ? 'correcao_fora_do_prazo' : 'correcao_de_chamada',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      chamadaId: chamada.id,
      dataAula,
      presentes: alunas.filter((a) => a.presente).map((a) => a.nome),
      ausentes: alunas.filter((a) => !a.presente).map((a) => a.nome),
      justificativa: justificativa?.trim(),
    },
  });

  for (const aluna of alunas.filter((a) => !a.presente)) {
    await notificar({
      destinatario: { tipo: 'aluna', id: aluna.alunaId },
      evento: 'presenca_corrigida',
      conteudo: `A chamada da aula de ${formatarDataBR(dataAula)} foi corrigida e você consta como ausente. Se houver um motivo, você pode enviar uma justificativa.`,
    });
  }

  const categoria = await categoriaVigenteNaData(chamada.professoraId, dataAula);
  const presentes = alunas.filter((a) => a.presente).length;

  return {
    valorComissao: categoria?.valorPorAula ?? 0,
    presentes,
    ausentes: alunas.length - presentes,
    ehAjuste,
  };
}

/**
 * Ocorrências passadas com aluna agendada e chamada ainda não finalizada
 * (RF-PRE-08). Usada para sinalizar pendência nos dois painéis.
 */
export async function chamadasPendentes(params: { professoraId?: string } = {}): Promise<
  Array<{ sessaoId: string; data: string; professoraId: string; alunas: number }>
> {
  const [ocorrencias, chamadas, agendamentos, sessoes] = await Promise.all([
    ocorrenciaSessaoRepositorio.listar(),
    chamadaRepositorio.listar(),
    agendamentoRepositorio.listar(),
    sessaoRepositorio.listar(),
  ]);

  const hoje = hojeISO();
  const pendentes: Array<{ sessaoId: string; data: string; professoraId: string; alunas: number }> = [];

  for (const ocorrencia of ocorrencias) {
    if (ocorrencia.data >= hoje || ocorrencia.situacao === 'cancelada') continue;
    if (params.professoraId && ocorrencia.professoraEfetivaId !== params.professoraId) continue;

    const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === ocorrencia.id);
    if (chamada?.situacao === 'finalizada') continue;

    const alunas = agendamentos.filter(
      (a) => a.ocorrenciaSessaoId === ocorrencia.id && (a.situacao === 'ativo' || a.situacao === 'realizado'),
    ).length;
    if (alunas === 0) continue;

    if (sessoes.some((s) => s.id === ocorrencia.sessaoId)) {
      pendentes.push({
        sessaoId: ocorrencia.sessaoId,
        data: ocorrencia.data,
        professoraId: ocorrencia.professoraEfetivaId,
        alunas,
      });
    }
  }

  return pendentes.sort((a, b) => a.data.localeCompare(b.data));
}
