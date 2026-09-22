import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { useConfirm } from '../../hooks/useConfirm';
import { useTermos } from '../../hooks/useTermos';
import { pendenciasDaAluna, SEM_PENDENCIA } from '../../hooks/pendenciasDeAceite';
import type { PendenciaDeAceite } from '../../hooks/pendenciasDeAceite';
import { quitarVendaDoPrimeiroAcesso } from '../../hooks/cadastroDeAlunas';
import { agendarAula } from '../../hooks/agendamentoDeAulas';
import { historicoDeComprasDaAluna } from '../../hooks/vendas';
import { useToast } from '../../hooks/useToast';
import { alunaRepositorio, pacoteRepositorio } from '../../services/repositorios';
import type { Aluna, Pacote, Venda } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CartaoDeAula } from '../../components/ui/CartaoDeAula';
import { ModalPendencias } from './ModalPendencias';
import { formatarDataBR, hojeISO } from '../../utils/data';
import { formatarCreditos, formatarMoeda } from '../../utils/creditos';
import { ResumoDoPacote } from './ResumoDoPacote';

export function PainelAlunaPage() {
  const { usuario } = useSessao();
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

  const [pendencia, setPendencia] = useState<PendenciaDeAceite>(SEM_PENDENCIA);
  const [resolvendoPendencia, setResolvendoPendencia] = useState(false);
  const [pagando, setPagando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    const [alunas, pacotes] = await Promise.all([alunaRepositorio.listar(), pacoteRepositorio.listar()]);
    const minha = alunas.find((a) => a.usuarioId === usuario.id);
    setAluna(minha);

    const historico = minha ? await historicoDeComprasDaAluna(minha.id) : [];

    const pendente = historico.find((v) => v.situacao === 'pendente' && v.tipo === 'pacote');
    setVendaPendente(pendente);
    setPacoteDaVenda(pacotes.find((p) => p.id === pendente?.pacoteId));

    // RF-ALU-08/RF-PNL-05: o que falta de termo e anamnese vira alerta no
    // topo do painel. É leitura — nada é gravado ao carregar a tela.
    setPendencia(minha ? await pendenciasDaAluna(minha) : SEM_PENDENCIA);

    setCarregando(false);
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (carregando || carregandoTermo) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!usuario) return null;

  /**
   * Pagamento pendente do cadastro administrativo sem bolsa.
   *
   * É a única pendência que ainda segura o agendamento — não por causa do
   * termo, mas porque a carteira só nasce na confirmação do pagamento
   * (RF-CRE-01). Bolsista não cai aqui: a carteira dela já veio ativa.
   */
  async function pagarPendente() {
    if (!vendaPendente || !usuario) return;
    setPagando(true);
    try {
      await quitarVendaDoPrimeiroAcesso({ venda: vendaPendente, autorId: usuario.id });
      mostrarToast('Pagamento confirmado. Seus créditos estão liberados.', 'sucesso');
      await recarregar();
      await recarregarAgenda();
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setPagando(false);
    }
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

      {/* RF-ALU-08: alerta persistente, com atalho — nunca bloqueio. */}
      {pendencia.alguma && aluna && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {pendencia.termo && pendencia.anamnese
                ? 'Termo e anamnese pendentes.'
                : pendencia.termo
                  ? 'Falta aceitar o termo de prestação de serviços.'
                  : 'Falta preencher a ficha de anamnese.'}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {/* Quem ainda não pagou não "já pode agendar": o que a trava é
                  a falta de créditos, e dizer o contrário confundiria. */}
              {vendaPendente
                ? 'Conclua quando puder — isso é independente do pagamento abaixo.'
                : pendencia.anamnese && !pendencia.termo
                  ? 'Suas respostas ajudam a professora a conduzir a aula com segurança.'
                  : 'Você já pode agendar aulas normalmente; conclua quando puder.'}
            </p>
          </div>
          <Button onClick={() => setResolvendoPendencia(true)}>Concluir agora</Button>
        </div>
      )}

      {/* A carteira só nasce com o pagamento confirmado (RF-CRE-01). */}
      {vendaPendente && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div>
            <p className="text-sm font-semibold text-orange-900">Pagamento pendente.</p>
            <p className="mt-1 text-sm text-orange-800">
              Seu pacote {pacoteDaVenda?.nome ? `"${pacoteDaVenda.nome}"` : ''} aguarda o pagamento de{' '}
              {formatarMoeda(vendaPendente.valor)} para liberar {formatarCreditos(vendaPendente.creditos)}. Pagamento
              simulado neste protótipo, único, sem mensalidade.
            </p>
          </div>
          <Button onClick={pagarPendente} disabled={pagando}>
            {pagando ? 'Processando…' : 'Pagar agora'}
          </Button>
        </div>
      )}

      {resolvendoPendencia && aluna && (
        <ModalPendencias
          usuario={usuario}
          aluna={aluna}
          pendencia={pendencia}
          termoVigente={termoVigente}
          aoFechar={() => setResolvendoPendencia(false)}
          aoConcluir={async (mensagem) => {
            mostrarToast(mensagem, 'sucesso');
            setResolvendoPendencia(false);
            await recarregar();
          }}
        />
      )}

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
