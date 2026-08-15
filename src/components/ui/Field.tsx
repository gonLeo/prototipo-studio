import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface WrapperProps {
  label: string;
  erro?: string;
  dica?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

function CampoWrapper({ label, erro, dica, wrapperClassName = '', children }: WrapperProps) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wrapperClassName}`}>
      <span className="font-medium text-neutral-700">{label}</span>
      {children}
      {dica && !erro && <span className="text-xs text-neutral-500">{dica}</span>}
      {erro && <span className="text-xs font-medium text-rose-600">{erro}</span>}
    </label>
  );
}

const CLASSE_INPUT =
  'rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-100';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  erro?: string;
  dica?: string;
  /** Classe aplicada ao `<label>` que envolve o campo (ex.: `sm:col-span-2` num grid). */
  wrapperClassName?: string;
}

export function TextField({ label, erro, dica, wrapperClassName, className = '', ...props }: TextFieldProps) {
  return (
    <CampoWrapper label={label} erro={erro} dica={dica} wrapperClassName={wrapperClassName}>
      <input className={`${CLASSE_INPUT} ${className}`} {...props} />
    </CampoWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  erro?: string;
  dica?: string;
  /** Classe aplicada ao `<label>` que envolve o campo (ex.: `sm:col-span-2` num grid). */
  wrapperClassName?: string;
}

export function SelectField({ label, erro, dica, wrapperClassName, className = '', children, ...props }: SelectFieldProps) {
  return (
    <CampoWrapper label={label} erro={erro} dica={dica} wrapperClassName={wrapperClassName}>
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
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}
