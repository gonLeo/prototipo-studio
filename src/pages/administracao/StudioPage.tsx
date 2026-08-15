import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useStudioConfig } from '../../hooks/useStudioConfig';
import { useToast } from '../../hooks/useToast';
import type { BlocoHorario, DiaSemana, HorarioFuncionamento } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TextField } from '../../components/ui/Field';
import { TimePicker } from '../../components/ui/TimePicker';
import { DIAS_SEMANA, horarioFuncionamentoVazio, reordenarBlocos, validarSobreposicao } from '../../utils/horarioFuncionamento';

function LinhaDia({
  dia,
  rotulo,
  blocos,
  onMudar,
  aberto,
  onAlternarAberto,
}: {
  dia: DiaSemana;
  rotulo: string;
  blocos: BlocoHorario[];
  onMudar: (blocos: BlocoHorario[]) => void;
  aberto: boolean;
  onAlternarAberto: () => void;
}) {
  function adicionar() {
    onMudar([...blocos, { inicio: '', fim: '' }]);
  }

  function remover(indice: number) {
    onMudar(blocos.filter((_, i) => i !== indice));
  }

  function atualizarCampo(indice: number, campo: 'inicio' | 'fim', valor: string) {
    const atualizados = blocos.map((bloco, i) => (i === indice ? { ...bloco, [campo]: valor } : bloco));
    onMudar(reordenarBlocos(atualizados));
  }

  const erroSobreposicao = validarSobreposicao(blocos.filter((b) => b.inicio && b.fim), rotulo);

  const fechado = blocos.length === 0;
  const resumo = fechado ? 'Fechado' : blocos.map((b) => `${b.inicio || '--:--'}–${b.fim || '--:--'}`).join(', ');

  return (
    <div>
      <button
        type="button"
        onClick={onAlternarAberto}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span className="w-28 shrink-0 text-sm font-semibold text-ink">{rotulo}</span>
        <span className="flex flex-1 items-center justify-between gap-2">
          {fechado ? <Badge tom="neutro">Fechado</Badge> : <span className="text-xs text-neutral-500">{resumo}</span>}
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {aberto && (
        <div className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="hidden sm:block sm:w-28 sm:shrink-0" aria-hidden="true" />

          <div className="flex flex-1 flex-col gap-2">
            {blocos.map((bloco, indice) => (
              <div key={`${dia}-${indice}`} className="flex flex-wrap items-center gap-2">
                <TimePicker rotulo={`início, ${rotulo}`} value={bloco.inicio} onChange={(v) => atualizarCampo(indice, 'inicio', v)} />
                <span className="text-xs text-neutral-400">até</span>
                <TimePicker rotulo={`fim, ${rotulo}`} value={bloco.fim} onChange={(v) => atualizarCampo(indice, 'fim', v)} />
                <button
                  type="button"
                  onClick={() => remover(indice)}
                  aria-label={`Remover intervalo de ${rotulo}`}
                  className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={adicionar}
              className="self-start text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              + Adicionar intervalo
            </button>

            {erroSobreposicao && <p className="text-xs font-medium text-rose-600">{erroSobreposicao}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function StudioPage() {
  const { studio, carregando, atualizar } = useStudioConfig();
  const mostrarToast = useToast();
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [endereco, setEndereco] = useState('');
  const [horario, setHorario] = useState<HorarioFuncionamento>(horarioFuncionamentoVazio());
  const [salvando, setSalvando] = useState(false);
  const [diasAbertos, setDiasAbertos] = useState<Set<DiaSemana>>(new Set());

  function alternarDiaAberto(dia: DiaSemana) {
    setDiasAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(dia)) {
        proximo.delete(dia);
      } else {
        proximo.add(dia);
      }
      return proximo;
    });
  }

  useEffect(() => {
    if (!studio) return;
    setNome(studio.nome);
    setContato(studio.contato);
    setEndereco(studio.endereco);
    setHorario(studio.horarioFuncionamento);
  }, [studio]);

  function mudarBlocosDoDia(dia: DiaSemana, blocos: BlocoHorario[]) {
    setHorario((atual) => ({ ...atual, [dia]: blocos }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await atualizar({ nome, contato, endereco, horarioFuncionamento: horario });
      mostrarToast('Dados do studio salvos com sucesso.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Studio e horário de funcionamento</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Usados nas comunicações automáticas, no termo de aceite e como base para as datas e horários disponíveis na
        grade. Cada dia pode ter mais de um intervalo (ex.: manhã e noite, com pausa entre eles).
      </p>

      <form onSubmit={enviar} className="mt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
          <TextField label="Nome do studio" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <TextField label="Contato" value={contato} onChange={(e) => setContato(e.target.value)} required />
          <TextField
            label="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            required
            wrapperClassName="sm:col-span-2"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">Horário de funcionamento por dia</p>
          <div className="mt-2 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {DIAS_SEMANA.map((dia) => (
              <LinhaDia
                key={dia.valor}
                dia={dia.valor}
                rotulo={dia.rotulo}
                blocos={horario[dia.valor]}
                onMudar={(blocos) => mudarBlocosDoDia(dia.valor, blocos)}
                aberto={diasAbertos.has(dia.valor)}
                onAlternarAberto={() => alternarDiaAberto(dia.valor)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">Sessões não poderão ser criadas fora destes intervalos.</p>
        </div>

        <div>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
