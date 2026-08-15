import {
  agendamentoRepositorio,
  contratoRepositorio,
  espacoRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  notificacaoRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Agendamento,
  Aluna,
  Contrato,
  Modalidade,
  OcorrenciaSessao,
  OrigemAgendamento,
  Sessao,
} from '../types/domain';
import { formatarDataBR, hojeISO, horasAteAula, somarDias } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';

/**
 * Regras de agendamento (M7) e de cancelamento pela aluna (M8.1).
 *
 * Camada de domínio, consumida pelos hooks de tela — mesmo padrão de
 * `cancelamentoDeAulas.ts` e `contratosDeAluna.ts`.
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

/** Janela de agendamento em dias, diferente para matriculada e convênio (RF-AGD-02). */
export async function janelaDeAgendamentoEmDias(aluna: Aluna): Promise<number> {
  return aluna.origem === 'convenio'
    ? parametroNumerico('janela_agendamento_convenio_dias', 7)
    : parametroNumerico('janela_agendamento_matriculadas_dias', 30);
}

export async function antecedenciaMinimaEmHoras(): Promise<number> {
  return parametroNumerico('antecedencia_cancelamento_horas', 4);
}

export async function prazoDeJustificativaEmDias(): Promise<number> {
  return parametroNumerico('prazo_justificativa_dias', 7);
}

/**
 * Impedimento geral da aluna para agendar (RF-AGD-04/07/08). Devolve
 * `undefined` quando ela pode agendar.
 *
 * A tela usa isso para mostrar a mensagem na própria grade e desabilitar
 * os botões, em vez de deixar a aluna descobrir o bloqueio só ao clicar.
 */
export function bloqueioParaAgendar(aluna: Aluna, contrato: Contrato | undefined): BloqueioDaAluna | undefined {
  // RF-ALU-08: sem termo aceito e anamnese preenchida, não há agendamento.
  if (aluna.situacao === 'aguardando_aceite') {
    return {
      motivo: 'O aceite do termo ainda está pendente.',
      detalhe: 'Assine o termo e preencha a ficha de anamnese no painel para liberar o agendamento.',
    };
  }
  if (!contrato || contrato.situacao === 'encerrado') {
    return {
      motivo: 'Você não tem um pacote ativo.',
      detalhe: 'Fale com a administração do studio para contratar um pacote e voltar a agendar.',
    };
  }
  if (contrato.situacao === 'trancado' || contrato.situacao === 'suspenso') {
    return {
      motivo: contrato.situacao === 'trancado' ? 'Seu contrato está trancado.' : 'Seu contrato está suspenso.',
      detalhe: 'Durante a pausa não é possível agendar. Fale com a administração para registrar seu retorno.',
    };
  }
  if (aluna.situacao === 'inadimplente') {
    return {
      motivo: 'Há uma mensalidade em aberto.',
      detalhe:
        'O agendamento de novas aulas fica bloqueado até a regularização. As aulas já agendadas continuam valendo.',
    };
  }
  if (contrato.saldoAulas <= 0) {
    return {
      motivo: 'Seu saldo de aulas acabou.',
      detalhe: 'Aguarde a renovação do ciclo ou fale com a administração para alterar o plano.',
    };
  }
  return undefined;
}

/**
 * Aulas que a aluna pode ver na grade (RF-AGD-01): da data de hoje até o
 * fim da janela de agendamento, já com ocupação, vagas e o motivo de cada
 * aula que não pode ser marcada.
 */
export async function listarAulasDisponiveis(params: {
  aluna: Aluna;
  contrato: Contrato | undefined;
}): Promise<AulaDisponivel[]> {
  const { aluna, contrato } = params;

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
        // RF-AGD-06: sem vaga; lista de espera é evolução futura.
        impedimento = 'Turma lotada. A lista de espera chega em uma fase futura.';
      } else if (contrato && data > contrato.dataTerminoContrato) {
        // RF-AGD-05.
        impedimento = `Depois do término do seu contrato (${formatarDataBR(contrato.dataTerminoContrato)}).`;
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
  novoSaldo: number;
  antecedenciaMinimaHoras: number;
}

/**
 * Reserva a vaga e desconta a aula do saldo (RF-AGD-03).
 *
 * Revalida tudo no momento da confirmação — saldo, vigência, capacidade,
 * pausa, inadimplência —, porque entre carregar a grade e confirmar o
 * cenário pode ter mudado (outra aluna ocupou a última vaga, por exemplo).
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

  const contratos = await contratoRepositorio.listar();
  const contrato = contratos.find((c) => c.alunaId === aluna.id && c.situacao !== 'encerrado');

  const bloqueio = bloqueioParaAgendar(aluna, contrato);
  if (bloqueio) throw new RegraNegocioError(`${bloqueio.motivo} ${bloqueio.detalhe ?? ''}`.trim());
  if (!contrato) throw new RegraNegocioError('Esta aluna não tem contrato ativo.');

  if (data > contrato.dataTerminoContrato) {
    throw new RegraNegocioError(
      `Esta data é posterior ao término do contrato (${formatarDataBR(contrato.dataTerminoContrato)}).`,
    );
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
  });

  const novoSaldo = experimental ? contrato.saldoAulas : contrato.saldoAulas - 1;
  if (!experimental) {
    await contratoRepositorio.atualizar(contrato.id, { saldoAulas: novoSaldo });
  }

  const antecedenciaMinimaHoras = await antecedenciaMinimaEmHoras();

  await notificacaoRepositorio.criar({
    destinatarioId: aluna.id,
    evento: 'agendamento_confirmado',
    canal: 'email',
    conteudo: `Aula agendada para ${formatarDataBR(data)} às ${sessao.horarioInicio}. Saldo restante: ${novoSaldo} aula(s). Cancelamentos com ${antecedenciaMinimaHoras}h ou mais de antecedência devolvem o crédito.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
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

  return { agendamento, novoSaldo, antecedenciaMinimaHoras };
}

export interface ResultadoCancelamento {
  creditoDevolvido: boolean;
  novoSaldo: number;
  /** A aluna pode justificar a falta quando o crédito não voltou (RF-CAN-02, RF-JUS-01). */
  podeJustificar: boolean;
}

/**
 * Cancelamento pela aluna (RF-CAN-01/02).
 *
 * Acima da antecedência mínima o crédito volta ao saldo; abaixo dela a
 * aula é consumida, e a aluna pode enviar justificativa. A tela avisa
 * disso **antes** de confirmar — aqui só aplicamos a regra.
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

  const contratos = await contratoRepositorio.listar();
  const contrato = contratos.find((c) => c.alunaId === agendamento.alunaId && c.situacao !== 'encerrado');

  let novoSaldo = contrato?.saldoAulas ?? 0;
  if (contrato && creditoDevolvido && !agendamento.experimental) {
    novoSaldo = contrato.saldoAulas + 1;
    await contratoRepositorio.atualizar(contrato.id, { saldoAulas: novoSaldo });
  }

  await notificacaoRepositorio.criar({
    destinatarioId: agendamento.alunaId,
    evento: 'agendamento_cancelado',
    canal: 'email',
    conteudo: creditoDevolvido
      ? `Aula de ${formatarDataBR(dataAula)} cancelada. O crédito voltou ao seu saldo (${novoSaldo} aula(s)).`
      : `Aula de ${formatarDataBR(dataAula)} cancelada com menos de ${antecedencia}h de antecedência, então a aula foi consumida. Você pode enviar uma justificativa para análise.`,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
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
    podeJustificar: !creditoDevolvido && !agendamento.experimental,
  };
}
