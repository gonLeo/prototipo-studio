import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'fantasma';

const CLASSES_VARIANTE: Record<Variante, string> = {
  primaria: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secundaria: 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50',
  perigo: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  fantasma: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
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
