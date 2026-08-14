import { useCallback, useEffect, useState } from 'react';
import { espacoRepositorio } from '../services/repositorios';
import type { Espaco } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export function useEspacos() {
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await espacoRepositorio.listar();
    setEspacos(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criar(nome: string) {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) throw new RegraNegocioError('Informe o nome do espaço.');
    await espacoRepositorio.criar({ nome: nomeLimpo, situacao: 'ativo' });
    await recarregar();
  }

  async function atualizar(id: string, nome: string) {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) throw new RegraNegocioError('Informe o nome do espaço.');
    await espacoRepositorio.atualizar(id, { nome: nomeLimpo });
    await recarregar();
  }

  async function alternarSituacao(espaco: Espaco) {
    await espacoRepositorio.atualizar(espaco.id, { situacao: espaco.situacao === 'ativo' ? 'inativo' : 'ativo' });
    await recarregar();
  }

  async function remover(id: string) {
    await espacoRepositorio.remover(id);
    await recarregar();
  }

  return { espacos, carregando, criar, atualizar, alternarSituacao, remover };
}
