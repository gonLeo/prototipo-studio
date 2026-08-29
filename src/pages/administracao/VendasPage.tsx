import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  alternarSimulacaoDeFalha,
  cancelarVenda,
  confirmarPagamentoDaVenda,
  listarVendasDetalhadas,
  reenviarLinkDePagamento,
  resumirVendas,
} from '../../hooks/vendas';
import type { ResumoDeVendas, VendaDetalhada } from '../../hooks/vendas';
import { processarRotinaDeCarteiras } from '../../hooks/carteiraDeCreditos';
import { listarReembolsos, ROTULO_TIPO_REEMBOLSO } from '../../hooks/reembolsos';
import type { ReembolsoDetalhado } from '../../hooks/reembolsos';
import { pacoteRepositorio } from '../../services/repositorios';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { Pacote, SituacaoVenda } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR } from '../../utils/data';
import {
  formatarCreditos,
  formatarMoeda,
  rotuloFormaPagamento,
  rotuloSituacaoVenda,
} from '../../utils/creditos';

type FiltroVenda = 'todas' | SituacaoVenda;

const FILTROS: Array<{ valor: FiltroVenda; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'confirmada', rotulo: 'Confirmadas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
  { valor: 'reembolsada', rotulo: 'Reembolsadas' },
];

const TOM_SITUACAO: Record<SituacaoVenda, 'sucesso' | 'erro' | 'aviso' | 'neutro' | 'info'> = {
  pendente: 'info',
  confirmada: 'sucesso',
  cancelada: 'neutro',
  reembolsada: 'aviso',
};

function Indicador({
  rotulo,
  valor,
  quantidade,
  destaque,
}: {
  rotulo: string;
  valor: number;
  quantidade: number;
  destaque?: 'positivo' | 'atencao';
}) {
  const cor =
    destaque === 'positivo'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : destaque === 'atencao'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-neutral-200 bg-white text-ink';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cor}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold">{formatarMoeda(valor)}</p>
      <p className="text-xs opacity-70">{quantidade} venda(s)</p>
    </div>
  );
}

function FormularioCancelamento({
  venda,
  onConfirmar,
  onFechar,
}: {
  venda: VendaDetalhada;
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
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Cancelar a venda de {formatarMoeda(venda.valor)} de <strong className="text-ink">{venda.nomeAluna}</strong>. A
        venda ainda não foi confirmada, então nenhum crédito foi aplicado à carteira.
      </p>
      <TextField
        label="Motivo do cancelamento"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        required
        autoFocus
        dica="Fica registrado na venda e na trilha de auditoria."
      />
      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Voltar
        </Button>
        <Button type="submit" variante="perigo" disabled={salvando}>
          {salvando ? 'Cancelando…' : 'Cancelar venda'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Painel de vendas (RF-VEN-07).
 *
 * Todo pagamento é único, no ato da compra: não há cobrança recorrente,
 * régua de inadimplência, multa ou juros. A venda nasce pendente e só
 * ativa a carteira quando o gateway confirma (RF-VEN-03).
 */
export function VendasPage() {
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [vendas, setVendas] = useState<VendaDetalhada[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [resumo, setResumo] = useState<ResumoDeVendas>();
  const [reembolsos, setReembolsos] = useState<ReembolsoDetalhado[]>([]);
  const [filtro, setFiltro] = useState<FiltroVenda>('todas');
  const [cancelando, setCancelando] = useState<VendaDetalhada | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, catalogo, aplicados] = await Promise.all([
      listarVendasDetalhadas(),
      pacoteRepositorio.listar(),
      listarReembolsos(),
    ]);
    setVendas(lista);
    setPacotes(catalogo);
    setResumo(resumirVendas(lista, catalogo, aplicados));
    setReembolsos(aplicados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const filtradas = vendas.filter((venda) => filtro === 'todas' || venda.situacao === filtro);

  async function executar(acao: () => Promise<void>, mensagem: string) {
    try {
      await acao();
      await recarregar();
      mostrarToast(mensagem, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  /**
   * Encerramento automático das carteiras e renovação da bolsista
   * (RF-CRE-10, RF-BOL-03). No sistema real roda sozinho todo dia; no
   * protótipo é uma ação explícita, porque carregar uma tela nunca
   * escreve no banco.
   */
  async function rodarRotina() {
    if (!usuario) return;
    setProcessando(true);
    try {
      const r = await processarRotinaDeCarteiras({ autorId: usuario.id });
      await recarregar();
      mostrarToast(
        `Rotina concluída: ${r.encerradasPorConsumo} carteira(s) consumida(s), ${r.encerradasPorVencimento} expirada(s), ` +
          `${r.creditosExpirados} crédito(s) perdido(s), ${r.bolsasRenovadas} bolsa(s) renovada(s), ` +
          `${r.avisosDeFinalizando} aviso(s) de pacote finalizando.`,
        'info',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Vendas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pagamento único no ato da compra. A carteira só é ativada depois da confirmação do gateway.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={filtradas.length === 0}
            onClick={() =>
              baixarCSV({
                nomeArquivo: 'vendas',
                itens: filtradas,
                colunas: [
                  { cabecalho: 'Aluna', valor: (item) => item.nomeAluna },
                  { cabecalho: 'Pacote', valor: (item) => item.nomePacote },
                  { cabecalho: 'Data', valor: (item) => item.data },
                  { cabecalho: 'Valor', valor: (item) => item.valor.toFixed(2) },
                  { cabecalho: 'Forma de pagamento', valor: (item) => rotuloFormaPagamento(item.formaPagamento, item.parcelas) },
                  { cabecalho: 'Situação', valor: (item) => rotuloSituacaoVenda(item.situacao) },
                  { cabecalho: 'Créditos', valor: (item) => item.creditos },
                  { cabecalho: 'Bolsa', valor: (item) => (item.bolsa ? 'Sim' : 'Não') },
                  { cabecalho: 'Identificador no gateway', valor: (item) => item.identificadorGateway ?? '' },
                ],
              })
            }
          >
            Exportar CSV
          </Button>
          <Button onClick={rodarRotina} disabled={processando}>
            {processando ? 'Processando…' : 'Rodar rotina de carteiras'}
          </Button>
        </div>
      </div>

      {resumo && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador
            rotulo="Confirmado"
            valor={resumo.confirmado}
            quantidade={resumo.quantidade.confirmada}
            destaque="positivo"
          />
          <Indicador
            rotulo="Pendente"
            valor={resumo.pendente}
            quantidade={resumo.quantidade.pendente}
            destaque={resumo.quantidade.pendente > 0 ? 'atencao' : undefined}
          />
          <Indicador rotulo="Cancelado" valor={resumo.cancelado} quantidade={resumo.quantidade.cancelada} />
          <Indicador rotulo="Reembolsado" valor={resumo.reembolsado} quantidade={resumo.quantidade.reembolsada} />
        </div>
      )}

      {resumo && resumo.isentoPorBolsa > 0 && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-100">
          {formatarMoeda(resumo.isentoPorBolsa)} não faturados em concessões de bolsa no período.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-1">
        {FILTROS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => setFiltro(opcao.valor)}
            aria-pressed={filtro === opcao.valor}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              filtro === opcao.valor
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && filtradas.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          {vendas.length === 0 ? 'Nenhuma venda registrada ainda.' : 'Nenhuma venda neste filtro.'}
        </p>
      )}

      {!carregando && filtradas.length > 0 && (
        <Tabela
          rotulo="Vendas"
          itens={filtradas}
          chave={(venda) => venda.id}
          busca={{
            placeholder: 'Buscar por aluna ou pacote',
            corresponde: (venda, termo) =>
              venda.nomeAluna.toLowerCase().includes(termo) || venda.nomePacote.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'aluna', rotulo: 'Aluna' },
            { chave: 'pacote', rotulo: 'Pacote' },
            { chave: 'valor', rotulo: 'Valor', alinhamento: 'direita' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(venda) => (
            <LinhaTabela key={venda.id}>
              <CelulaTabela>
                <Link
                  to={`/administracao/alunas/${venda.alunaId}`}
                  className="font-medium text-primary-700 hover:text-primary-800"
                >
                  {venda.nomeAluna}
                </Link>
                <p className="text-xs text-neutral-500">{formatarDataBR(venda.data)}</p>
              </CelulaTabela>
              <CelulaTabela>
                <p>{venda.nomePacote}</p>
                <p className="text-xs text-neutral-500">
                  {venda.creditos > 0 ? `${formatarCreditos(venda.creditos)} · ` : ''}
                  {rotuloFormaPagamento(venda.formaPagamento, venda.parcelas)}
                </p>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita" className="whitespace-nowrap">
                {venda.bolsa ? (
                  <span className="text-emerald-700">Isenta</span>
                ) : venda.valorReembolsado !== undefined ? (
                  <>
                    {/* O reembolso desconta os créditos já utilizados: o valor
                        devolvido quase nunca é o preço do pacote. */}
                    <p>{formatarMoeda(venda.valorReembolsado)}</p>
                    <p className="text-xs text-neutral-500">de {formatarMoeda(venda.valor)} pagos</p>
                  </>
                ) : (
                  formatarMoeda(venda.valor)
                )}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={TOM_SITUACAO[venda.situacao]}>{rotuloSituacaoVenda(venda.situacao)}</Badge>
                {venda.simularFalhaGateway && venda.situacao === 'pendente' && (
                  <p className="mt-0.5 text-xs text-amber-700">Gateway simulando recusa</p>
                )}
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                {venda.situacao === 'pendente' ? (
                  <div className="inline-flex flex-wrap items-center justify-end gap-1">
                    <Button
                      variante="fantasma"
                      onClick={() =>
                        executar(async () => {
                          const { confirmada, mensagem } = await confirmarPagamentoDaVenda({
                            venda,
                            autorId: usuario!.id,
                          });
                          if (!confirmada) throw new Error(mensagem);
                        }, 'Pagamento confirmado e créditos aplicados à carteira.')
                      }
                    >
                      Confirmar pagamento
                    </Button>
                    <Button
                      variante="fantasma"
                      onClick={() => executar(() => reenviarLinkDePagamento(venda), 'Link de pagamento reenviado.')}
                    >
                      Reenviar link
                    </Button>
                    <Button
                      variante="fantasma"
                      onClick={() =>
                        executar(
                          () => alternarSimulacaoDeFalha(venda).then(() => undefined),
                          venda.simularFalhaGateway
                            ? 'O gateway simulado voltará a aprovar esta venda.'
                            : 'O gateway simulado passará a recusar esta venda.',
                        )
                      }
                    >
                      {venda.simularFalhaGateway ? 'Aprovar no gateway' : 'Simular recusa'}
                    </Button>
                    <Button variante="perigo" onClick={() => setCancelando(venda)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">{venda.identificadorGateway ?? '—'}</span>
                )}
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {/* REL-13: reembolsos aplicados no período, para conferência. A
          listagem existe só aqui e na ficha da aluna que teve um aplicado
          — o perfil da aluna nunca expõe o recurso (RF-REE-09/10). */}
      {reembolsos.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Reembolsos aplicados</h2>
            <Button
              variante="secundaria"
              onClick={() =>
                baixarCSV({
                  nomeArquivo: 'reembolsos',
                  itens: reembolsos,
                  colunas: [
                    { cabecalho: 'Data', valor: (item) => item.data },
                    { cabecalho: 'Aluna', valor: (item) => item.nomeAluna },
                    { cabecalho: 'Tipo', valor: (item) => ROTULO_TIPO_REEMBOLSO[item.tipo] },
                    { cabecalho: 'Valor pago', valor: (item) => item.valorPago.toFixed(2) },
                    { cabecalho: 'Créditos utilizados', valor: (item) => item.creditosUtilizados },
                    { cabecalho: 'Valor descontado', valor: (item) => item.valorDescontado.toFixed(2) },
                    { cabecalho: 'Valor reembolsado', valor: (item) => item.valorReembolsado.toFixed(2) },
                    { cabecalho: 'Motivo', valor: (item) => item.motivo },
                    { cabecalho: 'Autor', valor: (item) => item.nomeAutor },
                  ],
                })
              }
            >
              Exportar CSV
            </Button>
          </div>

          <Tabela
            rotulo="Reembolsos aplicados"
            itens={reembolsos}
            chave={(item) => item.id}
            busca={{
              placeholder: 'Buscar por aluna ou motivo',
              corresponde: (item, termo) =>
                item.nomeAluna.toLowerCase().includes(termo) || item.motivo.toLowerCase().includes(termo),
            }}
            colunas={[
              { chave: 'aluna', rotulo: 'Aluna' },
              { chave: 'tipo', rotulo: 'Tipo' },
              { chave: 'creditos', rotulo: 'Créditos utilizados' },
              { chave: 'valor', rotulo: 'Reembolsado', alinhamento: 'direita' },
              { chave: 'autor', rotulo: 'Autor' },
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
                  <p className="text-xs text-neutral-500">{formatarDataBR(item.data)}</p>
                </CelulaTabela>
                <CelulaTabela>
                  <p>{ROTULO_TIPO_REEMBOLSO[item.tipo]}</p>
                  <p className="max-w-xs truncate text-xs text-neutral-500" title={item.motivo}>
                    {item.motivo}
                  </p>
                </CelulaTabela>
                <CelulaTabela>
                  {item.creditosUtilizados} de {item.creditosComprados}
                </CelulaTabela>
                <CelulaTabela alinhamento="direita" className="whitespace-nowrap">
                  <p className="font-medium text-ink">{formatarMoeda(item.valorReembolsado)}</p>
                  <p className="text-xs text-neutral-500">
                    de {formatarMoeda(item.valorPago)} · − {formatarMoeda(item.valorDescontado)}
                  </p>
                </CelulaTabela>
                <CelulaTabela className="text-xs text-neutral-500">{item.nomeAutor}</CelulaTabela>
              </LinhaTabela>
            )}
          />
        </section>
      )}

      {cancelando && (
        <Modal titulo="Cancelar venda" onFechar={() => setCancelando(null)}>
          <FormularioCancelamento
            venda={cancelando}
            onConfirmar={async (motivo) => {
              const ok = await confirmar({
                titulo: 'Cancelar venda',
                mensagem: `Cancelar a venda de ${formatarMoeda(cancelando.valor)} de ${cancelando.nomeAluna}?`,
                textoConfirmar: 'Cancelar venda',
                perigo: true,
              });
              if (!ok) return;
              await cancelarVenda({ venda: cancelando, motivo, autorId: usuario!.id });
              await recarregar();
              mostrarToast('Venda cancelada.', 'sucesso');
            }}
            onFechar={() => setCancelando(null)}
          />
        </Modal>
      )}

      {pacotes.length === 0 && !carregando && (
        <p className="mt-6 text-sm text-neutral-500">Cadastre ao menos um pacote para registrar vendas.</p>
      )}
    </div>
  );
}
