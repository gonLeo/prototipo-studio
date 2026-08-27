import {
  alocacaoRepositorio,
  alunaRepositorio,
  aulaExcepcionalRepositorio,
  categoriaAulaRepositorio,
  espacoRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraDaAulaRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
  studioRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type {
  Alocacao,
  AulaExcepcional,
  CategoriaAula,
  MotivoSemConsumo,
  ProfessoraDaAula,
  Sessao,
} from '../types/domain';
import { formatarDataBR, hojeISO, diaSemanaDe } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';
import { formatarCreditos } from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';
import { cancelarOcorrencia, contarAlunasAfetadasNaSessao } from './cancelamentoDeAulas';
import { carteiraVigenteDaAluna, consumirDireto, estornarConsumo } from './carteiraDeCreditos';

/**
 * Aulas excepcionais (M9): workshop e aula particular.
 *
 * Acontecem fora da grade recorrente, são criadas pela administração e não
 * podem ser agendadas pelas alunas (RN-12). Ambas compartilham o mesmo
 * cadastro — o que as diferencia é a categoria de aula escolhida e o custo
 * em créditos dela.
 *
 * Camada de domínio, não um hook React.
 */

export const ROTULO_MOTIVO_SEM_CONSUMO: Record<MotivoSemConsumo, string> = {
  pagamento_avulso: 'Pagamento avulso',
  convidada: 'Convidada',
  cortesia: 'Cortesia',
};

/** Categorias que podem originar uma aula excepcional (RF-CFG-05). */
export async function categoriasExcepcionais(): Promise<CategoriaAula[]> {
  const categorias = await categoriaAulaRepositorio.listar();
  return categorias
    .filter((c) => c.excepcional && c.situacao === 'ativo')
    .sort((a, b) => a.custoEmCreditos - b.custoEmCreditos);
}

// --- Validação de horário e conflitos ------------------------------------

export interface ConflitoDeAula {
  /** Bloqueia o cadastro (RN-23): espaço ou professora já ocupados. */
  bloqueantes: string[];
  /**
   * RF-AEX-13: fora do horário de funcionamento apenas alerta. Workshop de
   * sábado e aula particular em horário atípico são exatamente os casos em
   * que isso acontece, e bloquear obrigaria a administração a alterar a
   * configuração do studio para cadastrar um evento pontual.
   */
  foraDoFuncionamento: boolean;
  /**
   * RF-AEX-03: sessões regulares no mesmo horário. Não bloqueiam — o
   * sistema informa e oferece o cancelamento delas.
   */
  sessoesEmConflito: Array<{ sessao: Sessao; nomeModalidade: string; alunasAgendadas: number }>;
}

function horariosSeCruzam(inicioA: string, fimA: string, inicioB: string, fimB: string): boolean {
  return inicioA < fimB && inicioB < fimA;
}

export async function verificarConflitos(params: {
  data: string;
  horarioInicio: string;
  horarioFim: string;
  espacoId?: string;
  professoraIds: string[];
  /** Ao editar, a própria aula não conta como conflito. */
  ignorarAulaId?: string;
}): Promise<ConflitoDeAula> {
  const { data, horarioInicio, horarioFim, espacoId, professoraIds, ignorarAulaId } = params;

  const [aulas, vinculos, sessoes, ocorrencias, modalidadesDoStudio, professoras, usuarios, espacos] =
    await Promise.all([
      aulaExcepcionalRepositorio.listar(),
      professoraDaAulaRepositorio.listar(),
      sessaoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      studioRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      espacoRepositorio.listar(),
    ]);

  const bloqueantes: string[] = [];

  // Conflito com outras aulas excepcionais na mesma data.
  const outras = aulas.filter(
    (a) => a.id !== ignorarAulaId && a.situacao === 'ativa' && a.data === data,
  );

  for (const outra of outras) {
    if (!horariosSeCruzam(horarioInicio, horarioFim, outra.horarioInicio, outra.horarioFim)) continue;

    if (espacoId && outra.espacoId === espacoId) {
      const nomeEspaco = espacos.find((e) => e.id === espacoId)?.nome ?? 'o espaço';
      bloqueantes.push(
        `${nomeEspaco} já está ocupado por "${outra.nome}" das ${outra.horarioInicio} às ${outra.horarioFim}.`,
      );
    }

    const professorasDaOutra = vinculos.filter((v) => v.aulaExcepcionalId === outra.id);
    for (const professoraId of professoraIds) {
      if (!professorasDaOutra.some((v) => v.professoraId === professoraId)) continue;
      const professora = professoras.find((p) => p.id === professoraId);
      const nome = usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'A professora';
      bloqueantes.push(`${nome} já conduz "${outra.nome}" no mesmo horário.`);
    }
  }

  // Conflito com a grade regular — informativo, com opção de cancelar.
  const sessoesEmConflito: ConflitoDeAula['sessoesEmConflito'] = [];

  for (const sessao of sessoes) {
    if (sessao.situacao !== 'ativo' || !sessaoOcorreEm(sessao, data)) continue;
    if (!horariosSeCruzam(horarioInicio, horarioFim, sessao.horarioInicio, sessao.horarioFim)) continue;

    const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
    if (ocorrencia?.situacao === 'cancelada') continue;

    const mesmoEspaco = Boolean(espacoId) && sessao.espacoId === espacoId;
    const mesmaProfessora = professoraIds.includes(sessao.professoraId);
    if (!mesmoEspaco && !mesmaProfessora) continue;

    sessoesEmConflito.push({
      sessao,
      nomeModalidade: modalidadesDoStudio.length > 0 ? '' : '',
      alunasAgendadas: await contarAlunasAfetadasNaSessao(sessao.id),
    });
  }

  return {
    bloqueantes,
    foraDoFuncionamento: await estaForaDoFuncionamento(data, horarioInicio, horarioFim),
    sessoesEmConflito,
  };
}

/** RF-AEX-13: informa se o horário cai fora dos dias e da faixa do studio. */
export async function estaForaDoFuncionamento(
  data: string,
  horarioInicio: string,
  horarioFim: string,
): Promise<boolean> {
  const studios = await studioRepositorio.listar();
  const studio = studios[0];
  if (!studio) return false;

  const blocos = studio.horarioFuncionamento[diaSemanaDe(data)] ?? [];
  if (blocos.length === 0) return true;

  return !blocos.some((bloco) => horarioInicio >= bloco.inicio && horarioFim <= bloco.fim);
}

// --- Cadastro ------------------------------------------------------------

export interface DadosAulaExcepcional {
  categoriaAulaId: string;
  nome: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  espacoId?: string;
  descricao?: string;
  /** RF-AEX-12: vínculo opcional, com valor de comissão por professora. */
  professoras: Array<{ professoraId: string; valorComissao: number }>;
}

/**
 * Cria a aula excepcional (RF-AEX-01/02/13).
 *
 * Conflito de espaço e de professora bloqueia. Horário fora do
 * funcionamento não bloqueia: a tela alerta e a administração decide, o
 * que chega aqui como `confirmarForaDoFuncionamento`.
 */
export async function criarAulaExcepcional(params: {
  dados: DadosAulaExcepcional;
  autorId: string;
  confirmarForaDoFuncionamento?: boolean;
  /** RF-AEX-03: cancelar as sessões regulares que conflitam com esta aula. */
  cancelarSessoesEmConflito?: boolean;
}): Promise<{ aula: AulaExcepcional; sessoesCanceladas: number; alunasAfetadas: number }> {
  const { dados, autorId, confirmarForaDoFuncionamento = false, cancelarSessoesEmConflito = false } = params;

  if (!dados.nome.trim()) throw new RegraNegocioError('Informe o nome da aula.');
  if (!dados.categoriaAulaId) throw new RegraNegocioError('Escolha a categoria da aula.');
  if (dados.horarioFim <= dados.horarioInicio) {
    throw new RegraNegocioError('O horário de término precisa ser depois do início.');
  }

  const conflitos = await verificarConflitos({
    data: dados.data,
    horarioInicio: dados.horarioInicio,
    horarioFim: dados.horarioFim,
    espacoId: dados.espacoId,
    professoraIds: dados.professoras.map((p) => p.professoraId),
  });

  if (conflitos.bloqueantes.length > 0) {
    throw new RegraNegocioError(conflitos.bloqueantes.join(' '));
  }
  if (conflitos.foraDoFuncionamento && !confirmarForaDoFuncionamento) {
    throw new RegraNegocioError(
      'O horário está fora do funcionamento do studio. Confirme assim mesmo ou ajuste a data e o horário.',
    );
  }

  const aula = await aulaExcepcionalRepositorio.criar({
    categoriaAulaId: dados.categoriaAulaId,
    nome: dados.nome.trim(),
    data: dados.data,
    horarioInicio: dados.horarioInicio,
    horarioFim: dados.horarioFim,
    espacoId: dados.espacoId || undefined,
    descricao: dados.descricao?.trim() || undefined,
    situacao: 'ativa',
    foraDoFuncionamento: conflitos.foraDoFuncionamento,
    autorId,
    dataCriacao: hojeISO(),
  });

  for (const vinculo of dados.professoras) {
    await professoraDaAulaRepositorio.criar({
      aulaExcepcionalId: aula.id,
      professoraId: vinculo.professoraId,
      valorComissao: vinculo.valorComissao,
    });
  }

  // RF-AEX-03: cancelar as sessões da grade que ocupam o mesmo horário
  // devolve os créditos, prorroga a validade e notifica as alunas — tudo
  // pelo caminho já usado pelo calendário de exceções.
  let sessoesCanceladas = 0;
  let alunasAfetadas = 0;

  if (cancelarSessoesEmConflito) {
    for (const { sessao } of conflitos.sessoesEmConflito) {
      alunasAfetadas += await cancelarOcorrencia(
        sessao,
        dados.data,
        `Aula excepcional "${aula.nome}" ocupa este horário`,
        autorId,
      );
      sessoesCanceladas += 1;
    }
  }

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'AulaExcepcional',
    operacao: 'criacao',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      aulaId: aula.id,
      nome: aula.nome,
      data: aula.data,
      professoras: dados.professoras.length,
      foraDoFuncionamento: conflitos.foraDoFuncionamento,
      sessoesCanceladas,
    },
  });

  return { aula, sessoesCanceladas, alunasAfetadas };
}

/** Cancela a aula excepcional e estorna os créditos de todas as alocações. */
export async function cancelarAulaExcepcional(params: {
  aula: AulaExcepcional;
  motivo: string;
  autorId: string;
}): Promise<number> {
  const { aula, motivo, autorId } = params;

  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do cancelamento.');
  if (aula.situacao === 'cancelada') throw new RegraNegocioError('Esta aula já está cancelada.');

  const alocacoes = await alocacoesDaAula(aula.id);
  for (const alocacao of alocacoes.filter((a) => a.situacao === 'ativa')) {
    await cancelarAlocacao({ alocacao, aula, motivo: `Aula cancelada: ${motivo.trim()}`, autorId });
  }

  await aulaExcepcionalRepositorio.atualizar(aula.id, { situacao: 'cancelada' });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'AulaExcepcional',
    operacao: 'cancelamento',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { aulaId: aula.id, motivo: motivo.trim(), alocacoesEstornadas: alocacoes.length },
  });

  return alocacoes.length;
}

// --- Alocação ------------------------------------------------------------

export async function alocacoesDaAula(aulaExcepcionalId: string): Promise<Alocacao[]> {
  const lista = await alocacaoRepositorio.listar();
  return lista.filter((a) => a.aulaExcepcionalId === aulaExcepcionalId);
}

/**
 * Aloca uma aluna na aula (RF-AEX-04/05/06).
 *
 * O crédito é consumido na hora, sem passar por reserva, e cada
 * participante consome o custo integral da categoria — o custo não é
 * dividido entre elas. A alocação sem consumo existe para o caso em que o
 * pagamento é tratado fora do sistema, e exige motivo.
 */
export async function alocarAluna(params: {
  aula: AulaExcepcional;
  alunaId: string;
  consumoDispensado?: boolean;
  motivoSemConsumo?: MotivoSemConsumo;
  autorId: string;
}): Promise<Alocacao> {
  const { aula, alunaId, consumoDispensado = false, motivoSemConsumo, autorId } = params;

  if (aula.situacao === 'cancelada') throw new RegraNegocioError('Esta aula foi cancelada.');
  if (consumoDispensado && !motivoSemConsumo) {
    throw new RegraNegocioError('Escolha o motivo da alocação sem consumo de créditos.');
  }

  const alunas = await alunaRepositorio.listar();
  const aluna = alunas.find((a) => a.id === alunaId);
  if (!aluna) throw new RegraNegocioError('Aluna não encontrada.');

  // RF-AEX-11: aluna de convênio não participa de workshop nem de aula particular.
  if (aluna.origem === 'convenio') {
    throw new RegraNegocioError(
      'Alunas de convênio não participam de workshops nem de aulas particulares — o convênio cobre apenas a grade regular.',
    );
  }

  const jaAlocadas = await alocacoesDaAula(aula.id);
  if (jaAlocadas.some((a) => a.alunaId === alunaId && a.situacao === 'ativa')) {
    throw new RegraNegocioError('Esta aluna já está alocada nesta aula.');
  }

  const categorias = await categoriaAulaRepositorio.listar();
  const categoria = categorias.find((c) => c.id === aula.categoriaAulaId);
  const custo = consumoDispensado ? 0 : (categoria?.custoEmCreditos ?? 0);

  if (custo > 0) {
    const carteira = await carteiraVigenteDaAluna(alunaId);
    if (!carteira) {
      throw new RegraNegocioError(
        'Esta aluna está sem pacote ativo. Registre a participação sem consumo de créditos ou venda um pacote antes.',
      );
    }
    await consumirDireto({
      carteira,
      quantidade: custo,
      origem: `Alocação em "${aula.nome}" de ${formatarDataBR(aula.data)}`,
      autorId,
    });
  }

  const alocacao = await alocacaoRepositorio.criar({
    aulaExcepcionalId: aula.id,
    alunaId,
    creditosConsumidos: custo,
    consumoDispensado,
    motivoSemConsumo: consumoDispensado ? motivoSemConsumo : undefined,
    situacao: 'ativa',
    autorId,
    data: hojeISO(),
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Alocacao',
    operacao: 'alocacao_em_aula_excepcional',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      aulaId: aula.id,
      alunaId,
      creditosConsumidos: custo,
      consumoDispensado,
      motivoSemConsumo,
    },
  });

  // RF-NOT-04: a aluna é avisada da alocação, com data, horário e créditos.
  await notificar({
    destinatario: { tipo: 'aluna', id: alunaId },
    evento: 'alocacao_em_aula_excepcional',
    conteudo:
      `Você foi incluída em "${aula.nome}", em ${formatarDataBR(aula.data)} às ${aula.horarioInicio}. ` +
      (custo > 0
        ? `${formatarCreditos(custo)} foram consumidos do seu saldo.`
        : 'Esta participação não consome créditos.'),
  });

  return alocacao;
}

/** RF-AEX-07: cancelar a alocação estorna os créditos consumidos. */
export async function cancelarAlocacao(params: {
  alocacao: Alocacao;
  aula: AulaExcepcional;
  motivo: string;
  autorId: string;
}): Promise<void> {
  const { alocacao, aula, motivo, autorId } = params;

  if (alocacao.situacao === 'cancelada') throw new RegraNegocioError('Esta alocação já foi cancelada.');
  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do cancelamento da alocação.');

  await alocacaoRepositorio.atualizar(alocacao.id, {
    situacao: 'cancelada',
    motivoCancelamento: motivo.trim(),
  });

  if (alocacao.creditosConsumidos > 0) {
    const carteira = await carteiraVigenteDaAluna(alocacao.alunaId);
    if (carteira) {
      await estornarConsumo({
        carteira,
        quantidade: alocacao.creditosConsumidos,
        origem: `Cancelamento da alocação em "${aula.nome}"`,
        referenciaId: alocacao.id,
        autorId,
      });
    }
  }

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Alocacao',
    operacao: 'cancelamento_de_alocacao',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { creditosConsumidos: alocacao.creditosConsumidos },
    valorNovo: { alunaId: alocacao.alunaId, motivo: motivo.trim() },
  });

  await notificar({
    destinatario: { tipo: 'aluna', id: alocacao.alunaId },
    evento: 'alocacao_cancelada',
    conteudo:
      `Sua participação em "${aula.nome}" foi cancelada. Motivo: ${motivo.trim()}.` +
      (alocacao.creditosConsumidos > 0
        ? ` ${formatarCreditos(alocacao.creditosConsumidos)} voltaram ao seu saldo.`
        : ''),
  });
}

// --- Consulta ------------------------------------------------------------

export interface AulaExcepcionalDetalhada extends AulaExcepcional {
  nomeCategoria: string;
  custoEmCreditos: number;
  nomeEspaco?: string;
  professoras: Array<ProfessoraDaAula & { nome: string }>;
  /** RF-AEX-08: não há limite de participantes — a tela só mostra quantas são. */
  alocadas: number;
  totalComissao: number;
}

export async function listarAulasExcepcionais(): Promise<AulaExcepcionalDetalhada[]> {
  const [aulas, categorias, espacos, vinculos, professoras, usuarios, alocacoes] = await Promise.all([
    aulaExcepcionalRepositorio.listar(),
    categoriaAulaRepositorio.listar(),
    espacoRepositorio.listar(),
    professoraDaAulaRepositorio.listar(),
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
    alocacaoRepositorio.listar(),
  ]);

  return aulas
    .map((aula) => {
      const categoria = categorias.find((c) => c.id === aula.categoriaAulaId);
      const daAula = vinculos
        .filter((v) => v.aulaExcepcionalId === aula.id)
        .map((vinculo) => {
          const professora = professoras.find((p) => p.id === vinculo.professoraId);
          return {
            ...vinculo,
            nome: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
          };
        });

      return {
        ...aula,
        nomeCategoria: categoria?.nome ?? 'Categoria removida',
        custoEmCreditos: categoria?.custoEmCreditos ?? 0,
        nomeEspaco: espacos.find((e) => e.id === aula.espacoId)?.nome,
        professoras: daAula,
        alocadas: alocacoes.filter((a) => a.aulaExcepcionalId === aula.id && a.situacao === 'ativa').length,
        totalComissao: daAula.reduce((soma, p) => soma + p.valorComissao, 0),
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data) || a.horarioInicio.localeCompare(b.horarioInicio));
}

export interface AlocacaoDetalhada extends Alocacao {
  nomeAluna: string;
}

export async function listarAlocacoesDetalhadas(aulaExcepcionalId: string): Promise<AlocacaoDetalhada[]> {
  const [alocacoes, alunas, usuarios] = await Promise.all([
    alocacoesDaAula(aulaExcepcionalId),
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  return alocacoes
    .map((alocacao) => {
      const aluna = alunas.find((a) => a.id === alocacao.alunaId);
      return {
        ...alocacao,
        nomeAluna: usuarios.find((u) => u.id === aluna?.usuarioId)?.nome ?? 'Aluna removida',
      };
    })
    .sort((a, b) => a.nomeAluna.localeCompare(b.nomeAluna));
}

/** Professoras vinculadas a uma aula, com o valor de comissão de cada uma. */
export async function professorasDaAula(aulaExcepcionalId: string): Promise<ProfessoraDaAula[]> {
  const vinculos = await professoraDaAulaRepositorio.listar();
  return vinculos.filter((v) => v.aulaExcepcionalId === aulaExcepcionalId);
}

/** Aulas excepcionais de uma data, para a agenda da professora e a chamada. */
export async function aulasExcepcionaisDaData(params: {
  data: string;
  professoraId?: string;
}): Promise<AulaExcepcionalDetalhada[]> {
  const { data, professoraId } = params;
  const aulas = await listarAulasExcepcionais();

  return aulas.filter((aula) => {
    if (aula.data !== data || aula.situacao !== 'ativa') return false;
    if (!professoraId) return true;
    return aula.professoras.some((p) => p.professoraId === professoraId);
  });
}

/** RF-AEX-09: aulas excepcionais em que a aluna foi alocada. */
export async function alocacoesDaAluna(alunaId: string): Promise<
  Array<Alocacao & { aula: AulaExcepcionalDetalhada }>
> {
  const [alocacoes, aulas] = await Promise.all([alocacaoRepositorio.listar(), listarAulasExcepcionais()]);

  return alocacoes
    .filter((a) => a.alunaId === alunaId)
    .map((alocacao) => ({
      alocacao,
      aula: aulas.find((x) => x.id === alocacao.aulaExcepcionalId),
    }))
    .filter((item): item is { alocacao: Alocacao; aula: AulaExcepcionalDetalhada } => item.aula !== undefined)
    .map(({ alocacao, aula }) => ({ ...alocacao, aula }));
}
