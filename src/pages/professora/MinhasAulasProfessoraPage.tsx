import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaProfessora } from '../../hooks/useAgendaDaProfessora';
import type { AulaDaProfessora } from '../../hooks/useAgendaDaProfessora';
import { useToast } from '../../hooks/useToast';
import { solicitarCancelamento } from '../../hooks/solicitacoesDeCancelamento';
import type { SituacaoSolicitacaoCancelamento } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { diaSemanaDe, formatarDataBR } from '../../utils/data';
import { DIAS_SEMANA } from '../../utils/horarioFuncionamento';

const ROTULO_SOLICITACAO: Record<SituacaoSolicitacaoCancelamento, string> = {
  pendente: 'Aguardando aprovação',
  aprovada_substituicao: 'Aprovada com substituta',
  aprovada_cancelamento: 'Aprovada — aula cancelada',
  recusada: 'Recusada',
};

const TOM_SOLICITACAO: Record<SituacaoSolicitacaoCancelamento, 'aviso' | 'sucesso' | 'neutro' | 'erro'> = {
  pendente: 'aviso',
  aprovada_substituicao: 'sucesso',
  aprovada_cancelamento: 'neutro',
  recusada: 'erro',
};

function FormularioSolicitacao({
  aula,
  onEnviar,
  onFechar,
}: {
  aula: AulaDaProfessora;
  onEnviar: (motivo: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setEnviando(true);
    try {
      await onEnviar(motivo);
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
        {aula.nomeModalidade} em {formatarDataBR(aula.data)}, às {aula.sessao.horarioInicio}.
        {aula.ocupacao > 0 && ` ${aula.ocupacao} aluna(s) agendada(s).`}
      </p>
      <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800 ring-1 ring-inset ring-primary-100">
        A aula continua na grade até a administração decidir. Ela pode designar uma substituta — e aí a aula acontece
        normalmente — ou cancelar a aula e devolver o crédito às alunas.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Motivo</span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={4}
          required
          autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar solicitação'}
        </Button>
      </div>
    </form>
  );
}

export function MinhasAulasProfessoraPage() {
  const { usuario } = useSessao();
  const agenda = useAgendaDaProfessora(usuario?.id);
  const mostrarToast = useToast();
  const [solicitando, setSolicitando] = useState<AulaDaProfessora | null>(null);

  if (agenda.carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!agenda.professora) {
    return <p className="text-sm text-neutral-500">Cadastro de professora não encontrado.</p>;
  }

  const porData = agenda.aulas.reduce<Record<string, AulaDaProfessora[]>>((mapa, aula) => {
    (mapa[aula.data] ??= []).push(aula);
    return mapa;
  }, {});

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Minhas aulas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Suas próximas aulas, com a ocupação de cada turma. Para não dar uma aula, solicite o cancelamento — a
        administração decide se designa substituta ou cancela.
      </p>

      {Object.keys(porData).length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">Você não tem aulas nas próximas semanas.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {Object.entries(porData).map(([data, aulas]) => (
            <section key={data} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <header className="flex items-baseline justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
                <h2 className="text-sm font-semibold text-ink">
                  {DIAS_SEMANA.find((d) => d.valor === diaSemanaDe(data))?.rotulo}
                </h2>
                <span className="text-xs text-neutral-500">{formatarDataBR(data)}</span>
              </header>

              <ul className="divide-y divide-neutral-100">
                {aulas.map((aula) => (
                  <li
                    key={`${aula.sessao.id}-${aula.data}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${aula.cancelada ? 'text-neutral-400 line-through' : 'text-ink'}`}>
                        {aula.sessao.horarioInicio}–{aula.sessao.horarioFim} · {aula.nomeModalidade}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {aula.ocupacao}/{aula.sessao.capacidade} aluna(s)
                        {aula.nomeEspaco ? ` · ${aula.nomeEspaco}` : ''}
                      </p>
                      {aula.cancelada && aula.motivoCancelamento && (
                        <p className="mt-1 text-xs font-medium text-amber-700">{aula.motivoCancelamento}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {aula.substituindo && <Badge tom="info">Substituindo</Badge>}
                      {aula.solicitacao ? (
                        <Badge tom={TOM_SOLICITACAO[aula.solicitacao.situacao]}>
                          {ROTULO_SOLICITACAO[aula.solicitacao.situacao]}
                        </Badge>
                      ) : (
                        !aula.cancelada && (
                          <Button variante="secundaria" onClick={() => setSolicitando(aula)}>
                            Solicitar cancelamento
                          </Button>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-ink">Minhas solicitações</h2>
      {agenda.solicitacoes.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Você ainda não solicitou nenhum cancelamento.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {agenda.solicitacoes.map((solicitacao) => (
            <li key={solicitacao.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{formatarDataBR(solicitacao.data)}</p>
                <p className="text-xs text-neutral-500">{solicitacao.motivo}</p>
              </div>
              <Badge tom={TOM_SOLICITACAO[solicitacao.situacao]}>{ROTULO_SOLICITACAO[solicitacao.situacao]}</Badge>
            </li>
          ))}
        </ul>
      )}

      {solicitando && (
        <Modal titulo="Solicitar cancelamento de aula" onFechar={() => setSolicitando(null)}>
          <FormularioSolicitacao
            aula={solicitando}
            onEnviar={async (motivo) => {
              if (!agenda.professora) return;
              await solicitarCancelamento({
                sessaoId: solicitando.sessao.id,
                data: solicitando.data,
                professoraSolicitanteId: agenda.professora.id,
                motivo,
              });
              await agenda.recarregar();
              mostrarToast('Solicitação enviada. A aula segue na grade até a administração decidir.', 'sucesso');
            }}
            onFechar={() => setSolicitando(null)}
          />
        </Modal>
      )}
    </div>
  );
}
