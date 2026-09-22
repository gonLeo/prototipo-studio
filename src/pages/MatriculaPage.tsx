import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePacotes } from '../hooks/usePacotes';
import { useTermos } from '../hooks/useTermos';
import { registrarAceiteDoTermo, registrarAnamnese } from '../hooks/pendenciasDeAceite';
import { matricularAlunaPeloSite } from '../hooks/cadastroDeAlunas';
import type { DadosCadastraisAluna } from '../hooks/cadastroDeAlunas';
import { FORMAS_PAGAMENTO, PARCELAS_DISPONIVEIS } from '../hooks/vendas';
import { agendarAula, listarAulasDisponiveis } from '../hooks/agendamentoDeAulas';
import { custoDaAulaRegular } from '../hooks/carteiraDeCreditos';
import type { AulaDisponivel } from '../hooks/agendamentoDeAulas';
import type { Aluna, Carteira, FormaPagamento } from '../types/domain';
import { Button } from '../components/ui/Button';
import { TextField, SelectField } from '../components/ui/Field';
import { AceiteDoTermo, FichaDeAnamnese } from '../components/AceiteEAnamnese';
import { perguntasNaoRespondidas } from '../data/anamnese';
import { formatarCreditos, formatarMoeda } from '../utils/creditos';
import { formatarDataBR, somarDias, hojeISO } from '../utils/data';

type Passo = 'dados' | 'pacote' | 'pagamento' | 'termo' | 'anamnese' | 'primeira_aula' | 'concluido';

/**
 * A ordem dos passos é a do fluxo 6.1 da v2.1: o pagamento vem antes do
 * termo e da anamnese, para que a interessada não abandone o fluxo no meio
 * do preenchimento sem ter concluído a compra. Os três passos posteriores
 * ao pagamento podem ser pulados (RF-ALU-08, RF-AGD-10).
 */
const PASSOS: Array<{ id: Passo; rotulo: string }> = [
  { id: 'dados', rotulo: 'Seus dados' },
  { id: 'pacote', rotulo: 'Pacote' },
  { id: 'pagamento', rotulo: 'Pagamento' },
  { id: 'termo', rotulo: 'Termo' },
  { id: 'anamnese', rotulo: 'Anamnese' },
  { id: 'primeira_aula', rotulo: 'Primeira aula' },
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
 * Auto-matrícula pelo site (RF-ALU-04, fluxo 6.1): dados, pacote e
 * pagamento; depois termo, anamnese e primeira aula, cada um pulável.
 *
 * O pagamento é único, no ato da compra, e passa pelo gateway simulado do
 * M12. Confirmado o pagamento, a carteira é ativada e o acesso liberado
 * (RF-CRE-01) — o que ficar pendente vira alerta no painel da aluna e
 * linha no bloco de pendências da administração (RF-ALU-08), nunca
 * bloqueio. Quem prefere conhecer o studio antes de comprar tem o caminho
 * da aula experimental, em `/experimental` (M13), que inverte a ordem:
 * horário primeiro, pagamento depois (RN-36).
 */
export function MatriculaPage() {
  const { pacotes, carregando: carregandoPacotes } = usePacotes();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();

  const [passo, setPasso] = useState<Passo>('dados');
  const [dados, setDados] = useState<DadosCadastraisAluna>({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    contatoEmergencia: '',
  });
  const [pacoteId, setPacoteId] = useState('');
  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState(String(PARCELAS_DISPONIVEIS[0]));
  const [matriculada, setMatriculada] = useState<{ aluna: Aluna; carteira: Carteira | undefined } | undefined>();
  const [termoPendente, setTermoPendente] = useState(true);
  const [anamnesePendente, setAnamnesePendente] = useState(true);
  const [custoDaAula, setCustoDaAula] = useState(1);
  const [aulasDisponiveis, setAulasDisponiveis] = useState<AulaDisponivel[]>([]);
  const [agendandoChave, setAgendandoChave] = useState<string>();
  const [primeiraAula, setPrimeiraAula] = useState<AulaDisponivel>();

  // Carrega a grade só quando a matrícula termina e o acesso é liberado.
  useEffect(() => {
    if (passo !== 'primeira_aula' || !matriculada) return;
    let valido = true;
    custoDaAulaRegular().then((custo: number) => {
      if (!valido) return;
      setCustoDaAula(custo);
      return listarAulasDisponiveis({
        aluna: matriculada.aluna,
        carteira: matriculada.carteira,
        custoDaAula: custo,
      }).then((lista) => {
        if (valido) setAulasDisponiveis(lista.filter((a) => a.impedimento === undefined));
      });
    });
    return () => {
      valido = false;
    };
  }, [passo, matriculada]);

  const pacotesAtivos = pacotes.filter((p) => p.situacao === 'ativo');
  const pacoteEscolhido = pacotesAtivos.find((p) => p.id === pacoteId);

  // Quem decide concluir o passo responde tudo; quem não quer agora pula.
  // O que fica pendente é acompanhado depois (RF-ALU-08).
  const faltamRespostas = perguntasNaoRespondidas(respostas);

  function mudarDado(campo: keyof DadosCadastraisAluna, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function concluir(e: FormEvent) {
    e.preventDefault();
    if (!termoVigente || !pacoteEscolhido) return;
    setErro(undefined);
    setProcessando(true);
    try {
      const { aluna, venda } = await matricularAlunaPeloSite({
        dados,
        compra: {
          pacoteId,
          formaPagamento,
          parcelas: formaPagamento === 'cartao_parcelado' ? Number(parcelas) : undefined,
        },
      });
      // RF-CRE-01: a carteira nasceu ativa na confirmação do pagamento, e o
      // acesso está liberado antes do termo. A aluna segue para o termo, a
      // anamnese e a primeira aula podendo pular cada um deles.
      setMatriculada({
        aluna,
        carteira: {
          id: venda.carteiraId ?? '',
          alunaId: aluna.id,
          pacoteId,
          creditosTotais: venda.creditos,
          creditosUtilizados: 0,
          creditosReservados: 0,
          dataAtivacao: hojeISO(),
          dataValidade: somarDias(hojeISO(), venda.validadeDias),
          situacao: 'ativa',
          bolsa: false,
        },
      });
      setPasso('termo');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  /** Assina o termo e segue para a anamnese (RF-ALU-05). */
  async function aceitarTermo() {
    if (!termoVigente || !matriculada) return;
    setErro(undefined);
    setProcessando(true);
    try {
      await registrarAceiteDoTermo({
        usuarioId: matriculada.aluna.usuarioId,
        assinante: { nome: dados.nome.trim(), cpf: dados.cpf.trim() },
        termo: termoVigente,
        aluna: matriculada.aluna,
      });
      setTermoPendente(false);
      setPasso('anamnese');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  /** Preenche a anamnese e segue para a primeira aula (RF-ALU-07). */
  async function responderAnamnese() {
    if (!matriculada) return;
    setErro(undefined);
    setProcessando(true);
    try {
      await registrarAnamnese({ aluna: matriculada.aluna, respostas });
      setAnamnesePendente(false);
      setPasso('primeira_aula');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  const pendencias = [termoPendente && 'o aceite do termo', anamnesePendente && 'a ficha de anamnese'].filter(
    Boolean,
  ) as string[];

  if (carregandoPacotes || carregandoTermo) {
    return <p className="p-8 text-sm text-neutral-500">Carregando…</p>;
  }

  return (
    <div className="min-h-full bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-700 text-base font-bold text-white">
            M
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Matrícula no Studio MUV</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Preencha seus dados, escolha o pacote e comece a agendar suas aulas.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {passo !== 'concluido' && (
            <div className="mb-5 border-b border-neutral-200 pb-4">
              <Trilha atual={passo} />
            </div>
          )}

          {passo === 'dados' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('pacote');
              }}
              className="flex flex-col gap-4"
            >
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
                  dica="Você receberá o acesso ao sistema neste e-mail."
                />
                <TextField
                  label="CPF"
                  value={dados.cpf}
                  onChange={(e) => mudarDado('cpf', e.target.value)}
                  required
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
              <div className="flex justify-end">
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          )}

          {passo === 'pacote' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('pagamento');
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                {pacotesAtivos.map((pacote) => (
                  <label
                    key={pacote.id}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 ${
                      pacoteId === pacote.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="pacote"
                        value={pacote.id}
                        checked={pacoteId === pacote.id}
                        onChange={() => setPacoteId(pacote.id)}
                        required
                        className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{pacote.nome}</span>
                        <span className="block text-xs text-neutral-500">
                          {formatarCreditos(pacote.creditos)} · validade de {pacote.validadeDias} dias · acesso a todas
                          as modalidades
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {formatarMoeda(pacote.valor)}
                      <span className="block text-right text-xs font-normal text-neutral-500">pagamento único</span>
                    </span>
                  </label>
                ))}
                {pacotesAtivos.length === 0 && (
                  <p className="text-sm text-neutral-500">Nenhum pacote disponível no momento.</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('dados')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={!pacoteId}>
                  Continuar
                </Button>
              </div>
            </form>
          )}

          {passo === 'termo' && termoVigente && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                aceitarTermo();
              }}
              className="flex flex-col gap-5"
            >
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-semibold text-emerald-900">Pagamento confirmado e acesso liberado.</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Seus créditos já estão disponíveis. Falta assinar o termo e preencher a anamnese — dá para deixar
                  para depois, pelo seu painel.
                </p>
              </div>

              <AceiteDoTermo
                termo={termoVigente}
                assinante={{ nome: dados.nome.trim(), cpf: dados.cpf.trim() }}
                aceito={aceito}
                onAceitar={setAceito}
              />

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variante="secundaria" onClick={() => setPasso('anamnese')}>
                  Pular e concluir depois
                </Button>
                <Button type="submit" disabled={!aceito || processando}>
                  {processando ? 'Registrando…' : 'Aceitar e continuar'}
                </Button>
              </div>
            </form>
          )}

          {passo === 'termo' && !termoVigente && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-amber-800">
                O studio ainda não publicou o termo de aceite. Sua matrícula está concluída e seus créditos já estão
                disponíveis — o termo fica pendente até a administração publicá-lo.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setPasso('anamnese')}>Continuar</Button>
              </div>
            </div>
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
                <Button type="button" variante="secundaria" onClick={() => setPasso('primeira_aula')}>
                  Pular e concluir depois
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  {faltamRespostas.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      Responda {faltamRespostas.length} pergunta(s) de saúde para concluir.
                    </p>
                  )}
                  <Button type="submit" disabled={faltamRespostas.length > 0 || processando}>
                    {processando ? 'Registrando…' : 'Concluir e continuar'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {passo === 'pagamento' && pacoteEscolhido && (
            <form onSubmit={concluir} className="flex flex-col gap-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <h2 className="text-sm font-semibold text-ink">Resumo</h2>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Pacote</dt>
                    <dd className="text-ink">{pacoteEscolhido.nome}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Créditos</dt>
                    <dd className="text-ink">{formatarCreditos(pacoteEscolhido.creditos)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Validade</dt>
                    <dd className="text-ink">
                      {pacoteEscolhido.validadeDias} dias · até{' '}
                      {formatarDataBR(somarDias(hojeISO(), pacoteEscolhido.validadeDias))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
                    <dt className="font-medium text-ink">Valor a pagar</dt>
                    <dd className="font-semibold text-ink">{formatarMoeda(pacoteEscolhido.valor)}</dd>
                  </div>
                </dl>
              </div>

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
                        {n}x de {formatarMoeda(pacoteEscolhido.valor / n)}
                      </option>
                    ))}
                  </SelectField>
                )}
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                Pagamento simulado neste protótipo. É um pagamento único: não há mensalidade nem cobrança recorrente.
                Confirmado o pagamento, seus créditos são liberados na hora; o termo e a anamnese vêm em seguida.
              </p>

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('pacote')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={processando}>
                  {processando ? 'Processando…' : 'Pagar e liberar meus créditos'}
                </Button>
              </div>
            </form>
          )}

          {passo === 'primeira_aula' && matriculada && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-ink">Escolha sua primeira aula</p>
                <p className="mt-1 text-sm text-neutral-600">
                  Seus {matriculada.carteira ? formatarCreditos(matriculada.carteira.creditosTotais) : 'créditos'} já
                  estão disponíveis. Cada aula regular custa {formatarCreditos(custoDaAula)}. Dá para agendar depois,
                  pelo seu painel.
                </p>
              </div>

              {aulasDisponiveis.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Nenhuma aula disponível para agendar agora. Você pode agendar depois pelo seu painel.
                </p>
              ) : (
                <ul className="max-h-72 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
                  {aulasDisponiveis.map((aula) => {
                    const chave = `${aula.sessao.id}-${aula.data}`;
                    return (
                      <li key={chave} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {formatarDataBR(aula.data)} · {aula.sessao.horarioInicio}–{aula.sessao.horarioFim}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {aula.modalidade?.nome ?? 'Modalidade'} · {aula.nomeProfessora} · {aula.vagas} vaga(s)
                          </p>
                        </div>
                        <Button
                          disabled={agendandoChave !== undefined}
                          onClick={async () => {
                            setErro(undefined);
                            setAgendandoChave(chave);
                            try {
                              await agendarAula({
                                aluna: matriculada.aluna,
                                sessao: aula.sessao,
                                data: aula.data,
                                origem: 'portal',
                                autorId: matriculada.aluna.usuarioId,
                              });
                              setPrimeiraAula(aula);
                              setPasso('concluido');
                            } catch (erroCapturado) {
                              setErro(
                                erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.',
                              );
                            } finally {
                              setAgendandoChave(undefined);
                            }
                          }}
                        >
                          {agendandoChave === chave ? 'Agendando…' : 'Agendar'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex justify-end">
                <Button variante="secundaria" onClick={() => setPasso('concluido')}>
                  Pular e agendar depois
                </Button>
              </div>
            </div>
          )}

          {passo === 'concluido' && (
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
                ✓
              </span>
              <h2 className="mt-3 text-lg font-semibold text-ink">Matrícula concluída</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Enviamos o acesso para <span className="font-medium text-ink">{dados.email}</span>. Seus{' '}
                {pacoteEscolhido ? formatarCreditos(pacoteEscolhido.creditos) : 'créditos'} já estão disponíveis e o
                agendamento está liberado.
              </p>
              {pendencias.length > 0 && (
                <p className="mx-auto mt-3 max-w-sm rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                  Ficou pendente: {pendencias.join(' e ')}. O seu painel vai lembrar — conclua quando puder, sem
                  pressa: isso não impede você de agendar.
                </p>
              )}
              {primeiraAula && (
                <p className="mt-2 text-sm font-medium text-ink">
                  Sua primeira aula: {primeiraAula.modalidade?.nome} em {formatarDataBR(primeiraAula.data)} às{' '}
                  {primeiraAula.sessao.horarioInicio}.
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
            Já é aluna?{' '}
            <Link to="/login" className="font-medium text-primary-700">
              Entrar no sistema
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
