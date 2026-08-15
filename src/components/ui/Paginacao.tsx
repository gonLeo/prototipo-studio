import { OPCOES_ITENS_POR_PAGINA } from './usePaginacao';

/** Rodapé de paginação: quantos itens aparecem, quantos por página e a navegação. */
export function ControlesDePaginacao({
  pagina,
  setPagina,
  itensPorPagina,
  setItensPorPagina,
  totalPaginas,
  inicio,
  total,
  rotuloItens = 'registro',
}: {
  pagina: number;
  setPagina: (pagina: number) => void;
  itensPorPagina: number;
  setItensPorPagina: (quantidade: number) => void;
  totalPaginas: number;
  inicio: number;
  total: number;
  /** Singular do que está sendo listado: "registro", "aula"… */
  rotuloItens?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-neutral-500">
          Mostrando {inicio + 1} a {Math.min(inicio + itensPorPagina, total)} de {total}{' '}
          {total === 1 ? rotuloItens : `${rotuloItens}s`}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          Por página
          <select
            value={itensPorPagina}
            onChange={(e) => setItensPorPagina(Number(e.target.value))}
            className="rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {OPCOES_ITENS_POR_PAGINA.map((quantidade) => (
              <option key={quantidade} value={quantidade}>
                {quantidade}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPagina(Math.max(1, pagina - 1))}
            disabled={pagina === 1}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-ink hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-2 text-xs text-neutral-500">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina === totalPaginas}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-ink hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
