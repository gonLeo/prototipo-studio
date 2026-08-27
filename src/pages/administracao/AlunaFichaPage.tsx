import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFichaAluna } from '../../hooks/useFichaAluna';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import { ROTULO_SITUACAO_ALUNA } from '../../hooks/useAlunas';
import { ajustarCarteira, custoDaAulaRegular } from '../../hooks/carteiraDeCreditos';
import { alterarBolsa, comprarPacoteParaAluna } from '../../hooks/cadastroDeAlunas';
import { registrarVendaManual } from '../../hooks/vendas';
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
  ModalVendaManual,
} from './aluna/ModaisCarteira';
import { ModalAgendarPelaAdministracao } from './aluna/ModalAgendarPelaAdministracao';
import { agendarAula } from '../../hooks/agendamentoDeAulas';
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
  const positivo = AUMENTA_DISPONIVEL[movimento.tipo];
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
      <div className="min-w-0">
        <p className="text-ink">
          {ROTULO_MOVIMENTO[movimento.tipo]}
          {movimento.tipo === 'ajuste' && movimento.origem.startsWith('Prorrogar') ? ' de validade' : ''}
        </p>
        <p className="truncate text-xs text-neutral-500">{movimento.origem}</p>
      </div>
      <div className="text-right">
        <p className={`font-medium ${positivo ? 'text-emerald-700' : 'text-neutral-700'}`}>
          {positivo ? '+' : '−'}
          {movimento.quantidade}
        </p>
        <p className="text-xs text-neutral-500">{formatarDataBR(movimento.dataHora.slice(0, 10))}</p>
      </div>
    </li>
  );
}

type ModalAberto = 'comprar' | 'ajustar' | 'bolsa' | 'venda_manual' | 'agendar' | null;

export function AlunaFichaPage() {
  const { alunaId } = useParams<{ alunaId: string }>();
  const { ficha, carregando, recarregar } = useFichaAluna(alunaId);
  const { usuario } = useSessao();
  const mostrarToast = useToast();

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

  const { aluna, usuario: dadosUsuario, carteira, leitura, pacote } = ficha;

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
            {aluna.bolsista && <Badge tom="sucesso">Bolsista · isenta</Badge>}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {dadosUsuario.email} · {dadosUsuario.cpf}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModalAberto('agendar')} disabled={!carteira}>
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
          {carteira && (
            <Button variante="secundaria" onClick={() => setModalAberto('ajustar')}>
              Ajustar créditos
            </Button>
          )}
        </div>
      </div>

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

        <Secao titulo="Histórico de frequência">
          {ficha.frequencia.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma aula agendada ou realizada até agora.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ficha.frequencia.map((item) => (
                <li key={item.id} className="flex justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm">
                  <span className="text-ink">
                    {item.dataAula ? formatarDataBR(item.dataAula) : '—'}
                    {item.experimental && <span className="ml-1 text-xs text-neutral-500">· experimental</span>}
                  </span>
                  <span className="text-neutral-500">
                    {item.situacao}
                    {item.creditosReservados > 0 && (
                      <span className="ml-1 text-xs">· {formatarCreditos(item.creditosReservados)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

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
                      <span className="font-medium text-ink">
                        {item.bolsa ? 'Isenta' : formatarMoeda(item.valor)}
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

      {modalAberto === 'ajustar' && carteira && (
        <Modal titulo="Ajustar créditos" largura="larga" onFechar={() => setModalAberto(null)}>
          <ModalAjustarCreditos
            carteira={carteira}
            onConfirmar={async ({ tipo, quantidade, motivo }) => {
              await ajustarCarteira({ carteira, tipo, quantidade, motivo, autorId: usuario!.id });
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
    </div>
  );
}
