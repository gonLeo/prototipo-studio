import { useCallback, useEffect, useState } from 'react';
import { pacoteRepositorio, vendaRepositorio } from '../services/repositorios';
import type { Pacote } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export interface DadosPacote {
  nome: string;
  creditos: number;
  validadeDias: number;
  valor: number;
}

/** Catálogo de pacotes de créditos (RF-PAC-01/02/03). */
export function usePacotes() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await pacoteRepositorio.listar();
    setPacotes(lista.sort((a, b) => a.creditos - b.creditos || a.nome.localeCompare(b.nome)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function validar(dados: DadosPacote, ignorarId?: string) {
    const nome = dados.nome.trim();
    if (!nome) throw new RegraNegocioError('Informe o nome do pacote.');
    if (pacotes.some((p) => p.id !== ignorarId && p.nome.toLowerCase() === nome.toLowerCase())) {
      throw new RegraNegocioError(`Já existe um pacote chamado "${nome}".`);
    }
    if (!Number.isInteger(dados.creditos) || dados.creditos < 1) {
      throw new RegraNegocioError('O pacote precisa conceder ao menos um crédito, em número inteiro.');
    }
    if (dados.validadeDias <= 0) throw new RegraNegocioError('Informe a validade dos créditos em dias.');
    if (dados.valor <= 0) throw new RegraNegocioError('O valor do pacote deve ser maior que zero.');
    return nome;
  }

  async function criar(dados: DadosPacote) {
    const nome = validar(dados);
    await pacoteRepositorio.criar({ ...dados, nome, situacao: 'ativo' });
    await recarregar();
  }

  async function atualizar(id: string, dados: DadosPacote) {
    const nome = validar(dados, id);
    await pacoteRepositorio.atualizar(id, { ...dados, nome });
    await recarregar();
  }

  /**
   * RF-PAC-03: inativar tira o pacote das novas vendas sem afetar as
   * carteiras já ativas que o originaram.
   */
  async function alternarSituacao(pacote: Pacote) {
    await pacoteRepositorio.atualizar(pacote.id, {
      situacao: pacote.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  async function remover(id: string) {
    const vendas = await vendaRepositorio.listar();
    if (vendas.some((v) => v.pacoteId === id)) {
      throw new RegraNegocioError(
        'Este pacote já foi vendido a alguma aluna e não pode ser excluído — inative-o para tirá-lo das novas vendas.',
      );
    }
    await pacoteRepositorio.remover(id);
    await recarregar();
  }

  return { pacotes, carregando, criar, atualizar, alternarSituacao, remover };
}
