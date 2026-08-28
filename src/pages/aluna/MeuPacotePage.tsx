import { useCallback, useEffect, useState } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { historicoDeComprasDaAluna } from '../../hooks/vendas';
import type { CompraDaAluna } from '../../hooks/vendas';
import { useToast } from '../../hooks/useToast';
import { Badge } from '../../components/ui/Badge';
import { formatarDataBR } from '../../utils/data';
import { formatarCreditos, formatarMoeda, rotuloFormaPagamento, rotuloSituacaoVenda } from '../../utils/creditos';
import { ResumoDoPacote } from './ResumoDoPacote';
import { ComprarPacote } from './ComprarPacote';

/**
 * "Meu pacote" (UX-01): carteira, compra e histórico financeiro da aluna,
 * reunidos fora da tela inicial. O painel trata de aulas; esta página
 * trata de dinheiro — saldo, validade, aquisição e o que já foi pago.
 *
 * Acessível a qualquer aluna, inclusive a de convênio (RF-CNV-09): nada
 * no escopo impede que ela também tenha pacote, e a origem do cadastro
 * não deve governar o que ela vê aqui.
 */
export function MeuPacotePage() {
  const { usuario } = useSessao();
  const mostrarToast = useToast();
  const { aluna, carteira, leitura, pacote, recarregar: recarregarAgenda } = useAgendaDaAluna(usuario?.id);

  const [compras, setCompras] = useState<CompraDaAluna[]>([]);
  const [carregandoCompras, setCarregandoCompras] = useState(true);

  const recarregarCompras = useCallback(async () => {
    if (!aluna) return;
    setCarregandoCompras(true);
    const historico = await historicoDeComprasDaAluna(aluna.id);
    setCompras(historico);
    setCarregandoCompras(false);
  }, [aluna]);

  useEffect(() => {
    recarregarCompras();
  }, [recarregarCompras]);

  if (!aluna) return <p className="text-sm text-neutral-500">Carregando…</p>;

  // RF-TRA-04: comprar durante o trancamento mexeria na validade sob a
  // regra de prorrogação do trancamento — o efeito seria imprevisível.
  const trancada = aluna.situacao === 'trancada';

  // RF-REE-10: nenhuma menção a reembolso aparece para quem não teve um
  // aplicado ao próprio cadastro.
  const comprasVisiveis = compras.filter((v) => v.situacao !== 'cancelada');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Meu pacote</h1>
      <p className="mt-1 text-sm text-neutral-500">Sua carteira de créditos, a aquisição de pacotes e o histórico de compras.</p>

      {aluna.origem === 'convenio' && (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Seu acesso pelo convênio continua funcionando pelo aplicativo do parceiro — isso não muda aqui. Esta página é
          para quem também quer ter créditos próprios no studio (RF-CNV-09).
        </p>
      )}

      <div className="mt-4">
        <ResumoDoPacote carteira={carteira} leitura={leitura} pacote={pacote} />
      </div>

      {trancada && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Badge tom="aviso">Pacote trancado</Badge>
          <p className="mt-2 text-sm text-amber-800">
            Seu agendamento está pausado neste período, e a validade dos créditos fica congelada. Fale com a
            administração para registrar o retorno.
          </p>
        </div>
      )}

      <ComprarPacote
        aluna={aluna}
        carteira={carteira}
        desabilitado={trancada}
        motivoDesabilitado="A aquisição volta a ficar disponível quando seu pacote for destrancado."
        onComprado={async (mensagem, sucesso) => {
          await recarregarAgenda();
          await recarregarCompras();
          mostrarToast(mensagem, sucesso ? 'sucesso' : 'erro');
        }}
      />

      {!carregandoCompras && comprasVisiveis.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Histórico de compras</h2>
          <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {comprasVisiveis.map((venda) => (
              <li key={venda.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="text-ink">
                  {formatarDataBR(venda.data)} ·{' '}
                  {venda.tipo === 'aula_experimental' ? 'Aula experimental' : formatarCreditos(venda.creditos)}
                  <span className="ml-1 text-xs text-neutral-500">
                    {rotuloFormaPagamento(venda.formaPagamento, venda.parcelas)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-right">
                    {/* RF-REE-10: o valor devolvido só aparece para quem
                        teve um reembolso aplicado ao próprio cadastro. */}
                    <span className="block text-neutral-700">
                      {venda.bolsa ? 'Isenta' : formatarMoeda(venda.valorReembolsado ?? venda.valor)}
                    </span>
                    {venda.valorReembolsado !== undefined && (
                      <span className="block text-xs text-neutral-500">reembolsado de {formatarMoeda(venda.valor)}</span>
                    )}
                  </span>
                  {venda.situacao !== 'confirmada' && (
                    <Badge tom={venda.situacao === 'pendente' ? 'info' : 'aviso'}>
                      {rotuloSituacaoVenda(venda.situacao)}
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
