import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { usePacotes } from '../../hooks/usePacotes';
import { comprarPacoteParaAluna } from '../../hooks/cadastroDeAlunas';
import { registrarConversao } from '../../hooks/aulasExperimentais';
import { FORMAS_PAGAMENTO, PARCELAS_DISPONIVEIS } from '../../hooks/vendas';
import { aplicarBeneficio, beneficioDeConversaoDisponivel } from '../../hooks/beneficioDeConversao';
import type { BeneficioDeConversao } from '../../hooks/beneficioDeConversao';
import type { Aluna, FormaPagamento, Pacote } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { formatarDataBR, hojeISO } from '../../utils/data';
import { calcularPreviaDeCompra, formatarCreditos, formatarMoeda } from '../../utils/creditos';

/**
 * Compra de pacote pela própria aluna (RF-CRE-16, RF-EXP-07).
 *
 * É por aqui que quem fez a aula experimental adquire um pacote sem
 * repetir cadastro, e é também por aqui que quem já tem carteira renova
 * antecipadamente. A prévia mostra o saldo resultante e a nova validade
 * antes de confirmar, deixando claro o efeito sobre a carteira vigente.
 *
 * Vive em "Meu pacote" (UX-01) — deixou de estar na tela inicial do
 * painel para não ocupar o espaço mais visível com uma ação que a aluna
 * faz poucas vezes por ciclo.
 */
export function ComprarPacote({
  aluna,
  carteira,
  onComprado,
  desabilitado,
  motivoDesabilitado,
}: {
  aluna: Aluna | undefined;
  carteira: Parameters<typeof calcularPreviaDeCompra>[0]['carteiraVigente'];
  onComprado: (mensagem: string, sucesso: boolean) => Promise<void>;
  /** RF-TRA-04: compra fica bloqueada durante o trancamento. */
  desabilitado?: boolean;
  motivoDesabilitado?: string;
}) {
  const { pacotes, carregando } = usePacotes();
  const [pacoteId, setPacoteId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState(String(PARCELAS_DISPONIVEIS[0]));
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);
  const [beneficio, setBeneficio] = useState<BeneficioDeConversao>();

  // RF-EXP-08: quem fez a aula experimental precisa ver o benefício na
  // prévia, antes de confirmar — não descobri-lo no extrato depois.
  useEffect(() => {
    let valido = true;
    if (!aluna) return;
    beneficioDeConversaoDisponivel(aluna.id).then((encontrado) => {
      if (valido) setBeneficio(encontrado);
    });
    return () => {
      valido = false;
    };
  }, [aluna]);

  const ativos = pacotes.filter((p) => p.situacao === 'ativo');
  const escolhido = ativos.find((p) => p.id === pacoteId);
  const comBeneficio = escolhido ? aplicarBeneficio(escolhido, beneficio) : undefined;
  const previa =
    escolhido && comBeneficio
      ? calcularPreviaDeCompra({
          carteiraVigente: carteira,
          pacote: { ...escolhido, ...comBeneficio },
          hoje: hojeISO(),
        })
      : undefined;

  async function comprar(e: FormEvent) {
    e.preventDefault();
    if (!aluna || !escolhido) return;
    setErro(undefined);
    setProcessando(true);
    try {
      const { venda, confirmada, mensagem } = await comprarPacoteParaAluna({
        aluna,
        compra: {
          pacoteId: escolhido.id,
          formaPagamento,
          parcelas: formaPagamento === 'cartao_parcelado' ? Number(parcelas) : undefined,
        },
        autorId: aluna.usuarioId,
      });

      if (!confirmada) {
        setErro(`O pagamento não foi aprovado: ${mensagem}`);
        return;
      }

      // Compra depois da aula experimental fica marcada como conversão
      // (RF-EXP-09), para separá-la de uma compra comum na auditoria. Só
      // quem tinha benefício disponível veio de uma experimental — antes
      // isso era gravado em toda compra, inclusive de quem nunca fez uma.
      if (beneficio) {
        await registrarConversao({ alunaId: aluna.id, vendaId: venda.id, autorId: aluna.usuarioId });
      }

      await onComprado(
        `Compra confirmada: ${formatarCreditos(venda.creditos)} adicionados à sua carteira.` +
          (beneficio?.tipo === 'credito_adicional'
            ? ` Inclui ${formatarCreditos(beneficio.quantidade)} de bônus da aula experimental.`
            : ''),
        true,
      );
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  if (desabilitado) {
    return (
      <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold text-ink">
          {carteira ? 'Adquirir mais créditos' : 'Adquirir um pacote'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {motivoDesabilitado ?? 'A compra não está disponível no momento.'}
        </p>
      </div>
    );
  }

  if (carregando) return <p className="mt-6 text-sm text-neutral-500">Carregando pacotes…</p>;

  if (ativos.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
        O studio ainda não publicou pacotes disponíveis para compra.
      </p>
    );
  }

  return (
    <form onSubmit={comprar} className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-ink">
          {carteira ? 'Adquirir mais créditos' : 'Adquirir um pacote'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {carteira
            ? 'Os créditos restantes são somados aos do novo pacote, com uma validade única.'
            : 'Escolha um pacote para liberar o agendamento. O pagamento é único, no ato da compra.'}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ativos.map((pacote: Pacote) => {
          const selecionado = pacote.id === pacoteId;
          return (
            <li key={pacote.id}>
              <button
                type="button"
                onClick={() => setPacoteId(pacote.id)}
                aria-pressed={selecionado}
                className={`w-full rounded-lg border p-3 text-left ${
                  selecionado
                    ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <p className="text-sm font-semibold text-ink">{pacote.nome}</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{formatarMoeda(pacote.valor)}</p>
                <p className="text-xs text-neutral-500">
                  {formatarCreditos(pacote.creditos)} · validade de {pacote.validadeDias} dias
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {escolhido && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Forma de pagamento"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
          >
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma.valor} value={forma.valor}>
                {forma.rotulo}
              </option>
            ))}
          </SelectField>

          {formaPagamento === 'cartao_parcelado' && (
            <SelectField
              label="Parcelas"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              dica="O valor total é debitado do limite no momento da compra."
            >
              {PARCELAS_DISPONIVEIS.map((n) => (
                <option key={n} value={n}>
                  {n}x de {formatarMoeda((comBeneficio?.valor ?? escolhido.valor) / n)}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      )}

      {beneficio && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Você fez uma aula experimental e ganhou <strong className="font-semibold">{beneficio.rotulo}</strong> na
          primeira compra. Válido até {formatarDataBR(beneficio.validoAte)}.
        </p>
      )}

      {previa && (
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm ring-1 ring-inset ring-neutral-200">
          <p className="text-ink">
            Depois da compra você fica com{' '}
            <span className="font-semibold">{formatarCreditos(previa.creditosResultantes)}</span> disponíveis, válidos
            até <span className="font-semibold">{formatarDataBR(previa.validadeResultante)}</span>.
          </p>
          {previa.validadeMantida && (
            <p className="mt-0.5 text-xs text-emerald-700">
              Sua validade atual é mais longa que a do pacote escolhido e foi mantida — você não perde prazo comprando.
            </p>
          )}
        </div>
      )}

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={!escolhido || processando}>
          {processando
            ? 'Processando…'
            : comBeneficio
              ? `Pagar ${formatarMoeda(comBeneficio.valor)}`
              : 'Escolha um pacote'}
        </Button>
      </div>
    </form>
  );
}
