import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { useConfirm } from '../../hooks/useConfirm';
import { useTermos, registrarAceiteEAnamnese, liberarAcessoDaAluna } from '../../hooks/useTermos';
import { quitarVendaDoPrimeiroAcesso } from '../../hooks/cadastroDeAlunas';
import { agendarAula } from '../../hooks/agendamentoDeAulas';
import { historicoDeComprasDaAluna } from '../../hooks/vendas';
import { useToast } from '../../hooks/useToast';
import { aceiteRegistradoRepositorio, alunaRepositorio, pacoteRepositorio } from '../../services/repositorios';
import type { Aluna, Pacote, Venda } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CartaoDeAula } from '../../components/ui/CartaoDeAula';
import { TermoEAnamnese } from '../../components/TermoEAnamnese';
import { perguntasNaoRespondidas } from '../../data/anamnese';
import { formatarDataBR, hojeISO } from '../../utils/data';
import { formatarCreditos, formatarMoeda } from '../../utils/creditos';
import { ResumoDoPacote } from './ResumoDoPacote';

export function PainelAlunaPage() {
  const { usuario, recarregarUsuario } = useSessao();
  const mostrarToast = useToast();
  const confirmar = useConfirm();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();
  const {
    carteira,
    leitura,
    pacote,
    minhasAulas,
    disponiveis,
    bloqueio,
    antecedenciaHoras,
    recarregar: recarregarAgenda,
  } = useAgendaDaAluna(usuario?.id);
  const [agendando, setAgendando] = useState(false);

  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [vendaPendente, setVendaPendente] = useState<Venda | undefined>();
  const [pacoteDaVenda, setPacoteDaVenda] = useState<Pacote | undefined>();
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

  // RF-PNL-05: saldo, validade, grade disponível, próximas aulas e
  // frequência ficam no painel. Compra e histórico financeiro vivem em
  // "Meu pacote" (UX-01) — o painel trata de aulas, não de dinheiro.
  const proximasAulas = minhasAulas
    .filter((aula) => aula.situacao === 'ativo' && aula.data >= hojeISO())
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3);
  const ultimasPresencas = minhasAulas
    .filter((aula) => aula.presenca !== undefined)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);
  const proximasDisponiveis = disponiveis
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio))
    .slice(0, 4);

  // Bloqueio de saldo ou de pacote leva direto para "Meu pacote" — não faz
  // sentido listar aulas que a aluna não pode marcar sem indicar a saída.
  const bloqueioLevaAoPacote =
    bloqueio?.motivo === 'Nenhum pacote ativo.' || bloqueio?.motivo === 'Saldo de créditos insuficiente.';

  async function tentarAgendar(aula: (typeof proximasDisponiveis)[number]) {
    if (!aluna || !usuario) return;

    const ok = await confirmar({
      titulo: 'Confirmar agendamento',
      mensagem: `${aula.modalidade?.nome ?? 'Aula'} em ${formatarDataBR(aula.data)}, às ${aula.sessao.horarioInicio}. ${formatarCreditos(aula.custoEmCreditos)} serão reservados do seu saldo. Cancelamentos com ${antecedenciaHoras}h ou mais de antecedência liberam os créditos reservados.`,
      textoConfirmar: 'Agendar',
    });
    if (!ok) return;

    setAgendando(true);
    try {
      const resultado = await agendarAula({
        aluna,
        sessao: aula.sessao,
        data: aula.data,
        origem: 'portal',
        autorId: usuario.id,
      });
      await recarregarAgenda();
      mostrarToast(
        `Aula agendada. Saldo restante: ${resultado.novoSaldo} aula(s). Cancele com ${resultado.antecedenciaMinimaHoras}h de antecedência para não perder o crédito.`,
        'sucesso',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setAgendando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Seu saldo de créditos e a validade ficam sempre visíveis por aqui.
      </p>

      {aluna?.origem === 'convenio' && (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Seu acesso é pelo convênio: a reserva das aulas do convênio acontece no aplicativo do parceiro, e o check-in
          é validado aqui automaticamente. Se você também tiver créditos próprios, o agendamento por aqui funciona
          normalmente, como para qualquer aluna.
        </p>
      )}

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

          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Grade disponível</h2>
              <Link to="/aluna/grade" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                Ver a grade completa →
              </Link>
            </div>

            {bloqueio ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">{bloqueio.motivo}</p>
                {bloqueio.detalhe && <p className="mt-1 text-sm text-amber-800">{bloqueio.detalhe}</p>}
                {bloqueioLevaAoPacote && (
                  <Link
                    to="/aluna/meu-pacote"
                    className="mt-2 inline-block text-sm font-semibold text-amber-900 underline hover:no-underline"
                  >
                    Ir para Meu pacote →
                  </Link>
                )}
              </div>
            ) : proximasDisponiveis.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
                Nenhuma aula disponível nos próximos dias.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {proximasDisponiveis.map((aula) => (
                  <CartaoDeAula
                    key={`${aula.sessao.id}-${aula.data}`}
                    titulo={`${aula.modalidade?.nome ?? 'Modalidade'} — ${aula.nomeProfessora}`}
                    subtitulo={`${formatarDataBR(aula.data)} · ${aula.nomeEspaco ?? ''}`}
                    horario={`${aula.sessao.horarioInicio} - ${aula.sessao.horarioFim}`}
                    detalhe={aula.vagas > 0 ? `${aula.vagas} vaga(s)` : 'Sem vagas'}
                    valor={formatarCreditos(aula.custoEmCreditos)}
                    aviso={aula.impedimento}
                    esmaecido={aula.impedimento !== undefined && !aula.jaAgendada}
                    acao={
                      aula.jaAgendada ? (
                        <Badge tom="sucesso">Agendada</Badge>
                      ) : (
                        <Button
                          onClick={() => tentarAgendar(aula)}
                          disabled={aula.impedimento !== undefined || agendando}
                        >
                          Agendar
                        </Button>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Próximas aulas</h2>
              <Link to="/aluna/minhas-aulas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                Ver todas →
              </Link>
            </div>
            {proximasAulas.length === 0 ? (
              <div className="mt-2 flex flex-col items-start gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
                <p>Você ainda não tem nenhuma aula agendada.</p>
                <Link to="/aluna/grade">
                  <Button type="button">Marcar uma aula</Button>
                </Link>
              </div>
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
      </>
    </div>
  );
}
