import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  chamadaRepositorio,
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
import { listarAulasExcepcionais } from './aulasExcepcionais';
import type { AulaExcepcionalDetalhada } from './aulasExcepcionais';

/**
 * Aula excepcional na agenda da professora (RF-AEX-10): ela aparece nas
 * sessões do dia de cada professora vinculada, com a situação da chamada.
 */
export interface AulaExcepcionalDaProfessora extends AulaExcepcionalDetalhada {
  chamadaFinalizada: boolean;
  chamadaPendente: boolean;
}

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
  /** Situação da chamada daquela data (RF-PRE-01). */
  chamadaFinalizada: boolean;
  /** A aula já aconteceu e ainda tem chamada em aberto (RF-PRE-08). */
  chamadaPendente: boolean;
}

/** Quantos dias à frente a professora enxerga a própria agenda. */
const DIAS_VISIVEIS = 28;

/**
 * Quantos dias para trás a agenda vai. A professora precisa alcançar as
 * aulas recentes para fazer ou corrigir a chamada dentro do prazo
 * (RF-PRE-05); usamos uma folga sobre o prazo configurado para que uma
 * chamada esquecida ainda apareça na tela.
 */
const DIAS_RETROATIVOS = 14;

/**
 * Agenda da professora logada: as próprias aulas das próximas semanas,
 * incluindo as que ela assumiu como substituta, com a situação de cada
 * solicitação de cancelamento (RF-CPR-06).
 */
export function useAgendaDaProfessora(usuarioId: string | undefined) {
  const [professora, setProfessora] = useState<Professora | undefined>();
  const [aulas, setAulas] = useState<AulaDaProfessora[]>([]);
  const [aulasExcepcionais, setAulasExcepcionais] = useState<AulaExcepcionalDaProfessora[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCancelamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!usuarioId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    const [professoras, sessoes, ocorrencias, agendamentos, modalidades, espacos, excecoes, listaSolicitacoes, chamadas] =
      await Promise.all([
        professoraRepositorio.listar(),
        sessaoRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        agendamentoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        espacoRepositorio.listar(),
        excecaoCalendarioRepositorio.listar(),
        solicitacaoCancelamentoRepositorio.listar(),
        chamadaRepositorio.listar(),
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
    const inicio = somarDias(hoje, -DIAS_RETROATIVOS);
    const limite = somarDias(hoje, DIAS_VISIVEIS);
    const lista: AulaDaProfessora[] = [];

    for (let data = inicio; data <= limite; data = somarDias(data, 1)) {
      const excecao = excecoes.find((e) => e.data === data);

      for (const sessao of sessoes) {
        if (!sessaoOcorreEm(sessao, data)) continue;

        const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
        // A aula é dela quando é a professora da sessão ou quando assumiu
        // aquela data como substituta.
        const professoraEfetivaId = ocorrencia?.professoraEfetivaId ?? sessao.professoraId;
        if (professoraEfetivaId !== minha.id) continue;

        const chamada = ocorrencia ? chamadas.find((c) => c.ocorrenciaSessaoId === ocorrencia.id) : undefined;
        const alunasAgendadas = ocorrencia
          ? agendamentos.filter(
              (a) => a.ocorrenciaSessaoId === ocorrencia.id && (a.situacao === 'ativo' || a.situacao === 'realizado'),
            ).length
          : 0;
        const cancelada = excecao !== undefined || ocorrencia?.situacao === 'cancelada';

        lista.push({
          sessao,
          data,
          nomeModalidade: modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade removida',
          nomeEspaco: espacos.find((e) => e.id === sessao.espacoId)?.nome,
          ocupacao: alunasAgendadas,
          cancelada,
          motivoCancelamento: excecao ? excecao.descricao : ocorrencia?.motivoCancelamento,
          substituindo: sessao.professoraId !== minha.id,
          solicitacao: minhasSolicitacoes.find((s) => s.sessaoId === sessao.id && s.data === data),
          chamadaFinalizada: chamada?.situacao === 'finalizada',
          chamadaPendente: data < hoje && !cancelada && alunasAgendadas > 0 && chamada?.situacao !== 'finalizada',
        });
      }
    }

    setAulas(
      lista.sort((a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio)),
    );

    // RF-AEX-10: workshop e aula particular entram na agenda de cada
    // professora vinculada, com chamada própria.
    const todasExcepcionais = await listarAulasExcepcionais();
    setAulasExcepcionais(
      todasExcepcionais
        .filter(
          (aula) =>
            aula.situacao === 'ativa' &&
            aula.data >= inicio &&
            aula.data <= limite &&
            aula.professoras.some((p) => p.professoraId === minha.id),
        )
        .map((aula) => {
          const chamada = chamadas.find((c) => c.aulaExcepcionalId === aula.id);
          return {
            ...aula,
            chamadaFinalizada: chamada?.situacao === 'finalizada',
            chamadaPendente: aula.data < hoje && aula.alocadas > 0 && chamada?.situacao !== 'finalizada',
          };
        })
        .sort((a, b) => a.data.localeCompare(b.data) || a.horarioInicio.localeCompare(b.horarioInicio)),
    );

    setCarregando(false);
  }, [usuarioId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    professora,
    aulas,
    aulasExcepcionais,
    solicitacoes,
    carregando,
    recarregar,
    diasVisiveis: DIAS_VISIVEIS,
    diasRetroativos: DIAS_RETROATIVOS,
    pendentes: aulas.filter((aula) => aula.chamadaPendente),
    pendentesExcepcionais: aulasExcepcionais.filter((aula) => aula.chamadaPendente),
  };
}
