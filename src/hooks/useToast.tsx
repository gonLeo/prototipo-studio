import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info';

interface ToastItem {
  id: string;
  tipo: TipoToast;
  mensagem: string;
}

type FuncaoToast = (mensagem: string, tipo?: TipoToast) => void;

const ToastContext = createContext<FuncaoToast | undefined>(undefined);

const CLASSE_TIPO: Record<TipoToast, string> = {
  sucesso: 'bg-emerald-600',
  erro: 'bg-rose-600',
  aviso: 'bg-amber-500',
  info: 'bg-primary-700',
};

const ICONE_TIPO: Record<TipoToast, string> = {
  sucesso: '✓',
  erro: '✕',
  aviso: '!',
  info: 'i',
};

/**
 * Substitui window.alert e mensagens de erro soltas na tela: feedback
 * global (sucesso/erro de uma ação) aparece aqui, não em alert() nem em
 * texto estático de página. Erros de validação de campo dentro de um
 * formulário continuam inline, junto ao campo — isso é diferente de um
 * alerta global.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrarToast = useCallback<FuncaoToast>((mensagem, tipo = 'info') => {
    const id = crypto.randomUUID();
    setToasts((atual) => [...atual, { id, tipo, mensagem }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  function remover(id: string) {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={mostrarToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-96">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 ${CLASSE_TIPO[toast.tipo]}`}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
              {ICONE_TIPO[toast.tipo]}
            </span>
            <span className="flex-1">{toast.mensagem}</span>
            <button onClick={() => remover(toast.id)} aria-label="Fechar" className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return contexto;
}
