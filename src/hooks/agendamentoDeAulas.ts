import {
  agendamentoRepositorio,
  espacoRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type {
  Agendamento,
  Aluna,
  Carteira,
  Modalidade,
  OcorrenciaSessao,
  OrigemAgendamento,
  Sessao,
} from '../types/domain';
import { formatarDataBR, hojeISO, horasAteAula, somarDias } from '../utils/data';
import { creditosDisponiveis, formatarCreditos } from '../utils/creditos';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import {
  carteiraVigenteDaAluna,
  consumirReserva,
  custoDaAulaRegular,
  liberarReserva,
  reservarCreditos,
} from './carteiraDeCreditos';

/**
 * Regras de agendamento (M7) e de cancelamento pela aluna (M8.1).
 *
 * Camada de domínio, consumida pelos hooks de tela — mesmo padrão de
 * `cancelamentoDeAulas.ts` e `carteiraDeCreditos.ts`.
 */

export interface AulaDisponivel {
  sessao: Sessao;
  modalidade: Modalidade | undefined;
  nomeProfessora: string;
  nomeEspaco: string | undefined;
  data: string;
  ocorrencia: OcorrenciaSessao | undefined;
  ocupacao: number;
  vagas: number;
  jaAgendada: boolean;
  /** RF-AGD-01: o custo em créditos aparece em cada aula da grade. */
  custoEmCreditos: number;
  /** Motivo pelo qual **esta** aula não pode ser agendada agora. */
  impedimento: string | undefined;
}

/** Impedimento que vale para a aluna inteira, não para uma aula específica. */
export interface BloqueioDaAluna {
  motivo: string;
  detalhe?: string;
}

async function parametroNumerico(chave: string, padrao: number): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const parametro = parametros.find((p) => p.chave === chave);
  const valor = Number(parametro?.valor);
  return Number.isFinite(valor) ? valor : padrao;
}

/** Janela de agendamento em dias, distinta para aluna com pacote e de convênio (RF-AGD-03). */
export async function janelaDeAgendamentoEmDias(aluna: Aluna): Promise<number> {
  return aluna.origem === 'convenio'
    ? parametroNumerico('janela_agendamento_convenio_dias', 7)
    : parametroNumerico('janela_agendamento_com_pacote_dias', 30);
}

export async function antecedenciaMinimaEmHoras(): Promise<number> {
  return parametroNumerico('antecedencia_cancelamento_horas', 4);
}

export async function prazoDeJustificativaEmDias(): Promise<number> {
  return parametroNumerico('prazo_justificativa_dias', 7);
}

/**
 * Impedimento geral da aluna para agendar (RF-AGD-05/06/07). Devolve
 * `undefined` quando ela pode agendar.
 *
 * A tela usa isso para mostrar a mensagem na própria grade e desabilitar
 * os botões, em vez de deixar a aluna descobrir o bloqueio só ao clicar.
 *
 * Não há distinção visual entre carteira consumida e vencida (RF-CRE-11):
 * nos dois casos a mensagem é a mesma, "nenhum pacote ativo", com o convite
 * a adquirir um novo.
 */
export function bloqueioParaAgendar(params: {
  aluna: Aluna;
  carteira: Carteira | undefined;
  custoDaAula: number;
}): BloqueioDaAluna | undefined {
  const { aluna, carteira, custoDaAula } = params;

  // RF-ALU-08: sem termo aceito e anamnese preenchida, não há agendamento.
  if (aluna.situacao === 'aguardando_aceite') {
    return {
      motivo: 'O aceite do termo ainda está pendente.',
      detalhe: 'Assine o termo e preencha a ficha de anamnese no painel para liberar o agendamento.',
    };
  }

  // RF-AGD-07: durante o trancamento a aluna não visualiza a grade.
  if (aluna.situacao === 'trancada') {
    return {
      motivo: 'Seu pacote está trancado.',
      detalhe: 'Durante o trancamento não é possível agendar. Fale com a administração para registrar seu retorno.',
    };
  }

  if (!carteira) {
    // A aluna de convênio reserva pelo aplicativo do parceiro (M14): ela
    // não tem pacote no studio, e dizer "compre um pacote" seria errado.
    if (aluna.origem === 'convenio') {
      return {
        motivo: 'Suas reservas acontecem pelo aplicativo do convênio.',
        detalhe: 'A vaga reservada por lá aparece automaticamente na agenda do studio.',
      };
    }
    return {
      motivo: 'Nenhum pacote ativo.',
      detalhe: 'Adquira um pacote no seu painel para liberar o agendamento.',
    };
  }

  // RF-AGD-05 / RF-CRE-06: saldo insuficiente para o custo da aula.
  if (creditosDisponiveis(carteira) < custoDaAula) {
    return {
      motivo: 'Saldo de créditos insuficiente.',
      detalhe: `Esta aula custa ${formatarCreditos(custoDaAula)} e você tem ${formatarCreditos(creditosDisponiveis(carteira))} disponíveis. Adquira um novo pacote para continuar agendando.`,
    };
  }

  return undefined;
}

export interface SituacaoDeAgendamento {
  carteira: Carteira | undefined;
  custoDaAula: number;
  bloqueio: BloqueioDaAluna | undefined;
  creditosDisponiveis: number;
  dataValidade: string | undefined;
}

/** Reúne o que a grade precisa saber sobre a aluna antes de ofertar aulas. */
export async function carregarSituacaoDeAgendamento(aluna: Aluna): Promise<SituacaoDeAgendamento> {
  const [carteira, custoDaAula] = await Promise.all([
    carteiraVigenteDaAluna(aluna.id),
    custoDaAulaRegular(),
  ]);

  return {
    carteira,
    custoDaAula,
    bloqueio: bloqueioParaAgendar({ aluna, carteira, custoDaAula }),
    creditosDisponiveis: carteira ? creditosDisponiveis(carteira) : 0,
    dataValidade: carteira?.dataValidade,
  };
}

/**
 * Aulas que a aluna pode ver na grade (RF-AGD-01): da data de hoje até o
 * fim da janela de agendamento, já com ocupação, vagas e o motivo de cada
 * aula que não pode ser marcada.
 */
export async function listarAulasDisponiveis(params: {
  aluna: Aluna;
  carteira: Carteira | undefined;
  custoDaAula: number;
}): Promise<AulaDisponivel[]> {
  const { aluna, carteira, custoDaAula } = params;

  const [sessoes, ocorrencias, agendamentos, excecoes, modalidades, professoras, usuarios, espacos, janela] =
    await Promise.all([
      sessaoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      agendamentoRepositorio.listar(),
      excecaoCalendarioRepositorio.listar(),
      modalidadeRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      espacoRepositorio.listar(),
      janelaDeAgendamentoEmDias(aluna),
    ]);

  const hoje = hojeISO();
  const limite = somarDias(hoje, janela);
  const agora = new Date();

  const disponiveis: AulaDisponivel[] = [];

  for (let data = hoje; data <= limite; data = somarDias(data, 1)) {
    // Datas de exceção não são ofertadas (RF-EXC-06, RF-GRD-10).
    if (excecoes.some((e) => e.data === data)) continue;

    for (const sessao of sessoes) {
      if (!sessaoOcorreEm(sessao, data)) continue;

      const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
      if (ocorrencia?.situacao === 'cancelada') continue;

      const ativos = ocorrencia
        ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo')
        : [];
      const ocupacao = ativos.length;
      const jaAgendada = ativos.some((a) => a.alunaId === aluna.id);

      const professora = professoras.find((p) => p.id === sessao.professoraId);
      const usuarioProfessora = usuarios.find((u) => u.id === professora?.usuarioId);

      let impedimento: string | undefined;
      if (horasAteAula(data, sessao.horarioInicio, agora) <= 0) {
        impedimento = 'Esta aula já começou.';
      } else if (jaAgendada) {
        impedimento = 'Você já está agendada nesta aula.';
      } else if (ocupacao >= sessao.capacidade) {
        // RF-AGD-06: sem vaga; lista de espera é evolução futura (EV-06).
        impedimento = 'Turma lotada. A lista de espera chega em uma fase futura.';
      } else if (carteira && data > carteira.dataValidade) {
        // RF-CRE-07: não se agenda para depois da validade da carteira.
        impedimento = `Depois da validade dos seus créditos (${formatarDataBR(carteira.dataValidade)}).`;
      }

      disponiveis.push({
        sessao,
        modalidade: modalidades.find((m) => m.id === sessao.modalidadeId),
        nomeProfessora: usuarioProfessora?.nome ?? 'Professora removida',
        nomeEspaco: espacos.find((e) => e.id === sessao.espacoId)?.nome,
        data,
        ocorrencia,
        ocupacao,
        vagas: Math.max(0, sessao.capacidade - ocupacao),
        jaAgendada,
        custoEmCreditos: custoDaAula,
        impedimento,
      });
    }
  }

  return disponiveis.sort(
    (a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio),
  );
}

export interface ResultadoAgendamento {
  agendamento: Agendamento;
  /** Créditos disponíveis depois da reserva (RF-AGD-11). */
  novoSaldo: number;
  creditosReservados: number;
  antecedenciaMinimaHoras: number;
}

/**
 * Reserva a vaga e reserva os créditos correspondentes (RF-AGD-04,
 * RF-CRE-03). A reserva bloqueia o crédito, mas ainda não o consome — o
 * consumo acontece na chamada, no cancelamento fora do prazo ou na falta
 * sem justificativa aprovada (RF-CRE-05).
 *
 * Revalida tudo no momento da confirmação — saldo, validade, capacidade,
 * trancamento —, porque entre carregar a grade e confirmar o cenário pode
 * ter mudado (outra aluna ocupou a última vaga, por exemplo).
 */
export async function agendarAula(params: {
  aluna: Aluna;
  sessao: Sessao;
  data: string;
  origem: OrigemAgendamento;
  /** Quem executou. Na administração, é a autoria do registro (RF-AGD-09). */
  autorId: string;
  experimental?: boolean;
}): Promise<ResultadoAgendamento> {
  const { aluna, sessao, data, origem, autorId, experimental = false } = params;

  // A aula experimental é cobrada à parte e não consome créditos
  // (RF-EXP-06), então ela não passa pela validação de carteira.
  const custoDaAula = experimental ? 0 : await custoDaAulaRegular();
  const carteira = experimental ? undefined : await carteiraVigenteDaAluna(aluna.id);

  if (!experimental) {
    const bloqueio = bloqueioParaAgendar({ aluna, carteira, custoDaAula });
    if (bloqueio) throw new RegraNegocioError(`${bloqueio.motivo} ${bloqueio.detalhe ?? ''}`.trim());
    if (!carteira) throw new RegraNegocioError('Esta aluna não tem pacote ativo.');

    // RF-CRE-07: o agendamento é bloqueado para datas posteriores à validade.
    if (data > carteira.dataValidade) {
      throw new RegraNegocioError(
        `Esta data é posterior à validade dos créditos (${formatarDataBR(carteira.dataValidade)}).`,
      );
    }
  }

  if (!sessaoOcorreEm(sessao, data)) {
    throw new RegraNegocioError('Esta sessão não acontece na data escolhida.');
  }
  if (horasAteAula(data, sessao.horarioInicio) <= 0) {
    throw new RegraNegocioError('Esta aula já começou.');
  }

  const excecoes = await excecaoCalendarioRepositorio.listar();
  const excecao = excecoes.find((e) => e.data === data);
  if (excecao) {
    throw new RegraNegocioError(`O studio não abre nesta data: ${excecao.descricao}.`);
  }

  // Materializa a ocorrência só agora — a recorrência é derivada, e esta
  // data passa a existir como registro porque recebeu um agendamento.
  const ocorrencias = await ocorrenciaSessaoRepositorio.listar();
  let ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
  if (!ocorrencia) {
    ocorrencia = await ocorrenciaSessaoRepositorio.criar({
      sessaoId: sessao.id,
      data,
      professoraEfetivaId: sessao.professoraId,
      situacao: 'ativa',
    });
  }
  if (ocorrencia.situacao === 'cancelada') {
    throw new RegraNegocioError('Esta aula foi cancelada.');
  }

  const agendamentos = await agendamentoRepositorio.listar();
  const ativosNaOcorrencia = agendamentos.filter(
    (a) => a.ocorrenciaSessaoId === ocorrencia!.id && a.situacao === 'ativo',
  );
  if (ativosNaOcorrencia.some((a) => a.alunaId === aluna.id)) {
    throw new RegraNegocioError('Esta aluna já está agendada nesta aula.');
  }
  if (ativosNaOcorrencia.length >= sessao.capacidade) {
    throw new RegraNegocioError('A turma já atingiu a capacidade máxima.');
  }

  const agendamento = await agendamentoRepositorio.criar({
    alunaId: aluna.id,
    ocorrenciaSessaoId: ocorrencia.id,
    origem,
    dataHora: new Date().toISOString(),
    situacao: 'ativo',
    experimental,
    creditosReservados: custoDaAula,
  });

  let novoSaldo = 0;
  if (carteira && custoDaAula > 0) {
    const atualizada = await reservarCreditos({
      carteira,
      quantidade: custoDaAula,
      origem: `Agendamento de ${formatarDataBR(data)} às ${sessao.horarioInicio}`,
      referenciaId: agendamento.id,
      autorId,
    });
    novoSaldo = creditosDisponiveis(atualizada);
  }

  const antecedenciaMinimaHoras = await antecedenciaMinimaEmHoras();

  await notificar({
    destinatario: { tipo: 'aluna', id: aluna.id },
    evento: 'agendamento_confirmado',
    conteudo: experimental
      ? `Aula experimental agendada para ${formatarDataBR(data)} às ${sessao.horarioInicio}.`
      : `Aula agendada para ${formatarDataBR(data)} às ${sessao.horarioInicio}. ${formatarCreditos(custoDaAula)} reservados; saldo disponível: ${formatarCreditos(novoSaldo)}. Cancelamentos com ${antecedenciaMinimaHoras}h ou mais de antecedência liberam os créditos reservados.`,
  });

  if (origem === 'administracao') {
    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'Agendamento',
      operacao: 'agendamento_pela_administracao',
      autorId,
      dataHora: new Date().toISOString(),
      valorNovo: { alunaId: aluna.id, sessaoId: sessao.id, data },
    });
  }

  return { agendamento, novoSaldo, creditosReservados: custoDaAula, antecedenciaMinimaHoras };
}

export interface ResultadoCancelamento {
  creditoDevolvido: boolean;
  novoSaldo: number;
  creditosEnvolvidos: number;
  /** A aluna pode justificar a falta quando os créditos foram consumidos (RF-CAN-02, RF-JUS-01). */
  podeJustificar: boolean;
}

/**
 * Cancelamento pela aluna (RF-CAN-01/02).
 *
 * Acima da antecedência mínima a reserva é liberada e os créditos voltam
 * ao disponível; abaixo dela a reserva vira consumo, e a aluna pode enviar
 * justificativa. A tela avisa disso **antes** de confirmar — aqui só
 * aplicamos a regra.
 */
export async function cancelarAgendamentoDaAluna(params: {
  agendamento: Agendamento;
  dataAula: string;
  horaAula: string;
  origemCancelamento: 'aluna' | 'administracao';
  autorId: string;
}): Promise<ResultadoCancelamento> {
  const { agendamento, dataAula, horaAula, origemCancelamento, autorId } = params;

  if (agendamento.situacao !== 'ativo') {
    throw new RegraNegocioError('Este agendamento já foi cancelado ou realizado.');
  }

  const antecedencia = await antecedenciaMinimaEmHoras();
  const horasRestantes = horasAteAula(dataAula, horaAula);
  // Cancelamento pela administração devolve o crédito de qualquer forma:
  // a regra de antecedência existe para a aluna, não para o studio.
  const creditoDevolvido =
    origemCancelamento === 'administracao' || horasRestantes >= antecedencia;

  await agendamentoRepositorio.atualizar(agendamento.id, {
    situacao: 'cancelado',
    origemCancelamento,
    creditoDevolvido,
  });

  const creditosEnvolvidos = agendamento.creditosReservados ?? 0;
  const carteira = await carteiraVigenteDaAluna(agendamento.alunaId);

  let novoSaldo = carteira ? creditosDisponiveis(carteira) : 0;

  if (carteira && creditosEnvolvidos > 0) {
    const descricao = `Cancelamento da aula de ${formatarDataBR(dataAula)}`;
    const atualizada = creditoDevolvido
      ? await liberarReserva({
          carteira,
          quantidade: creditosEnvolvidos,
          origem: `${descricao} — dentro da antecedência`,
          referenciaId: agendamento.id,
          autorId,
        })
      : await consumirReserva({
          carteira,
          quantidade: creditosEnvolvidos,
          origem: `${descricao} — fora da antecedência`,
          referenciaId: agendamento.id,
          autorId,
        });
    novoSaldo = creditosDisponiveis(atualizada);
  }

  await notificar({
    destinatario: { tipo: 'aluna', id: agendamento.alunaId },
    evento: 'agendamento_cancelado',
    conteudo: creditoDevolvido
      ? `Aula de ${formatarDataBR(dataAula)} cancelada. ${formatarCreditos(creditosEnvolvidos)} voltaram ao saldo disponível (${formatarCreditos(novoSaldo)}).`
      : `Aula de ${formatarDataBR(dataAula)} cancelada com menos de ${antecedencia}h de antecedência, então ${formatarCreditos(creditosEnvolvidos)} foram consumidos. Você pode enviar uma justificativa para análise.`,
  });

  if (origemCancelamento === 'administracao') {
    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'Agendamento',
      operacao: 'cancelamento_pela_administracao',
      autorId,
      dataHora: new Date().toISOString(),
      valorAnterior: { situacao: 'ativo' },
      valorNovo: { situacao: 'cancelado', creditoDevolvido },
    });
  }

  return {
    creditoDevolvido,
    novoSaldo,
    creditosEnvolvidos,
    podeJustificar: !creditoDevolvido && !agendamento.experimental,
  };
}
