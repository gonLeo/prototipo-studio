import type { ReactNode } from 'react';
import { Badge } from './Badge';

/**
 * Cartão de uma aula do dia, usado na grade da aluna e na agenda da
 * professora.
 *
 * O bloco de horário à direita é a área de ação: quando `onAcao` existe,
 * ele vira botão; caso contrário, fica apenas informativo. O espaço do
 * `valor` só é usado onde há preço a exibir — hoje, a aula experimental
 * (M12); nas aulas do pacote não há valor por aula.
 */
export function CartaoDeAula({
  titulo,
  subtitulo,
  etiqueta,
  horario,
  detalhe,
  valor,
  acao,
  esmaecido = false,
  aviso,
}: {
  titulo: string;
  subtitulo?: string;
  etiqueta?: string;
  horario: string;
  /** Linha abaixo do horário no bloco de ação: vagas, ocupação… */
  detalhe?: string;
  /** Preço, quando a aula é cobrada à parte. */
  valor?: string;
  acao?: ReactNode;
  esmaecido?: boolean;
  aviso?: string;
}) {
  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        esmaecido ? 'opacity-70' : ''
      }`}
    >
      <div className="min-w-0">
        <h3 className={`text-base font-semibold ${esmaecido ? 'text-neutral-500 line-through' : 'text-ink'}`}>
          {titulo}
        </h3>
        {subtitulo && <p className="mt-0.5 text-sm text-neutral-500">{subtitulo}</p>}
        {etiqueta && (
          <p className="mt-2">
            <Badge tom="neutro">{etiqueta}</Badge>
          </p>
        )}
        {aviso && <p className="mt-2 text-xs font-medium text-amber-700">{aviso}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
        <div className="rounded-lg border border-neutral-300 px-3 py-2 text-center">
          <p className="font-mono text-sm font-semibold text-ink">{horario}</p>
          {valor && <p className="text-sm font-semibold text-ink">{valor}</p>}
          {detalhe && <p className="text-xs text-neutral-500">{detalhe}</p>}
        </div>
        {acao}
      </div>
    </li>
  );
}
