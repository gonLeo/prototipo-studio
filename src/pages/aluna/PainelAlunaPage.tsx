import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { usePacotes } from '../../hooks/usePacotes';
import { useTermos, registrarAceiteEAnamnese, liberarAcessoDaAluna } from '../../hooks/useTermos';
import { comprarPacoteParaAluna, quitarVendaDoPrimeiroAcesso } from '../../hooks/cadastroDeAlunas';
import { registrarConversao } from '../../hooks/aulasExperimentais';
import { FORMAS_PAGAMENTO, PARCELAS_DISPONIVEIS, historicoDeComprasDaAluna } from '../../hooks/vendas';
import type { CompraDaAluna } from '../../hooks/vendas';
import { useToast } from '../../hooks/useToast';
import { aceiteRegistradoRepositorio, alunaRepositorio, pacoteRepositorio } from '../../services/repositorios';
import type { Aluna, FormaPagamento, Pacote, Venda } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SelectField } from '../../components/ui/Field';
import { TermoEAnamnese } from '../../components/TermoEAnamnese';
import { perguntasNaoRespondidas } from '../../data/anamnese';
import { formatarDataBR, hojeISO } from '../../utils/data';
import {
  calcularPreviaDeCompra,
  formatarCreditos,
  formatarMoeda,
  rotuloFormaPagamento,
  rotuloSituacaoVenda,
} from '../../utils/creditos';
import { ResumoDoPacote } from './ResumoDoPacote';

/**
 * Compra de pacote pela própria aluna (RF-CRE-16, RF-EXP-07).
 *
 * É por aqui que quem fez a aula experimental adquire um pacote sem
 * repetir cadastro, e é também por aqui que quem já tem carteira renova
 * antecipadamente. A prévia mostra o saldo resultante e a nova validade
 * antes de confirmar, deixando claro o efeito sobre a carteira vigente.
 */
function ComprarPacote({
  aluna,
  carteira,
  onComprado,
}: {
  aluna: Aluna | undefined;
  carteira: Parameters<typeof calcularPreviaDeCompra>[0]['carteiraVigente'];
  onComprado: (mensagem: string, sucesso: boolean) => Promise<void>;
}) {
  const { pacotes, carregando } = usePacotes();
  const [pacoteId, setPacoteId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState(String(PARCELAS_DISPONIVEIS[0]));
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);

  const ativos = pacotes.filter((p) => p.situacao === 'ativo');
  const escolhido = ativos.find((p) => p.id === pacoteId);
  const previa = escolhido
    ? calcularPreviaDeCompra({ carteiraVigente: carteira, pacote: escolhido, hoje: hojeISO() })
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
      // (RF-EXP-09), para separá-la de uma compra comum no relatório.
      await registrarConversao({ alunaId: aluna.id, vendaId: venda.id, autorId: aluna.usuarioId });

      await onComprado(`Compra confirmada: ${formatarCreditos(escolhido.creditos)} adicionados à sua carteira.`, true);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
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
                  {n}x de {formatarMoeda(escolhido.valor / n)}
                </option>
              ))}
            </SelectField>
          )}
        </div>
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
          {processando ? 'Processando…' : escolhido ? `Pagar ${formatarMoeda(escolhido.valor)}` : 'Escolha um pacote'}
        </Button>
      </div>
    </form>
  );
}

export function PainelAlunaPage() {
  const { usuario, recarregarUsuario } = useSessao();
  const mostrarToast = useToast();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();
  const { carteira, leitura, pacote, minhasAulas, recarregar: recarregarAgenda } = useAgendaDaAluna(usuario?.id);

  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [vendaPendente, setVendaPendente] = useState<Venda | undefined>();
  const [pacoteDaVenda, setPacoteDaVenda] = useState<Pacote | undefined>();
  const [compras, setCompras] = useState<CompraDaAluna[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [passoPrimeiroAcesso, setPassoPrimeiroAcesso] = useState<'termo' | 'pagamento'>('termo');

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    const [alunas, pacotes, aceites] = await Promise.all([
      alunaRepositorio.listar(),
      pacoteRepositorio.listar(),
      aceiteRegistradoRepositorio.listar(),
    ]);
    const minha = alunas.find((a) => a.usuarioId === usuario.id);
    setAluna(minha);

    const historico = minha ? await historicoDeComprasDaAluna(minha.id) : [];
    setCompras(historico);

    const pendente = historico.find((v) => v.situacao === 'pendente' && v.tipo === 'pacote');
    setVendaPendente(pendente);
    setPacoteDaVenda(pacotes.find((p) => p.id === pendente?.pacoteId));

    // Se o aceite já foi registrado mas o acesso ainda não abriu, o que
    // falta é o pagamento: retoma desse ponto em vez de pedir o aceite de
    // novo (o que geraria um segundo registro do mesmo termo).
    if (aceites.some((a) => a.usuarioId === usuario.id)) {
      setPassoPrimeiroAcesso('pagamento');
    }

    setCarregando(false);
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (carregando || carregandoTermo) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!usuario) return null;

  const precisaAceitar = usuario.situacao === 'aguardando_aceite' || aluna?.situacao === 'aguardando_aceite';

  // O acesso só é liberado com o termo aceito E as perguntas de saúde
  // respondidas (RF-ALU-08: aceite do termo *e* anamnese preenchida).
  const faltamRespostas = perguntasNaoRespondidas(respostas);
  const podeConcluir = aceito && faltamRespostas.length === 0;

  if (precisaAceitar) {
    // Bolsista não tem nada a pagar (RF-BOL-02): o primeiro acesso dela
    // termina no aceite, sem passo de pagamento.
    const isenta = !vendaPendente;

    async function concluirAceite() {
      if (!termoVigente || !usuario) return;
      setEnviando(true);
      try {
        await registrarAceiteEAnamnese({
          usuarioId: usuario.id,
          alunaId: aluna?.id,
          termo: termoVigente,
          respostasAnamnese: respostas,
        });

        if (isenta) {
          await liberarAcessoDaAluna({ usuarioId: usuario.id, alunaId: aluna?.id });
          mostrarToast('Termo aceito e anamnese registrada. Seus créditos estão liberados.', 'sucesso');
          await recarregarUsuario();
          await recarregar();
          await recarregarAgenda();
          return;
        }

        setPassoPrimeiroAcesso('pagamento');
      } catch (erroCapturado) {
        mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
      } finally {
        setEnviando(false);
      }
    }

    async function concluirPagamento() {
      if (!vendaPendente || !usuario) return;
      setEnviando(true);
      try {
        await quitarVendaDoPrimeiroAcesso({ venda: vendaPendente, autorId: usuario.id });
        await liberarAcessoDaAluna({ usuarioId: usuario.id, alunaId: aluna?.id });
        mostrarToast('Pagamento confirmado. Seus créditos estão liberados.', 'sucesso');
        await recarregarUsuario();
        await recarregar();
        await recarregarAgenda();
      } catch (erroCapturado) {
        mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
        setEnviando(false);
      }
    }

    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">Falta pouco, {usuario.nome.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {passoPrimeiroAcesso === 'termo'
            ? 'Para liberar o agendamento, aceite o termo de prestação de serviço e preencha a ficha de anamnese.'
            : 'Último passo: confirme o pagamento do seu pacote.'}
        </p>

        <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'termo' as const, rotulo: 'Termo e anamnese' },
            { id: 'pagamento' as const, rotulo: 'Pagamento' },
          ]
            .filter((passo) => passo.id !== 'pagamento' || !isenta)
            .map((passo, indice, lista) => {
              const ehAtual = passo.id === passoPrimeiroAcesso;
              const concluido = passo.id === 'termo' && passoPrimeiroAcesso === 'pagamento';
              return (
                <li key={passo.id} className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      ehAtual
                        ? 'bg-primary-600 text-white'
                        : concluido
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {concluido ? '✓' : indice + 1}
                  </span>
                  <span className={ehAtual ? 'font-medium text-ink' : 'text-neutral-500'}>{passo.rotulo}</span>
                  {indice < lista.length - 1 && <span className="text-neutral-300">→</span>}
                </li>
              );
            })}
        </ol>

        {!termoVigente ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            O studio ainda não publicou o termo de aceite. Assim que ele estiver disponível, você poderá concluir esta
            etapa.
          </p>
        ) : passoPrimeiroAcesso === 'termo' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              concluirAceite();
            }}
            className="mt-6 flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <TermoEAnamnese
              termo={termoVigente}
              aceito={aceito}
              onAceitar={setAceito}
              respostas={respostas}
              onResponder={(chave, valor) => setRespostas((atual) => ({ ...atual, [chave]: valor }))}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              {!podeConcluir && (
                <p className="text-xs text-neutral-500">
                  {!aceito && 'Aceite o termo'}
                  {!aceito && faltamRespostas.length > 0 && ' e '}
                  {faltamRespostas.length > 0 && `responda ${faltamRespostas.length} pergunta(s) de saúde`} para
                  continuar.
                </p>
              )}
              <Button type="submit" disabled={!podeConcluir || enviando}>
                {enviando ? 'Registrando…' : isenta ? 'Aceitar e liberar meu acesso' : 'Aceitar e continuar'}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              concluirPagamento();
            }}
            className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h2 className="text-sm font-semibold text-ink">Seu pacote</h2>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Pacote</dt>
                  <dd className="text-ink">{pacoteDaVenda?.nome ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Créditos</dt>
                  <dd className="text-ink">{vendaPendente?.creditos ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Validade</dt>
                  <dd className="text-ink">
                    {vendaPendente?.validadeDias ?? 0} dias a partir da liberação do acesso
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
                  <dt className="font-medium text-ink">Valor a pagar</dt>
                  <dd className="font-semibold text-ink">{formatarMoeda(vendaPendente?.valor ?? 0)}</dd>
                </div>
              </dl>
            </div>

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              Pagamento simulado neste protótipo. O agendamento é liberado assim que você confirmar — pagamento único,
              sem mensalidade.
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={enviando}>
                {enviando
                  ? 'Processando…'
                  : `Pagar ${formatarMoeda(vendaPendente?.valor ?? 0)} e liberar meu acesso`}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // RF-PNL-05: saldo, validade, próximas aulas, frequência e histórico de
  // compras ficam no painel.
  const proximasAulas = minhasAulas
    .filter((aula) => aula.situacao === 'ativo' && aula.data >= hojeISO())
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3);
  const ultimasPresencas = minhasAulas
    .filter((aula) => aula.presenca !== undefined)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);

  // RF-REE-10: nenhuma menção a reembolso aparece para quem não teve um
  // aplicado ao próprio cadastro.
  const comprasVisiveis = compras.filter((v) => v.situacao !== 'cancelada');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Seu saldo de créditos e a validade ficam sempre visíveis por aqui.
      </p>

      {aluna?.origem === 'convenio' ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Seu acesso é pelo convênio: a reserva das aulas acontece no aplicativo do parceiro, e o check-in é validado
          aqui automaticamente.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <ResumoDoPacote carteira={carteira} leitura={leitura} pacote={pacote} />
          </div>

          {aluna?.situacao === 'trancada' && (
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
            onComprado={async (mensagem, sucesso) => {
              await recarregar();
              await recarregarAgenda();
              mostrarToast(mensagem, sucesso ? 'sucesso' : 'erro');
            }}
          />

          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Próximas aulas</h2>
              <Link to="/aluna/minhas-aulas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                Ver todas →
              </Link>
            </div>
            {proximasAulas.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
                Nenhuma aula agendada.{' '}
                <Link to="/aluna/grade" className="font-medium text-primary-700 hover:text-primary-800">
                  Ver a grade disponível
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                {proximasAulas.map((aula) => (
                  <li key={aula.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="text-ink">
                      {formatarDataBR(aula.data)} · {aula.nomeModalidade}
                    </span>
                    <span className="text-neutral-500">
                      {aula.horarioInicio}–{aula.horarioFim} · {aula.nomeProfessora}
                      {aula.creditosReservados > 0 && ` · ${formatarCreditos(aula.creditosReservados)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ultimasPresencas.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-ink">Frequência recente</h2>
              <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                {ultimasPresencas.map((aula) => (
                  <li key={aula.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="text-ink">
                      {formatarDataBR(aula.data)} · {aula.nomeModalidade}
                    </span>
                    <Badge tom={aula.presenca === 'presente' ? 'sucesso' : 'erro'}>
                      {aula.presenca === 'presente' ? 'Presente' : 'Falta'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {comprasVisiveis.length > 0 && (
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
                          <span className="block text-xs text-neutral-500">
                            reembolsado de {formatarMoeda(venda.valor)}
                          </span>
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
        </>
      )}
    </div>
  );
}
