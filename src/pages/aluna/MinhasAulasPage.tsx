import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { destinoDosCreditos, useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import type { AulaDaAluna, DestinoDosCreditos } from '../../hooks/useAgendaDaAluna';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { cancelarAgendamentoDaAluna } from '../../hooks/agendamentoDeAulas';
import { enviarJustificativa } from '../../hooks/justificativasDeFalta';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { ControlesDePaginacao } from '../../components/ui/Paginacao';
import { usePaginacao } from '../../components/ui/usePaginacao';
import { ResumoDoPacote } from './ResumoDoPacote';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../../utils/data';

function ModalJustificativa({
  aula,
  prazoDias,
  onEnviar,
  onFechar,
}: {
  aula: AulaDaAluna;
  prazoDias: number;
  onEnviar: (texto: string, nomeAnexo?: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [nomeAnexo, setNomeAnexo] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setEnviando(true);
    try {
      await onEnviar(texto, nomeAnexo.trim() || undefined);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Aula de {formatarDataBR(aula.data)} às {aula.horarioInicio} — {aula.nomeModalidade}. A administração analisa e,
        se aprovar, o crédito volta para o seu saldo. O prazo para justificar é de {prazoDias} dias após a aula.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">O que aconteceu?</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          required
          autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      <TextField
        label="Comprovante (opcional)"
        value={nomeAnexo}
        onChange={(e) => setNomeAnexo(e.target.value)}
        dica="Informe o nome do arquivo (atestado, comprovante). O envio de arquivo entra com a API real."
      />

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar justificativa'}
        </Button>
      </div>
    </form>
  );
}

function SituacaoDaAula({ aula }: { aula: AulaDaAluna }) {
  if (aula.canceladaPeloStudio) return <Badge tom="aviso">Cancelada pelo studio</Badge>;
  if (aula.situacao === 'cancelado') return <Badge tom="neutro">Cancelada</Badge>;
  // Depois da chamada finalizada, o que vale é a presença registrada.
  if (aula.presenca === 'presente') return <Badge tom="sucesso">Presente</Badge>;
  if (aula.presenca === 'ausente') return <Badge tom="erro">Falta</Badge>;
  if (aula.situacao === 'realizado') return <Badge tom="sucesso">Realizada</Badge>;
  // Na aula excepcional quem inclui a aluna é a administração (RF-AEX-04):
  // dizer "agendada" atribuiria a ela uma ação que não foi dela.
  if (aula.tipoDeAula === 'excepcional') return <Badge tom="info">Alocada</Badge>;
  return <Badge tom="info">Agendada</Badge>;
}

/** Cor da linha de créditos conforme o efeito no saldo (RF-PRE-07). */
const COR_DO_DESTINO: Record<DestinoDosCreditos, string> = {
  reservados: 'text-neutral-600',
  utilizados: 'text-neutral-600',
  devolvidos: 'text-emerald-700',
  sem_consumo: 'text-neutral-500',
};

function ItemDeAula({
  aula,
  podeCancelar,
  podeJustificar,
  onCancelar,
  onJustificar,
}: {
  aula: AulaDaAluna;
  podeCancelar: boolean;
  podeJustificar: boolean;
  onCancelar: () => void;
  onJustificar: () => void;
}) {
  const creditos = destinoDosCreditos(aula);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {formatarDataBR(aula.data)} · {aula.horarioInicio}–{aula.horarioFim}
        </p>
        <p className="text-xs text-neutral-500">
          {aula.nomeModalidade} · {aula.nomeProfessora}
        </p>
        {/* RF-PRE-07: o histórico diz o que aconteceu com os créditos
            daquela ocorrência, não só quantos ela custou. */}
        <p className={`mt-0.5 text-xs font-medium ${COR_DO_DESTINO[creditos.destino]}`}>{creditos.texto}</p>
        {aula.canceladaPeloStudio && aula.motivoCancelamento && (
          <p className="mt-1 text-xs font-medium text-amber-700">{aula.motivoCancelamento}</p>
        )}
        {aula.justificativa &&
          // O parecer da análise é omitido quando a justificativa fica sem
          // efeito: ele descreve uma decisão que a correção da chamada
          // desfez, e repeti-lo aqui contradiria a própria linha.
          (aula.justificativa.situacao === 'sem_efeito' ? (
            <p className="mt-1 text-xs text-neutral-600">
              Justificativa sem efeito — a chamada foi corrigida e você consta como presente.
            </p>
          ) : (
            <p className="mt-1 text-xs text-neutral-600">
              Justificativa{' '}
              {aula.justificativa.situacao === 'pendente'
                ? 'em análise'
                : aula.justificativa.situacao === 'aprovada'
                  ? 'aprovada'
                  : 'recusada'}
              {aula.justificativa.parecer ? ` — ${aula.justificativa.parecer}` : ''}
            </p>
          ))}
      </div>

      <div className="flex items-center gap-2">
        <SituacaoDaAula aula={aula} />
        {podeCancelar && (
          <Button variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        {podeJustificar && (
          <Button variante="secundaria" onClick={onJustificar}>
            Justificar
          </Button>
        )}
      </div>
    </li>
  );
}

export function MinhasAulasPage() {
  const { usuario } = useSessao();
  const agenda = useAgendaDaAluna(usuario?.id);
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [justificando, setJustificando] = useState<AulaDaAluna | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  // Os hooks de paginação precisam rodar sempre, antes de qualquer saída
  // antecipada — daí virem acima dos returns de carregamento.
  const paginacaoProximas = usePaginacao(agenda.proximas, 5);
  const paginacaoHistorico = usePaginacao(agenda.historico, 5);

  if (agenda.carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!agenda.aluna) return <p className="text-sm text-neutral-500">Cadastro de aluna não encontrado.</p>;

  async function cancelar(aula: AulaDaAluna) {
    if (!usuario) return;
    const perdeCredito = aula.horasAteAAula < agenda.antecedenciaHoras;

    const ok = await confirmar({
      titulo: 'Cancelar aula',
      // RF-CAN-02: o aviso de que a aula será consumida vem **antes** da
      // confirmação, não depois.
      mensagem: perdeCredito
        ? `Faltam menos de ${agenda.antecedenciaHoras}h para esta aula, então ela será consumida do seu saldo. Você poderá enviar uma justificativa para análise. Cancelar mesmo assim?`
        : `A aula de ${formatarDataBR(aula.data)} será cancelada e o crédito volta para o seu saldo.`,
      textoConfirmar: 'Cancelar aula',
      perigo: perdeCredito,
    });
    if (!ok) return;

    try {
      const resultado = await cancelarAgendamentoDaAluna({
        agendamento: aula,
        dataAula: aula.data,
        horaAula: aula.horarioInicio,
        origemCancelamento: 'aluna',
        autorId: usuario.id,
      });
      await agenda.recarregar();
      mostrarToast(
        resultado.creditoDevolvido
          ? `Aula cancelada. Saldo atual: ${resultado.novoSaldo} aula(s).`
          : 'Aula cancelada e consumida do saldo. Você pode enviar uma justificativa em "Minhas aulas".',
        resultado.creditoDevolvido ? 'sucesso' : 'aviso',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  function podeJustificar(aula: AulaDaAluna): boolean {
    // Justifica quem perdeu a aula de fato (RF-JUS-01): cancelou abaixo da
    // antecedência mínima sem receber o crédito de volta, ou faltou — o que
    // só se sabe depois que a chamada é finalizada.
    //
    // A aula excepcional fica de fora: quem aloca e quem cancela é a
    // administração (RF-AEX-04/07), então não há falta da aluna a justificar.
    if (aula.tipoDeAula === 'excepcional') return false;
    if (aula.justificativa || aula.experimental || aula.canceladaPeloStudio) return false;

    // RF-JUS-02: o prazo é contado da data da aula. Fora dele o envio é
    // recusado no domínio — oferecer o botão só para falhar depois seria
    // prometer à aluna uma saída que não existe mais.
    const diasDecorridos = diferencaEmDias(aula.data, hojeISO());
    if (diasDecorridos < 0 || diasDecorridos > agenda.prazoJustificativaDias) return false;

    if (aula.presenca === 'ausente') return true;
    return aula.situacao === 'cancelado' && aula.creditoDevolvido === false;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Minhas aulas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cancelamentos com {agenda.antecedenciaHoras}h ou mais de antecedência devolvem o crédito ao seu saldo.
      </p>

      <div className="mt-4">
        <ResumoDoPacote carteira={agenda.carteira} leitura={agenda.leitura} pacote={agenda.pacote} />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-ink">Próximas aulas</h2>
      {agenda.proximas.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Você não tem aulas agendadas.</p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <ul className="divide-y divide-neutral-100">
            {paginacaoProximas.visiveis.map((aula) => (
              <ItemDeAula
                key={aula.id}
                aula={aula}
                podeCancelar={
                  aula.tipoDeAula === 'grade' && aula.situacao === 'ativo' && !aula.canceladaPeloStudio
                }
                podeJustificar={podeJustificar(aula)}
                onCancelar={() => cancelar(aula)}
                onJustificar={() => setJustificando(aula)}
              />
            ))}
          </ul>
          <ControlesDePaginacao
            pagina={paginacaoProximas.pagina}
            setPagina={paginacaoProximas.setPagina}
            itensPorPagina={paginacaoProximas.itensPorPagina}
            setItensPorPagina={paginacaoProximas.setItensPorPagina}
            totalPaginas={paginacaoProximas.totalPaginas}
            inicio={paginacaoProximas.inicio}
            total={paginacaoProximas.total}
            rotuloItens="aula"
          />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setHistoricoAberto((atual) => !atual)}
          aria-expanded={historicoAberto}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50"
        >
          <span className="text-sm font-semibold text-ink">
            Histórico
            <span className="ml-2 text-xs font-normal text-neutral-500">
              {agenda.historico.length} aula(s)
            </span>
          </span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${historicoAberto ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {historicoAberto &&
          (agenda.historico.length === 0 ? (
            <p className="border-t border-neutral-100 px-4 py-3 text-sm text-neutral-500">Nada por aqui ainda.</p>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                {paginacaoHistorico.visiveis.map((aula) => (
                  <ItemDeAula
                    key={aula.id}
                    aula={aula}
                    podeCancelar={false}
                    podeJustificar={podeJustificar(aula)}
                    onCancelar={() => cancelar(aula)}
                    onJustificar={() => setJustificando(aula)}
                  />
                ))}
              </ul>
              <ControlesDePaginacao
                pagina={paginacaoHistorico.pagina}
                setPagina={paginacaoHistorico.setPagina}
                itensPorPagina={paginacaoHistorico.itensPorPagina}
                setItensPorPagina={paginacaoHistorico.setItensPorPagina}
                totalPaginas={paginacaoHistorico.totalPaginas}
                inicio={paginacaoHistorico.inicio}
                total={paginacaoHistorico.total}
                rotuloItens="aula"
              />
            </>
          ))}
      </div>

      {justificando && (
        <Modal titulo="Justificar falta" onFechar={() => setJustificando(null)}>
          <ModalJustificativa
            aula={justificando}
            prazoDias={agenda.prazoJustificativaDias}
            onEnviar={async (texto, nomeAnexo) => {
              if (!agenda.aluna) return;
              await enviarJustificativa({
                agendamentoId: justificando.id,
                alunaId: agenda.aluna.id,
                dataAula: justificando.data,
                texto,
                nomeAnexo,
              });
              await agenda.recarregar();
              mostrarToast('Justificativa enviada para análise da administração.', 'sucesso');
            }}
            onFechar={() => setJustificando(null)}
          />
        </Modal>
      )}
    </div>
  );
}
