import {
  agendamentoRepositorio,
  alunaRepositorio,
  chamadaRepositorio,
  convenioIntegracaoRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  registroPresencaRepositorio,
  reservaConvenioRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Aluna,
  ConvenioIntegracao,
  Modalidade,
  NomeConvenio,
  ReservaConvenio,
  Sessao,
} from '../types/domain';
import { formatarDataBR, hojeISO, horasAteAula, somarDias } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import { garantirOcorrencia } from './cancelamentoDeAulas';
import { validarIdentificacaoUnica } from './cadastroDeAlunas';

/**
 * Convênios corporativos (M13).
 *
 * O modelo reproduz a operação atual do studio: a grade é espelhada nos
 * aplicativos dos parceiros, a aluna reserva por lá, a reserva ocupa vaga
 * na sessão e o check-in feito no local é validado automaticamente — é ele
 * que autoriza o repasse.
 *
 * **Não há API real no protótipo.** As mensagens que viriam do parceiro
 * (reserva, cancelamento, check-in) são disparadas pela administração,
 * exatamente como decidido para o M11 e o gateway: o que entra e o que sai
 * do sistema é o mesmo; muda apenas quem aperta o botão. Por isso o mesmo
 * caminho serve à contingência prevista no RF-CNV-13.
 */

export const NOMES_CONVENIO: { valor: NomeConvenio; rotulo: string }[] = [
  { valor: 'wellhub', rotulo: 'Wellhub' },
  { valor: 'totalpass', rotulo: 'TotalPass' },
];

export function rotuloDoConvenio(convenio: NomeConvenio): string {
  return NOMES_CONVENIO.find((c) => c.valor === convenio)?.rotulo ?? convenio;
}

/** Janela de agendamento própria dos convênios (RF-CNV-08). */
export async function janelaDoConvenioEmDias(): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const valor = Number(parametros.find((p) => p.chave === 'janela_agendamento_convenio_dias')?.valor);
  return Number.isFinite(valor) ? valor : 7;
}

/* ------------------------------------------------------------------ */
/* Credenciais de integração (RF-CNV-12)                               */
/* ------------------------------------------------------------------ */

export async function listarIntegracoes(): Promise<ConvenioIntegracao[]> {
  return convenioIntegracaoRepositorio.listar();
}

export async function salvarIntegracao(params: {
  convenio: NomeConvenio;
  credenciais: string;
  situacaoIntegracao: ConvenioIntegracao['situacaoIntegracao'];
  autorId: string;
}): Promise<ConvenioIntegracao> {
  const { convenio, credenciais, situacaoIntegracao, autorId } = params;

  if (!credenciais.trim()) {
    throw new RegraNegocioError('Informe a credencial de integração fornecida pelo convênio.');
  }

  const existentes = await convenioIntegracaoRepositorio.listar();
  const atual = existentes.find((i) => i.convenio === convenio);

  const salva = atual
    ? await convenioIntegracaoRepositorio.atualizar(atual.id, {
        credenciais: credenciais.trim(),
        situacaoIntegracao,
      })
    : await convenioIntegracaoRepositorio.criar({
        convenio,
        credenciais: credenciais.trim(),
        situacaoIntegracao,
      });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'ConvenioIntegracao',
    operacao: 'configuracao_de_integracao',
    autorId,
    dataHora: new Date().toISOString(),
    // A credencial em si não vai para a auditoria.
    valorNovo: { convenio, situacaoIntegracao },
  });

  return salva;
}

/** Marca a sincronização da grade com o parceiro (RF-CNV-01). */
export async function registrarSincronizacao(integracao: ConvenioIntegracao): Promise<ConvenioIntegracao> {
  if (integracao.situacaoIntegracao === 'inativa') {
    throw new RegraNegocioError('Ative a integração deste convênio antes de sincronizar a grade.');
  }
  return convenioIntegracaoRepositorio.atualizar(integracao.id, {
    dataUltimaSincronizacao: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------ */
/* Espelhamento da grade (RF-CNV-01/02)                                */
/* ------------------------------------------------------------------ */

export interface SessaoEspelhada {
  sessao: Sessao;
  modalidade: Modalidade | undefined;
  nomeProfessora: string;
}

export async function listarSessoesParaEspelhamento(): Promise<SessaoEspelhada[]> {
  const [sessoes, modalidades, professoras, usuarios] = await Promise.all([
    sessaoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    professoraRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  return sessoes
    .map((sessao) => {
      const professora = professoras.find((p) => p.id === sessao.professoraId);
      return {
        sessao,
        modalidade: modalidades.find((m) => m.id === sessao.modalidadeId),
        nomeProfessora: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
      };
    })
    .sort((a, b) => a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio));
}

/** RF-CNV-02: a administração escolhe quais sessões vão para os convênios. */
export async function alternarEspelhamento(sessao: Sessao, autorId: string): Promise<Sessao> {
  const atualizada = await sessaoRepositorio.atualizar(sessao.id, {
    espelhadaConvenio: !sessao.espelhadaConvenio,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Sessao',
    operacao: 'espelhamento_convenio',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { espelhadaConvenio: sessao.espelhadaConvenio },
    valorNovo: { espelhadaConvenio: !sessao.espelhadaConvenio },
  });

  return atualizada;
}

/* ------------------------------------------------------------------ */
/* Alunas de convênio                                                   */
/* ------------------------------------------------------------------ */

/**
 * Cadastro de aluna de convênio: existe no studio para ocupar vaga e
 * aparecer na chamada, mas **não tem carteira nem créditos** — o vínculo
 * financeiro dela é com o parceiro.
 */
export async function cadastrarAlunaDeConvenio(params: {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
}): Promise<Aluna> {
  const { nome, email, cpf, telefone } = params;

  await validarIdentificacaoUnica(email, cpf);

  const usuario = await usuarioRepositorio.criar({
    nome: nome.trim(),
    email: email.trim(),
    cpf: cpf.trim(),
    situacao: 'ativo',
    perfis: ['aluna'],
  });

  return alunaRepositorio.criar({
    usuarioId: usuario.id,
    telefone: telefone.trim(),
    dataNascimento: '',
    contatoEmergencia: '',
    origem: 'convenio',
    situacao: 'ativa',
    bolsista: false,
  });
}

export async function listarAlunasDeConvenio(): Promise<Array<Aluna & { nome: string }>> {
  const [alunas, usuarios] = await Promise.all([alunaRepositorio.listar(), usuarioRepositorio.listar()]);
  return alunas
    .filter((a) => a.origem === 'convenio')
    .map((aluna) => ({
      ...aluna,
      nome: usuarios.find((u) => u.id === aluna.usuarioId)?.nome ?? 'Aluna removida',
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/* ------------------------------------------------------------------ */
/* Reservas (RF-CNV-03 a 07, 13)                                        */
/* ------------------------------------------------------------------ */

export interface AulaEspelhadaDisponivel {
  sessao: Sessao;
  modalidade: Modalidade | undefined;
  data: string;
  ocupacao: number;
  vagas: number;
}

/**
 * O que os aplicativos dos convênios enxergam (RF-CNV-01): apenas sessões
 * marcadas para espelhamento, dentro da janela própria do convênio
 * (RF-CNV-08), com as vagas atualizadas.
 */
export async function listarAulasEspelhadas(): Promise<AulaEspelhadaDisponivel[]> {
  const [sessoes, ocorrencias, agendamentos, modalidades, janela] = await Promise.all([
    sessaoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    agendamentoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    janelaDoConvenioEmDias(),
  ]);

  const hoje = hojeISO();
  const limite = somarDias(hoje, janela);
  const aulas: AulaEspelhadaDisponivel[] = [];

  for (let data = hoje; data <= limite; data = somarDias(data, 1)) {
    for (const sessao of sessoes) {
      if (!sessao.espelhadaConvenio || sessao.situacao !== 'ativo') continue;
      if (!sessaoOcorreEm(sessao, data)) continue;

      const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
      if (ocorrencia?.situacao === 'cancelada') continue;

      const ocupacao = ocorrencia
        ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
        : 0;

      aulas.push({
        sessao,
        modalidade: modalidades.find((m) => m.id === sessao.modalidadeId),
        data,
        ocupacao,
        vagas: Math.max(0, sessao.capacidade - ocupacao),
      });
    }
  }

  return aulas.sort(
    (a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio),
  );
}

/**
 * Reserva recebida do convênio (RF-CNV-03/04/07).
 *
 * A resposta ao parceiro é a própria devolução desta função: confirma
 * quando há vaga e **recusa com motivo** quando não há — a capacidade da
 * sessão é a mesma para todo mundo, matriculada ou de convênio.
 */
export async function receberReserva(params: {
  convenio: NomeConvenio;
  alunaId: string;
  sessao: Sessao;
  data: string;
  identificadorExterno?: string;
  origemRegistro?: ReservaConvenio['origemRegistro'];
  autorId: string;
}): Promise<ReservaConvenio> {
  const { convenio, alunaId, sessao, data, autorId } = params;
  const origemRegistro = params.origemRegistro ?? 'integracao';

  if (!sessao.espelhadaConvenio) {
    throw new RegraNegocioError('Esta sessão não está espelhada nos convênios — inclua no espelhamento primeiro.');
  }
  if (!sessaoOcorreEm(sessao, data)) {
    throw new RegraNegocioError('Esta sessão não acontece na data informada.');
  }
  if (horasAteAula(data, sessao.horarioInicio) <= 0) {
    throw new RegraNegocioError('Esta aula já começou.');
  }

  const janela = await janelaDoConvenioEmDias();
  if (data > somarDias(hojeISO(), janela)) {
    throw new RegraNegocioError(
      `A janela de agendamento dos convênios é de ${janela} dias — esta data está fora dela.`,
    );
  }

  const ocorrencia = await garantirOcorrencia(sessao, data);
  if (ocorrencia.situacao === 'cancelada') throw new RegraNegocioError('Esta aula foi cancelada.');

  const agendamentos = await agendamentoRepositorio.listar();
  const ativos = agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo');
  if (ativos.some((a) => a.alunaId === alunaId)) {
    throw new RegraNegocioError('Esta aluna já está reservada nesta aula.');
  }
  // RF-CNV-07: a vaga de convênio ocupa a mesma capacidade da modalidade.
  if (ativos.length >= sessao.capacidade) {
    throw new RegraNegocioError('Reserva recusada: a turma já atingiu a capacidade máxima.');
  }

  await agendamentoRepositorio.criar({
    alunaId,
    ocorrenciaSessaoId: ocorrencia.id,
    origem: 'convenio',
    dataHora: new Date().toISOString(),
    situacao: 'ativo',
    experimental: false,
    // A aluna de convênio não tem carteira no studio (RN-33): ocupa a vaga
    // sem reservar crédito nenhum.
    creditosReservados: 0,
  });

  const reserva = await reservaConvenioRepositorio.criar({
    convenio,
    identificadorExterno:
      params.identificadorExterno?.trim() || `${convenio.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    alunaId,
    ocorrenciaSessaoId: ocorrencia.id,
    situacao: 'confirmada',
    checkinValidado: false,
    data,
    origemRegistro,
  });

  if (origemRegistro === 'contingencia') {
    await registroAuditoriaRepositorio.criar({
      entidadeAfetada: 'ReservaConvenio',
      operacao: 'reserva_em_contingencia',
      autorId,
      dataHora: new Date().toISOString(),
      valorNovo: { convenio, alunaId, sessaoId: sessao.id, data },
    });
  }

  return reserva;
}

/** Cancelamento recebido do convênio (RF-CNV-05): libera a vaga na sessão. */
export async function cancelarReserva(params: { reserva: ReservaConvenio; autorId: string }): Promise<void> {
  const { reserva, autorId } = params;

  if (reserva.situacao === 'cancelada') throw new RegraNegocioError('Esta reserva já está cancelada.');

  const agendamentos = await agendamentoRepositorio.listar();
  const agendamento = agendamentos.find(
    (a) => a.ocorrenciaSessaoId === reserva.ocorrenciaSessaoId && a.alunaId === reserva.alunaId && a.origem === 'convenio',
  );

  if (agendamento && agendamento.situacao === 'ativo') {
    await agendamentoRepositorio.atualizar(agendamento.id, {
      situacao: 'cancelado',
      origemCancelamento: 'aluna',
      // Aluna de convênio não tem saldo de pacote a devolver.
      creditoDevolvido: false,
    });
  }

  await reservaConvenioRepositorio.atualizar(reserva.id, { situacao: 'cancelada' });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'ReservaConvenio',
    operacao: 'cancelamento_de_reserva',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { reservaId: reserva.id, convenio: reserva.convenio },
  });
}

/**
 * Check-in validado (RF-CNV-06): chega do aplicativo do parceiro e é
 * aceito sem confirmação manual. É ele que autoriza o repasse — por isso a
 * presença marcada pela professora (RF-CNV-10) não o substitui.
 */
export async function validarCheckin(reserva: ReservaConvenio): Promise<ReservaConvenio> {
  if (reserva.situacao === 'cancelada') {
    throw new RegraNegocioError('Reserva cancelada não recebe check-in.');
  }
  if (reserva.checkinValidado) return reserva;

  return reservaConvenioRepositorio.atualizar(reserva.id, {
    checkinValidado: true,
    dataHoraCheckin: new Date().toISOString(),
  });
}

export interface ReservaDetalhada extends ReservaConvenio {
  nomeAluna: string;
  dataAula: string;
  descricaoAula: string;
  /** Presença registrada na chamada, quando a aula já teve chamada finalizada. */
  presenca: 'presente' | 'ausente' | undefined;
}

export async function listarReservas(): Promise<ReservaDetalhada[]> {
  const [reservas, ocorrencias, sessoes, modalidades, alunas, usuarios, registros, chamadas] = await Promise.all([
    reservaConvenioRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    sessaoRepositorio.listar(),
    modalidadeRepositorio.listar(),
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
    registroPresencaRepositorio.listar(),
    chamadaRepositorio.listar(),
  ]);

  return reservas
    .map((reserva) => {
      const ocorrencia = ocorrencias.find((o) => o.id === reserva.ocorrenciaSessaoId);
      const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
      const aluna = alunas.find((a) => a.id === reserva.alunaId);
      // A presença precisa ser a **daquela aula**: casada pela chamada da
      // ocorrência, nunca só pelo id da aluna.
      const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === reserva.ocorrenciaSessaoId);
      const registro = chamada
        ? registros.find((r) => r.chamadaId === chamada.id && r.alunaId === reserva.alunaId)
        : undefined;

      return {
        ...reserva,
        nomeAluna: usuarios.find((u) => u.id === aluna?.usuarioId)?.nome ?? 'Aluna removida',
        dataAula: ocorrencia?.data ?? reserva.data ?? '',
        descricaoAula: sessao
          ? `${modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade'} · ${sessao.horarioInicio}`
          : 'Aula removida',
        presenca: registro?.situacao,
      };
    })
    .sort((a, b) => b.dataAula.localeCompare(a.dataAula));
}

/* ------------------------------------------------------------------ */
/* Relatório de conferência do repasse (RF-CNV-11)                      */
/* ------------------------------------------------------------------ */

export interface LinhaRelatorioConvenio {
  convenio: NomeConvenio;
  reservas: number;
  canceladas: number;
  checkinsValidados: number;
  ausencias: number;
  /** Reserva confirmada, aula já passada e nenhum check-in recebido. */
  semCheckin: number;
}

export async function relatorioDeConvenios(params: {
  dataInicio: string;
  dataFim: string;
}): Promise<LinhaRelatorioConvenio[]> {
  const { dataInicio, dataFim } = params;

  const reservas = await listarReservas();
  const hoje = hojeISO();

  const linhas = new Map<NomeConvenio, LinhaRelatorioConvenio>();
  for (const { valor } of NOMES_CONVENIO) {
    linhas.set(valor, {
      convenio: valor,
      reservas: 0,
      canceladas: 0,
      checkinsValidados: 0,
      ausencias: 0,
      semCheckin: 0,
    });
  }

  for (const reserva of reservas) {
    if (!reserva.dataAula || reserva.dataAula < dataInicio || reserva.dataAula > dataFim) continue;

    const linha = linhas.get(reserva.convenio);
    if (!linha) continue;

    linha.reservas += 1;
    if (reserva.situacao === 'cancelada') {
      linha.canceladas += 1;
      continue;
    }
    if (reserva.checkinValidado) linha.checkinsValidados += 1;
    else if (reserva.dataAula < hoje) linha.semCheckin += 1;

    if (reserva.presenca === 'ausente' && reserva.dataAula < hoje) linha.ausencias += 1;
  }

  return [...linhas.values()];
}

/** Texto curto do estado da integração, usado nas telas. */
export function descreverIntegracao(integracao: ConvenioIntegracao | undefined): string {
  if (!integracao) return 'Sem credenciais cadastradas.';
  if (integracao.situacaoIntegracao === 'inativa') return 'Integração inativa.';
  const quando = integracao.dataUltimaSincronizacao
    ? `última sincronização em ${formatarDataBR(integracao.dataUltimaSincronizacao.slice(0, 10))}`
    : 'ainda sem sincronização';
  return integracao.situacaoIntegracao === 'contingencia'
    ? `Em contingência — reservas registradas manualmente (${quando}).`
    : `Integração ativa — ${quando}.`;
}
