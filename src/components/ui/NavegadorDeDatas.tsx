import { useEffect, useState } from 'react';
import { datasDaSemana, diaSemanaDe, nomeDoMes, somarDias } from '../../utils/data';
import { DIAS_SEMANA } from '../../utils/horarioFuncionamento';

const DIAS_VISIVEIS = 7;

function abreviacaoDoDia(dataISO: string): string {
  return DIAS_SEMANA.find((d) => d.valor === diaSemanaDe(dataISO))?.rotulo.slice(0, 3) ?? '';
}

function rotuloDoMes(dataISO: string): string {
  const [ano, mes] = dataISO.split('-').map(Number);
  const nome = nomeDoMes(mes - 1);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1, 3)} ${ano}`;
}

/**
 * Faixa de dias navegável usada pela aluna (grade disponível) e pela
 * professora (minhas aulas): mostra uma semana por vez, com o dia
 * selecionado em destaque.
 *
 * A navegação é limitada por `dataMinima` e `dataMaxima` — a mínima é
 * sempre hoje, porque não existe agendamento retroativo, e a máxima vem da
 * janela configurada para o perfil.
 */
export function NavegadorDeDatas({
  dataSelecionada,
  onSelecionar,
  dataMinima,
  dataMaxima,
}: {
  dataSelecionada: string;
  onSelecionar: (data: string) => void;
  dataMinima: string;
  dataMaxima: string;
}) {
  const [inicioFaixa, setInicioFaixa] = useState(dataMinima);

  // Se a data selecionada mudar por fora (voltar para "hoje", por
  // exemplo), a faixa acompanha para que ela continue visível.
  useEffect(() => {
    const fimFaixa = somarDias(inicioFaixa, DIAS_VISIVEIS - 1);
    if (dataSelecionada < inicioFaixa || dataSelecionada > fimFaixa) {
      setInicioFaixa(dataSelecionada);
    }
  }, [dataSelecionada, inicioFaixa]);

  const dias = datasDaSemana(inicioFaixa).filter((data) => data <= dataMaxima);
  const podeVoltar = inicioFaixa > dataMinima;
  const podeAvancar = somarDias(inicioFaixa, DIAS_VISIVEIS) <= dataMaxima;

  function mover(dias: number) {
    const destino = somarDias(inicioFaixa, dias);
    const limitado = destino < dataMinima ? dataMinima : destino;
    setInicioFaixa(limitado);
    onSelecionar(limitado > dataMaxima ? dataMaxima : limitado);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{rotuloDoMes(dataSelecionada)}</p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => mover(-DIAS_VISIVEIS)}
            disabled={!podeVoltar}
            aria-label="Semana anterior"
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setInicioFaixa(dataMinima);
              onSelecionar(dataMinima);
            }}
            className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 hover:bg-primary-50"
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => mover(DIAS_VISIVEIS)}
            disabled={!podeAvancar}
            aria-label="Próxima semana"
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-lg border border-neutral-200">
        {dias.map((data) => {
          const selecionado = data === dataSelecionada;
          const ehHoje = data === dataMinima;
          return (
            <button
              key={data}
              type="button"
              onClick={() => onSelecionar(data)}
              aria-pressed={selecionado}
              className={`flex flex-col items-center gap-0.5 border-r border-neutral-200 px-1 py-2 last:border-r-0 transition-colors ${
                selecionado ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span className={`text-[11px] ${selecionado ? 'text-primary-100' : 'text-neutral-500'}`}>
                {abreviacaoDoDia(data)}
              </span>
              <span className={`text-base font-semibold ${selecionado ? 'text-white' : 'text-ink'}`}>
                {Number(data.slice(8, 10))}
              </span>
              {ehHoje && !selecionado && <span className="h-1 w-1 rounded-full bg-primary-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
