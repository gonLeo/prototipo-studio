import { useCallback, useEffect, useState } from 'react';
import { contratoRepositorio, pacoteRepositorio } from '../services/repositorios';
import type { Pacote } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export interface DadosPacote {
  nome: string;
  valorMensal: number;
  aulasPorCiclo: number;
  aulasPorSemana: number;
  duracaoMeses: number;
  validadeCicloDias: number;
  limiteDiasPausa: number;
}

export function usePacotes() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await pacoteRepositorio.listar();
    setPacotes(lista.sort((a, b) => a.aulasPorCiclo - b.aulasPorCiclo));
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
    if (dados.valorMensal <= 0) throw new RegraNegocioError('O valor mensal deve ser maior que zero.');
    if (dados.aulasPorCiclo <= 0) throw new RegraNegocioError('O pacote precisa ter ao menos uma aula por ciclo.');
    if (dados.aulasPorSemana <= 0) throw new RegraNegocioError('Informe quantas aulas por semana o pacote permite.');
    if (dados.duracaoMeses <= 0) throw new RegraNegocioError('A duração do contrato deve ser de ao menos um mês.');
    if (dados.validadeCicloDias <= 0) throw new RegraNegocioError('Informe a validade do ciclo em dias.');
    if (dados.limiteDiasPausa < 0) throw new RegraNegocioError('O limite de dias de pausa não pode ser negativo.');
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
   * RF-PAC-06: inativar tira o pacote das novas contratações sem afetar os
   * contratos vigentes que já o utilizam.
   */
  async function alternarSituacao(pacote: Pacote) {
    await pacoteRepositorio.atualizar(pacote.id, {
      situacao: pacote.situacao === 'ativo' ? 'inativo' : 'ativo',
    });
    await recarregar();
  }

  async function remover(id: string) {
    const contratos = await contratoRepositorio.listar();
    if (contratos.some((c) => c.pacoteId === id)) {
      throw new RegraNegocioError(
        'Este pacote já foi contratado por alguma aluna e não pode ser excluído — inative-o para tirá-lo das novas contratações.',
      );
    }
    await pacoteRepositorio.remover(id);
    await recarregar();
  }

  return { pacotes, carregando, criar, atualizar, alternarSituacao, remover };
}
