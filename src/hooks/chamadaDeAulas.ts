import {
  agendamentoRepositorio,
  alunaRepositorio,
  chamadaRepositorio,
  justificativaRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  registroAuditoriaRepositorio,
  registroPresencaRepositorio,
  reservaConvenioRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { AulaExcepcional, Chamada, RegistroPresenca, Sessao } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../utils/data';
import { RegraNegocioError } from './useModalidades';
import { carteiraVigenteDaAluna, consumirDireto, consumirReserva } from './carteiraDeCreditos';
import { garantirOcorrencia } from './cancelamentoDeAulas';
import {
  categoriaVigenteNaData,
  estornarComissaoDaChamada,
  lancarComissao,
  lancarComissoesDaAulaExcepcional,
} from './comissoes';
import { alocacoesDaAula, professorasDaAula } from './aulasExcepcionais';

/**
 * Presença e chamada (M10).
 *
 * A chamada existe por ocorrência de sessão **ou** por aula excepcional
 * (RF-AEX-10). Ela nasce aberta com todas as participantes marcadas como
 * presentes (RF-PRE-03) — quem conduz só precisa apontar as ausências —, e
 * ao ser finalizada consolida os registros e gera a comissão (RF-PRE-04).
 */

export interface AlunaNaChamada {
  /**
   * Identificador da linha na lista: o id da aluna, ou o da alocação
   * quando a participante não tem cadastro (RF-AEX-06). É por ele que a
   * tela alterna a presença.
   */
  chave: string;
  /** Preenchido na aula da grade; ausente na aula excepcional. */
  agendamentoId?: string;
  /** Preenchido na aula excepcional; ausente na aula da grade. */
  alocacaoId?: string;
  /** Ausente para participante sem cadastro. */
  alunaId?: string;
  /** Telefone da participante sem cadastro, o único contato que existe dela. */
  telefone?: string;
  semCadastro: boolean;
  nome: string;
  origemConvenio: boolean;
  /** RF-EXP-06: a aluna experimental aparece identificada como tal. */
  experimental: boolean;
  /**
   * RF-CNV-10: check-in do aplicativo do convênio já validado. Quando
   * falta, a professora ainda pode marcar presença (RF-CNV-11) — o
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
      chave: agendamento.alunaId,
      semCadastro: false,
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
    // professora que recebe a comissão (RF-COM-04).
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
  /** RF-COM-03: ninguém compareceu, então nenhuma comissão foi gerada. */
  semPresencas: boolean;
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

  const professoraId = chamada.professoraId;
  if (!professoraId) {
    throw new RegraNegocioError('Esta chamada não tem professora vinculada.');
  }

  const presentes = alunas.filter((a) => a.presente).length;

  const { ehAjuste, semPresencas } = await lancarComissao({
    chamadaId: chamada.id,
    professoraId,
    dataAula,
    presencas: presentes,
    autorId,
  });

  const categoria = await categoriaVigenteNaData(professoraId, dataAula);

  return {
    valorComissao: semPresencas ? 0 : (categoria?.valorPorAula ?? 0),
    presentes,
    ausentes: alunas.length - presentes,
    ehAjuste,
    semPresencas,
  };
}

async function gravarRegistrosDePresenca(params: {
  chamada: Chamada;
  dataAula: string;
  alunas: AlunaNaChamada[];
  autorId: string;
}): Promise<void> {
  const { chamada, dataAula, alunas, autorId } = params;
  const [registros, agendamentos, justificativas] = await Promise.all([
    registroPresencaRepositorio.listar(),
    agendamentoRepositorio.listar(),
    justificativaRepositorio.listar(),
  ]);

  for (const aluna of alunas) {
    const situacao: RegistroPresenca['situacao'] = aluna.presente ? 'presente' : 'ausente';
    // A participante sem cadastro não tem `alunaId`: o registro dela é
    // identificado pela alocação (RF-AEX-06).
    const existente = registros.find(
      (r) =>
        r.chamadaId === chamada.id &&
        (aluna.alunaId ? r.alunaId === aluna.alunaId : r.alocacaoId === aluna.alocacaoId),
    );

    if (existente) {
      await registroPresencaRepositorio.atualizar(existente.id, { situacao, dataHora: new Date().toISOString() });
    } else {
      await registroPresencaRepositorio.criar({
        chamadaId: chamada.id,
        alunaId: aluna.alunaId,
        alocacaoId: aluna.alunaId ? undefined : aluna.alocacaoId,
        situacao,
        // O check-in vem validado do aplicativo do parceiro (RF-CNV-06). A
        // presença marcada aqui sem check-in vale para o controle interno
        // de ocupação e não gera repasse (RF-CNV-11).
        checkinConvenio: aluna.checkinConvenio,
        dataHora: new Date().toISOString(),
        autorId,
      });
    }

    // RF-CRE-05: presença confirmada e ausência sem justificativa aprovada
    // convertem a reserva em consumo. A conversão acontece uma única vez —
    // a correção da chamada reescreve a presença, mas não cobra de novo. O
    // crédito só volta por justificativa aprovada (RF-JUS-04).
    if (!aluna.agendamentoId || !aluna.alunaId) continue;
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

    // RF-PRE-05: a correção ajusta o saldo de créditos "quando aplicável".
    // O caso que existe na prática é este: a falta foi justificada, a
    // administração aprovou e o crédito voltou ao saldo (RF-JUS-04); a
    // correção mostra que a aluna estava presente. A aula aconteceu para
    // ela, então o crédito volta a ser consumido e a justificativa perde
    // efeito — ela justificava uma falta que não houve.
    //
    // O caminho inverso não existe: presença e ausência consomem igual
    // (RF-CRE-05), então corrigir de presente para ausente não mexe no
    // saldo. O crédito só volta por justificativa aprovada.
    const justificativaAprovada = justificativas.find(
      (j) => j.agendamentoId === aluna.agendamentoId && j.situacao === 'aprovada',
    );

    if (agendamento && jaConsumido && justificativaAprovada && aluna.presente && creditos > 0) {
      const carteira = await carteiraVigenteDaAluna(aluna.alunaId);
      if (carteira) {
        await consumirDireto({
          carteira,
          quantidade: creditos,
          origem: `Correção da chamada de ${formatarDataBR(dataAula)}: presença confirmada`,
          referenciaId: agendamento.id,
          autorId,
        });
      }

      await justificativaRepositorio.atualizar(justificativaAprovada.id, { situacao: 'sem_efeito' });

      await notificar({
        destinatario: { tipo: 'aluna', id: aluna.alunaId },
        evento: 'presenca_corrigida',
        conteudo: `A chamada da aula de ${formatarDataBR(dataAula)} foi corrigida e você consta como presente. Como a aula aconteceu para você, o crédito que havia sido devolvido pela justificativa voltou a ser consumido.`,
      });
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
  const professoraId = chamada.professoraId;
  if (!professoraId) {
    throw new RegraNegocioError('Esta chamada não tem professora vinculada.');
  }

  const presentes = alunas.filter((a) => a.presente).length;

  await estornarComissaoDaChamada(chamada.id);
  const { ehAjuste, semPresencas } = await lancarComissao({
    chamadaId: chamada.id,
    professoraId,
    dataAula,
    presencas: presentes,
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

  // Participante sem cadastro não recebe aviso: ela não tem acesso ao
  // sistema (RF-AEX-06).
  for (const aluna of alunas.filter((a) => !a.presente && a.alunaId)) {
    await notificar({
      destinatario: { tipo: 'aluna', id: aluna.alunaId as string },
      evento: 'presenca_corrigida',
      conteudo: `A chamada da aula de ${formatarDataBR(dataAula)} foi corrigida e você consta como ausente. Se houver um motivo, você pode enviar uma justificativa.`,
    });
  }

  const categoria = await categoriaVigenteNaData(professoraId, dataAula);

  return {
    valorComissao: semPresencas ? 0 : (categoria?.valorPorAula ?? 0),
    presentes,
    ausentes: alunas.length - presentes,
    ehAjuste,
    semPresencas,
  };
}

// --- Chamada de aula excepcional (RF-AEX-10) ------------------------------

/**
 * Carrega a chamada de uma aula excepcional — **sem gravar nada**, pelo
 * mesmo motivo da chamada da grade.
 *
 * A lista sai das alocações ativas, não de agendamentos: em aula
 * excepcional quem inclui a participante é a administração (RF-AEX-04).
 * Entram também as participantes sem cadastro e as alunas de convênio
 * alocadas com pagamento à parte (RF-PRE-02, RF-AEX-06/11).
 */
export async function carregarChamadaDeAulaExcepcional(
  aulaExcepcionalId: string,
): Promise<{ chamada: Chamada | undefined; alunas: AlunaNaChamada[] }> {
  const [chamadas, registros, alocacoes, { alunasPorId }] = await Promise.all([
    chamadaRepositorio.listar(),
    registroPresencaRepositorio.listar(),
    alocacoesDaAula(aulaExcepcionalId),
    carregarNomesDeAlunas(),
  ]);

  const chamada = chamadas.find((c) => c.aulaExcepcionalId === aulaExcepcionalId);

  const alunas: AlunaNaChamada[] = alocacoes
    .filter((a) => a.situacao === 'ativa')
    .map((alocacao) => {
      const registro = chamada
        ? registros.find(
            (r) =>
              r.chamadaId === chamada.id &&
              (alocacao.alunaId ? r.alunaId === alocacao.alunaId : r.alocacaoId === alocacao.id),
          )
        : undefined;
      const daAluna = alocacao.alunaId ? alunasPorId[alocacao.alunaId] : undefined;
      return {
        chave: alocacao.alunaId ?? alocacao.id,
        alocacaoId: alocacao.id,
        alunaId: alocacao.alunaId,
        telefone: alocacao.participanteSemCadastro?.telefone,
        semCadastro: alocacao.participanteSemCadastro !== undefined,
        nome: alocacao.participanteSemCadastro?.nome ?? daAluna?.nome ?? 'Aluna removida',
        origemConvenio: daAluna?.origemConvenio ?? false,
        experimental: false,
        checkinConvenio: false,
        presente: registro ? registro.situacao === 'presente' : true,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return { chamada, alunas };
}

export interface ResultadoFinalizacaoExcepcional {
  presentes: number;
  ausentes: number;
  /** Um lançamento por professora vinculada; zero quando não há nenhuma. */
  comissoesGeradas: number;
  totalComissao: number;
  ehAjuste: boolean;
}

/**
 * Finaliza a chamada da aula excepcional (RF-AEX-10/12).
 *
 * Os créditos já foram consumidos na alocação (RF-AEX-04), então aqui não
 * há conversão de reserva: a finalização registra a presença e gera **um
 * lançamento de comissão por professora vinculada**, com o valor que foi
 * informado para cada uma no cadastro da aula. Aula sem professora
 * vinculada não gera comissão nenhuma.
 */
export async function finalizarChamadaDeAulaExcepcional(params: {
  aula: AulaExcepcional;
  alunas: AlunaNaChamada[];
  autorId: string;
}): Promise<ResultadoFinalizacaoExcepcional> {
  const { aula, alunas, autorId } = params;

  const chamadas = await chamadaRepositorio.listar();
  let chamada = chamadas.find((c) => c.aulaExcepcionalId === aula.id);

  if (chamada?.situacao === 'finalizada') {
    throw new RegraNegocioError('Esta chamada já foi finalizada. Use a correção para alterá-la.');
  }

  const vinculos = await professorasDaAula(aula.id);

  if (!chamada) {
    chamada = await chamadaRepositorio.criar({
      aulaExcepcionalId: aula.id,
      // Sem professora vinculada, a chamada é da administração e o campo
      // fica vazio — não há a quem atribuir a condução (RF-AEX-10).
      professoraId: vinculos[0]?.professoraId,
      situacao: 'aberta',
    });
  }

  await gravarRegistrosDePresenca({ chamada, dataAula: aula.data, alunas, autorId });

  await chamadaRepositorio.atualizar(chamada.id, {
    situacao: 'finalizada',
    dataHoraFinalizacao: new Date().toISOString(),
  });

  const presentes = alunas.filter((a) => a.presente).length;

  const { comissoes, ehAjuste } = await lancarComissoesDaAulaExcepcional({
    chamadaId: chamada.id,
    aulaExcepcionalId: aula.id,
    nomeAula: aula.nome,
    professoras: vinculos.map((v) => ({ professoraId: v.professoraId, valorComissao: v.valorComissao })),
    dataAula: aula.data,
    presencas: presentes,
    autorId,
  });

  return {
    presentes,
    ausentes: alunas.length - presentes,
    comissoesGeradas: comissoes.length,
    totalComissao: comissoes.reduce((soma, c) => soma + c.valor, 0),
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
