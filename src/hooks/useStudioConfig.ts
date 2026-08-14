import { useCallback, useEffect, useState } from 'react';
import { studioRepositorio } from '../services/repositorios';
import type { Studio } from '../types/domain';
import { validarHorarioFuncionamento } from '../utils/horarioFuncionamento';

export function useStudioConfig() {
  const [studio, setStudio] = useState<Studio | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await studioRepositorio.listar();
    setStudio(lista[0]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function atualizar(dados: Omit<Studio, 'id'>) {
    if (!studio) return;
    const erro = validarHorarioFuncionamento(dados.horarioFuncionamento);
    if (erro) throw new Error(erro);
    await studioRepositorio.atualizar(studio.id, dados);
    await recarregar();
  }

  return { studio, carregando, atualizar };
}
