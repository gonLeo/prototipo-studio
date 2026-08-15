import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFichaAluna } from '../../hooks/useFichaAluna';
import { usePacotes } from '../../hooks/usePacotes';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { ROTULO_SITUACAO_ALUNA } from '../../hooks/useAlunas';
import {
  alterarBolsa,
  alterarPlano,
  aulasRealizadasNoCicloCorrente,
  encerrarContrato,
  pausarContrato,
  reativarAluna,
  renovarCiclo,
  retornarDePausa,
} from '../../hooks/contratosDeAluna';
import type { SituacaoAluna } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PERGUNTAS_ANAMNESE } from '../../data/anamnese';
import { diferencaEmDias, formatarDataBR } from '../../utils/data';
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../../utils/contrato';
import { ModalAlterarPlano, ModalBolsa, ModalEncerrar, ModalPausa, ModalReativar } from './aluna/ModaisContrato';
import { ModalAgendarPelaAdministracao } from './aluna/ModalAgendarPelaAdministracao';
import { agendarAula } from '../../hooks/agendamentoDeAulas';

const TOM_POR_SITUACAO: Record<SituacaoAluna, 'sucesso' | 'erro' | 'aviso' | 'neutro' | 'info'> = {
  ativa: 'sucesso',
  inadimplente: 'erro',
  trancada: 'neutro',
  suspensa: 'aviso',
  encerrada: 'neutro',
  aguardando_aceite: 'info',
};

function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
        {acao}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-ink">{valor}</dd>
    </div>
  );
}

type ModalAberto = 'plano' | 'bolsa' | 'pausa' | 'encerrar' | 'reativar' | 'agendar' | null;

export function AlunaFichaPage() {
  const { alunaId } = useParams<{ alunaId: string }>();
  const { ficha, carregando, recarregar, hoje } = useFichaAluna(alunaId);
  const { pacotes } = usePacotes();
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [aulasRealizadas, setAulasRealizadas] = useState(0);

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!ficha) {
    return (
      <div>
        <p className="text-sm text-neutral-500">Aluna não encontrada.</p>
        <Link to="/administracao/alunas" className="mt-2 inline-block text-sm font-medium text-primary-700">
          ← Voltar para a lista
        </Link>
      </div>
    );
  }

  const { aluna, usuario: dadosUsuario, contrato, pacote } = ficha;
  const percentualBolsa = aluna.percentualBolsa ?? 0;
  const pausada = contrato?.situacao === 'trancado' || contrato?.situacao === 'suspenso';
  const encerrado = !contrato || contrato.situacao === 'encerrado';

  async function abrirAlteracaoDePlano() {
    if (!contrato) return;
    setAulasRealizadas(await aulasRealizadasNoCicloCorrente(contrato));
    setModalAberto('plano');
  }

  async function executar(acao: () => Promise<void>, mensagemSucesso: string) {
    try {
      await acao();
      await recarregar();
      mostrarToast(mensagemSucesso, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div className="max-w-5xl">
      <Link to="/administracao/alunas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
        ← Alunas
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{dadosUsuario.nome}</h1>
            <Badge tom={TOM_POR_SITUACAO[aluna.situacao]}>{ROTULO_SITUACAO_ALUNA[aluna.situacao]}</Badge>
            {aluna.bolsista && (
              <Badge tom="sucesso">
                Bolsista {percentualBolsa}%{ehIsencaoTotal(percentualBolsa) ? ' · isenta' : ''}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {dadosUsuario.email} · {dadosUsuario.cpf}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contrato && !encerrado && (
            <>
              <Button onClick={() => setModalAberto('agendar')} disabled={contrato.situacao !== 'ativo'}>
                Agendar aula
              </Button>
              <Button variante="secundaria" onClick={abrirAlteracaoDePlano} disabled={contrato.situacao !== 'ativo'}>
                Alterar plano
              </Button>
              <Button variante="secundaria" onClick={() => setModalAberto('bolsa')}>
                Bolsa
              </Button>
              {pausada ? (
                <Button
                  variante="secundaria"
                  onClick={() =>
                    executar(
                      () => retornarDePausa({ contrato, aluna, autorId: usuario!.id }),
                      'Contrato reativado — a validade voltou a correr.',
                    )
                  }
                >
                  Registrar retorno
                </Button>
              ) : (
                <Button variante="secundaria" onClick={() => setModalAberto('pausa')}>
                  {contrato.tipo === 'semestral' ? 'Trancar' : 'Suspender'}
                </Button>
              )}
              <Button variante="perigo" onClick={() => setModalAberto('encerrar')}>
                Encerrar
              </Button>
            </>
          )}
          {encerrado && <Button onClick={() => setModalAberto('reativar')}>Reativar</Button>}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Secao titulo="Dados cadastrais">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Dado rotulo="Telefone" valor={aluna.telefone} />
            <Dado rotulo="Data de nascimento" valor={aluna.dataNascimento ? formatarDataBR(aluna.dataNascimento) : '—'} />
            <Dado rotulo="Contato de emergência" valor={aluna.contatoEmergencia} />
            <Dado rotulo="Origem" valor={aluna.origem === 'convenio' ? 'Convênio' : 'Matrícula direta'} />
            <Dado
              rotulo="Situação do acesso"
              valor={
                dadosUsuario.situacao === 'aguardando_aceite'
                  ? 'Aguardando aceite do termo e anamnese'
                  : 'Liberado'
              }
            />
          </dl>
        </Secao>

        <Secao
          titulo="Contrato e pacote"
          acao={
            contrato?.situacao === 'ativo' ? (
              <Button
                variante="fantasma"
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Renovar ciclo',
                    mensagem:
                      'Renovar credita as aulas do pacote no novo ciclo, somando as aulas não realizadas do ciclo atual, e avança o vencimento em um mês. No sistema final isso acontece automaticamente na data de vencimento.',
                    textoConfirmar: 'Renovar',
                  });
                  if (!ok) return;
                  await executar(
                    () => renovarCiclo(contrato, usuario!.id).then(() => undefined),
                    'Ciclo renovado com o saldo transferido.',
                  );
                }}
              >
                Renovar ciclo
              </Button>
            ) : undefined
          }
        >
          {!contrato ? (
            <p className="text-sm text-neutral-500">Nenhum contrato registrado.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Dado rotulo="Pacote" valor={pacote?.nome ?? 'Pacote removido'} />
              <Dado rotulo="Duração" valor={contrato.tipo === 'semestral' ? 'Semestral' : 'Mensal'} />
              <Dado
                rotulo="Mensalidade"
                valor={
                  !pacote ? (
                    '—'
                  ) : ehIsencaoTotal(percentualBolsa) ? (
                    <span className="font-medium text-emerald-700">Isenta</span>
                  ) : (
                    <>
                      {formatarMoeda(valorComBolsa(pacote.valorMensal, percentualBolsa))}
                      {percentualBolsa > 0 && (
                        <span className="ml-1 text-xs text-neutral-400 line-through">
                          {formatarMoeda(pacote.valorMensal)}
                        </span>
                      )}
                    </>
                  )
                }
              />
              <Dado rotulo="Saldo de aulas" valor={`${contrato.saldoAulas} aulas`} />
              <Dado
                rotulo="Validade do ciclo"
                valor={
                  <>
                    {formatarDataBR(contrato.dataVencimentoCiclo)}
                    <span className="ml-1 text-xs text-neutral-500">
                      ({diferencaEmDias(hoje, contrato.dataVencimentoCiclo)} dias)
                    </span>
                  </>
                }
              />
              <Dado rotulo="Término do contrato" valor={formatarDataBR(contrato.dataTerminoContrato)} />
              <Dado
                rotulo="Situação do contrato"
                valor={
                  {
                    ativo: 'Ativo',
                    trancado: 'Trancado',
                    suspenso: 'Suspenso',
                    encerrado: 'Encerrado',
                  }[contrato.situacao]
                }
              />
              <Dado
                rotulo="Dias adicionais concedidos"
                valor={`${contrato.diasAdicionaisConcedidos} dia(s)`}
              />
            </dl>
          )}
        </Secao>

        <Secao titulo="Ficha de anamnese">
          {!ficha.anamnese ? (
            <p className="text-sm text-neutral-500">
              Ainda não preenchida — a aluna responde no momento do aceite do termo.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                Respostas autodeclaradas pela aluna, sem validação da administração. Preenchida em{' '}
                {formatarDataBR(ficha.anamnese.dataPreenchimento.slice(0, 10))}.
              </p>
              <dl className="flex flex-col gap-3">
                {PERGUNTAS_ANAMNESE.map((pergunta) => (
                  <div key={pergunta.chave}>
                    <dt className="text-xs text-neutral-500">{pergunta.pergunta}</dt>
                    <dd className="text-sm text-ink">{ficha.anamnese?.respostas[pergunta.chave] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Secao>

        <Secao titulo="Histórico de contratos">
          {ficha.contratos.length === 0 ? (
            <p className="text-sm text-neutral-500">Sem contratos registrados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.contratos.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
                  <span className="text-ink">
                    {pacotes.find((p) => p.id === item.pacoteId)?.nome ?? 'Pacote removido'} ·{' '}
                    {item.tipo === 'semestral' ? 'Semestral' : 'Mensal'}
                  </span>
                  <span className="text-neutral-500">
                    {formatarDataBR(item.dataInicio)} a {formatarDataBR(item.dataTerminoContrato)} ·{' '}
                    {item.situacao === 'encerrado' ? 'Encerrado' : 'Em andamento'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Histórico de alterações de plano">
          {ficha.historicoPlanos.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma alteração de plano registrada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.historicoPlanos.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <p className="text-ink">
                    {pacotes.find((p) => p.id === item.pacoteAnteriorId)?.nome ?? 'Pacote removido'} →{' '}
                    {pacotes.find((p) => p.id === item.pacoteNovoId)?.nome ?? 'Pacote removido'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatarDataBR(item.data)} · saldo {item.saldoAnterior} → {item.saldoResultante} aulas ·{' '}
                    {item.diferencaCobrada >= 0
                      ? `diferença cobrada de ${formatarMoeda(item.diferencaCobrada)}`
                      : `crédito de ${formatarMoeda(Math.abs(item.diferencaCobrada))}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Histórico de bolsa">
          {ficha.historicoBolsas.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma concessão ou alteração de bolsa registrada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.historicoBolsas.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <p className="text-ink">
                    {item.percentualAnterior}% → {item.percentualNovo}%
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatarDataBR(item.data)} · {item.motivo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Trancamentos e suspensões">
          {ficha.pausas.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma pausa registrada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.pausas.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <p className="text-ink">
                    {item.tipo === 'trancamento' ? 'Trancamento' : 'Suspensão'} · {item.diasCongelados} dias
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatarDataBR(item.dataInicio)} a {formatarDataBR(item.dataTerminoPrevista)} ·{' '}
                    {item.dataRetornoEfetiva ? `retorno em ${formatarDataBR(item.dataRetornoEfetiva)}` : 'em curso'} ·{' '}
                    {item.motivo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Histórico de frequência">
          {ficha.frequencia.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Sem aulas registradas. O agendamento chega na Fase 4 e a chamada na Fase 5.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.frequencia.map((item) => (
                <li key={item.id} className="flex justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
                  <span className="text-ink">{item.dataAula ? formatarDataBR(item.dataAula) : '—'}</span>
                  <span className="text-neutral-500">{item.situacao}</span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Histórico de pagamentos">
          {ficha.cobrancas.length === 0 ? (
            <p className="text-sm text-neutral-500">Sem cobranças registradas. O financeiro chega na Fase 6.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.cobrancas.map((item) => (
                <li key={item.id} className="flex justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
                  <span className="text-ink">{formatarDataBR(item.dataVencimento)}</span>
                  <span className="text-neutral-500">
                    {formatarMoeda(item.valorLiquido)} · {item.situacao}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {modalAberto === 'plano' && contrato && pacote && (
        <Modal titulo="Alterar plano" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAlterarPlano
            ficha={ficha}
            contrato={contrato}
            pacoteAtual={pacote}
            aulasRealizadasNoCiclo={aulasRealizadas}
            onConfirmar={async (pacoteNovo, previa) => {
              await alterarPlano({
                contrato,
                pacoteNovoId: pacoteNovo.id,
                saldoAulasResultante: previa.saldoAulasResultante,
                diferencaApurada: previa.diferenca,
                valorConsumido: previa.valorConsumido,
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast('Plano alterado e histórico registrado.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'bolsa' && (
        <Modal titulo="Bolsa da aluna" onFechar={() => setModalAberto(null)}>
          <ModalBolsa
            ficha={ficha}
            onConfirmar={async (percentual, motivo) => {
              await alterarBolsa({ aluna, percentualNovo: percentual, motivo, autorId: usuario!.id });
              await recarregar();
              mostrarToast('Bolsa registrada. Vale a partir do próximo ciclo.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'pausa' && contrato && (
        <Modal
          titulo={contrato.tipo === 'semestral' ? 'Trancar contrato' : 'Suspender contrato'}
          onFechar={() => setModalAberto(null)}
        >
          <ModalPausa
            contrato={contrato}
            onConfirmar={async (dados) => {
              const { agendamentosCancelados } = await pausarContrato({
                contrato,
                aluna,
                autorId: usuario!.id,
                ...dados,
              });
              await recarregar();
              mostrarToast(
                agendamentosCancelados > 0
                  ? `Contrato pausado. ${agendamentosCancelados} agendamento(s) cancelado(s) com crédito devolvido.`
                  : 'Contrato pausado.',
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'encerrar' && contrato && (
        <Modal titulo="Encerrar contrato" onFechar={() => setModalAberto(null)}>
          <ModalEncerrar
            onConfirmar={async (motivo) => {
              const { agendamentosCancelados } = await encerrarContrato({
                contrato,
                aluna,
                motivo,
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast(
                agendamentosCancelados > 0
                  ? `Contrato encerrado. ${agendamentosCancelados} aula(s) futura(s) cancelada(s).`
                  : 'Contrato encerrado.',
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'agendar' && (
        <Modal titulo={`Agendar aula — ${dadosUsuario.nome}`} largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAgendarPelaAdministracao
            aluna={aluna}
            contrato={contrato}
            onAgendar={async (aula) => {
              const resultado = await agendarAula({
                aluna,
                sessao: aula.sessao,
                data: aula.data,
                origem: 'administracao',
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast(
                `Aula agendada para ${formatarDataBR(aula.data)}. Saldo restante: ${resultado.novoSaldo} aula(s).`,
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'reativar' && (
        <Modal titulo="Reativar aluna" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalReativar
            ficha={ficha}
            onConfirmar={async (dados) => {
              await reativarAluna({ aluna, contratacao: dados, autorId: usuario!.id });
              await recarregar();
              mostrarToast('Aluna reativada com novo contrato.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
