import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  chamadaRepositorio,
  contratoRepositorio,
  justificativaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  professoraRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Agendamento, Aluna, Contrato, Justificativa, Pacote } from '../types/domain';
import { hojeISO, horasAteAula } from '../utils/data';
import {
  antecedenciaMinimaEmHoras,
  bloqueioParaAgendar,
  janelaDeAgendamentoEmDias,
  listarAulasDisponiveis,
  prazoDeJustificativaEmDias,
} from './agendamentoDeAulas';
import type { AulaDisponivel, BloqueioDaAluna } from './agendamentoDeAulas';

export interface AulaDaAluna extends Agendamento {
  data: string;
  horarioInicio: string;
  horarioFim: string;
  nomeModalidade: string;
  nomeProfessora: string;
  /** A ocorrência daquela data foi cancelada pelo studio. */
  canceladaPeloStudio: boolean;
  motivoCancelamento: string | undefined;
  justificativa: Justificativa | undefined;
  horasAteAAula: number;
  /** Presença registrada na chamada, quando ela já foi finalizada (RF-PRE-07). */
  presenca: 'presente' | 'ausente' | undefined;
}

/**
 * Agenda da aluna logada: grade disponível para agendar (M7) e as próprias
 * aulas, com o que é preciso para cancelar ou justificar (M8).
 */
export function useAgendaDaAluna(usuarioId: string | undefined) {
  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [contrato, setContrato] = useState<Contrato | undefined>();
  const [pacote, setPacote] = useState<Pacote | undefined>();
  const [disponiveis, setDisponiveis] = useState<AulaDisponivel[]>([]);
  const [minhasAulas, setMinhasAulas] = useState<AulaDaAluna[]>([]);
  const [bloqueio, setBloqueio] = useState<BloqueioDaAluna | undefined>();
  const [janelaDias, setJanelaDias] = useState(0);
  const [antecedenciaHoras, setAntecedenciaHoras] = useState(4);
  const [prazoJustificativaDias, setPrazoJustificativaDias] = useState(7);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!usuarioId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    const [
      alunas,
      contratos,
      pacotes,
      agendamentos,
      ocorrencias,
      sessoes,
      modalidades,
      professoras,
      usuarios,
      justificativas,
      chamadas,
      registrosPresenca,
    ] = await Promise.all([
      alunaRepositorio.listar(),
      contratoRepositorio.listar(),
      pacoteRepositorio.listar(),
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      justificativaRepositorio.listar(),
      chamadaRepositorio.listar(),
      registroPresencaRepositorio.listar(),
    ]);

    const minha = alunas.find((a) => a.usuarioId === usuarioId);
    const meuContrato = contratos.find((c) => c.alunaId === minha?.id && c.situacao !== 'encerrado');
    setAluna(minha);
    setContrato(meuContrato);
    setPacote(pacotes.find((p) => p.id === meuContrato?.pacoteId));

    if (!minha) {
      setCarregando(false);
      return;
    }

    setBloqueio(bloqueioParaAgendar(minha, meuContrato));
    setJanelaDias(await janelaDeAgendamentoEmDias(minha));
    setAntecedenciaHoras(await antecedenciaMinimaEmHoras());
    setPrazoJustificativaDias(await prazoDeJustificativaEmDias());
    setDisponiveis(await listarAulasDisponiveis({ aluna: minha, contrato: meuContrato }));

    const agora = new Date();
    const aulas = agendamentos
      .filter((a) => a.alunaId === minha.id)
      .map((agendamento) => {
        const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
        const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
        const professora = professoras.find((p) => p.id === (ocorrencia?.professoraEfetivaId ?? sessao?.professoraId));
        const usuarioProfessora = usuarios.find((u) => u.id === professora?.usuarioId);
        const data = ocorrencia?.data ?? '';
        const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === agendamento.ocorrenciaSessaoId);
        const registro =
          chamada?.situacao === 'finalizada'
            ? registrosPresenca.find((r) => r.chamadaId === chamada.id && r.alunaId === minha.id)
            : undefined;

        return {
          ...agendamento,
          presenca: registro?.situacao,
          data,
          horarioInicio: sessao?.horarioInicio ?? '',
          horarioFim: sessao?.horarioFim ?? '',
          nomeModalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade removida',
          nomeProfessora: usuarioProfessora?.nome ?? 'Professora removida',
          canceladaPeloStudio: ocorrencia?.situacao === 'cancelada',
          motivoCancelamento: ocorrencia?.motivoCancelamento,
          justificativa: justificativas.find((j) => j.agendamentoId === agendamento.id),
          horasAteAAula: data && sessao ? horasAteAula(data, sessao.horarioInicio, agora) : 0,
        };
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.horarioInicio.localeCompare(a.horarioInicio));

    setMinhasAulas(aulas);
    setCarregando(false);
  }, [usuarioId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const hoje = hojeISO();
  const proximas = minhasAulas.filter((a) => a.situacao === 'ativo' && a.data >= hoje && !a.canceladaPeloStudio);
  const historico = minhasAulas.filter((a) => !proximas.includes(a));

  return {
    aluna,
    contrato,
    pacote,
    disponiveis,
    minhasAulas,
    proximas,
    historico,
    bloqueio,
    janelaDias,
    antecedenciaHoras,
    prazoJustificativaDias,
    carregando,
    recarregar,
    hoje,
  };
}
