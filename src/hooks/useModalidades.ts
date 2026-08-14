import { useCallback, useEffect, useState } from 'react';
import { modalidadeRepositorio, sessaoRepositorio } from '../services/repositorios';
import type { Modalidade } from '../types/domain';

export class RegraNegocioError extends Error {}

export function useModalidades() {
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await modalidadeRepositorio.listar();
    setModalidades(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function validarNomeUnico(nome: string, ignorarId?: string) {
    const normalizado = nome.trim().toUpperCase();
    const duplicada = modalidades.some((m) => m.id !== ignorarId && m.nome === normalizado);
    if (duplicada) {
      throw new RegraNegocioError(`Já existe uma modalidade chamada "${normalizado}".`);
    }
    return normalizado;
  }

  async function criar(dados: { nome: string; capacidadeMaxima: number }) {
    const nome = validarNomeUnico(dados.nome);
    await modalidadeRepositorio.criar({ nome, capacidadeMaxima: dados.capacidadeMaxima, situacao: 'ativo' });
    await recarregar();
  }

  async function atualizar(id: string, dados: { nome: string; capacidadeMaxima: number }) {
    const nome = validarNomeUnico(dados.nome, id);
    await modalidadeRepositorio.atualizar(id, { nome, capacidadeMaxima: dados.capacidadeMaxima });
    await recarregar();
  }

  async function alternarSituacao(modalidade: Modalidade) {
    await modalidadeRepositorio.atualizar(modalidade.id, {
      situacao: modalidade.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  async function remover(id: string) {
    const sessoes = await sessaoRepositorio.listar();
    const vinculadaASessaoAtiva = sessoes.some((s) => s.modalidadeId === id && s.situacao === 'ativo');
    if (vinculadaASessaoAtiva) {
      throw new RegraNegocioError(
        'Esta modalidade está vinculada a sessões ativas na grade e não pode ser excluída — inative-a em vez disso.',
      );
    }
    await modalidadeRepositorio.remover(id);
    await recarregar();
  }

  return { modalidades, carregando, criar, atualizar, alternarSituacao, remover };
}
