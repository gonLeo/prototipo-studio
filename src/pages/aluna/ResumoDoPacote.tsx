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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Saldo de aulas</p>
        <p className="mt-1 text-2xl font-semibold text-ink">{contrato.saldoAulas}</p>
        <p className="text-xs text-neutral-500">{pacote?.nome ?? 'Pacote'}</p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Validade do ciclo</p>
        <p className="mt-1 text-2xl font-semibold text-ink">{formatarDataBR(contrato.dataVencimentoCiclo)}</p>
        <p className="text-xs text-neutral-500">
          {diasRestantes >= 0 ? `${diasRestantes} dias restantes` : 'Ciclo vencido'}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Mensalidade</p>
        <p className="mt-1 text-2xl font-semibold text-ink">
          {!pacote
            ? '—'
            : ehIsencaoTotal(percentualBolsa)
              ? 'Isenta'
              : formatarMoeda(valorComBolsa(pacote.valorMensal, percentualBolsa))}
        </p>
        {percentualBolsa > 0 && !ehIsencaoTotal(percentualBolsa) && (
          <p className="text-xs text-emerald-700">Com {percentualBolsa}% de bolsa</p>
        )}
      </div>
    </div>
  );
}
