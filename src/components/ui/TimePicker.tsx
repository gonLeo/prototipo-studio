import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (valor: string) => void;
  rotulo: string;
}

function partes(value: string): [string, string] {
  return value.includes(':') ? (value.split(':') as [string, string]) : ['', ''];
}

const CX = 120;
const CY = 128;
const RAIO_EXTERNO = 96;
const RAIO_INTERNO = 60;

/** Posição (x, y) do índice `i` (0 = topo, sentido horário) de um mostrador de 12 posições. */
function posicao(i: number, raio: number) {
  const anguloRad = ((i * 30 - 90) * Math.PI) / 180;
  return { x: CX + raio * Math.cos(anguloRad), y: CY + raio * Math.sin(anguloRad) };
}

/** Índice (0-11) da posição mais próxima de um ângulo em graus (0 = topo, sentido horário). */
function indicePorAngulo(anguloGraus: number, passos: number) {
  const passo = 360 / passos;
  return Math.round(anguloGraus / passo) % passos;
}

function anguloDoPonteiro(clientX: number, clientY: number, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const escala = 240 / rect.width;
  const x = (clientX - rect.left) * escala - CX;
  const y = (clientY - rect.top) * escala - CY;
  const distancia = Math.hypot(x, y);
  let angulo = (Math.atan2(y, x) * 180) / Math.PI + 90;
  if (angulo < 0) angulo += 360;
  return { angulo, distancia };
}

function horaParaPosicao(hora: string): { i: number; anel: 'externo' | 'interno' } {
  const h = Number(hora);
  if (h === 0) return { i: 0, anel: 'interno' };
  if (h === 12) return { i: 0, anel: 'externo' };
  if (h > 12) return { i: h - 12, anel: 'interno' };
  return { i: h, anel: 'externo' };
}

function posicaoParaHora(i: number, anel: 'externo' | 'interno'): string {
  if (anel === 'externo') return String(i === 0 ? 12 : i).padStart(2, '0');
  return String(i === 0 ? 0 : i + 12).padStart(2, '0');
}

function Mostrador({
  etapa,
  hora,
  minuto,
  onEscolherHora,
  onEscolherMinuto,
  onSoltarHora,
}: {
  etapa: 'hora' | 'minuto';
  hora: string;
  minuto: string;
  onEscolherHora: (hora: string) => void;
  onEscolherMinuto: (minuto: string) => void;
  onSoltarHora: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastando = useRef(false);

  function processarPonteiro(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const { angulo, distancia } = anguloDoPonteiro(clientX, clientY, svg);

    if (etapa === 'hora') {
      const anel = distancia < (RAIO_EXTERNO + RAIO_INTERNO) / 2 ? 'interno' : 'externo';
      const i = indicePorAngulo(angulo, 12);
      onEscolherHora(posicaoParaHora(i, anel));
    } else {
      const m = Math.round(angulo / 6) % 60;
      onEscolherMinuto(String(m).padStart(2, '0'));
    }
  }

  function aoPressionar(e: ReactPointerEvent<SVGSVGElement>) {
    arrastando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    processarPonteiro(e.clientX, e.clientY);
  }

  function aoMover(e: ReactPointerEvent<SVGSVGElement>) {
    if (!arrastando.current) return;
    processarPonteiro(e.clientX, e.clientY);
  }

  function aoSoltar() {
    if (!arrastando.current) return;
    arrastando.current = false;
    if (etapa === 'hora') onSoltarHora();
  }

  const horaPos = horaParaPosicao(hora || '00');
  const anguloPonteiroHora = horaPos.i * 30 - 90;
  const raioPonteiroHora = horaPos.anel === 'externo' ? RAIO_EXTERNO : RAIO_INTERNO;

  const minutoNum = Number(minuto || '0');
  const anguloPonteiroMinuto = (minutoNum / 60) * 360 - 90;

  const anguloPonteiro = etapa === 'hora' ? anguloPonteiroHora : anguloPonteiroMinuto;
  const raioPonteiro = etapa === 'hora' ? raioPonteiroHora : RAIO_EXTERNO;
  const pontaX = CX + raioPonteiro * Math.cos((anguloPonteiro * Math.PI) / 180);
  const pontaY = CY + raioPonteiro * Math.sin((anguloPonteiro * Math.PI) / 180);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 256"
      className="h-64 w-60 touch-none select-none"
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
    >
      <circle cx={CX} cy={CY} r={RAIO_EXTERNO + 20} className="fill-neutral-100" />
      <line x1={CX} y1={CY} x2={pontaX} y2={pontaY} className="stroke-primary-600" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={4} className="fill-primary-600" />
      <circle cx={pontaX} cy={pontaY} r={16} className="fill-primary-600" />

      {etapa === 'hora' &&
        Array.from({ length: 12 }, (_, i) => {
          const p = posicao(i, RAIO_EXTERNO);
          const selecionado = horaPos.anel === 'externo' && horaPos.i === i;
          return (
            <text
              key={`ext-${i}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none text-[15px] font-medium ${selecionado ? 'fill-white' : 'fill-ink'}`}
            >
              {i === 0 ? '12' : i}
            </text>
          );
        })}

      {etapa === 'hora' &&
        Array.from({ length: 12 }, (_, i) => {
          const p = posicao(i, RAIO_INTERNO);
          const selecionado = horaPos.anel === 'interno' && horaPos.i === i;
          return (
            <text
              key={`int-${i}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none text-[12px] ${selecionado ? 'fill-white' : 'fill-neutral-500'}`}
            >
              {i === 0 ? '00' : i + 12}
            </text>
          );
        })}

      {etapa === 'minuto' &&
        Array.from({ length: 12 }, (_, i) => {
          const p = posicao(i, RAIO_EXTERNO);
          const valor = i * 5;
          const selecionado = Math.round(minutoNum / 5) % 12 === i;
          return (
            <text
              key={`min-${i}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none text-[15px] font-medium ${selecionado ? 'fill-white' : 'fill-ink'}`}
            >
              {String(valor).padStart(2, '0')}
            </text>
          );
        })}
    </svg>
  );
}

/**
 * Seletor de horário do projeto: abre um mostrador analógico em modal (hora
 * num anel duplo 1-12/13-23,00, minuto num anel único de 5 em 5, com
 * arraste ou toque) em vez do `input[type=time]` nativo do navegador.
 * Valor vazio (`''`) é o padrão inicial; nunca vem pré-preenchido.
 *
 * A seleção fica em rascunho local enquanto o modal está aberto — só vira
 * `onChange` ao confirmar. Cancelar descarta; Limpar zera e confirma na
 * hora.
 */
export function TimePicker({ value, onChange, rotulo }: TimePickerProps) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<'hora' | 'minuto'>('hora');
  const [hora, setHora] = useState('');
  const [minuto, setMinuto] = useState('');

  function abrir() {
    const [h, m] = partes(value);
    setHora(h);
    setMinuto(m);
    setEtapa('hora');
    setAberto(true);
  }

  function confirmar() {
    onChange(hora && minuto ? `${hora}:${minuto}` : '');
    setAberto(false);
  }

  function limpar() {
    onChange('');
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={rotulo}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-mono text-sm text-ink hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {partes(value)[0] || '--'}
        <span className="text-neutral-400">:</span>
        {partes(value)[1] || '--'}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50" onClick={() => setAberto(false)}>
          <div
            className="w-full max-w-xs overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 bg-primary-700 px-6 py-5">
              <button
                type="button"
                onClick={() => setEtapa('hora')}
                className={`font-mono text-4xl font-semibold ${etapa === 'hora' ? 'text-white' : 'text-primary-200'}`}
              >
                {hora || '--'}
              </button>
              <span className="text-4xl font-semibold text-primary-200">:</span>
              <button
                type="button"
                onClick={() => setEtapa('minuto')}
                className={`font-mono text-4xl font-semibold ${etapa === 'minuto' ? 'text-white' : 'text-primary-200'}`}
              >
                {minuto || '--'}
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 px-4 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {etapa === 'hora' ? 'Escolha a hora' : 'Escolha o minuto'}
              </p>
              <Mostrador
                etapa={etapa}
                hora={hora}
                minuto={minuto}
                onEscolherHora={setHora}
                onEscolherMinuto={setMinuto}
                onSoltarHora={() => setEtapa('minuto')}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={limpar} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
                Limpar
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={!hora || !minuto}
                  className="text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:cursor-not-allowed disabled:text-neutral-300"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
