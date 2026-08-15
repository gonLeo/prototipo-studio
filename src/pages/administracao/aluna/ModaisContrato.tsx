import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Contrato, Pacote, TipoContrato, TipoPausa } from '../../../types/domain';
import type { FichaAluna } from '../../../hooks/useFichaAluna';
import { Button } from '../../../components/ui/Button';
import { TextField, SelectField } from '../../../components/ui/Field';
import {
  calcularPreviaAlteracaoPlano,
  calcularPreviaPausa,
  ehIsencaoTotal,
  formatarMoeda,
  valorComBolsa,
} from '../../../utils/contrato';
import type { PreviaAlteracaoPlano } from '../../../utils/contrato';
import { formatarDataBR, hojeISO } from '../../../utils/data';
import { MOTIVOS_ENCERRAMENTO } from '../../../hooks/contratosDeAluna';

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
 * Alteração de plano (RF-PLN-01/06): comparativo lado a lado do plano
 * atual e do novo, com o cálculo da diferença e do saldo resultante antes
 * da confirmação — a administração enxerga o que será cobrado sem
 * calcular nada à mão (decisão de UX registrada no escopo).
 */
export function ModalAlterarPlano({
  ficha,
  contrato,
  pacoteAtual,
  aulasRealizadasNoCiclo,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  contrato: Contrato;
  pacoteAtual: Pacote;
  aulasRealizadasNoCiclo: number;
  onConfirmar: (pacoteNovo: Pacote, previa: PreviaAlteracaoPlano) => Promise<void>;
  onFechar: () => void;
}) {
  const [pacoteNovoId, setPacoteNovoId] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const disponiveis = ficha.pacotes.filter((p) => p.situacao === 'ativo' && p.id !== contrato.pacoteId);
  const pacoteNovo = disponiveis.find((p) => p.id === pacoteNovoId);
  const percentualBolsa = ficha.aluna.percentualBolsa ?? 0;

  const previa = pacoteNovo
    ? calcularPreviaAlteracaoPlano({
        contrato,
        pacoteAtual,
        pacoteNovo,
        aulasRealizadasNoCiclo,
        percentualBolsa,
        hoje: hojeISO(),
      })
    : undefined;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pacoteNovo || !previa) return;
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar(pacoteNovo, previa);
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
      textoConfirmar="Confirmar alteração"
      salvando={salvando}
      erro={erro}
      desabilitado={!pacoteNovo}
    >
      <SelectField label="Novo plano" value={pacoteNovoId} onChange={(e) => setPacoteNovoId(e.target.value)} required>
        <option value="">Selecione…</option>
        {disponiveis.map((pacote) => (
          <option key={pacote.id} value={pacote.id}>
            {pacote.nome} — {pacote.aulasPorCiclo} aulas · {formatarMoeda(pacote.valorMensal)}
          </option>
        ))}
      </SelectField>

      {previa && pacoteNovo && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span />
            <span>Plano atual</span>
            <span>Plano novo</span>
          </div>
          <LinhaComparativo rotulo="Pacote" atual={pacoteAtual.nome} novo={pacoteNovo.nome} />
          <LinhaComparativo
            rotulo="Aulas por ciclo"
            atual={`${pacoteAtual.aulasPorCiclo}`}
            novo={`${pacoteNovo.aulasPorCiclo}`}
          />
          <LinhaComparativo
            rotulo="Valor mensal"
            atual={formatarMoeda(valorComBolsa(pacoteAtual.valorMensal, percentualBolsa))}
            novo={formatarMoeda(valorComBolsa(pacoteNovo.valorMensal, percentualBolsa))}
          />

          <dl className="mt-3 flex flex-col gap-1 border-t border-neutral-200 pt-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">
                Consumido do plano atual ({previa.diasDecorridos} de {previa.diasDoCiclo} dias)
              </dt>
              <dd className="text-neutral-700">{formatarMoeda(previa.valorConsumido)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Crédito do saldo não consumido</dt>
              <dd className="text-neutral-700">{formatarMoeda(previa.creditoRestante)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Novo plano pelos {previa.diasRestantes} dias restantes</dt>
              <dd className="text-neutral-700">{formatarMoeda(previa.custoNovoProporcional)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-2 border-t border-neutral-200 pt-2">
              <dt className="font-medium text-ink">
                {previa.diferenca >= 0 ? 'Diferença a cobrar agora' : 'Crédito na próxima cobrança'}
              </dt>
              <dd className={`font-semibold ${previa.diferenca >= 0 ? 'text-ink' : 'text-emerald-700'}`}>
                {formatarMoeda(Math.abs(previa.diferenca))}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-medium text-ink">Saldo de aulas resultante</dt>
              <dd className="font-semibold text-ink">
                {previa.saldoAulasResultante} aulas
                <span className="ml-1 text-xs font-normal text-neutral-500">
                  ({aulasRealizadasNoCiclo} já realizada(s) no ciclo)
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Término do contrato</dt>
              <dd className="text-neutral-700">
                {formatarDataBR(previa.dataTerminoContrato)}
                <span className="ml-1 text-xs text-neutral-500">(inalterado)</span>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Formulario>
  );
}

/** Concessão, alteração ou revogação de bolsa (RF-BOL-01/02/07/08). */
export function ModalBolsa({
  ficha,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  onConfirmar: (percentual: number, motivo: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [percentual, setPercentual] = useState(String(ficha.aluna.percentualBolsa ?? 0));
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const valor = Number(percentual) || 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar(valor, motivo);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario onEnviar={enviar} onFechar={onFechar} textoConfirmar="Salvar bolsa" salvando={salvando} erro={erro}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Percentual de desconto (%)"
          type="number"
          min={0}
          max={100}
          value={percentual}
          onChange={(e) => setPercentual(e.target.value)}
          required
          autoFocus
          dica="0 revoga a bolsa. 100 isenta integralmente."
        />
        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          dica="Fica registrado no histórico com autor e data."
        />
      </div>

      {ficha.pacote && (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm ring-1 ring-inset ring-neutral-200">
          {ehIsencaoTotal(valor) ? (
            <span className="font-medium text-emerald-700">Isenta — nenhuma cobrança será gerada.</span>
          ) : (
            <>
              <span className="font-medium text-ink">{formatarMoeda(valorComBolsa(ficha.pacote.valorMensal, valor))}</span>
              {valor > 0 && (
                <span className="ml-2 text-neutral-400 line-through">{formatarMoeda(ficha.pacote.valorMensal)}</span>
              )}
              <span className="ml-2 text-neutral-500">por mês</span>
            </>
          )}
        </p>
      )}

      <p className="text-xs text-neutral-500">
        A alteração vale a partir do próximo ciclo de cobrança, sem efeito retroativo sobre o ciclo corrente.
      </p>
    </Formulario>
  );
}

/** Trancamento ou suspensão, com prévia do efeito na validade (RF-CTR-01/03/06). */
export function ModalPausa({
  contrato,
  onConfirmar,
  onFechar,
}: {
  contrato: Contrato;
  onConfirmar: (dados: { tipo: TipoPausa; dataInicio: string; dataTerminoPrevista: string; motivo: string }) => Promise<void>;
  onFechar: () => void;
}) {
  // O mecanismo é determinado pela duração do contrato: semestral tranca,
  // mensal suspende (seção 5.3.5 do escopo).
  const tipo: TipoPausa = contrato.tipo === 'semestral' ? 'trancamento' : 'suspensao';

  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const previa =
    dataInicio && dataTerminoPrevista
      ? calcularPreviaPausa({ contrato, dataInicio, dataTerminoPrevista })
      : undefined;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ tipo, dataInicio, dataTerminoPrevista, motivo });
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
      textoConfirmar={tipo === 'trancamento' ? 'Trancar contrato' : 'Suspender contrato'}
      salvando={salvando}
      erro={erro}
    >
      <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800 ring-1 ring-inset ring-primary-100">
        {tipo === 'trancamento'
          ? 'Contrato semestral: durante o trancamento a cobrança é pausada e a validade do pacote fica congelada.'
          : 'Contrato mensal: durante a suspensão a cobrança é mantida e a aluna recebe prazo adicional para repor as aulas.'}{' '}
        Nos dois casos o agendamento fica bloqueado e as aulas já marcadas no período são canceladas com devolução do
        crédito.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Início da pausa"
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Retorno previsto"
          type="date"
          value={dataTerminoPrevista}
          onChange={(e) => setDataTerminoPrevista(e.target.value)}
          required
        />
        <TextField
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {previa && (
        <dl className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Período de pausa</dt>
            <dd className="text-neutral-700">{previa.diasDePausa} dias</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Saldo congelado</dt>
            <dd className="text-neutral-700">{previa.saldoCongelado} aulas</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Validade atual</dt>
            <dd className="text-neutral-700">{formatarDataBR(previa.validadeAtual)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1.5">
            <dt className="font-medium text-ink">Validade após o retorno</dt>
            <dd className="font-semibold text-ink">{formatarDataBR(previa.validadeProjetada)}</dd>
          </div>
        </dl>
      )}
    </Formulario>
  );
}

/** Encerramento com motivo estruturado (RF-CTR-07/08). */
export function ModalEncerrar({
  onConfirmar,
  onFechar,
}: {
  onConfirmar: (motivo: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_ENCERRAMENTO[0]);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar(motivo);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario onEnviar={enviar} onFechar={onFechar} textoConfirmar="Encerrar contrato" salvando={salvando} erro={erro}>
      <p className="text-sm text-neutral-600">
        A aluna perde o acesso ao agendamento e as aulas futuras são canceladas. O cadastro e todo o histórico
        permanecem, e ela pode voltar depois contratando um novo pacote.
      </p>
      <SelectField label="Motivo do encerramento" value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
        {MOTIVOS_ENCERRAMENTO.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </SelectField>
    </Formulario>
  );
}

/** Reativação contratando novo pacote (RF-CTR-09). */
export function ModalReativar({
  ficha,
  onConfirmar,
  onFechar,
}: {
  ficha: FichaAluna;
  onConfirmar: (dados: { pacoteId: string; tipo: TipoContrato; dataPrimeiraCobranca: string; percentualBolsa: number }) => Promise<void>;
  onFechar: () => void;
}) {
  const disponiveis = ficha.pacotes.filter((p) => p.situacao === 'ativo');
  const [pacoteId, setPacoteId] = useState('');
  const [tipo, setTipo] = useState<TipoContrato>('mensal');
  const [dataPrimeiraCobranca, setDataPrimeiraCobranca] = useState(hojeISO());
  const [percentualBolsa, setPercentualBolsa] = useState(String(ficha.aluna.percentualBolsa ?? 0));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({
        pacoteId,
        tipo,
        dataPrimeiraCobranca,
        percentualBolsa: Number(percentualBolsa) || 0,
      });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Formulario onEnviar={enviar} onFechar={onFechar} textoConfirmar="Reativar aluna" salvando={salvando} erro={erro}>
      <p className="text-sm text-neutral-600">
        O histórico anterior é preservado — o contrato encerrado continua no histórico e um novo passa a valer.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Pacote"
          value={pacoteId}
          onChange={(e) => setPacoteId(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
        >
          <option value="">Selecione…</option>
          {disponiveis.map((pacote) => (
            <option key={pacote.id} value={pacote.id}>
              {pacote.nome} — {pacote.aulasPorCiclo} aulas · {formatarMoeda(pacote.valorMensal)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Duração" value={tipo} onChange={(e) => setTipo(e.target.value as TipoContrato)} required>
          <option value="mensal">Mensal</option>
          <option value="semestral">Semestral</option>
        </SelectField>
        <TextField
          label="Data da primeira cobrança"
          type="date"
          value={dataPrimeiraCobranca}
          onChange={(e) => setDataPrimeiraCobranca(e.target.value)}
          required
        />
        <TextField
          label="Bolsa (%)"
          type="number"
          min={0}
          max={100}
          value={percentualBolsa}
          onChange={(e) => setPercentualBolsa(e.target.value)}
          wrapperClassName="sm:col-span-2"
        />
      </div>
    </Formulario>
  );
}
