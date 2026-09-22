import { useCallback, useEffect, useState } from 'react';
import {
  excecaoCalendarioRepositorio,
  ocorrenciaSessaoRepositorio,
  sessaoRepositorio,
} from '../services/repositorios';
import type { ExcecaoCalendario, TipoExcecao } from '../types/domain';
import { hojeISO } from '../utils/data';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import { cancelarOcorrencia, previaDeImpactoNaData } from './cancelamentoDeAulas';

export const TIPOS_EXCECAO: Array<{ valor: TipoExcecao; rotulo: string }> = [
  { valor: 'feriado', rotulo: 'Feriado' },
  { valor: 'recesso', rotulo: 'Recesso' },
  { valor: 'manutencao', rotulo: 'Manutenção' },
  { valor: 'fechamento', rotulo: 'Fechamento' },
];

export function rotuloTipoExcecao(tipo: TipoExcecao): string {
  return TIPOS_EXCECAO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

/**
 * Marca no cancelamento da ocorrência que ela veio do calendário de
 * exceções. É esse prefixo que permite, ao remover a exceção (RF-EXC-07),
 * reabrir só as datas que a própria exceção fechou — sem tocar em sessões
 * canceladas individualmente por outro motivo.
 */
const PREFIXO_MOTIVO = 'Exceção de calendário';

export function useExcecoesCalendario() {
  const [excecoes, setExcecoes] = useState<ExcecaoCalendario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await excecaoCalendarioRepositorio.listar();
    setExcecoes(lista.sort((a, b) => a.data.localeCompare(b.data)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /**
   * RF-EXC-03: o que acontece se esta data virar exceção. Estável entre
   * renders porque a tela a usa como dependência de efeito.
   */
  const previaDeImpacto = useCallback((data: string) => previaDeImpactoNaData(data), []);

  /**
   * RF-EXC-01/04: cadastra a exceção e cancela automaticamente todas as
   * sessões da data, devolvendo crédito às alunas agendadas e notificando.
   */
  async function criar(
    dados: { data: string; tipo: TipoExcecao; descricao: string },
    autorId: string,
  ): Promise<{ sessoesCanceladas: number; alunasAfetadas: number }> {
    if (!dados.data) throw new RegraNegocioError('Escolha a data da exceção.');
    if (!dados.descricao.trim()) throw new RegraNegocioError('Descreva o motivo da exceção.');

    const jaExiste = excecoes.some((e) => e.data === dados.data);
    if (jaExiste) {
      throw new RegraNegocioError('Já existe uma exceção cadastrada para esta data.');
    }

    await excecaoCalendarioRepositorio.criar({
      data: dados.data,
      tipo: dados.tipo,
      descricao: dados.descricao.trim(),
      autorId,
      dataCriacao: new Date().toISOString(),
    });

    const sessoes = await sessaoRepositorio.listar();
    const sessoesDoDia = sessoes.filter((s) => sessaoOcorreEm(s, dados.data));

    let alunasAfetadas = 0;
    for (const sessao of sessoesDoDia) {
      alunasAfetadas += await cancelarOcorrencia(
        sessao,
        dados.data,
        `${PREFIXO_MOTIVO}: ${dados.descricao.trim()}`,
        autorId,
        'excecao',
      );
    }

    await recarregar();
    return { sessoesCanceladas: sessoesDoDia.length, alunasAfetadas };
  }

  /**
   * RF-EXC-07: exceção só pode ser removida enquanto a data for futura. As
   * sessões voltam a ficar disponíveis, mas os agendamentos cancelados não
   * são restabelecidos — a aluna já recebeu o crédito de volta e precisa
   * agendar novamente.
   */
  async function remover(excecao: ExcecaoCalendario) {
    if (excecao.data < hojeISO()) {
      throw new RegraNegocioError('Exceções em datas passadas não podem ser removidas — elas já afetaram a grade.');
    }

    const ocorrencias = await ocorrenciaSessaoRepositorio.listar();
    const canceladasPelaExcecao = ocorrencias.filter(
      (o) =>
        o.data === excecao.data &&
        o.situacao === 'cancelada' &&
        (o.motivoCancelamento ?? '').startsWith(PREFIXO_MOTIVO),
    );

    for (const ocorrencia of canceladasPelaExcecao) {
      await ocorrenciaSessaoRepositorio.remover(ocorrencia.id);
    }

    await excecaoCalendarioRepositorio.remover(excecao.id);
    await recarregar();
  }

  function excecaoNaData(data: string) {
    return excecoes.find((e) => e.data === data);
  }

  return {
    excecoes,
    carregando,
    criar,
    remover,
    previaDeImpacto,
    excecaoNaData,
    hoje: hojeISO(),
  };
}
