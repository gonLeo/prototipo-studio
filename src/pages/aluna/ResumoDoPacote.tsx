import type { Carteira, Pacote } from '../../types/domain';
import { formatarDataBR } from '../../utils/data';
import { Badge } from '../../components/ui/Badge';
import {
  explicarFinalizando,
  rotuloStatusCarteira,
  type LeituraDaCarteira,
} from '../../utils/creditos';

/**
 * Saldo de créditos, validade e status da carteira.
 *
 * Fica visível de forma persistente no painel **e** na tela de grade
 * (RF-AGD-02): a aluna decide se agenda olhando para o saldo, então ele
 * não pode estar a um clique de distância.
 *
 * O saldo é apresentado nas três dimensões que o escopo distingue
 * (RF-CRE-12): disponível para agendar, reservado em aulas futuras e já
 * utilizado.
 */
export function ResumoDoPacote({
  carteira,
  leitura,
  pacote,
}: {
  carteira: Carteira | undefined;
  leitura: LeituraDaCarteira | undefined;
  pacote: Pacote | undefined;
}) {
  // RF-CRE-11: não há diferença visual entre carteira consumida e vencida.
  if (!carteira || !leitura) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
        <strong className="font-semibold text-ink">Nenhum pacote ativo.</strong> Adquira um pacote no seu painel para
        voltar a agendar.
      </p>
    );
  }

  const finalizando = leitura.motivoFinalizando !== undefined;

  return (
    <div className="space-y-2">
      {/* Três colunas em qualquer largura: no celular a faixa continua sendo
          uma linha só, com tipografia reduzida em vez de empilhar os cartões. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Disponíveis</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">{leitura.disponiveis}</p>
          <p className="truncate text-[10px] text-neutral-500 sm:text-xs">{pacote?.nome ?? 'Pacote'}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Reservados</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">{leitura.reservados}</p>
          <p className="text-[10px] text-neutral-500 sm:text-xs">{leitura.utilizados} já utilizados</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Validade</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">
            {formatarDataBR(carteira.dataValidade)}
          </p>
          <p className="text-[10px] text-neutral-500 sm:text-xs">
            {leitura.diasParaVencer >= 0 ? `${leitura.diasParaVencer} dias` : 'Vencido'}
          </p>
        </div>
      </div>

      {finalizando && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">
          <Badge tom="aviso">{rotuloStatusCarteira('finalizando')}</Badge>
          <span>
            {explicarFinalizando(leitura.motivoFinalizando!, leitura)} Você continua agendando normalmente — vale
            renovar para não ficar sem créditos.
          </span>
        </div>
      )}
    </div>
  );
}
