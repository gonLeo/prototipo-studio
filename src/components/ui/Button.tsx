import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'fantasma';

const CLASSES_VARIANTE: Record<Variante, string> = {
  primaria: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 disabled:bg-primary-300',
  secundaria: 'bg-white text-ink ring-1 ring-inset ring-neutral-300 hover:bg-neutral-100 disabled:opacity-50',
  perigo: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300',
  fantasma: 'text-neutral-600 hover:bg-neutral-100 disabled:opacity-50',
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

export function Button({ variante = 'primaria', className = '', ...props }: BotaoProps) {
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${CLASSES_VARIANTE[variante]} ${className}`}
      {...props}
    />
  );
}
