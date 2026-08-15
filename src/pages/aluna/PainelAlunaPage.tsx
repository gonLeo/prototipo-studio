import { useCallback, useEffect, useState } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useTermos, registrarAceiteEAnamnese, liberarAcessoDaAluna } from '../../hooks/useTermos';
import { registrarPagamentoDaPrimeiraCobranca } from '../../hooks/contratosDeAluna';
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
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../../utils/contrato';

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
  const mostrarToast = useToast();

  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [contrato, setContrato] = useState<Contrato | undefined>();
  const [pacote, setPacote] = useState<Pacote | undefined>();
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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">Seu pacote, saldo e validade ficam sempre visíveis por aqui.</p>

      {!contrato ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Você não tem um pacote ativo no momento. Fale com a administração do studio para contratar.
        </p>
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

          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
            A grade disponível e o agendamento das suas aulas chegam na próxima fase do protótipo.
          </div>
        </>
      )}
    </div>
  );
}
