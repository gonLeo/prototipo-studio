import { useCallback, useEffect, useState } from 'react';
import { categoriaProfessoraRepositorio, professoraRepositorio } from '../services/repositorios';
import type { CategoriaProfessora } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export function useCategoriasProfessora() {
  const [categorias, setCategorias] = useState<CategoriaProfessora[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await categoriaProfessoraRepositorio.listar();
    setCategorias(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criar(dados: { nome: string; valorPorAula: number }) {
    const nome = dados.nome.trim();
    if (!nome) throw new RegraNegocioError('Informe o nome da categoria.');
    if (dados.valorPorAula <= 0) throw new RegraNegocioError('O valor por aula deve ser maior que zero.');
    await categoriaProfessoraRepositorio.criar({ nome, valorPorAula: dados.valorPorAula, situacao: 'ativo' });
    await recarregar();
  }

  async function atualizar(id: string, dados: { nome: string; valorPorAula: number }) {
    const nome = dados.nome.trim();
    if (!nome) throw new RegraNegocioError('Informe o nome da categoria.');
    if (dados.valorPorAula <= 0) throw new RegraNegocioError('O valor por aula deve ser maior que zero.');
    await categoriaProfessoraRepositorio.atualizar(id, { nome, valorPorAula: dados.valorPorAula });
    await recarregar();
  }

  async function alternarSituacao(categoria: CategoriaProfessora) {
    await categoriaProfessoraRepositorio.atualizar(categoria.id, {
      situacao: categoria.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  async function remover(id: string) {
    const professoras = await professoraRepositorio.listar();
    if (professoras.some((p) => p.categoriaId === id)) {
      throw new RegraNegocioError('Esta categoria está vinculada a professoras e não pode ser excluída — inative-a em vez disso.');
    }
    await categoriaProfessoraRepositorio.remover(id);
    await recarregar();
  }

  return { categorias, carregando, criar, atualizar, alternarSituacao, remover };
}
