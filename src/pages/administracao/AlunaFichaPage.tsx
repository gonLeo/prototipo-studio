import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFichaAluna } from '../../hooks/useFichaAluna';
import type { FrequenciaDaAluna } from '../../hooks/useFichaAluna';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import { ROTULO_SITUACAO_ALUNA } from '../../hooks/useAlunas';
import { ajustarCarteira, custoDaAulaRegular } from '../../hooks/carteiraDeCreditos';
import { alterarBolsa, comprarPacoteParaAluna } from '../../hooks/cadastroDeAlunas';
import { registrarVendaManual } from '../../hooks/vendas';
import { concederTrancamento, registrarRetorno } from '../../hooks/trancamento';
import { executarReembolso, ROTULO_TIPO_REEMBOLSO } from '../../hooks/reembolsos';
import { useConfirm } from '../../hooks/useConfirm';
import type { MovimentoCredito, SituacaoAluna, TipoMovimentoCredito, Venda } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PERGUNTAS_ANAMNESE } from '../../data/anamnese';
import { formatarDataBR } from '../../utils/data';
import {
  explicarFinalizando,
  formatarCreditos,
  formatarMoeda,
  rotuloFormaPagamento,
  rotuloSituacaoVenda,
  rotuloStatusCarteira,
} from '../../utils/creditos';
import {
  ModalAjustarCreditos,
  ModalBolsa,
  ModalComprarPacote,
  ModalReembolso,
  ModalTrancamento,
  ModalVendaManual,
} from './aluna/ModaisCarteira';
import { ModalAgendarPelaAdministracao } from './aluna/ModalAgendarPelaAdministracao';
import { agendarAula, cancelarAgendamentoDaAluna, remarcarAgendamento } from '../../hooks/agendamentoDeAulas';
import { useEffect } from 'react';

const TOM_POR_SITUACAO: Record<SituacaoAluna, 'sucesso' | 'aviso' | 'info'> = {
  ativa: 'sucesso',
  trancada: 'aviso',
  aguardando_aceite: 'info',
};

const ROTULO_MOVIMENTO: Record<TipoMovimentoCredito, string> = {
  concessao: 'Concessão',
  reserva: 'Reserva',
  liberacao: 'Liberação',
  consumo: 'Consumo',
  expiracao: 'Expiração',
  estorno: 'Estorno',
  ajuste: 'Ajuste',
};

/** Movimento que aumenta o disponível aparece com sinal positivo no extrato. */
const AUMENTA_DISPONIVEL: Record<TipoMovimentoCredito, boolean> = {
  concessao: true,
  reserva: false,
  liberacao: true,
  consumo: false,
  expiracao: false,
  estorno: true,
  ajuste: true,
};

const TOM_SITUACAO_VENDA: Record<Venda['situacao'], 'sucesso' | 'erro' | 'aviso' | 'neutro' | 'info'> = {
  pendente: 'info',
  confirmada: 'sucesso',
  cancelada: 'neutro',
  reembolsada: 'aviso',
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

function LinhaMovimento({ movimento }: { movimento: MovimentoCredito }) {
  // Prorrogação movimenta dias, não créditos: sem o sufixo o extrato
  // mostraria "+30" numa carteira cujo saldo não mudou.
  const emDias = movimento.unidade === 'dias';
  const positivo = movimento.quantidade < 0 ? false : AUMENTA_DISPONIVEL[movimento.tipo];

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
      <div className="min-w-0">
        <p className="text-ink">
          {ROTULO_MOVIMENTO[movimento.tipo]}
          {emDias ? ' de validade' : ''}
        </p>
        <p className="truncate text-xs text-neutral-500">{movimento.origem}</p>
      </div>
      <div className="text-right">
        <p className={`font-medium ${positivo ? 'text-emerald-700' : 'text-neutral-700'}`}>
          {positivo ? '+' : '−'}
          {Math.abs(movimento.quantidade)}
          {emDias ? ' dias' : ''}
        </p>
        <p className="text-xs text-neutral-500">{formatarDataBR(movimento.dataHora.slice(0, 10))}</p>
      </div>
    </li>
  );
}

type ModalAberto =
  | 'comprar'
  | 'ajustar'
  | 'bolsa'
  | 'venda_manual'
  | 'agendar'
  | 'trancar'
  | { reembolso: Venda }
  | { remarcar: FrequenciaDaAluna }
  | null;

/** Situação da aula no histórico de frequência, em linguagem de tela. */
function SituacaoDaFrequencia({ item }: { item: FrequenciaDaAluna }) {
  if (item.canceladaPeloStudio) return <Badge tom="aviso">Cancelada pelo studio</Badge>;
  if (item.situacao === 'cancelado') {
    return (
      <Badge tom="neutro">
        {item.creditoDevolvido === false ? 'Cancelada fora do prazo' : 'Cancelada'}
      </Badge>
    );
  }
  if (item.presenca === 'presente') return <Badge tom="sucesso">Presente</Badge>;
  if (item.presenca === 'ausente') return <Badge tom="erro">Falta</Badge>;
  if (item.situacao === 'realizado') return <Badge tom="sucesso">Realizada</Badge>;
  return <Badge tom="info">Agendada</Badge>;
}

export function AlunaFichaPage() {
  const { alunaId } = useParams<{ alunaId: string }>();
  const { ficha, carregando, recarregar } = useFichaAluna(alunaId);
  const { usuario } = useSessao();
  const mostrarToast = useToast();
  const confirmar = useConfirm();

  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [custoDaAula, setCustoDaAula] = useState(1);

  useEffect(() => {
    custoDaAulaRegular().then(setCustoDaAula);
  }, []);

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

  const { aluna, usuario: dadosUsuario, carteira, leitura, pacote, trancamentoAtivo } = ficha;

  // RF-CRE-09: o ajuste vale "inclusive para carteira já encerrada" — é o
  // caso de quem precisou esperar a fatura e viu o pacote vencer. Sem
  // carteira vigente, o alvo é a mais recente; prorrogar a validade dela
  // para o futuro a reabre.
  const carteiraAjustavel = carteira ?? ficha.carteiras[0];

  async function executar(acao: () => Promise<void>, mensagemSucesso: string) {
    try {
      await acao();
      await recarregar();
      mostrarToast(mensagemSucesso, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  /**
   * Cancelamento em nome da aluna (RF-AGD-08). O crédito volta sempre: a
   * antecedência mínima existe para a aluna desistir, não para o studio
   * desmarcar — e é isso que a confirmação diz antes de executar.
   */
  async function cancelarPelaAdministracao(item: FrequenciaDaAluna) {
    const ok = await confirmar({
      titulo: 'Cancelar aula da aluna',
      mensagem: `A aula de ${formatarDataBR(item.dataAula)} às ${item.horarioInicio} será cancelada e ${formatarCreditos(item.creditosReservados)} voltam ao saldo disponível. A aluna é notificada, e o cancelamento fica registrado como feito pela administração.`,
      textoConfirmar: 'Cancelar aula',
      perigo: true,
    });
    if (!ok) return;

    await executar(
      () =>
        cancelarAgendamentoDaAluna({
          agendamento: item,
          dataAula: item.dataAula,
          horaAula: item.horarioInicio,
          origemCancelamento: 'administracao',
          autorId: usuario!.id,
        }).then(() => undefined),
      'Aula cancelada e créditos devolvidos ao saldo.',
    );
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
            {aluna.bolsista && <Badge tom="sucesso">Bolsista · isenta</Badge>}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {dadosUsuario.email} · {dadosUsuario.cpf}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModalAberto('agendar')} disabled={!carteira || aluna.situacao === 'trancada'}>
            Agendar aula
          </Button>
          <Button variante="secundaria" onClick={() => setModalAberto('comprar')}>
            Comprar pacote
          </Button>
          <Button variante="secundaria" onClick={() => setModalAberto('venda_manual')}>
            Registrar venda
          </Button>
          <Button variante="secundaria" onClick={() => setModalAberto('bolsa')}>
            Bolsa
          </Button>
          {carteiraAjustavel && (
            <Button variante="secundaria" onClick={() => setModalAberto('ajustar')}>
              Ajustar créditos
            </Button>
          )}
          {/* RF-TRA-01 e RF-PER-03: trancamento é exclusivo da administração. */}
          {trancamentoAtivo ? (
            <Button
              variante="secundaria"
              onClick={() =>
                executar(
                  () =>
                    registrarRetorno({ trancamento: trancamentoAtivo, aluna, autorId: usuario!.id }).then(
                      () => undefined,
                    ),
                  'Retorno registrado. A validade foi prorrogada pelo tempo trancado e o agendamento está liberado.',
                )
              }
            >
              Registrar retorno
            </Button>
          ) : (
            carteira && (
              <Button variante="secundaria" onClick={() => setModalAberto('trancar')}>
                Trancar
              </Button>
            )
          )}
        </div>
      </div>

      {trancamentoAtivo && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="font-medium">Pacote trancado</span> de {formatarDataBR(trancamentoAtivo.dataInicio)} a{' '}
          {formatarDataBR(trancamentoAtivo.dataTerminoPrevista)} · {trancamentoAtivo.diasProrrogados} dia(s) de
          prorrogação · {trancamentoAtivo.motivo}. Durante o período a aluna não visualiza a grade nem agenda.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <Secao titulo="Dados cadastrais">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Dado rotulo="Telefone" valor={aluna.telefone} />
            <Dado rotulo="Data de nascimento" valor={aluna.dataNascimento ? formatarDataBR(aluna.dataNascimento) : '—'} />
            <Dado rotulo="Contato de emergência" valor={aluna.contatoEmergencia || '—'} />
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

        {/* RF-CRE-12: saldo em três dimensões, validade e status da carteira. */}
        <Secao
          titulo="Carteira de créditos"
          acao={
            leitura && (
              <Badge tom={leitura.motivoFinalizando ? 'aviso' : 'sucesso'}>
                {rotuloStatusCarteira(leitura.status)}
              </Badge>
            )
          }
        >
          {!carteira || !leitura ? (
            <p className="text-sm text-neutral-500">
              Nenhum pacote ativo. A aluna precisa adquirir um novo pacote para voltar a agendar.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Dado rotulo="Disponíveis" valor={<span className="text-lg font-semibold">{leitura.disponiveis}</span>} />
                <Dado rotulo="Reservados" valor={leitura.reservados} />
                <Dado rotulo="Utilizados" valor={leitura.utilizados} />
                <Dado rotulo="Total do pacote" valor={leitura.totais} />
                <Dado rotulo="Pacote vigente" valor={pacote?.nome ?? '—'} />
                <Dado
                  rotulo="Validade"
                  valor={
                    <>
                      {formatarDataBR(carteira.dataValidade)}
                      <span className="ml-1 text-xs text-neutral-500">
                        ({leitura.diasParaVencer >= 0 ? `${leitura.diasParaVencer} dias` : 'vencida'})
                      </span>
                    </>
                  }
                />
                <Dado
                  rotulo="Ativada em"
                  valor={carteira.dataAtivacao ? formatarDataBR(carteira.dataAtivacao) : 'Aguardando aceite'}
                />
                <Dado rotulo="Custo da aula regular" valor={formatarCreditos(custoDaAula)} />
              </dl>

              {leitura.motivoFinalizando && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">
                  {explicarFinalizando(leitura.motivoFinalizando, leitura)} A aluna continua agendando normalmente — é o
                  momento de oferecer a renovação.
                </p>
              )}
            </>
          )}
        </Secao>

        {/* RF-CRE-08: todo movimento de crédito fica registrado. */}
        <Secao titulo="Extrato de créditos">
          {ficha.movimentos.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum movimento de crédito registrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.movimentos.slice(0, 20).map((movimento) => (
                <LinhaMovimento key={movimento.id} movimento={movimento} />
              ))}
            </ul>
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

        {/* RF-HIS-01: a carteira permanece no histórico mesmo depois de encerrada. */}
        <Secao titulo="Histórico de pacotes">
          {ficha.carteiras.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum pacote adquirido até agora.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.carteiras.map((item) => {
                const nome = ficha.pacotes.find((p) => p.id === item.pacoteId)?.nome ?? 'Pacote removido';
                return (
                  <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink">
                        {nome}
                        {item.bolsa && <span className="ml-1 text-xs text-emerald-700">· bolsa</span>}
                      </span>
                      <Badge tom={item.id === carteira?.id ? 'sucesso' : 'neutro'}>
                        {item.id === carteira?.id ? 'Vigente' : rotuloStatusCarteira(item.situacao)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {item.creditosTotais} adquiridos · {item.creditosUtilizados} utilizados ·{' '}
                      {item.dataAtivacao ? `ativada em ${formatarDataBR(item.dataAtivacao)}` : 'aguardando ativação'} ·
                      validade {formatarDataBR(item.dataValidade)}
                      {item.dataEncerramento && ` · encerrada em ${formatarDataBR(item.dataEncerramento)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        {/* RF-PRE-07 e RF-AGD-08: o histórico diz o que aconteceu com os
            créditos, e a administração cancela ou remarca daqui mesmo. */}
        <Secao titulo="Histórico de frequência">
          {ficha.frequencia.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma aula agendada ou realizada até agora.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.frequencia.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-ink">
                      {item.dataAula ? formatarDataBR(item.dataAula) : '—'}
                      {item.horarioInicio && (
                        <span className="ml-1 text-xs text-neutral-500">
                          · {item.horarioInicio}–{item.horarioFim}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {item.nomeAulaExcepcional ?? item.nomeModalidade}
                      {item.experimental && ' · experimental'}
                      {/* RF-CNV-09: a mesma pessoa pode ter pacote e convênio,
                          e cada agendamento registra sua origem. */}
                      {item.origem === 'convenio' && ' · reserva pelo convênio'}
                      {item.creditosReservados > 0 && ` · ${formatarCreditos(item.creditosReservados)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <SituacaoDaFrequencia item={item} />
                    {item.podeRemanejar && (
                      <>
                        <Button variante="fantasma" onClick={() => cancelarPelaAdministracao(item)}>
                          Cancelar
                        </Button>
                        <Button variante="secundaria" onClick={() => setModalAberto({ remarcar: item })}>
                          Remarcar
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        {/* RF-TRA-06/07: registro completo dos trancamentos. */}
        {ficha.trancamentos.length > 0 && (
          <Secao titulo="Trancamentos">
            <ul className="flex flex-col gap-2">
              {ficha.trancamentos.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">
                      {formatarDataBR(item.dataInicio)} a {formatarDataBR(item.dataTerminoPrevista)}
                    </span>
                    <Badge tom={item.situacao === 'em_curso' ? 'aviso' : 'neutro'}>
                      {item.situacao === 'em_curso' ? 'Em curso' : 'Encerrado'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {item.diasProrrogados} dia(s) de prorrogação ·{' '}
                    {item.dataRetornoEfetiva
                      ? `retorno em ${formatarDataBR(item.dataRetornoEfetiva)}`
                      : 'aguardando retorno'}{' '}
                    · {item.motivo}
                  </p>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {/* RF-REE-08/10: a informação de reembolso só aparece para quem teve um aplicado. */}
        {ficha.reembolsos.length > 0 && (
          <Secao titulo="Reembolsos aplicados">
            <ul className="flex flex-col gap-2">
              {ficha.reembolsos.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">
                      {formatarDataBR(item.data)} · {ROTULO_TIPO_REEMBOLSO[item.tipo]}
                    </span>
                    <span className="font-medium text-ink">{formatarMoeda(item.valorReembolsado)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Pago {formatarMoeda(item.valorPago)} · {item.creditosUtilizados} de {item.creditosComprados}{' '}
                    créditos utilizados · descontado {formatarMoeda(item.valorDescontado)}
                    {item.carteiraEncerrada ? ' · carteira encerrada' : ' · validade anterior restaurada'}
                  </p>
                  <p className="text-xs text-neutral-500">{item.motivo}</p>
                  {item.documentacao && (
                    <p className="text-xs text-neutral-500">Documentação: {item.documentacao}</p>
                  )}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {/* RF-VEN-06: histórico de compras da aluna. */}
        <Secao
          titulo="Histórico de compras"
          acao={
            <Link to="/administracao/vendas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
              Painel de vendas →
            </Link>
          }
        >
          {ficha.compras.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma compra registrada para esta aluna.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.compras.map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">
                      {item.tipo === 'aula_experimental'
                        ? 'Aula experimental'
                        : (ficha.pacotes.find((p) => p.id === item.pacoteId)?.nome ?? 'Pacote removido')}
                      <span className="ml-1 text-xs text-neutral-500">· {formatarDataBR(item.data)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-right">
                        {/* Reembolso desconta os créditos já utilizados: o
                            devolvido quase nunca é o que foi pago. */}
                        <span className="block font-medium text-ink">
                          {item.bolsa
                            ? 'Isenta'
                            : formatarMoeda(item.valorReembolsado ?? item.valor)}
                        </span>
                        {item.valorReembolsado !== undefined && (
                          <span className="block text-xs font-normal text-neutral-500">
                            de {formatarMoeda(item.valor)} pagos
                          </span>
                        )}
                      </span>
                      <Badge tom={TOM_SITUACAO_VENDA[item.situacao]}>{rotuloSituacaoVenda(item.situacao)}</Badge>
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {rotuloFormaPagamento(item.formaPagamento, item.parcelas)}
                    {item.creditos > 0 && ` · ${formatarCreditos(item.creditos)} · validade de ${item.validadeDias} dias`}
                  </p>
                  {item.motivoCancelamento && (
                    <p className="text-xs text-neutral-500">Cancelada: {item.motivoCancelamento}</p>
                  )}
                  {item.observacao && <p className="text-xs text-neutral-500">{item.observacao}</p>}
                  {/* RF-REE-09: o reembolso só existe aqui, no perfil da administração. */}
                  {item.tipo === 'pacote' && item.situacao === 'confirmada' && !item.bolsa && (
                    <div className="mt-1">
                      <Button variante="fantasma" onClick={() => setModalAberto({ reembolso: item })}>
                        Reembolsar
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {modalAberto === 'comprar' && (
        <Modal titulo="Comprar pacote" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalComprarPacote
            ficha={ficha}
            onConfirmar={async ({ pacoteId, formaPagamento, parcelas }) => {
              const { confirmada, mensagem } = await comprarPacoteParaAluna({
                aluna,
                compra: { pacoteId, formaPagamento, parcelas },
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast(
                confirmada ? 'Compra confirmada e créditos aplicados à carteira.' : `Venda pendente: ${mensagem}`,
                confirmada ? 'sucesso' : 'aviso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'venda_manual' && (
        <Modal titulo="Registrar venda fora do gateway" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalVendaManual
            ficha={ficha}
            onConfirmar={async ({ pacoteId, valor, data, observacao }) => {
              const pacoteEscolhido = ficha.pacotes.find((p) => p.id === pacoteId);
              if (!pacoteEscolhido) return;
              await registrarVendaManual({
                aluna,
                pacote: pacoteEscolhido,
                valor,
                data,
                observacao,
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast('Venda registrada e créditos aplicados à carteira.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'ajustar' && carteiraAjustavel && (
        <Modal titulo="Ajustar créditos" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAjustarCreditos
            carteira={carteiraAjustavel}
            encerrada={!carteira}
            onConfirmar={async ({ tipo, quantidade, motivo }) => {
              await ajustarCarteira({ carteira: carteiraAjustavel, tipo, quantidade, motivo, autorId: usuario!.id });
              await recarregar();
              mostrarToast('Ajuste aplicado e registrado no extrato.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'bolsa' && (
        <Modal titulo="Bolsa" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalBolsa
            ficha={ficha}
            onConfirmar={async ({ bolsista, pacoteConcedidoId, motivo }) => {
              await alterarBolsa({ aluna, bolsista, pacoteConcedidoId, motivo, autorId: usuario!.id });
              await recarregar();
              mostrarToast(bolsista ? 'Bolsa concedida.' : 'Bolsa revogada.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'trancar' && carteira && (
        <Modal titulo="Trancar pacote" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalTrancamento
            ficha={ficha}
            carteira={carteira}
            onConfirmar={async ({ dataInicio, dataTerminoPrevista, motivo }) => {
              const { agendamentosCancelados } = await concederTrancamento({
                carteira,
                aluna,
                dataInicio,
                dataTerminoPrevista,
                motivo,
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast(
                agendamentosCancelados > 0
                  ? `Pacote trancado. ${agendamentosCancelados} aula(s) cancelada(s) e créditos liberados.`
                  : 'Pacote trancado e validade prorrogada.',
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto && typeof modalAberto === 'object' && 'reembolso' in modalAberto && (
        <Modal titulo="Reembolso" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalReembolso
            venda={modalAberto.reembolso}
            onConfirmar={async ({ tipo, motivo, documentacao, valorPersonalizado }) => {
              const ok = await confirmar({
                titulo: 'Confirmar reembolso',
                mensagem:
                  'O estorno será enviado ao gateway e os créditos desta compra saem da carteira. Esta ação não pode ser desfeita.',
                textoConfirmar: 'Reembolsar',
                perigo: true,
              });
              if (!ok) return;

              const reembolso = await executarReembolso({
                venda: modalAberto.reembolso,
                tipo,
                motivo,
                documentacao,
                valorPersonalizado,
                autorId: usuario!.id,
              });
              await recarregar();
              mostrarToast(
                `Reembolso de ${formatarMoeda(reembolso.valorReembolsado)} aplicado e registrado.`,
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto === 'agendar' && (
        <Modal titulo="Agendar aula" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAgendarPelaAdministracao
            aluna={aluna}
            carteira={carteira}
            custoDaAula={custoDaAula}
            onAgendar={async (aula) => {
              await executar(
                () =>
                  agendarAula({
                    aluna,
                    sessao: aula.sessao,
                    data: aula.data,
                    origem: 'administracao',
                    autorId: usuario!.id,
                  }).then(() => undefined),
                'Aula agendada e créditos reservados.',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {modalAberto && typeof modalAberto === 'object' && 'remarcar' in modalAberto && (
        <Modal titulo="Remarcar aula" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAgendarPelaAdministracao
            aluna={aluna}
            carteira={carteira}
            custoDaAula={custoDaAula}
            remarcandoDe={`${formatarDataBR(modalAberto.remarcar.dataAula)} às ${modalAberto.remarcar.horarioInicio}`}
            onAgendar={async (aula) => {
              const original = modalAberto.remarcar;
              await executar(
                () =>
                  remarcarAgendamento({
                    aluna,
                    agendamento: original,
                    dataAtual: original.dataAula,
                    horaAtual: original.horarioInicio,
                    novaSessao: aula.sessao,
                    novaData: aula.data,
                    autorId: usuario!.id,
                  }).then(() => undefined),
                `Aula remarcada para ${formatarDataBR(aula.data)} às ${aula.sessao.horarioInicio}.`,
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
