import { useEffect, useRef, useState } from 'react';

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface TimePickerProps {
  value: string;
  onChange: (valor: string) => void;
  rotulo: string;
}

function partes(value: string): [string, string] {
  return value.includes(':') ? (value.split(':') as [string, string]) : ['', ''];
}

/**
 * Seletor de horário do projeto: dois combos (hora/minuto) em vez do
 * input[type=time] nativo do navegador, cujo visual/comportamento varia
 * entre browsers e sistemas operacionais. Valor vazio ('') = campo não
 * preenchido; nunca vem pré-preenchido com um horário padrão.
 *
 * Estado de hora/minuto é local (não deriva só do `value` prop): o valor
 * externo só existe como par completo "HH:MM", então escolher a hora
 * sozinha propaga onChange('') ao componente pai — se a UI refletisse
 * esse '' diretamente, a hora escolhida "sumiria" até o minuto também ser
 * preenchido. `ultimoValorEmitido` distingue esse eco do próprio
 * componente de uma mudança externa real (troca de bloco, reset), que aí
 * sim deve resincronizar os combos.
 */
export function TimePicker({ value, onChange, rotulo }: TimePickerProps) {
  const [hora, setHora] = useState(() => partes(value)[0]);
  const [minuto, setMinuto] = useState(() => partes(value)[1]);
  const ultimoValorEmitido = useRef(value);

  useEffect(() => {
    if (value === ultimoValorEmitido.current) return;
    const [h, m] = partes(value);
    setHora(h);
    setMinuto(m);
    ultimoValorEmitido.current = value;
  }, [value]);

  function atualizar(novaHora: string, novoMinuto: string) {
    setHora(novaHora);
    setMinuto(novoMinuto);
    const novoValor = novaHora && novoMinuto ? `${novaHora}:${novoMinuto}` : '';
    ultimoValorEmitido.current = novoValor;
    onChange(novoValor);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
      <select
        aria-label={`Hora — ${rotulo}`}
        value={hora}
        onChange={(e) => atualizar(e.target.value, minuto)}
        className="bg-transparent text-sm text-ink focus:outline-none"
      >
        <option value="">--</option>
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-neutral-400">:</span>
      <select
        aria-label={`Minuto — ${rotulo}`}
        value={minuto}
        onChange={(e) => atualizar(hora, e.target.value)}
        className="bg-transparent text-sm text-ink focus:outline-none"
      >
        <option value="">--</option>
        {MINUTOS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
