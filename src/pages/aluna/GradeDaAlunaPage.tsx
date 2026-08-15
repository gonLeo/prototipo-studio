import { useState } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { agendarAula } from '../../hooks/agendamentoDeAulas';
import type { AulaDisponivel } from '../../hooks/agendamentoDeAulas';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ResumoDoPacote } from './ResumoDoPacote';
import { diaSemanaDe, formatarDataBR, formatarDiaMes } from '../../utils/data';
import { DIAS_SEMANA } from '../../utils/horarioFuncionamento';

function CartaoDeAula({
  aula,
  desabilitado,
  onAgendar,
}: {
  aula: AulaDisponivel;
  desabilitado: boolean;
  onAgendar: () => void;
}) {
  const indisponivel = desabilitado || aula.impedimento !== undefined;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {aula.sessao.horarioInicio}–{aula.sessao.horarioFim} · {aula.modalidade?.nome ?? 'Modalidade'}
        </p>
        <p className="text-xs text-neutral-500">
          {aula.nomeProfessora}
          {aula.nomeEspaco ? ` · ${aula.nomeEspaco}` : ''}
        </p>
        {aula.impedimento && <p className="mt-1 text-xs font-medium text-amber-700">{aula.impedimento}</p>}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500">
          {aula.vagas > 0 ? `${aula.vagas} vaga(s)` : 'Sem vagas'}
          <span className="ml-1 text-neutral-400">
            ({aula.ocupacao}/{aula.sessao.capacidade})
          </span>
        </span>
        {aula.jaAgendada ? (
          <Badge tom="sucesso">Agendada</Badge>
        ) : (
          <Button onClick={onAgendar} disabled={indisponivel}>
            Agendar
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Grade disponível para a aluna (RF-AGD-01).
 *
 * O saldo e a validade ficam visíveis de forma persistente no topo, e
 * quando há bloqueio (sem saldo, inadimplente, contrato pausado) a
 * mensagem aparece na própria grade com os botões desabilitados — decisão
 * de UX registrada no escopo, para a aluna não descobrir o impedimento só
 * ao clicar.
 */
export function GradeDaAlunaPage() {
  const { usuario } = useSessao();
  const agenda = useAgendaDaAluna(usuario?.id);
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [agendando, setAgendando] = useState(false);

  if (agenda.carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!agenda.aluna) return <p className="text-sm text-neutral-500">Cadastro de aluna não encontrado.</p>;

  const porData = agenda.disponiveis.reduce<Record<string, AulaDisponivel[]>>((mapa, aula) => {
    (mapa[aula.data] ??= []).push(aula);
    return mapa;
  }, {});

  async function tentarAgendar(aula: AulaDisponivel) {
    if (!agenda.aluna || !usuario) return;

    const ok = await confirmar({
      titulo: 'Confirmar agendamento',
      mensagem: `${aula.modalidade?.nome ?? 'Aula'} em ${formatarDataBR(aula.data)}, às ${aula.sessao.horarioInicio}. Uma aula será descontada do seu saldo. Cancelamentos com ${agenda.antecedenciaHoras}h ou mais de antecedência devolvem o crédito.`,
      textoConfirmar: 'Agendar',
    });
    if (!ok) return;

    setAgendando(true);
    try {
      const resultado = await agendarAula({
        aluna: agenda.aluna,
        sessao: aula.sessao,
        data: aula.data,
        origem: 'portal',
        autorId: usuario.id,
      });
      await agenda.recarregar();
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
      <h1 className="text-2xl font-semibold text-ink">Grade disponível</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Você pode agendar aulas dos próximos {agenda.janelaDias} dias.
      </p>

      <div className="mt-4">
        <ResumoDoPacote contrato={agenda.contrato} pacote={agenda.pacote} aluna={agenda.aluna} />
      </div>

      {agenda.bloqueio && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{agenda.bloqueio.motivo}</p>
          {agenda.bloqueio.detalhe && <p className="mt-1 text-sm text-amber-800">{agenda.bloqueio.detalhe}</p>}
        </div>
      )}

      {Object.keys(porData).length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhuma aula disponível na sua janela de agendamento no momento.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {Object.entries(porData).map(([data, aulas]) => (
            <section key={data} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <header className="flex items-baseline justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
                <h2 className="text-sm font-semibold text-ink">
                  {DIAS_SEMANA.find((d) => d.valor === diaSemanaDe(data))?.rotulo}
                  {data === agenda.hoje && <span className="ml-2 text-xs font-normal text-primary-700">hoje</span>}
                </h2>
                <span className="text-xs text-neutral-500">{formatarDiaMes(data)}</span>
              </header>
              <ul className="divide-y divide-neutral-100">
                {aulas.map((aula) => (
                  <CartaoDeAula
                    key={`${aula.sessao.id}-${aula.data}`}
                    aula={aula}
                    desabilitado={agenda.bloqueio !== undefined || agendando}
                    onAgendar={() => tentarAgendar(aula)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
