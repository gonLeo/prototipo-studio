import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  anamneseRepositorio,
  cobrancaRepositorio,
  contratoRepositorio,
  historicoBolsaRepositorio,
  historicoPlanoRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  pausaRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Agendamento,
  Aluna,
  Anamnese,
  Cobranca,
  Contrato,
  HistoricoBolsa,
  HistoricoPlano,
  Pacote,
  Pausa,
  Usuario,
} from '../types/domain';
import { hojeISO } from '../utils/data';

export interface FrequenciaDaAluna extends Agendamento {
  dataAula: string;
}

export interface FichaAluna {
  aluna: Aluna;
  usuario: Usuario;
  /** Contrato vigente (não encerrado); indefinido se a aluna só tem histórico. */
  contrato: Contrato | undefined;
  pacote: Pacote | undefined;
  anamnese: Anamnese | undefined;
  contratos: Contrato[];
  historicoPlanos: HistoricoPlano[];
  historicoBolsas: HistoricoBolsa[];
  pausas: Pausa[];
  frequencia: FrequenciaDaAluna[];
  cobrancas: Cobranca[];
  pacotes: Pacote[];
}

/**
 * Visão consolidada da aluna (RF-ALU-09): dados cadastrais, anamnese,
 * pacote ativo, saldo, validade, situação financeira e os históricos de
 * contratos, planos, bolsas, pausas, frequência e pagamentos.
 *
 * Frequência e pagamentos já são lidos aqui, mas só ganham conteúdo
 * quando os módulos que os produzem existirem (M9 na Fase 5 e M11 na
 * Fase 6) — até lá as seções aparecem vazias, sem dado inventado.
 */
export function useFichaAluna(alunaId: string | undefined) {
  const [ficha, setFicha] = useState<FichaAluna | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!alunaId) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    const [
      alunas,
      usuarios,
      contratos,
      pacotes,
      anamneses,
      planos,
      bolsas,
      pausas,
      agendamentos,
      ocorrencias,
      cobrancas,
    ] = await Promise.all([
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
      contratoRepositorio.listar(),
      pacoteRepositorio.listar(),
      anamneseRepositorio.listar(),
      historicoPlanoRepositorio.listar(),
      historicoBolsaRepositorio.listar(),
      pausaRepositorio.listar(),
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      cobrancaRepositorio.listar(),
    ]);

    const aluna = alunas.find((a) => a.id === alunaId);
    const usuario = aluna && usuarios.find((u) => u.id === aluna.usuarioId);
    if (!aluna || !usuario) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    const contratosDaAluna = contratos
      .filter((c) => c.alunaId === aluna.id)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
    const contrato = contratosDaAluna.find((c) => c.situacao !== 'encerrado');
    const idsContratos = contratosDaAluna.map((c) => c.id);

    const frequencia = agendamentos
      .filter((a) => a.alunaId === aluna.id)
      .map((agendamento) => ({
        ...agendamento,
        dataAula: ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId)?.data ?? '',
      }))
      .sort((a, b) => b.dataAula.localeCompare(a.dataAula));

    setFicha({
      aluna,
      usuario,
      contrato,
      pacote: pacotes.find((p) => p.id === contrato?.pacoteId),
      anamnese: anamneses.find((a) => a.alunaId === aluna.id),
      contratos: contratosDaAluna,
      historicoPlanos: planos
        .filter((p) => idsContratos.includes(p.contratoId))
        .sort((a, b) => b.data.localeCompare(a.data)),
      historicoBolsas: bolsas
        .filter((b) => idsContratos.includes(b.contratoId))
        .sort((a, b) => b.data.localeCompare(a.data)),
      pausas: pausas
        .filter((p) => idsContratos.includes(p.contratoId))
        .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
      frequencia,
      cobrancas: cobrancas
        .filter((c) => idsContratos.includes(c.contratoId))
        .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento)),
      pacotes,
    });
    setCarregando(false);
  }, [alunaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ficha, carregando, recarregar, hoje: hojeISO() };
}
