import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface WrapperProps {
  label: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}

function CampoWrapper({ label, erro, dica, children }: WrapperProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {dica && !erro && <span className="text-xs text-slate-500">{dica}</span>}
      {erro && <span className="text-xs font-medium text-rose-600">{erro}</span>}
    </label>
  );
}

const CLASSE_INPUT =
  'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  erro?: string;
  dica?: string;
}

export function TextField({ label, erro, dica, className = '', ...props }: TextFieldProps) {
  return (
    <CampoWrapper label={label} erro={erro} dica={dica}>
      <input className={`${CLASSE_INPUT} ${className}`} {...props} />
    </CampoWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  erro?: string;
  dica?: string;
}

export function SelectField({ label, erro, dica, className = '', children, ...props }: SelectFieldProps) {
  return (
    <CampoWrapper label={label} erro={erro} dica={dica}>
      <select className={`${CLASSE_INPUT} bg-white ${className}`} {...props}>
        {children}
      </select>
    </CampoWrapper>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (marcado: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}
