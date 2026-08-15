import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
}

interface EstadoConfirmacao extends OpcoesConfirmacao {
  resolver: (valor: boolean) => void;
}

type FuncaoConfirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ConfirmContext = createContext<FuncaoConfirmar | undefined>(undefined);

/**
 * Substitui window.confirm em todo o projeto: toda confirmação usa este
 * modal, nunca o alert/confirm nativo do navegador.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoConfirmacao | null>(null);

  const confirmar = useCallback<FuncaoConfirmar>((opcoes) => {
    return new Promise((resolve) => {
      setEstado({ ...opcoes, resolver: resolve });
    });
  }, []);

  function responder(valor: boolean) {
    estado?.resolver(valor);
    setEstado(null);
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {estado && (
        <Modal titulo={estado.titulo} onFechar={() => responder(false)}>
          <p className="text-sm text-neutral-600">{estado.mensagem}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variante="secundaria" onClick={() => responder(false)}>
              {estado.textoCancelar ?? 'Cancelar'}
            </Button>
            <Button variante={estado.perigo ? 'perigo' : 'primaria'} onClick={() => responder(true)}>
              {estado.textoConfirmar ?? 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const contexto = useContext(ConfirmContext);
  if (!contexto) {
    throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>');
  }
  return contexto;
}
