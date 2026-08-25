import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { usePacotes } from '../../hooks/usePacotes';
import { useTermos, registrarAceiteEAnamnese, liberarAcessoDaAluna } from '../../hooks/useTermos';
import { contratarPacoteParaAluna, registrarPagamentoDaPrimeiraCobranca } from '../../hooks/contratosDeAluna';
import { registrarConversao } from '../../hooks/aulasExperimentais';
import { debitoDaAluna, pagarDebitoDaAluna } from '../../hooks/cobrancas';
import type { DebitoDaAluna } from '../../hooks/cobrancas';
import { useToast } from '../../hooks/useToast';
import {
  aceiteRegistradoRepositorio,
  alunaRepositorio,
  contratoRepositorio,
  pacoteRepositorio,
} from '../../services/repositorios';
import type { Aluna, Contrato, Pacote } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TermoEAnamnese } from '../../components/TermoEAnamnese';
import { perguntasNaoRespondidas } from '../../data/anamnese';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../../utils/data';
import { ehIsencaoTotal, formatarMoeda, rotuloTipoContrato, valorComBolsa } from '../../utils/contrato';

/**
 * Contratação de pacote pela própria aluna (RF-EXP-07).
 *
 * É por aqui que quem fez a aula experimental vira matriculada sem repetir
 * cadastro: o vínculo já existe, o que falta é o contrato — e a primeira
 * mensalidade segue o mesmo caminho de cobrança das demais (RF-FIN-01).
 */
function ContratarPacote({
  aluna,
  onContratado,
}: {
  aluna: Aluna | undefined;
  onContratado: (mensagem: string) => Promise<void>;
}) {
  const { pacotes, carregando } = usePacotes();
  const [pacoteId, setPacoteId] = useState('');
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);

  const ativos = pacotes.filter((p) => p.situacao === 'ativo');
  const escolhido = ativos.find((p) => p.id === pacoteId);

  async function contratar(e: FormEvent) {
    e.preventDefault();
    if (!aluna || !escolhido) return;
    setErro(undefined);
    setProcessando(true);
    try {
      const contrato = await contratarPacoteParaAluna({
        aluna,
        contratacao: { pacoteId: escolhido.id, dataPrimeiraCobranca: hojeISO(), percentualBolsa: 0 },
        autorId: aluna.usuarioId,
      });
      await registrarPagamentoDaPrimeiraCobranca(contrato);
      await registrarConversao({ alunaId: aluna.id, contratoId: contrato.id, autorId: aluna.usuarioId });
      await onContratado(
        `Pacote contratado. ${escolhido.aulasPorCiclo} aulas creditadas e agendamento liberado.`,
      );
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) return <p className="mt-6 text-sm text-neutral-500">Carregando pacotes…</p>;

  return (
    <form onSubmit={contratar} className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-ink">Contrate um pacote</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Você ainda não tem pacote ativo. Escolha um plano para liberar o agendamento — seu cadastro é aproveitado,
          nada precisa ser preenchido de novo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ativos.map((pacote) => (
          <label
            key={pacote.id}
            className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 ${
              pacoteId === pacote.id ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="pacote-conversao"
                value={pacote.id}
                checked={pacoteId === pacote.id}
                onChange={() => setPacoteId(pacote.id)}
                required
                className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">{pacote.nome}</span>
                <span className="block text-xs text-neutral-500">
                  {pacote.aulasPorCiclo} aulas por ciclo · até {pacote.aulasPorSemana} por semana · contrato{' '}
                  {rotuloTipoContrato(pacote.tipo).toLowerCase()}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-ink">{formatarMoeda(pacote.valorMensal)}</span>
          </label>
        ))}
        {ativos.length === 0 && <p className="text-sm text-neutral-500">Nenhum pacote disponível no momento.</p>}
      </div>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={!escolhido || processando}>
          {processando
            ? 'Processando…'
            : escolhido
              ? `Pagar ${formatarMoeda(escolhido.valorMensal)} e contratar`
              : 'Escolha um pacote'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Painel da aluna.
 *
 * Enquanto o termo não é aceito e a anamnese não é preenchida, esta é a
 * única coisa que a aluna vê — o acesso ao agendamento fica bloqueado
 * (RF-ALU-08). Depois do aceite, o painel mostra pacote, saldo e validade
 * de forma persistente, como pede a decisão de UX do escopo.
 */
export function PainelAlunaPage() {
  const { usuario, recarregarUsuario } = useSessao();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();
  const { minhasAulas } = useAgendaDaAluna(usuario?.id);
  const mostrarToast = useToast();

  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [contrato, setContrato] = useState<Contrato | undefined>();
  const [pacote, setPacote] = useState<Pacote | undefined>();
  const [debito, setDebito] = useState<DebitoDaAluna | undefined>();
  const [pagandoDebito, setPagandoDebito] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [passoPrimeiroAcesso, setPassoPrimeiroAcesso] = useState<'termo' | 'pagamento'>('termo');

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    const [alunas, contratos, pacotes, aceites] = await Promise.all([
      alunaRepositorio.listar(),
      contratoRepositorio.listar(),
      pacoteRepositorio.listar(),
      aceiteRegistradoRepositorio.listar(),
    ]);
    const minha = alunas.find((a) => a.usuarioId === usuario.id);
    const meuContrato = contratos.find((c) => c.alunaId === minha?.id && c.situacao !== 'encerrado');
    setAluna(minha);
    setContrato(meuContrato);
    setPacote(pacotes.find((p) => p.id === meuContrato?.pacoteId));
    setDebito(minha ? await debitoDaAluna(minha.id) : undefined);

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
    // Isenta não tem cobrança a pagar (RF-BOL-03): o primeiro acesso dela
    // termina no aceite, sem passo de pagamento.
    const isenta = ehIsencaoTotal(contrato?.percentualBolsa ?? 0) || !contrato;
    const valorAPagar = pacote ? valorComBolsa(pacote.valorMensal, contrato?.percentualBolsa ?? 0) : 0;

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
          mostrarToast('Termo aceito e anamnese registrada. Seu agendamento está liberado.', 'sucesso');
          await recarregarUsuario();
          await recarregar();
          return;
        }

        // Aceite registrado; falta o pagamento da primeira cobrança para
        // liberar o agendamento.
        setPassoPrimeiroAcesso('pagamento');
      } catch (erroCapturado) {
        mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
      } finally {
        setEnviando(false);
      }
    }

    async function concluirPagamento() {
      if (!contrato || !usuario) return;
      setEnviando(true);
      try {
        await registrarPagamentoDaPrimeiraCobranca(contrato);
        await liberarAcessoDaAluna({ usuarioId: usuario.id, alunaId: aluna?.id });
        mostrarToast('Pagamento confirmado. Seu agendamento está liberado.', 'sucesso');
        await recarregarUsuario();
        await recarregar();
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
            : 'Último passo: confirme o pagamento da primeira mensalidade.'}
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
                  {faltamRespostas.length > 0 &&
                    `responda ${faltamRespostas.length} pergunta(s) de saúde`}{' '}
                  para continuar.
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
              <h2 className="text-sm font-semibold text-ink">Primeira mensalidade</h2>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Pacote</dt>
                  <dd className="text-ink">{pacote?.nome ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Aulas creditadas</dt>
                  <dd className="text-ink">{contrato?.saldoAulas ?? 0} aulas</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Vencimento</dt>
                  <dd className="text-ink">{contrato ? formatarDataBR(contrato.dataInicio) : '—'}</dd>
                </div>
                {(contrato?.percentualBolsa ?? 0) > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Bolsa aplicada</dt>
                    <dd className="text-emerald-700">{contrato?.percentualBolsa}% de desconto</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
                  <dt className="font-medium text-ink">Valor a pagar</dt>
                  <dd className="font-semibold text-ink">
                    {formatarMoeda(valorAPagar)}
                    {(contrato?.percentualBolsa ?? 0) > 0 && pacote && (
                      <span className="ml-2 text-xs font-normal text-neutral-400 line-through">
                        {formatarMoeda(pacote.valorMensal)}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              Pagamento simulado neste protótipo — a integração com o gateway entra junto do módulo financeiro. O
              agendamento é liberado assim que você confirmar.
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Processando…' : `Pagar ${formatarMoeda(valorAPagar)} e liberar meu acesso`}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const percentualBolsa = aluna?.percentualBolsa ?? 0;
  const pausado = contrato?.situacao === 'trancado' || contrato?.situacao === 'suspenso';

  // RF-PNL-05: as próximas aulas e a frequência recente ficam no painel,
  // junto do saldo e da situação financeira.
  const proximasAulas = minhasAulas
    .filter((aula) => aula.situacao === 'ativo' && aula.data >= hojeISO())
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3);
  const ultimasPresencas = minhasAulas
    .filter((aula) => aula.presenca !== undefined)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">Seu pacote, saldo e validade ficam sempre visíveis por aqui.</p>

      {!contrato ? (
        aluna?.origem === 'convenio' ? (
          <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
            Seu acesso é pelo convênio: a reserva das aulas acontece no aplicativo do parceiro, e o check-in é
            validado aqui automaticamente.
          </p>
        ) : (
          <ContratarPacote
            aluna={aluna}
            onContratado={async (mensagem) => {
              await recarregar();
              mostrarToast(mensagem, 'sucesso');
            }}
          />
        )
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Saldo de aulas</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{contrato.saldoAulas}</p>
              <p className="text-xs text-neutral-500">{pacote?.nome ?? 'Pacote'}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Validade do ciclo</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatarDataBR(contrato.dataVencimentoCiclo)}
              </p>
              <p className="text-xs text-neutral-500">
                {diferencaEmDias(hojeISO(), contrato.dataVencimentoCiclo)} dias restantes
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

          {pausado && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom="aviso">{contrato.situacao === 'trancado' ? 'Contrato trancado' : 'Contrato suspenso'}</Badge>
              </div>
              <p className="mt-2 text-sm text-amber-800">
                Seu agendamento está pausado neste período. Fale com a administração para registrar o retorno.
              </p>
            </div>
          )}

          {!ehIsencaoTotal(percentualBolsa) && (
            <p className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600 shadow-sm">
              Próxima cobrança em{' '}
              <span className="font-medium text-ink">{formatarDataBR(contrato.dataVencimentoCiclo)}</span>
              {pacote && (
                <>
                  , no valor de{' '}
                  <span className="font-medium text-ink">
                    {formatarMoeda(valorComBolsa(pacote.valorMensal, percentualBolsa))}
                  </span>
                </>
              )}
              . A renovação é automática — para ajustar o plano, fale com a administração.
            </p>
          )}

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

          {debito && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom="erro">Mensalidade em aberto</Badge>
                <span className="text-xs text-rose-800">
                  {debito.cobrancas.length} cobrança(s) · {debito.diasDeAtraso} dia(s) de atraso
                </span>
              </div>

              <dl className="mt-3 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-rose-800">Valor original</dt>
                  <dd className="text-rose-900">{formatarMoeda(debito.valorOriginal)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-rose-800">Multa</dt>
                  <dd className="text-rose-900">{formatarMoeda(debito.multa)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-rose-800">Juros de mora</dt>
                  <dd className="text-rose-900">{formatarMoeda(debito.juros)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-rose-200 pt-1">
                  <dt className="font-medium text-rose-900">Valor atualizado</dt>
                  <dd className="font-semibold text-rose-900">{formatarMoeda(debito.valorAtualizado)}</dd>
                </div>
              </dl>

              <p className="mt-3 text-sm text-rose-800">
                {aluna?.situacao === 'inadimplente'
                  ? 'O agendamento de novas aulas está bloqueado até a regularização — as aulas já marcadas continuam valendo. O acesso é liberado assim que o pagamento é confirmado.'
                  : 'Regularize para não ter o agendamento bloqueado. As aulas já marcadas continuam valendo.'}
              </p>

              <div className="mt-3 flex justify-end">
                <Button
                  disabled={pagandoDebito}
                  onClick={async () => {
                    if (!aluna) return;
                    setPagandoDebito(true);
                    try {
                      const { pagas, falhas } = await pagarDebitoDaAluna(aluna.id);
                      await recarregar();
                      mostrarToast(
                        falhas > 0
                          ? `${falhas} cobrança(s) recusada(s) pelo gateway. Tente novamente ou fale com a administração.`
                          : `Pagamento de ${pagas} cobrança(s) confirmado. Seu agendamento está liberado.`,
                        falhas > 0 ? 'erro' : 'sucesso',
                      );
                    } catch (erroCapturado) {
                      mostrarToast(
                        erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.',
                        'erro',
                      );
                    } finally {
                      setPagandoDebito(false);
                    }
                  }}
                >
                  {pagandoDebito ? 'Processando…' : `Pagar ${formatarMoeda(debito.valorAtualizado)}`}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
