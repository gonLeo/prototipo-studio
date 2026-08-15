import { useMemo, useState } from 'react';

export const OPCOES_ITENS_POR_PAGINA = [5, 10, 25, 50] as const;

/**
 * Paginação compartilhada entre a `Tabela` e as listas em cartão (as
 * próximas aulas da aluna, por exemplo). Fica fora da tabela porque nem
 * toda lista paginada é uma tabela, e fora do `.tsx` do componente para
 * não quebrar o fast refresh.
 */
export function usePaginacao<T>(itens: T[], itensPorPaginaInicial = 10) {
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPaginaEstado] = useState<number>(itensPorPaginaInicial);

  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * itensPorPagina;

  const visiveis = useMemo(
    () => itens.slice(inicio, inicio + itensPorPagina),
    [itens, inicio, itensPorPagina],
  );

  function setItensPorPagina(quantidade: number) {
    setItensPorPaginaEstado(quantidade);
    // Trocar o tamanho da página quase sempre invalida a página atual.
    setPagina(1);
  }

  return {
    visiveis,
    pagina: paginaAtual,
    setPagina,
    itensPorPagina,
    setItensPorPagina,
    totalPaginas,
    inicio,
    total: itens.length,
    reiniciar: () => setPagina(1),
  };
}
