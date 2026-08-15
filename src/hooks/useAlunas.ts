import { useCallback, useEffect, useState } from 'react';
import {
  alunaRepositorio,
  contratoRepositorio,
  pacoteRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Aluna, Contrato, Pacote, SituacaoAluna, Usuario } from '../types/domain';
import { diferencaEmDias, hojeISO } from '../utils/data';

export interface AlunaComDetalhes extends Aluna {
  usuario: Usuario;
  contrato: Contrato | undefined;
  pacote: Pacote | undefined;
}

export const ROTULO_SITUACAO_ALUNA: Record<SituacaoAluna, string> = {
  ativa: 'Ativa',
  inadimplente: 'Inadimplente',
  trancada: 'Trancada',
  suspensa: 'Suspensa',
  encerrada: 'Encerrada',
  aguardando_aceite: 'Aguardando aceite',
};

/** Filtros da lista de alunas (RF-ALU-10, RF-BOL-09). */
export type FiltroAluna = 'todas' | SituacaoAluna | 'pacote_a_vencer' | 'bolsistas';

export const FILTROS_ALUNA: Array<{ valor: FiltroAluna; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'ativa', rotulo: 'Ativas' },
  { valor: 'inadimplente', rotulo: 'Inadimplentes' },
  { valor: 'aguardando_aceite', rotulo: 'Aguardando aceite' },
  { valor: 'trancada', rotulo: 'Trancadas' },
  { valor: 'suspensa', rotulo: 'Suspensas' },
  { valor: 'encerrada', rotulo: 'Encerradas' },
  { valor: 'pacote_a_vencer', rotulo: 'Pacote a vencer' },
  { valor: 'bolsistas', rotulo: 'Bolsistas' },
];

/** Janela usada pelo filtro "pacote a vencer". */
const DIAS_PARA_VENCER = 7;

export function aplicarFiltroDeAluna(aluna: AlunaComDetalhes, filtro: FiltroAluna, hoje: string): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'bolsistas') return aluna.bolsista;
  if (filtro === 'pacote_a_vencer') {
    if (!aluna.contrato || aluna.contrato.situacao !== 'ativo') return false;
    const dias = diferencaEmDias(hoje, aluna.contrato.dataVencimentoCiclo);
    return dias >= 0 && dias <= DIAS_PARA_VENCER;
  }
  return aluna.situacao === filtro;
}

export function useAlunas() {
  const [alunas, setAlunas] = useState<AlunaComDetalhes[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, usuarios, contratos, pacotes] = await Promise.all([
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
      contratoRepositorio.listar(),
      pacoteRepositorio.listar(),
    ]);

    const combinadas = lista
      .map((aluna) => {
        const usuario = usuarios.find((u) => u.id === aluna.usuarioId);
        if (!usuario) return undefined;
        // Contrato vigente é o que ainda não foi encerrado; se todos
        // estiverem encerrados, mostra o mais recente para o histórico.
        const doAluno = contratos.filter((c) => c.alunaId === aluna.id);
        const contrato =
          doAluno.find((c) => c.situacao !== 'encerrado') ??
          doAluno.sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))[0];
        return {
          ...aluna,
          usuario,
          contrato,
          pacote: pacotes.find((p) => p.id === contrato?.pacoteId),
        };
      })
      .filter((a): a is AlunaComDetalhes => a !== undefined)
      .sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome));

    setAlunas(combinadas);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function buscarPorId(alunaId: string) {
    return alunas.find((a) => a.id === alunaId);
  }

  return { alunas, carregando, recarregar, buscarPorId, hoje: hojeISO() };
}
