import { useEffect, useState } from 'react';
import type { Aluna, Carteira } from '../../../types/domain';
import { listarAulasDisponiveis, bloqueioParaAgendar } from '../../../hooks/agendamentoDeAulas';
import type { AulaDisponivel } from '../../../hooks/agendamentoDeAulas';
import { Button } from '../../../components/ui/Button';
import { formatarDataBR } from '../../../utils/data';

/**
 * Agendamento em nome da aluna (RF-AGD-09).
 *
 * Usa a mesma listagem e as mesmas validações do portal da aluna — a
 * administração agenda pelos mesmos critérios, o que muda é só a autoria
 * do registro.
 */
export function ModalAgendarPelaAdministracao({
  aluna,
  carteira,
  custoDaAula,
  onAgendar,
  onFechar,
}: {
  aluna: Aluna;
  carteira: Carteira | undefined;
  custoDaAula: number;
  onAgendar: (aula: AulaDisponivel) => Promise<void>;
  onFechar: () => void;
}) {
  const [aulas, setAulas] = useState<AulaDisponivel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendando, setAgendando] = useState<string | undefined>();
  const [erro, setErro] = useState<string>();

  const bloqueio = bloqueioParaAgendar({ aluna, carteira, custoDaAula });

  useEffect(() => {
    let valido = true;
    listarAulasDisponiveis({ aluna, carteira, custoDaAula }).then((lista) => {
      if (!valido) return;
      setAulas(lista);
      setCarregando(false);
    });
    return () => {
      valido = false;
    };
  }, [aluna, carteira, custoDaAula]);

  async function agendar(aula: AulaDisponivel) {
    setErro(undefined);
    setAgendando(`${aula.sessao.id}-${aula.data}`);
    try {
      await onAgendar(aula);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setAgendando(undefined);
    }
  }

  if (bloqueio) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">{bloqueio.motivo}</p>
          {bloqueio.detalhe && <p className="mt-1 text-sm text-amber-800">{bloqueio.detalhe}</p>}
        </div>
        <div className="flex justify-end">
          <Button variante="secundaria" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  const disponiveis = aulas.filter((aula) => aula.impedimento === undefined);
  const creditosDisponiveis = carteira
    ? Math.max(0, carteira.creditosTotais - carteira.creditosUtilizados - carteira.creditosReservados)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Saldo disponível: {creditosDisponiveis} crédito(s). Cada aula reserva {custoDaAula} crédito(s), e o agendamento
        fica registrado como feito pela administração.
      </p>

      {carregando && <p className="text-sm text-neutral-500">Carregando aulas disponíveis…</p>}

      {!carregando && disponiveis.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhuma aula disponível para agendar na janela desta aluna.</p>
      )}

      {!carregando && disponiveis.length > 0 && (
        <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {disponiveis.map((aula) => {
            const chave = `${aula.sessao.id}-${aula.data}`;
            return (
              <li key={chave} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {formatarDataBR(aula.data)} · {aula.sessao.horarioInicio}–{aula.sessao.horarioFim}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {aula.modalidade?.nome ?? 'Modalidade'} · {aula.nomeProfessora} · {aula.vagas} vaga(s) ·{' '}
                    {aula.custoEmCreditos} crédito(s)
                  </p>
                </div>
                <Button onClick={() => agendar(aula)} disabled={agendando !== undefined}>
                  {agendando === chave ? 'Agendando…' : 'Agendar'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end">
        <Button variante="secundaria" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
