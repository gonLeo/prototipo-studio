import { useState } from 'react';
import { efeitoDoParametro, useParametros } from '../../hooks/useParametros';
import type { Parametro } from '../../types/domain';

function LinhaParametro({
  parametro,
  onSalvar,
}: {
  parametro: Parametro;
  onSalvar: (valor: number) => Promise<void>;
}) {
  const [valor, setValor] = useState(String(parametro.valor));
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(undefined);
    setSalvo(false);
    const numero = Number(valor);
    try {
      await onSalvar(numero);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1800);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  const efeito = efeitoDoParametro({ ...parametro, valor: Number(valor) || parametro.valor });

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-900">{parametro.descricao}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={salvar}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {salvo && <span className="text-xs font-medium text-emerald-600">Salvo</span>}
      </div>
      {efeito && <p className="mt-1.5 text-xs text-slate-500">{efeito}</p>}
      {erro && <p className="mt-1 text-xs font-medium text-rose-600">{erro}</p>}
    </li>
  );
}

export function ParametrosPage() {
  const { parametros, carregando, atualizarValor } = useParametros();

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Parâmetros operacionais</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ajustável pela administração, sem depender de suporte técnico. Cada campo mostra o efeito prático do valor
        informado.
      </p>

      {carregando && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {parametros.map((parametro) => (
          <LinhaParametro key={parametro.id} parametro={parametro} onSalvar={(valor) => atualizarValor(parametro.id, valor)} />
        ))}
      </ul>
    </div>
  );
}
