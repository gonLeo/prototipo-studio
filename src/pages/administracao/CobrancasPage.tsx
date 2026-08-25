import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  alternarSimulacaoDeFalha,
  cancelarCobranca,
  listarCobrancasDetalhadas,
  parametrosFinanceiros,
  processarRotinaFinanceira,
  registrarPagamentoManual,
  reenviarLinkDePagamento,
  resumirCobrancas,
  tentarPagamento,
} from '../../hooks/cobrancas';
import type { CobrancaDetalhada } from '../../hooks/cobrancas';
import type { FormaPagamento, SituacaoCobranca } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SelectField, TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR, hojeISO, nomeDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/contrato';

const ROTULO_SITUACAO: Record<SituacaoCobranca, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  falha: 'Falha',
  atrasada: 'Em atraso',
  cancelada: 'Cancelada',
};

const TOM_SITUACAO: Record<SituacaoCobranca, 'aviso' | 'sucesso' | 'erro' | 'neutro' | 'info'> = {
  pendente: 'info',
  paga: 'sucesso',
  falha: 'aviso',
  atrasada: 'erro',
  cancelada: 'neutro',
};

const FORMAS_DE_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'cartao', rotulo: 'Cartão na maquininha' },
  { valor: 'outro', rotulo: 'Outro' },
];

type FiltroSituacao = 'todas' | SituacaoCobranca;

const FILTROS: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'atrasada', rotulo: 'Em atraso' },
  { valor: 'falha', rotulo: 'Com falha' },
  { valor: 'pendente', rotulo: 'A receber' },
  { valor: 'paga', rotulo: 'Recebidas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
];

function Indicador({
  rotulo,
  valor,
  quantidade,
  destaque,
}: {
  rotulo: string;
  valor: number;
  quantidade: number;
  destaque?: 'positivo' | 'negativo';
}) {
  const cor =
    destaque === 'positivo'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : destaque === 'negativo'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-neutral-200 bg-white text-ink';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cor}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold">{formatarMoeda(valor)}</p>
      <p className="text-xs opacity-70">{quantidade} cobrança(s)</p>
    </div>
  );
}

function FormularioPagamentoManual({
  cobranca,
  onConfirmar,
  onFechar,
}: {
  cobranca: CobrancaDetalhada;
  onConfirmar: (dados: { formaPagamento: FormaPagamento; dataPagamento: string; observacao: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [dataPagamento, setDataPagamento] = useState(hojeISO());
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ formaPagamento, dataPagamento, observacao });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <p className="font-medium text-ink">{cobranca.nomeAluna}</p>
        <p className="text-xs text-neutral-500">
          {cobranca.nomePacote} · vencimento em {formatarDataBR(cobranca.dataVencimento)}
        </p>
        <p className="mt-2 text-ink">
          Valor a receber: <strong>{formatarMoeda(cobranca.valorAtualizado)}</strong>
          {cobranca.multa + cobranca.juros > 0 && (
            <span className="text-xs text-neutral-500">
              {' '}
              (original {formatarMoeda(cobranca.valorLiquido)} + multa {formatarMoeda(cobranca.multa)} + juros{' '}
              {formatarMoeda(cobranca.juros)})
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Forma de pagamento"
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
        >
          {FORMAS_DE_PAGAMENTO.map((forma) => (
            <option key={forma.valor} value={forma.valor}>
              {forma.rotulo}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Data do pagamento"
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          required
        />
        <TextField
          label="Observação"
          wrapperClassName="sm:col-span-2"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: pago na recepção, comprovante arquivado"
          dica="Fica no histórico financeiro da aluna."
        />
      </div>

      <p className="text-xs text-neutral-500">
        Registrar o pagamento quita a cobrança e, não restando outro débito vencido, regulariza a aluna e libera o
        agendamento na hora.
      </p>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Registrando…' : 'Registrar pagamento'}
        </Button>
      </div>
    </form>
  );
}

function FormularioCancelamento({
  cobranca,
  onConfirmar,
  onFechar,
}: {
  cobranca: CobrancaDetalhada;
  onConfirmar: (motivo: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
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
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Cancelar a cobrança de {cobranca.nomeAluna} no valor de {formatarMoeda(cobranca.valorAtualizado)}, com
        vencimento em {formatarDataBR(cobranca.dataVencimento)}. O motivo fica registrado na auditoria.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Motivo</span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          required
          autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Voltar
        </Button>
        <Button type="submit" variante="perigo" disabled={salvando}>
          {salvando ? 'Cancelando…' : 'Cancelar cobrança'}
        </Button>
      </div>
    </form>
  );
}

function DetalheDaCobranca({ cobranca }: { cobranca: CobrancaDetalhada }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Aluna</dt>
          <dd className="text-ink">{cobranca.nomeAluna}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Pacote</dt>
          <dd className="text-ink">{cobranca.nomePacote}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Vencimento</dt>
          <dd className="text-ink">{formatarDataBR(cobranca.dataVencimento)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Situação</dt>
          <dd>
            <Badge tom={TOM_SITUACAO[cobranca.situacao]}>{ROTULO_SITUACAO[cobranca.situacao]}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Valor original</dt>
          <dd className="text-ink">{formatarMoeda(cobranca.valorLiquido)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Multa e juros</dt>
          <dd className="text-ink">
            {formatarMoeda(cobranca.multa)} + {formatarMoeda(cobranca.juros)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Valor atualizado</dt>
          <dd className="font-semibold text-ink">{formatarMoeda(cobranca.valorAtualizado)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Quitação</dt>
          <dd className="text-ink">
            {cobranca.dataQuitacao ? formatarDataBR(cobranca.dataQuitacao) : '—'}
            {cobranca.formaPagamento && cobranca.formaPagamento !== 'gateway' && (
              <span className="text-xs text-neutral-500">
                {' '}
                ({FORMAS_DE_PAGAMENTO.find((f) => f.valor === cobranca.formaPagamento)?.rotulo})
              </span>
            )}
          </dd>
        </div>
      </dl>

      {cobranca.observacao && (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          Observação: {cobranca.observacao}
        </p>
      )}
      {cobranca.motivoCancelamento && (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          Motivo do cancelamento: {cobranca.motivoCancelamento}
        </p>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink">Tentativas de cobrança</h3>
        {cobranca.tentativas.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Nenhuma tentativa registrada até agora.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
            {cobranca.tentativas.map((tentativa) => (
              <li key={tentativa.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
                <div>
                  <p className="text-sm text-ink">
                    {formatarDataBR(tentativa.dataHora.slice(0, 10))} às {tentativa.dataHora.slice(11, 16)} ·{' '}
                    {tentativa.origem === 'automatica' ? 'automática' : 'manual'}
                  </p>
                  <p className="text-xs text-neutral-500">{tentativa.retornoGateway}</p>
                </div>
                <Badge tom={tentativa.situacao === 'sucesso' ? 'sucesso' : 'erro'}>
                  {tentativa.situacao === 'sucesso' ? 'Aprovada' : 'Recusada'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type ModalAberto =
  | { tipo: 'detalhe'; cobranca: CobrancaDetalhada }
  | { tipo: 'pagamento'; cobranca: CobrancaDetalhada }
  | { tipo: 'cancelamento'; cobranca: CobrancaDetalhada }
  | null;

/**
 * Painel de cobranças (M11): consolidado do período por situação
 * (RF-FIN-11), rotina financeira do dia (RF-FIN-02/03/05/06/09) e as ações
 * de recebimento — retentativa, reenvio de link, pagamento manual e
 * cancelamento (RF-FIN-04/12/13).
 */
export function CobrancasPage() {
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [cobrancas, setCobrancas] = useState<CobrancaDetalhada[]>([]);
  const [prazoBloqueio, setPrazoBloqueio] = useState(5);
  const [filtro, setFiltro] = useState<FiltroSituacao>('todas');
  const [modal, setModal] = useState<ModalAberto>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const hoje = useMemo(() => hojeISO(), []);
  const mesCorrente = hoje.slice(0, 7);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, parametros] = await Promise.all([listarCobrancasDetalhadas(hoje), parametrosFinanceiros()]);
    setCobrancas(lista);
    setPrazoBloqueio(parametros.prazoBloqueioDias);
    setCarregando(false);
  }, [hoje]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // RF-FIN-11: o consolidado é do mês corrente; as vencidas de meses
  // anteriores continuam na lista, porque ainda são dinheiro a receber.
  const doPeriodo = useMemo(
    () => cobrancas.filter((c) => c.dataVencimento.slice(0, 7) === mesCorrente),
    [cobrancas, mesCorrente],
  );
  const resumo = useMemo(() => resumirCobrancas(doPeriodo), [doPeriodo]);

  const visiveis = filtro === 'todas' ? cobrancas : cobrancas.filter((c) => c.situacao === filtro);
  const emAtrasoTotal = cobrancas.filter((c) => c.situacao === 'atrasada');

  async function executar(acao: () => Promise<void>, mensagem: string) {
    try {
      await acao();
      await recarregar();
      mostrarToast(mensagem, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  async function rodarRotina() {
    if (!usuario) return;
    const ok = await confirmar({
      titulo: 'Executar rotina financeira do dia',
      mensagem:
        'Gera as cobranças dos ciclos que vencem hoje, retenta as que falharam, recalcula multa e juros das vencidas, bloqueia quem passou do prazo e envia os avisos de término de contrato. No sistema final isso roda sozinho na virada do dia.',
      textoConfirmar: 'Executar',
    });
    if (!ok) return;

    setProcessando(true);
    try {
      const resultado = await processarRotinaFinanceira({ autorId: usuario.id, hoje });
      await recarregar();
      mostrarToast(
        `Rotina concluída: ${resultado.cobrancasGeradas} cobrança(s) gerada(s), ${resultado.tentativasComSucesso} de ${resultado.tentativasExecutadas} tentativa(s) aprovada(s), ${resultado.cobrancasAtrasadas} marcada(s) em atraso, ${resultado.alunasBloqueadas} aluna(s) bloqueada(s), ${resultado.alunasRegularizadas} regularizada(s) e ${resultado.avisosDeVencimento} aviso(s) de término enviado(s).`,
        'sucesso',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink first-letter:uppercase">
            Cobranças de {nomeDoMes(Number(mesCorrente.slice(5, 7)) - 1)} de {mesCorrente.slice(0, 4)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cobrança recorrente pelo gateway, retentativa no dia seguinte e bloqueio do agendamento após{' '}
            {prazoBloqueio} dias de atraso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={cobrancas.length === 0}
            onClick={() =>
              baixarCSV({
                nomeArquivo: 'cobrancas',
                itens: visiveis,
                colunas: [
                  { cabecalho: 'Aluna', valor: (item) => item.nomeAluna },
                  { cabecalho: 'Referência', valor: (item) => item.nomePacote },
                  { cabecalho: 'Vencimento', valor: (item) => item.dataVencimento },
                  { cabecalho: 'Valor original', valor: (item) => item.valorLiquido },
                  { cabecalho: 'Multa', valor: (item) => item.multa },
                  { cabecalho: 'Juros', valor: (item) => item.juros },
                  { cabecalho: 'Valor atualizado', valor: (item) => item.valorAtualizado },
                  { cabecalho: 'Situação', valor: (item) => ROTULO_SITUACAO[item.situacao] },
                  { cabecalho: 'Quitação', valor: (item) => item.dataQuitacao ?? '' },
                  { cabecalho: 'Tentativas', valor: (item) => item.tentativas.length },
                ],
              })
            }
          >
            Exportar CSV
          </Button>
          <Button onClick={rodarRotina} disabled={processando}>
            {processando ? 'Processando…' : 'Executar rotina do dia'}
          </Button>
        </div>
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              rotulo="Recebido"
              valor={resumo.recebido}
              quantidade={resumo.quantidade.recebido}
              destaque="positivo"
            />
            <Indicador rotulo="A receber" valor={resumo.aReceber} quantidade={resumo.quantidade.aReceber} />
            <Indicador rotulo="Com falha" valor={resumo.comFalha} quantidade={resumo.quantidade.comFalha} />
            <Indicador
              rotulo="Em atraso"
              valor={resumo.emAtraso}
              quantidade={resumo.quantidade.emAtraso}
              destaque="negativo"
            />
          </div>

          {emAtrasoTotal.length > 0 && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-900">
                {emAtrasoTotal.length} cobrança(s) em atraso, somando{' '}
                {formatarMoeda(emAtrasoTotal.reduce((soma, c) => soma + c.valorAtualizado, 0))}
              </p>
              <p className="mt-1 text-sm text-rose-800">
                Multa e juros já aplicados. Passados {prazoBloqueio} dias do vencimento, a rotina do dia bloqueia o
                agendamento da aluna até a regularização.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-1.5">
            {FILTROS.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => setFiltro(item.valor)}
                aria-pressed={filtro === item.valor}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  filtro === item.valor
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>

          <Tabela
            rotulo="Cobranças"
            itens={visiveis}
            chave={(item) => item.id}
            busca={{
              placeholder: 'Buscar por aluna',
              corresponde: (item, termo) => item.nomeAluna.toLowerCase().includes(termo),
            }}
            semResultados="Nenhuma cobrança nesta situação."
            colunas={[
              { chave: 'aluna', rotulo: 'Aluna' },
              { chave: 'vencimento', rotulo: 'Vencimento' },
              { chave: 'valor', rotulo: 'Valor', alinhamento: 'direita' },
              { chave: 'situacao', rotulo: 'Situação' },
              { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
            ]}
            renderLinha={(item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela>
                  <Link
                    to={`/administracao/alunas/${item.alunaId}`}
                    className="font-medium text-primary-700 hover:text-primary-800"
                  >
                    {item.nomeAluna}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {item.nomePacote}
                    {item.origem === 'contratacao' ? ' · contratação' : ''}
                  </p>
                </CelulaTabela>
                <CelulaTabela>
                  <p>{formatarDataBR(item.dataVencimento)}</p>
                  {item.diasDeAtraso > 0 && (
                    <p className="text-xs text-rose-600">{item.diasDeAtraso} dia(s) de atraso</p>
                  )}
                </CelulaTabela>
                <CelulaTabela alinhamento="direita">
                  <p className="font-medium text-ink">{formatarMoeda(item.valorAtualizado)}</p>
                  {item.multa + item.juros > 0 && (
                    <p className="text-xs text-neutral-500">
                      {formatarMoeda(item.valorLiquido)} + encargos {formatarMoeda(item.multa + item.juros)}
                    </p>
                  )}
                </CelulaTabela>
                <CelulaTabela>
                  <Badge tom={TOM_SITUACAO[item.situacao]}>{ROTULO_SITUACAO[item.situacao]}</Badge>
                  {item.simularFalhaGateway && (
                    <p className="mt-1 text-xs text-amber-700">Gateway simulando recusa</p>
                  )}
                </CelulaTabela>
                <CelulaTabela alinhamento="direita">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button variante="fantasma" onClick={() => setModal({ tipo: 'detalhe', cobranca: item })}>
                      Detalhar
                    </Button>
                    {item.situacao !== 'paga' && item.situacao !== 'cancelada' && (
                      <>
                        <Button
                          variante="fantasma"
                          onClick={() =>
                            executar(
                              () => tentarPagamento({ cobranca: item, origem: 'manual' }).then(() => undefined),
                              'Tentativa registrada.',
                            )
                          }
                        >
                          Tentar de novo
                        </Button>
                        <Button variante="fantasma" onClick={() => setModal({ tipo: 'pagamento', cobranca: item })}>
                          Receber por fora
                        </Button>
                      </>
                    )}
                  </div>
                </CelulaTabela>
              </LinhaTabela>
            )}
          />

          <p className="mt-3 text-xs text-neutral-500">
            O provedor de pagamento ainda está em definição no escopo (RF-FIN-14 / PA-04). Neste protótipo o gateway é
            simulado e aprova sempre, exceto nas cobranças marcadas com "Simular falha" — é o que permite demonstrar
            retentativa, multa, juros e bloqueio por inadimplência de forma reproduzível.
          </p>
        </>
      )}

      {modal?.tipo === 'detalhe' && (
        <Modal titulo="Detalhe da cobrança" largura="larga" onFechar={() => setModal(null)}>
          <DetalheDaCobranca cobranca={modal.cobranca} />
          {modal.cobranca.situacao !== 'paga' && modal.cobranca.situacao !== 'cancelada' && (
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4">
              <Button
                variante="secundaria"
                onClick={() => {
                  const cobranca = modal.cobranca;
                  setModal(null);
                  executar(
                    () => alternarSimulacaoDeFalha(cobranca).then(() => undefined),
                    cobranca.simularFalhaGateway
                      ? 'Gateway simulado volta a aprovar esta cobrança.'
                      : 'Gateway simulado vai recusar esta cobrança.',
                  );
                }}
              >
                {modal.cobranca.simularFalhaGateway ? 'Parar de simular falha' : 'Simular falha no gateway'}
              </Button>
              <Button
                variante="secundaria"
                onClick={() => {
                  const cobranca = modal.cobranca;
                  setModal(null);
                  executar(() => reenviarLinkDePagamento(cobranca), 'Link de pagamento reenviado.');
                }}
              >
                Reenviar link
              </Button>
              <Button
                variante="perigo"
                onClick={() => setModal({ tipo: 'cancelamento', cobranca: modal.cobranca })}
              >
                Cancelar cobrança
              </Button>
            </div>
          )}
        </Modal>
      )}

      {modal?.tipo === 'pagamento' && (
        <Modal titulo="Registrar pagamento fora do gateway" largura="larga" onFechar={() => setModal(null)}>
          <FormularioPagamentoManual
            cobranca={modal.cobranca}
            onConfirmar={async (dados) => {
              if (!usuario) return;
              await registrarPagamentoManual({ cobranca: modal.cobranca, autorId: usuario.id, ...dados });
              await recarregar();
              mostrarToast('Pagamento registrado e situação da aluna atualizada.', 'sucesso');
            }}
            onFechar={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.tipo === 'cancelamento' && (
        <Modal titulo="Cancelar cobrança" onFechar={() => setModal(null)}>
          <FormularioCancelamento
            cobranca={modal.cobranca}
            onConfirmar={async (motivo) => {
              if (!usuario) return;
              await cancelarCobranca({ cobranca: modal.cobranca, motivo, autorId: usuario.id });
              await recarregar();
              mostrarToast('Cobrança cancelada com o motivo registrado.', 'sucesso');
            }}
            onFechar={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
