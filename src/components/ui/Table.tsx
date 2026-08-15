import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ControlesDePaginacao } from './Paginacao';
import { usePaginacao } from './usePaginacao';

interface Coluna {
  chave: string;
  rotulo: string;
  alinhamento?: 'esquerda' | 'direita';
}

interface BuscaConfig<T> {
  placeholder: string;
  corresponde: (item: T, termoNormalizado: string) => boolean;
}

interface TabelaProps<T> {
  itens: T[];
  colunas: Coluna[];
  chave: (item: T) => string;
  renderLinha: (item: T) => ReactNode;
  rotulo: string;
  busca?: BuscaConfig<T>;
  itensPorPagina?: number;
  semResultados?: ReactNode;
}

/**
 * Tabela do kit de UI: cabeçalho + corpo com linhas divididas, busca por
 * texto e paginação. Filtra e pagina de verdade sobre `itens` — diferente
 * de uma tabela ilustrativa, os dados aqui são reais.
 */
export function Tabela<T>({
  itens,
  colunas,
  chave,
  renderLinha,
  rotulo,
  busca,
  itensPorPagina = 8,
  semResultados = 'Nenhum registro encontrado.',
}: TabelaProps<T>) {
  const [termo, setTermo] = useState('');

  const filtrados = useMemo(() => {
    if (!busca || !termo.trim()) return itens;
    const termoNormalizado = termo.trim().toLowerCase();
    return itens.filter((item) => busca.corresponde(item, termoNormalizado));
  }, [itens, busca, termo]);

  const paginacao = usePaginacao(filtrados, itensPorPagina);

  function mudarTermo(valor: string) {
    setTermo(valor);
    // Filtrar encurta a lista: a página em que a usuária estava pode nem
    // existir mais no resultado.
    paginacao.reiniciar();
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      {busca && (
        <div className="border-b border-neutral-200 px-3 py-2.5">
          <div className="relative max-w-xs">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={termo}
              onChange={(e) => mudarTermo(e.target.value)}
              aria-label={busca.placeholder}
              placeholder={busca.placeholder}
              className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <caption className="sr-only">{rotulo}</caption>
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${
                    coluna.alinhamento === 'direita' ? 'text-right' : 'text-left'
                  }`}
                >
                  {coluna.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paginacao.visiveis.map((item) => (
              <Fragment key={chave(item)}>{renderLinha(item)}</Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral-500">{semResultados}</p>}

      {filtrados.length > 0 && (
        <ControlesDePaginacao
          pagina={paginacao.pagina}
          setPagina={paginacao.setPagina}
          itensPorPagina={paginacao.itensPorPagina}
          setItensPorPagina={paginacao.setItensPorPagina}
          totalPaginas={paginacao.totalPaginas}
          inicio={paginacao.inicio}
          total={paginacao.total}
        />
      )}
    </div>
  );
}

export function LinhaTabela({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-neutral-50">{children}</tr>;
}

export function CelulaTabela({
  children,
  alinhamento,
  className = '',
}: {
  children: ReactNode;
  alinhamento?: 'esquerda' | 'direita';
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-middle text-neutral-700 ${alinhamento === 'direita' ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}
