import type { Aluna, Contrato, Pacote } from '../../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../../utils/data';
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../../utils/contrato';

/**
 * Saldo, validade e mensalidade da aluna.
 *
 * Fica visível de forma persistente no painel **e** na tela de grade
 * (decisão de UX do escopo): a aluna decide se agenda olhando para o
 * saldo, então ele não pode estar a um clique de distância.
 */
export function ResumoDoPacote({
  contrato,
  pacote,
  aluna,
}: {
  contrato: Contrato | undefined;
  pacote: Pacote | undefined;
  aluna: Aluna | undefined;
}) {
  if (!contrato) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
        Você não tem um pacote ativo no momento. Fale com a administração do studio para contratar.
      </p>
    );
  }

  const percentualBolsa = aluna?.percentualBolsa ?? 0;
  const diasRestantes = diferencaEmDias(hojeISO(), contrato.dataVencimentoCiclo);

  // Três colunas em qualquer largura: no celular a faixa continua sendo
  // uma linha só, com tipografia reduzida em vez de empilhar os cartões.
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Saldo</p>
        <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">{contrato.saldoAulas}</p>
        <p className="truncate text-[10px] text-neutral-500 sm:text-xs">{pacote?.nome ?? 'Pacote'}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Validade</p>
        <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">
          {formatarDataBR(contrato.dataVencimentoCiclo)}
        </p>
        <p className="text-[10px] text-neutral-500 sm:text-xs">
          {diasRestantes >= 0 ? `${diasRestantes} dias` : 'Vencido'}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Mensalidade</p>
        <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">
          {!pacote
            ? '—'
            : ehIsencaoTotal(percentualBolsa)
              ? 'Isenta'
              : formatarMoeda(valorComBolsa(pacote.valorMensal, percentualBolsa))}
        </p>
        {percentualBolsa > 0 && !ehIsencaoTotal(percentualBolsa) && (
          <p className="text-[10px] text-emerald-700 sm:text-xs">{percentualBolsa}% de bolsa</p>
        )}
      </div>
    </div>
  );
}
