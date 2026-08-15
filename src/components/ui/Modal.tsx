import type { ReactNode } from 'react';

const LARGURAS = {
  normal: 'sm:max-w-lg',
  larga: 'sm:max-w-2xl',
} as const;

export function Modal({
  titulo,
  onFechar,
  largura = 'normal',
  children,
}: {
  titulo: string;
  onFechar: () => void;
  /** `larga` para formulários com grid de campos que não cabe confortavelmente em 32rem. */
  largura?: keyof typeof LARGURAS;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:rounded-xl ${LARGURAS[largura]}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
