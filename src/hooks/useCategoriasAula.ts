import { useCallback, useEffect, useState } from 'react';
import { categoriaAulaRepositorio } from '../services/repositorios';
import type { CategoriaAula } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export interface DadosCategoriaAula {
  nome: string;
  custoEmCreditos: number;
  excepcional: boolean;
}

/**
 * RF-CFG-05: a categoria da aula define quanto ela custa em créditos, e a
 * administração pode alterar os custos e cadastrar categorias novas sem
 * intervenção técnica.
 */
export function useCategoriasAula() {
  const [categorias, setCategorias] = useState<CategoriaAula[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await categoriaAulaRepositorio.listar();
    setCategorias(lista.sort((a, b) => a.custoEmCreditos - b.custoEmCreditos || a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function validar(dados: DadosCategoriaAula, ignorarId?: string) {
    const nome = dados.nome.trim();
    if (!nome) throw new RegraNegocioError('Informe o nome da categoria.');
    if (categorias.some((c) => c.id !== ignorarId && c.nome.toLowerCase() === nome.toLowerCase())) {
      throw new RegraNegocioError(`Já existe uma categoria de aula chamada "${nome}".`);
    }
    if (!Number.isInteger(dados.custoEmCreditos) || dados.custoEmCreditos < 1) {
      throw new RegraNegocioError('O custo precisa ser um número inteiro de créditos, a partir de 1.');
    }
    return nome;
  }

  async function criar(dados: DadosCategoriaAula) {
    const nome = validar(dados);
    await categoriaAulaRepositorio.criar({ ...dados, nome, situacao: 'ativo' });
    await recarregar();
  }

  async function atualizar(id: string, dados: DadosCategoriaAula) {
    const nome = validar(dados, id);
    await categoriaAulaRepositorio.atualizar(id, { ...dados, nome });
    await recarregar();
  }

  async function alternarSituacao(categoria: CategoriaAula) {
    await categoriaAulaRepositorio.atualizar(categoria.id, {
      situacao: categoria.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  async function remover(id: string) {
    await categoriaAulaRepositorio.remover(id);
    await recarregar();
  }

  return { categorias, carregando, criar, atualizar, alternarSituacao, remover };
}
