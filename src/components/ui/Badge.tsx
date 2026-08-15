import type { ReactNode } from 'react';

type Tom = 'neutro' | 'sucesso' | 'aviso' | 'erro' | 'info';

const CLASSES_TOM: Record<Tom, string> = {
  neutro: 'bg-neutral-100 text-neutral-600',
  sucesso: 'bg-emerald-100 text-emerald-700',
  aviso: 'bg-amber-100 text-amber-700',
  erro: 'bg-rose-100 text-rose-700',
  info: 'bg-primary-100 text-primary-700',
};

export function Badge({ children, tom = 'neutro' }: { children: ReactNode; tom?: Tom }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES_TOM[tom]}`}>
      {children}
    </span>
  );
}
