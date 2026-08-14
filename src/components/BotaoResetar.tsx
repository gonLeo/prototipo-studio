import { useState } from 'react';
import { resetarPrototipo } from '../services/reset';

export function BotaoResetar() {
  const [estado, setEstado] = useState<'ocioso' | 'confirmando' | 'resetando' | 'concluido' | 'erro'>('ocioso');

  async function confirmar() {
    setEstado('resetando');
    try {
      await resetarPrototipo();
      setEstado('concluido');
      setTimeout(() => window.location.assign('/login'), 1200);
    } catch {
      setEstado('erro');
    }
  }

  if (estado === 'concluido') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Protótipo resetado ✓
      </span>
    );
  }

  if (estado === 'confirmando') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-600">Apagar tudo e restaurar o backfill?</span>
        <button
          onClick={confirmar}
          className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-700"
        >
          Confirmar
        </button>
        <button
          onClick={() => setEstado('ocioso')}
          className="rounded-md bg-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-300"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEstado('confirmando')}
      disabled={estado === 'resetando'}
      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
    >
      {estado === 'resetando' ? 'Resetando…' : estado === 'erro' ? 'Erro — tentar de novo' : 'Resetar protótipo'}
    </button>
  );
}
