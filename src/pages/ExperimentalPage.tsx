import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  agendarAulaExperimental,
  listarAulasParaExperimental,
  parametrosExperimentais,
} from '../hooks/aulasExperimentais';
import type { AulaParaExperimental, DadosInteressada, ParametrosExperimentais } from '../hooks/aulasExperimentais';
import { useTermos } from '../hooks/useTermos';
import { registrarAceiteDoTermo, registrarAnamnese } from '../hooks/pendenciasDeAceite';
import { AceiteDoTermo, FichaDeAnamnese } from '../components/AceiteEAnamnese';
import { perguntasNaoRespondidas } from '../data/anamnese';
import type { Aluna } from '../types/domain';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { NavegadorDeDatas } from '../components/ui/NavegadorDeDatas';
import { CartaoDeAula } from '../components/ui/CartaoDeAula';
import { formatarMoeda } from '../utils/creditos';
import { formatarDataBR, hojeISO, somarDias } from '../utils/data';

type Passo = 'aula' | 'cadastro' | 'pagamento' | 'termo' | 'anamnese' | 'concluido';

/**
 * Termo e anamnese vêm **depois** da vaga confirmada (fluxo 6.2 da v2.1) e
 * podem ser pulados: o que ficar em aberto vira pendência acompanhada pela
 * administração (RF-ALU-08).
 */
const PASSOS: Array<{ id: Passo; rotulo: string }> = [
  { id: 'aula', rotulo: 'Escolha a aula' },
  { id: 'cadastro', rotulo: 'Seus dados' },
  { id: 'pagamento', rotulo: 'Pagamento' },
  { id: 'termo', rotulo: 'Termo' },
  { id: 'anamnese', rotulo: 'Anamnese' },
];

function Trilha({ atual }: { atual: Passo }) {
  const indiceAtual = PASSOS.findIndex((p) => p.id === atual);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {PASSOS.map((passo, indice) => {
        const concluido = indice < indiceAtual;
        const ehAtual = indice === indiceAtual;
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
              {indice + 1}
            </span>
            <span className={ehAtual ? 'font-medium text-ink' : 'text-neutral-500'}>{passo.rotulo}</span>
            {indice < PASSOS.length - 1 && <span className="text-neutral-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Aula experimental pelo site (M12).
 *
 * O fluxo é invertido em relação ao da matrícula, como definido na
 * reunião: primeiro a interessada vê a grade e escolhe o horário, depois
 * se cadastra e paga — a vaga só é confirmada com o pagamento aprovado
 * (RF-EXP-01/02/05).
 */
export function ExperimentalPage() {
  const { vigente: termoVigente } = useTermos();
  const [passo, setPasso] = useState<Passo>('aula');
  const [parametros, setParametros] = useState<ParametrosExperimentais>();
  const [aulas, setAulas] = useState<AulaParaExperimental[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO());
  const [escolhida, setEscolhida] = useState<AulaParaExperimental>();
  const [dados, setDados] = useState<DadosInteressada>({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    contatoEmergencia: '',
  });
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);
  const [interessada, setInteressada] = useState<Aluna>();
  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [termoPendente, setTermoPendente] = useState(true);
  const [anamnesePendente, setAnamnesePendente] = useState(true);

  const hoje = useMemo(() => hojeISO(), []);

  useEffect(() => {
    let valido = true;
    Promise.all([listarAulasParaExperimental(), parametrosExperimentais()]).then(([lista, params]) => {
      if (!valido) return;
      setAulas(lista);
      setParametros(params);
      setCarregando(false);
    });
    return () => {
      valido = false;
    };
  }, []);

  const doDia = aulas.filter((aula) => aula.data === dataSelecionada);

  function mudarDado(campo: keyof DadosInteressada, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function pagarEConfirmar(e: FormEvent) {
    e.preventDefault();
    if (!escolhida) return;
    setErro(undefined);
    setProcessando(true);
    try {
      const resultado = await agendarAulaExperimental({ dados, sessao: escolhida.sessao, data: escolhida.data });
      setInteressada(resultado.aluna);
      setPasso('termo');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  /** Assina o termo e segue para a anamnese (RF-ALU-05). */
  async function aceitarTermo() {
    if (!termoVigente || !interessada) return;
    setErro(undefined);
    setProcessando(true);
    try {
      await registrarAceiteDoTermo({
        usuarioId: interessada.usuarioId,
        assinante: { nome: dados.nome.trim(), cpf: dados.cpf.trim() },
        termo: termoVigente,
        aluna: interessada,
      });
      setTermoPendente(false);
      setPasso('anamnese');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  /** Preenche a anamnese e encerra o fluxo (RF-ALU-07). */
  async function responderAnamnese() {
    if (!interessada) return;
    setErro(undefined);
    setProcessando(true);
    try {
      await registrarAnamnese({ aluna: interessada, respostas });
      setAnamnesePendente(false);
      setPasso('concluido');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  const pendencias = [termoPendente && 'o aceite do termo', anamnesePendente && 'a ficha de anamnese'].filter(
    Boolean,
  ) as string[];
  const faltamRespostas = perguntasNaoRespondidas(respostas);

  return (
    <div className="min-h-full bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-700 text-base font-bold text-white">
            M
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Aula experimental no Studio MUV</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Escolha o horário que cabe na sua rotina e garanta sua vaga
            {parametros ? ` por ${formatarMoeda(parametros.valor)}` : ''}.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {passo !== 'concluido' && (
            <div className="mb-5 border-b border-neutral-200 pb-4">
              <Trilha atual={passo} />
            </div>
          )}

          {passo === 'aula' && (
            <>
              {carregando ? (
                <p className="text-sm text-neutral-500">Carregando a grade…</p>
              ) : (
                <>
                  <NavegadorDeDatas
                    dataSelecionada={dataSelecionada}
                    onSelecionar={setDataSelecionada}
                    dataMinima={hoje}
                    dataMaxima={somarDias(hoje, parametros?.janelaDias ?? 30)}
                  />

                  {doDia.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                      Nenhuma aula nesta data. Escolha outro dia na faixa acima.
                    </p>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-3">
                      {doDia.map((aula) => (
                        <CartaoDeAula
                          key={`${aula.sessao.id}-${aula.data}`}
                          titulo={aula.modalidade?.nome ?? 'Aula'}
                          subtitulo={`${aula.nomeProfessora}${aula.nomeEspaco ? ` · ${aula.nomeEspaco}` : ''}`}
                          horario={`${aula.sessao.horarioInicio}–${aula.sessao.horarioFim}`}
                          detalhe={`${aula.vagas} vaga(s)`}
                          valor={parametros ? formatarMoeda(parametros.valor) : undefined}
                          esmaecido={aula.impedimento !== undefined}
                          aviso={aula.impedimento}
                          acao={
                            <Button
                              disabled={aula.impedimento !== undefined}
                              onClick={() => {
                                setEscolhida(aula);
                                setPasso('cadastro');
                              }}
                            >
                              Escolher
                            </Button>
                          }
                        />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}

          {passo === 'cadastro' && escolhida && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('pagamento');
              }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm">
                <p className="font-semibold text-primary-900">{escolhida.modalidade?.nome}</p>
                <p className="text-primary-800">
                  {formatarDataBR(escolhida.data)} · {escolhida.sessao.horarioInicio}–{escolhida.sessao.horarioFim} ·{' '}
                  {escolhida.nomeProfessora}
                </p>
              </div>

              <p className="text-sm text-neutral-600">
                O agendamento exige cadastro, mesmo sem contratar pacote — é com ele que você entra no sistema para
                acompanhar a aula e, se quiser, contratar um pacote depois.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Nome completo"
                  value={dados.nome}
                  onChange={(e) => mudarDado('nome', e.target.value)}
                  required
                  autoFocus
                  wrapperClassName="sm:col-span-2"
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={dados.email}
                  onChange={(e) => mudarDado('email', e.target.value)}
                  required
                />
                <TextField
                  label="CPF"
                  value={dados.cpf}
                  onChange={(e) => mudarDado('cpf', e.target.value)}
                  required
                  dica="O limite de aulas experimentais é controlado por CPF."
                />
                <TextField
                  label="Telefone"
                  value={dados.telefone}
                  onChange={(e) => mudarDado('telefone', e.target.value)}
                  required
                />
                <TextField
                  label="Data de nascimento"
                  type="date"
                  value={dados.dataNascimento}
                  onChange={(e) => mudarDado('dataNascimento', e.target.value)}
                  required
                />
                <TextField
                  label="Contato de emergência"
                  value={dados.contatoEmergencia}
                  onChange={(e) => mudarDado('contatoEmergencia', e.target.value)}
                  required
                  dica="Nome e telefone de quem podemos acionar se precisar."
                  wrapperClassName="sm:col-span-2"
                />
              </div>

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('aula')}>
                  Voltar
                </Button>
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          )}

          {passo === 'pagamento' && escolhida && parametros && (
            <form onSubmit={pagarEConfirmar} className="flex flex-col gap-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <h2 className="text-sm font-semibold text-ink">Resumo</h2>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Aula</dt>
                    <dd className="text-ink">{escolhida.modalidade?.nome}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Quando</dt>
                    <dd className="text-ink">
                      {formatarDataBR(escolhida.data)} às {escolhida.sessao.horarioInicio}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Professora</dt>
                    <dd className="text-ink">{escolhida.nomeProfessora}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
                    <dt className="font-medium text-ink">Valor da aula</dt>
                    <dd className="font-semibold text-ink">{formatarMoeda(parametros.valor)}</dd>
                  </div>
                </dl>
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                Sua vaga é confirmada assim que o pagamento for aprovado. Pagamento simulado neste protótipo, pelo
                mesmo caminho usado nas compras de pacote.
              </p>

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('cadastro')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={processando}>
                  {processando ? 'Processando…' : `Pagar ${formatarMoeda(parametros.valor)} e confirmar vaga`}
                </Button>
              </div>
            </form>
          )}

          {passo === 'termo' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                aceitarTermo();
              }}
              className="flex flex-col gap-5"
            >
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-semibold text-emerald-900">Vaga confirmada.</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Falta assinar o termo e responder a anamnese. Dá para deixar para depois — a sua vaga está garantida
                  de qualquer forma.
                </p>
              </div>

              {termoVigente ? (
                <AceiteDoTermo
                  termo={termoVigente}
                  assinante={{ nome: dados.nome.trim(), cpf: dados.cpf.trim() }}
                  aceito={aceito}
                  onAceitar={setAceito}
                />
              ) : (
                <p className="text-sm text-amber-800">
                  O studio ainda não publicou o termo de aceite. Ele fica pendente até a administração publicá-lo.
                </p>
              )}

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variante="secundaria" onClick={() => setPasso('anamnese')}>
                  Pular e concluir depois
                </Button>
                <Button type="submit" disabled={!aceito || !termoVigente || processando}>
                  {processando ? 'Registrando…' : 'Aceitar e continuar'}
                </Button>
              </div>
            </form>
          )}

          {passo === 'anamnese' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                responderAnamnese();
              }}
              className="flex flex-col gap-5"
            >
              <FichaDeAnamnese
                respostas={respostas}
                onResponder={(chave, valor) => setRespostas((atual) => ({ ...atual, [chave]: valor }))}
              />

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variante="secundaria" onClick={() => setPasso('concluido')}>
                  Pular e concluir depois
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  {faltamRespostas.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      Responda {faltamRespostas.length} pergunta(s) de saúde para concluir.
                    </p>
                  )}
                  <Button type="submit" disabled={faltamRespostas.length > 0 || processando}>
                    {processando ? 'Registrando…' : 'Concluir'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {passo === 'concluido' && escolhida && (
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
                ✓
              </span>
              <h2 className="mt-3 text-lg font-semibold text-ink">Vaga confirmada</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {escolhida.modalidade?.nome} em {formatarDataBR(escolhida.data)} às{' '}
                {escolhida.sessao.horarioInicio}, com {escolhida.nomeProfessora}. Enviamos a confirmação para{' '}
                <span className="font-medium text-ink">{dados.email}</span>.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Depois da aula, você pode contratar um pacote pelo seu próprio painel — seu cadastro já fica pronto.
              </p>
              {pendencias.length > 0 && (
                <p className="mx-auto mt-3 max-w-sm rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                  Ficou pendente: {pendencias.join(' e ')}. O seu painel vai lembrar; conclua quando puder.
                </p>
              )}
              <Link
                to="/login"
                className="mt-4 inline-block rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Ir para o login
              </Link>
            </div>
          )}
        </div>

        {passo !== 'concluido' && (
          <p className="mt-4 text-center text-xs text-neutral-500">
            Prefere já contratar um pacote?{' '}
            <Link to="/matricula" className="font-medium text-primary-700">
              Abrir a matrícula
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
