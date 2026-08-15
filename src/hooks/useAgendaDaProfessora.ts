import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  espacoRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  solicitacaoCancelamentoRepositorio,
} from '../services/repositorios';
import type { Professora, Sessao, SolicitacaoCancelamento } from '../types/domain';
import { hojeISO, somarDias } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';

export interface AulaDaProfessora {
  sessao: Sessao;
  data: string;
  nomeModalidade: string;
  nomeEspaco: string | undefined;
  ocupacao: number;
  cancelada: boolean;
  motivoCancelamento: string | undefined;
  /** Preenchido quando a professora está cobrindo a aula de outra pessoa. */
  substituindo: boolean;
  solicitacao: SolicitacaoCancelamento | undefined;
}

/** Quantos dias à frente a professora enxerga a própria agenda. */
const DIAS_VISIVEIS = 28;

/**
 * Agenda da professora logada: as próprias aulas das próximas semanas,
 * incluindo as que ela assumiu como substituta, com a situação de cada
 * solicitação de cancelamento (RF-CPR-06).
 */
export function useAgendaDaProfessora(usuarioId: string | undefined) {
  const [professora, setProfessora] = useState<Professora | undefined>();
  const [aulas, setAulas] = useState<AulaDaProfessora[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCancelamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!usuarioId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    const [professoras, sessoes, ocorrencias, agendamentos, modalidades, espacos, excecoes, listaSolicitacoes] =
      await Promise.all([
        professoraRepositorio.listar(),
        sessaoRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        agendamentoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        espacoRepositorio.listar(),
        excecaoCalendarioRepositorio.listar(),
        solicitacaoCancelamentoRepositorio.listar(),
      ]);

    const minha = professoras.find((p) => p.usuarioId === usuarioId);
    setProfessora(minha);

    if (!minha) {
      setCarregando(false);
      return;
    }

    const minhasSolicitacoes = listaSolicitacoes
      .filter((s) => s.professoraSolicitanteId === minha.id)
      .sort((a, b) => b.data.localeCompare(a.data));
    setSolicitacoes(minhasSolicitacoes);

    const hoje = hojeISO();
    const limite = somarDias(hoje, DIAS_VISIVEIS);
    const lista: AulaDaProfessora[] = [];

    for (let data = hoje; data <= limite; data = somarDias(data, 1)) {
      const excecao = excecoes.find((e) => e.data === data);

      for (const sessao of sessoes) {
        if (!sessaoOcorreEm(sessao, data)) continue;

        const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
        // A aula é dela quando é a professora da sessão ou quando assumiu
        // aquela data como substituta.
        const professoraEfetivaId = ocorrencia?.professoraEfetivaId ?? sessao.professoraId;
        if (professoraEfetivaId !== minha.id) continue;

        lista.push({
          sessao,
          data,
          nomeModalidade: modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade removida',
          nomeEspaco: espacos.find((e) => e.id === sessao.espacoId)?.nome,
          ocupacao: ocorrencia
            ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
            : 0,
          cancelada: excecao !== undefined || ocorrencia?.situacao === 'cancelada',
          motivoCancelamento: excecao ? excecao.descricao : ocorrencia?.motivoCancelamento,
          substituindo: sessao.professoraId !== minha.id,
          solicitacao: minhasSolicitacoes.find((s) => s.sessaoId === sessao.id && s.data === data),
        });
      }
    }

    setAulas(
      lista.sort((a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio)),
    );
    setCarregando(false);
  }, [usuarioId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { professora, aulas, solicitacoes, carregando, recarregar };
}
