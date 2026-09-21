import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Carteira, FormaPagamento, Pacote, TipoReembolso, Venda } from '../../../types/domain';
import type { FichaAluna } from '../../../hooks/useFichaAluna';
import { ROTULOS_AJUSTE, type TipoAjuste } from '../../../hooks/carteiraDeCreditos';
import { FORMAS_PAGAMENTO, PARCELAS_DISPONIVEIS } from '../../../hooks/vendas';
import { calcularPreviaDeTrancamento, type PreviaTrancamento } from '../../../hooks/trancamento';
import { calcularPreviaDeReembolso, type PreviaDeReembolso } from '../../../hooks/reembolsos';
import { aplicarBeneficio, beneficioDeConversaoDisponivel } from '../../../hooks/beneficioDeConversao';
import type { BeneficioDeConversao } from '../../../hooks/beneficioDeConversao';
import { Button } from '../../../components/ui/Button';
import { TextField, SelectField, CheckboxField } from '../../../components/ui/Field';
import {
  calcularPreviaDeCompra,
  formatarCreditos,
  formatarMoeda,
  rotuloFormaPagamento,
  valorUnitarioDoCredito,
} from '../../../utils/creditos';
import { formatarDataBR, hojeISO, somarDias } from '../../../utils/data';

function Formulario({
  children,
  onFechar,
  textoConfirmar,
  salvando,
  erro,
  onEnviar,
  desabilitado,
}: {
  children: ReactNode;
  onFechar: () => void;
  textoConfirmar: string;
  salvando: boolean;
  erro?: string;
  onEnviar: (e: FormEvent) => void;
  desabilitado?: boolean;
}) {
  return (
    <form onSubmit={onEnviar} className="flex flex-col gap-4">
      {children}
      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando || desabilitado}>
          {salvando ? 'Salvando…' : textoConfirmar}
        </Button>
      </div>
    </form>
  );
}

function LinhaComparativo({ rotulo, atual, novo }: { rotulo: string; atual: string; novo: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 py-1.5 text-sm">
      <span className="text-neutral-500">{rotulo}</span>
      <span className="text-neutral-600">{atual}</span>
      <span className="font-medium text-ink">{novo}</span>
    </div>
  );
}

/**
 * Compra de pacote pela administração (RF-CRE-16).
 *
 * A prévia mostra o efeito da operação sobre a carteira vigente antes de
 * confirmar: quantos créditos serão somados, o saldo resultante e a nova
 * data de validade. Quando a validade vigente é mais distante que a do
 * pacote comprado, ela é mantida (PA-10) e a tela diz isso explicitamente
 * — a aluna nunca perde prazo por comprar mais créditos.
 */
export function ModalComprarPacote({
  ficha,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  onConfirmar: (params: { pacoteId: string; formaPagamento: FormaPagamento; parcelas?: number }) => Promise<void>;
  onFechar: () => void;
}) {
  const ativos = ficha.pacotes.filter((p) => p.situacao === 'ativo');
  const [pacoteId, setPacoteId] = useState(ativos[0]?.id ?? '');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState(String(PARCELAS_DISPONIVEIS[0]));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const [beneficio, setBeneficio] = useState<BeneficioDeConversao>();

  // RF-EXP-08: a administração também precisa ver o bônus antes de
  // confirmar, para não estranhar a diferença entre catálogo e extrato.
  useEffect(() => {
    let valido = true;
    beneficioDeConversaoDisponivel(ficha.aluna.id).then((encontrado) => {
      if (valido) setBeneficio(encontrado);
    });
    return () => {
      valido = false;
    };
  }, [ficha.aluna.id]);

  const pacote = ativos.find((p) => p.id === pacoteId);
  const comBeneficio = pacote ? aplicarBeneficio(pacote, beneficio) : undefined;
  const previa =
    pacote && comBeneficio
      ? calcularPreviaDeCompra({
          carteiraVigente: ficha.carteira,
          pacote: { ...pacote, ...comBeneficio },
          hoje: hojeISO(),
        })
      : undefined;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({
        pacoteId,
        formaPagamento,
        parcelas: formaPagamento === 'cartao_parcelado' ? Number(parcelas) : undefined,
      });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario
      onEnviar={enviar}
      onFechar={onFechar}
      textoConfirmar="Confirmar compra"
      salvando={salvando}
      erro={erro}
      desabilitado={!pacote}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Pacote"
          value={pacoteId}
          onChange={(e) => setPacoteId(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
        >
          {ativos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {formatarCreditos(p.creditos)} · {p.validadeDias} dias · {formatarMoeda(p.valor)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Forma de pagamento"
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
          required
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
                {n}x de {pacote ? formatarMoeda(pacote.valor / n) : '—'}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {beneficio && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Esta aluna fez aula experimental em {formatarDataBR(beneficio.dataAula)} e tem direito a{' '}
          <strong className="font-semibold">{beneficio.rotulo}</strong> nesta compra. Válido até{' '}
          {formatarDataBR(beneficio.validoAte)}.
        </p>
      )}

      {previa && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="grid grid-cols-3 gap-2 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span>Prévia</span>
            <span>Hoje</span>
            <span>Depois da compra</span>
          </div>
          <LinhaComparativo
            rotulo="Créditos disponíveis"
            atual={String(previa.creditosAtuais)}
            novo={String(previa.creditosResultantes)}
          />
          <LinhaComparativo
            rotulo="Validade"
            atual={previa.validadeAtual ? formatarDataBR(previa.validadeAtual) : '—'}
            novo={formatarDataBR(previa.validadeResultante)}
          />
          <LinhaComparativo rotulo="Valor" atual="—" novo={formatarMoeda(previa.valor)} />

          <p className="mt-2 text-xs text-neutral-600">
            {previa.renovacaoAntecipada
              ? 'Renovação antecipada: os créditos restantes são somados aos do novo pacote e passa a valer uma validade única.'
              : 'A aluna está sem pacote ativo, então nasce uma carteira nova — créditos de carteiras encerradas não são somados.'}
            {previa.validadeMantida && (
              <span className="ml-1 font-medium text-emerald-700">
                A validade atual ({formatarDataBR(previa.validadeAtual!)}) é mais distante que a do pacote comprado e foi
                mantida.
              </span>
            )}
          </p>
        </div>
      )}
    </Formulario>
  );
}

/**
 * Ajuste administrativo da carteira (RF-CRE-09): conceder créditos,
 * estornar utilizados e prorrogar a validade — inclusive de carteira já
 * encerrada. Motivo é obrigatório e fica no extrato.
 */
export function ModalAjustarCreditos({
  carteira,
  encerrada = false,
  onConfirmar,
  onFechar,
}: {
  carteira: Carteira;
  /** A carteira alvo já encerrou: o ajuste a reabre (RF-CRE-09). */
  encerrada?: boolean;
  onConfirmar: (params: { tipo: TipoAjuste; quantidade: number; motivo: string }) => Promise<void>;
  onFechar: () => void;
}) {
  // Numa carteira encerrada, o caso típico é prorrogar a validade de quem
  // precisou esperar a fatura — então o tipo já abre em "prorrogar".
  const [tipo, setTipo] = useState<TipoAjuste>(encerrada ? 'prorrogar' : 'conceder');
  const [quantidade, setQuantidade] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const emDias = tipo === 'prorrogar';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ tipo, quantidade: Number(quantidade), motivo });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario
      onEnviar={enviar}
      onFechar={onFechar}
      textoConfirmar="Aplicar ajuste"
      salvando={salvando}
      erro={erro}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Tipo de ajuste" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAjuste)}>
          {(Object.keys(ROTULOS_AJUSTE) as TipoAjuste[]).map((valor) => (
            <option key={valor} value={valor}>
              {ROTULOS_AJUSTE[valor]}
            </option>
          ))}
        </SelectField>

        <TextField
          label={emDias ? 'Dias a prorrogar' : 'Quantidade de créditos'}
          type="number"
          min={1}
          step={1}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
          dica={
            emDias
              ? `Validade atual: ${formatarDataBR(carteira.dataValidade)}.`
              : `Hoje: ${carteira.creditosTotais} totais, ${carteira.creditosUtilizados} utilizados.`
          }
        />

        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          dica="Fica registrado no extrato de créditos e na trilha de auditoria."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {/* `encerrada` cobre a carteira vencida que a rotina ainda não
          consolidou: no banco ela segue "ativa", mas a leitura já a
          encerrou e a ficha não a mostra como vigente. */}
      {(carteira.situacao !== 'ativa' || encerrada) && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">
          Esta carteira está encerrada. Conceder créditos ou prorrogar a validade reabre a carteira — é o caminho
          previsto para resolver casos concretos sem abrir precedente.
        </p>
      )}
    </Formulario>
  );
}

/**
 * Concessão, alteração e revogação de bolsa (RF-BOL-01/05/06).
 *
 * Na Fase 1 a bolsa é sempre integral (RF-BOL-02): o que a administração
 * escolhe é o pacote concedido. A revogação vale a partir do encerramento
 * da carteira vigente, sem efeito retroativo.
 */
export function ModalBolsa({
  ficha,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  onConfirmar: (params: { bolsista: boolean; pacoteConcedidoId?: string; motivo: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const ativos = ficha.pacotes.filter((p) => p.situacao === 'ativo');
  const [bolsista, setBolsista] = useState(ficha.aluna.bolsista);
  const [pacoteConcedidoId, setPacoteConcedidoId] = useState(
    ficha.aluna.pacoteConcedidoId ?? ativos[0]?.id ?? '',
  );
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const pacote = ativos.find((p) => p.id === pacoteConcedidoId);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ bolsista, pacoteConcedidoId: bolsista ? pacoteConcedidoId : undefined, motivo });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario onEnviar={enviar} onFechar={onFechar} textoConfirmar="Salvar" salvando={salvando} erro={erro}>
      <CheckboxField label="Aluna bolsista — isenção total do valor do pacote" checked={bolsista} onChange={setBolsista} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {bolsista && (
          <SelectField
            label="Pacote concedido"
            value={pacoteConcedidoId}
            onChange={(e) => setPacoteConcedidoId(e.target.value)}
            required
            dica="Qualquer pacote do catálogo pode ser concedido — a condição é da aluna, não do pacote."
            wrapperClassName="sm:col-span-2"
          >
            {ativos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {formatarCreditos(p.creditos)} · {p.validadeDias} dias
              </option>
            ))}
          </SelectField>
        )}

        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          dica="Registrado com autor, data e pacote na trilha de auditoria."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-200">
        {bolsista ? (
          <>
            Nenhuma cobrança será gerada. Ao encerrar, a carteira é renovada automaticamente com{' '}
            {pacote ? `${formatarCreditos(pacote.creditos)} do pacote ${pacote.nome}` : 'o pacote concedido'}. Valor de
            tabela não faturado: {pacote ? formatarMoeda(pacote.valor) : '—'} por concessão.
          </>
        ) : (
          <>
            A revogação vale a partir do encerramento da carteira vigente, sem efeito retroativo: a aluna continua com os
            créditos que já tem.
          </>
        )}
      </p>
    </Formulario>
  );
}

/**
 * Registro de venda realizada fora do gateway (RF-VEN-04). Já nasce
 * confirmada: o pagamento aconteceu fora do sistema, e quem registra está
 * atestando isso.
 */
export function ModalVendaManual({
  ficha,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  onConfirmar: (params: { pacoteId: string; valor: number; data: string; observacao: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const ativos = ficha.pacotes.filter((p) => p.situacao === 'ativo');
  const [pacoteId, setPacoteId] = useState(ativos[0]?.id ?? '');
  const [valor, setValor] = useState(String(ativos[0]?.valor ?? ''));
  const [data, setData] = useState(hojeISO());
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  function trocarPacote(id: string) {
    setPacoteId(id);
    const escolhido = ativos.find((p) => p.id === id);
    if (escolhido) setValor(String(escolhido.valor));
  }

  const pacote = ativos.find((p: Pacote) => p.id === pacoteId);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ pacoteId, valor: Number(valor), data, observacao });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario
      onEnviar={enviar}
      onFechar={onFechar}
      textoConfirmar="Registrar venda"
      salvando={salvando}
      erro={erro}
      desabilitado={!pacote}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Pacote"
          value={pacoteId}
          onChange={(e) => trocarPacote(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
        >
          {ativos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {formatarCreditos(p.creditos)} · {p.validadeDias} dias
            </option>
          ))}
        </SelectField>

        <TextField
          label="Valor recebido (R$)"
          type="number"
          min={0}
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          dica={
            pacote && Number(valor) > 0
              ? `${formatarMoeda(valorUnitarioDoCredito(Number(valor), pacote.creditos))} por crédito.`
              : 'Pode diferir do valor de tabela.'
          }
        />

        <TextField label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

        <TextField
          label="Como foi recebido"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          required
          dica="Dinheiro, transferência, maquininha do studio…"
          wrapperClassName="sm:col-span-2"
        />
      </div>
    </Formulario>
  );
}

/**
 * Trancamento da carteira (RF-TRA-01/05/07).
 *
 * A tela apresenta o pacote, o saldo, a validade e o histórico de
 * trancamentos anteriores como apoio à decisão: o escopo decidiu não impor
 * teto de dias, então o controle é o critério de quem concede, e o que o
 * sistema faz é dar contexto antes de arbitrar.
 */
export function ModalTrancamento({
  ficha,
  carteira,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  carteira: Carteira;
  onConfirmar: (params: { dataInicio: string; dataTerminoPrevista: string; motivo: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState(somarDias(hojeISO(), 30));
  const [motivo, setMotivo] = useState('');
  const [previa, setPrevia] = useState<PreviaTrancamento>();
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let valido = true;
    calcularPreviaDeTrancamento({
      carteira,
      alunaId: ficha.aluna.id,
      dataInicio,
      dataTerminoPrevista,
    }).then((resultado) => {
      if (valido) setPrevia(resultado);
    });
    return () => {
      valido = false;
    };
  }, [carteira, ficha.aluna.id, dataInicio, dataTerminoPrevista]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ dataInicio, dataTerminoPrevista, motivo });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario onEnviar={enviar} onFechar={onFechar} textoConfirmar="Trancar pacote" salvando={salvando} erro={erro}>
      {/* RF-TRA-07: contexto para a decisão, antes dos campos. */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pacote</p>
          <p className="text-ink">{ficha.pacote?.nome ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Disponíveis</p>
          <p className="text-ink">{ficha.leitura?.disponiveis ?? 0}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Validade</p>
          <p className="text-ink">{formatarDataBR(carteira.dataValidade)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Trancamentos</p>
          <p className="text-ink">{ficha.trancamentos.length} anterior(es)</p>
        </div>
      </div>

      {ficha.trancamentos.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-neutral-500">
          {ficha.trancamentos.slice(0, 3).map((t) => (
            <li key={t.id}>
              {formatarDataBR(t.dataInicio)} a {formatarDataBR(t.dataTerminoPrevista)} · {t.diasProrrogados} dia(s) ·{' '}
              {t.motivo}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Início do trancamento"
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          required
        />
        <TextField
          label="Retorno previsto"
          type="date"
          value={dataTerminoPrevista}
          onChange={(e) => setDataTerminoPrevista(e.target.value)}
          required
          dica="O sistema não impõe teto de dias — a decisão é da administração."
        />
        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          dica="Registrado com autor e data na trilha de auditoria."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {previa && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="grid grid-cols-3 gap-2 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span>Prévia</span>
            <span>Hoje</span>
            <span>No retorno</span>
          </div>
          <LinhaComparativo
            rotulo="Créditos congelados"
            atual={String(previa.creditosCongelados)}
            novo={String(previa.creditosCongelados)}
          />
          <LinhaComparativo
            rotulo="Validade"
            atual={formatarDataBR(previa.validadeAtual)}
            novo={formatarDataBR(previa.validadeProjetada)}
          />
          <LinhaComparativo
            rotulo="Dias de trancamento"
            atual="—"
            novo={`${previa.diasDeTrancamento} dia(s)`}
          />

          {previa.aulasQueSeraoCanceladas.length > 0 ? (
            <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">
              <p className="font-medium">
                {previa.aulasQueSeraoCanceladas.length} aula(s) agendada(s) no período serão canceladas, e os créditos
                reservados voltam ao saldo disponível:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {previa.aulasQueSeraoCanceladas.map((aula) => (
                  <li key={aula.agendamentoId}>
                    {formatarDataBR(aula.data)} · {formatarCreditos(aula.creditos)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-600">Nenhuma aula agendada no período.</p>
          )}
        </div>
      )}
    </Formulario>
  );
}

/**
 * Reembolso (RF-REE-01/02/03/07).
 *
 * A prévia mostra valor pago, créditos utilizados, valor descontado e
 * líquido a reembolsar antes de confirmar. Fora do prazo de arrependimento,
 * a operação só segue por motivo legal, com documentação datada — e aí o
 * valor admite ajuste, porque o RF-REE-07 permite reembolso parcial.
 */
export function ModalReembolso({
  venda,
  onConfirmar,
  onFechar,
}: {
  venda: Venda;
  onConfirmar: (params: {
    tipo: TipoReembolso;
    motivo: string;
    documentacao?: string;
    valorPersonalizado?: number;
  }) => Promise<void>;
  onFechar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoReembolso>('arrependimento');
  const [motivo, setMotivo] = useState('');
  const [documentacao, setDocumentacao] = useState('');
  const [valorPersonalizado, setValorPersonalizado] = useState('');
  const [previa, setPrevia] = useState<PreviaDeReembolso>();
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let valido = true;
    calcularPreviaDeReembolso({ venda, tipo }).then((resultado) => {
      if (!valido) return;
      setPrevia(resultado);
      setValorPersonalizado(String(resultado.valorReembolsado));
    });
    return () => {
      valido = false;
    };
  }, [venda, tipo]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({
        tipo,
        motivo,
        documentacao: tipo === 'legal' ? documentacao : undefined,
        valorPersonalizado: tipo === 'legal' ? Number(valorPersonalizado) : undefined,
      });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario
      onEnviar={enviar}
      onFechar={onFechar}
      textoConfirmar="Confirmar reembolso"
      salvando={salvando}
      erro={erro}
      desabilitado={!previa?.elegivel}
    >
      <p className="text-sm text-neutral-600">
        Compra de {formatarDataBR(venda.data)} · {formatarCreditos(venda.creditos)} ·{' '}
        {formatarMoeda(venda.valor)} em {rotuloFormaPagamento(venda.formaPagamento, venda.parcelas)}.
      </p>

      <SelectField label="Tipo de reembolso" value={tipo} onChange={(e) => setTipo(e.target.value as TipoReembolso)}>
        <option value="arrependimento">Arrependimento (dentro do prazo)</option>
        <option value="legal">Motivo legal (mediante documentação)</option>
      </SelectField>

      {previa && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Valor pago</dt>
              <dd className="text-ink">{formatarMoeda(previa.valorPago)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Créditos utilizados desde a compra</dt>
              <dd className="text-ink">
                {previa.creditosUtilizados} de {previa.creditosComprados} ({previa.percentualUtilizado}%)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">
                Valor descontado ({formatarMoeda(previa.valorUnitario)} por crédito)
              </dt>
              <dd className="text-ink">− {formatarMoeda(previa.valorDescontado)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
              <dt className="font-medium text-ink">Valor líquido a reembolsar</dt>
              <dd className="font-semibold text-ink">{formatarMoeda(previa.valorReembolsado)}</dd>
            </div>
          </dl>

          <p className="mt-2 text-xs text-neutral-600">
            {previa.encerraCarteira ? (
              <>
                A carteira será encerrada, os créditos remanescentes anulados
                {previa.aulasFuturas > 0 && ` e ${previa.aulasFuturas} aula(s) futura(s) cancelada(s)`}.
              </>
            ) : (
              <>
                Esta compra foi absorvida por uma carteira que já existia: apenas os créditos dela saem, e a validade
                anterior ({formatarDataBR(previa.validadeRestaurada!)}) é restaurada.
              </>
            )}
          </p>

          {!previa.elegivel && (
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
              {previa.impedimento}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tipo === 'legal' && (
          <>
            <TextField
              label="Documentação apresentada"
              value={documentacao}
              onChange={(e) => setDocumentacao(e.target.value)}
              required
              dica="Documento datado e assinado, apresentado em até 7 dias do evento."
            />
            <TextField
              label="Valor a reembolsar (R$)"
              type="number"
              min={0}
              step="0.01"
              value={valorPersonalizado}
              onChange={(e) => setValorPersonalizado(e.target.value)}
              required
              dica="O reembolso por motivo legal admite valor parcial."
            />
          </>
        )}
        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          dica="Registrado com autor, data e valor na trilha de auditoria."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {previa?.textoPrazo && (
        <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800 ring-1 ring-inset ring-primary-100">
          Informado à aluna: {previa.textoPrazo}
        </p>
      )}
    </Formulario>
  );
}
