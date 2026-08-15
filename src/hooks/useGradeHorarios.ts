import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  espacoRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  studioRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Agendamento,
  Espaco,
  ExcecaoCalendario,
  Modalidade,
  OcorrenciaSessao,
  Sessao,
} from '../types/domain';
import { hojeISO, somarDias } from '../utils/data';
import {
  diasEmConflito,
  rotularDias,
  sessaoOcorreEm,
  validarFaixaContraFuncionamento,
} from '../utils/grade';
import type { FaixaHorario, SessaoCandidata } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import { cancelarOcorrenciasFuturasDaSessao, contarAlunasAfetadasNaSessao } from './cancelamentoDeAulas';

export interface SessaoComDetalhes extends Sessao {
  modalidade: Modalidade | undefined;
  espaco: Espaco | undefined;
  nomeProfessora: string;
}

/** Dados comuns a todas as faixas informadas numa mesma operação de cadastro. */
export interface DadosSessao {
  modalidadeId: string;
  professoraId: string;
  espacoId?: string;
  dataInicio: string;
  dataTermino?: string;
  descricao?: string;
}

export function useGradeHorarios() {
  const [sessoes, setSessoes] = useState<SessaoComDetalhes[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaSessao[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [excecoes, setExcecoes] = useState<ExcecaoCalendario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, modalidades, espacos, professoras, usuarios, listaOcorrencias, listaAgendamentos, listaExcecoes] =
      await Promise.all([
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        espacoRepositorio.listar(),
        professoraRepositorio.listar(),
        usuarioRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        agendamentoRepositorio.listar(),
        excecaoCalendarioRepositorio.listar(),
      ]);

    const combinadas = lista
      .map((sessao) => {
        const professora = professoras.find((p) => p.id === sessao.professoraId);
        const usuario = usuarios.find((u) => u.id === professora?.usuarioId);
        return {
          ...sessao,
          modalidade: modalidades.find((m) => m.id === sessao.modalidadeId),
          espaco: espacos.find((e) => e.id === sessao.espacoId),
          nomeProfessora: usuario?.nome ?? 'Professora removida',
        };
      })
      .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));

    setSessoes(combinadas);
    setOcorrencias(listaOcorrencias);
    setAgendamentos(listaAgendamentos);
    setExcecoes(listaExcecoes);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /**
   * Valida uma faixa contra o funcionamento do studio (RF-GRD-05) e contra
   * conflitos de professora (RF-GRD-03) e de espaço (RF-GRD-04). Cada faixa
   * é validada isoladamente, para que a usuária saiba exatamente qual delas
   * precisa ajustar (RF-GRD-02).
   */
  async function validarFaixa(faixa: FaixaHorario, dados: DadosSessao, ignorarSessaoId?: string) {
    const [studios, listaSessoes] = await Promise.all([studioRepositorio.listar(), sessaoRepositorio.listar()]);
    const studio = studios[0];
    if (!studio) throw new RegraNegocioError('Configure os dados do studio antes de montar a grade.');

    const erroFuncionamento = validarFaixaContraFuncionamento(faixa, studio.horarioFuncionamento);
    if (erroFuncionamento) throw new RegraNegocioError(erroFuncionamento);

    const candidata: SessaoCandidata = {
      id: ignorarSessaoId,
      ...faixa,
      professoraId: dados.professoraId,
      espacoId: dados.espacoId,
      dataInicio: dados.dataInicio,
      dataTermino: dados.dataTermino,
    };

    for (const existente of listaSessoes) {
      const conflitos = diasEmConflito(candidata, existente);
      if (conflitos.length === 0) continue;

      const detalhe = `${rotularDias(conflitos)}, ${existente.horarioInicio}–${existente.horarioFim}`;
      const nomeModalidade = sessoes.find((s) => s.id === existente.id)?.modalidade?.nome ?? 'outra sessão';

      if (existente.professoraId === dados.professoraId) {
        throw new RegraNegocioError(
          `Conflito de professora: ela já tem "${nomeModalidade}" em ${detalhe}. Ajuste ou remova essa faixa.`,
        );
      }
      if (dados.espacoId && existente.espacoId === dados.espacoId) {
        throw new RegraNegocioError(
          `Conflito de espaço: o espaço já está ocupado por "${nomeModalidade}" em ${detalhe}. Ajuste ou remova essa faixa.`,
        );
      }
    }
  }

  /**
   * Cria uma sessão por faixa informada (RF-GRD-01/02). Todas as faixas são
   * validadas antes de qualquer gravação, para não deixar a grade em estado
   * parcial se a última faixa for inválida.
   */
  async function criar(dados: DadosSessao, faixas: FaixaHorario[]) {
    if (faixas.length === 0) throw new RegraNegocioError('Informe ao menos uma faixa de dia e horário.');

    const modalidades = await modalidadeRepositorio.listar();
    const modalidade = modalidades.find((m) => m.id === dados.modalidadeId);
    if (!modalidade) throw new RegraNegocioError('Selecione uma modalidade válida.');

    if (dados.dataTermino && dados.dataTermino < dados.dataInicio) {
      throw new RegraNegocioError('A data de término não pode ser anterior à data de início.');
    }

    for (const faixa of faixas) {
      await validarFaixa(faixa, dados);
    }

    for (const faixa of faixas) {
      await sessaoRepositorio.criar({
        modalidadeId: dados.modalidadeId,
        professoraId: dados.professoraId,
        espacoId: dados.espacoId,
        diasSemana: faixa.diasSemana,
        horarioInicio: faixa.horarioInicio,
        horarioFim: faixa.horarioFim,
        // RF-GRD-01: capacidade é herdada da modalidade, não digitada.
        capacidade: modalidade.capacidadeMaxima,
        dataInicio: dados.dataInicio,
        dataTermino: dados.dataTermino,
        descricao: dados.descricao,
        espelhadaConvenio: false,
        situacao: 'ativo',
      });
    }

    await recarregar();
  }

  /** Alteração de uma sessão existente (RF-GRD-07 — a confirmação é da tela). */
  async function atualizar(sessaoId: string, dados: DadosSessao, faixa: FaixaHorario) {
    const modalidades = await modalidadeRepositorio.listar();
    const modalidade = modalidades.find((m) => m.id === dados.modalidadeId);
    if (!modalidade) throw new RegraNegocioError('Selecione uma modalidade válida.');

    if (dados.dataTermino && dados.dataTermino < dados.dataInicio) {
      throw new RegraNegocioError('A data de término não pode ser anterior à data de início.');
    }

    await validarFaixa(faixa, dados, sessaoId);

    await sessaoRepositorio.atualizar(sessaoId, {
      modalidadeId: dados.modalidadeId,
      professoraId: dados.professoraId,
      espacoId: dados.espacoId,
      diasSemana: faixa.diasSemana,
      horarioInicio: faixa.horarioInicio,
      horarioFim: faixa.horarioFim,
      capacidade: modalidade.capacidadeMaxima,
      dataInicio: dados.dataInicio,
      dataTermino: dados.dataTermino,
      descricao: dados.descricao,
    });
    await recarregar();
  }

  /**
   * Encerramento (RF-GRD-09): a sessão sai da grade a partir da data
   * informada, mas continua existindo — o histórico de aulas já realizadas
   * é preservado. As datas futuras já agendadas são canceladas.
   */
  async function encerrar(sessao: Sessao, dataTermino: string, autorId: string) {
    if (dataTermino < sessao.dataInicio) {
      throw new RegraNegocioError('A data de término não pode ser anterior ao início da sessão.');
    }
    await sessaoRepositorio.atualizar(sessao.id, { dataTermino });
    await cancelarOcorrenciasFuturasDaSessao(
      sessao,
      'A sessão foi encerrada na grade.',
      autorId,
      // A sessão ainda acontece no próprio dia do término: só as datas
      // seguintes saem da grade.
      somarDias(dataTermino, 1),
    );
    await recarregar();
  }

  /**
   * Exclusão (RF-GRD-08): cancela os agendamentos futuros devolvendo o
   * crédito com prazo adicional e notificando as alunas, depois remove a
   * sessão da grade.
   */
  async function remover(sessao: Sessao, autorId: string) {
    const afetadas = await cancelarOcorrenciasFuturasDaSessao(sessao, 'A sessão foi excluída da grade.', autorId);
    await sessaoRepositorio.remover(sessao.id);
    await recarregar();
    return afetadas;
  }

  async function alternarSituacao(sessao: Sessao) {
    await sessaoRepositorio.atualizar(sessao.id, {
      situacao: sessao.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  /** Sessões que acontecem numa data, já com o estado e a ocupação daquela data específica. */
  function sessoesDaData(data: string) {
    const excecao = excecoes.find((e) => e.data === data);
    return sessoes
      .filter((sessao) => sessaoOcorreEm(sessao, data))
      .map((sessao) => {
        const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
        const ocupacao = ocorrencia
          ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
          : 0;
        return {
          sessao,
          ocorrencia,
          ocupacao,
          cancelada: excecao !== undefined || ocorrencia?.situacao === 'cancelada',
          motivoCancelamento: excecao
            ? excecao.descricao
            : ocorrencia?.situacao === 'cancelada'
              ? ocorrencia.motivoCancelamento
              : undefined,
        };
      })
      .sort((a, b) => a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio));
  }

  function excecaoNaData(data: string) {
    return excecoes.find((e) => e.data === data);
  }

  return {
    sessoes,
    excecoes,
    carregando,
    criar,
    atualizar,
    encerrar,
    remover,
    alternarSituacao,
    sessoesDaData,
    excecaoNaData,
    contarAlunasAfetadas: contarAlunasAfetadasNaSessao,
    hoje: hojeISO(),
    recarregar,
  };
}
