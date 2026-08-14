import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useStudioConfig } from '../../hooks/useStudioConfig';
import type { DiaSemana, HorarioFuncionamento } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { DIAS_SEMANA, horarioFuncionamentoVazio } from '../../utils/horarioFuncionamento';

function LinhaDia({
  dia,
  rotulo,
  blocos,
  onMudar,
}: {
  dia: DiaSemana;
  rotulo: string;
  blocos: { inicio: string; fim: string }[];
  onMudar: (blocos: { inicio: string; fim: string }[]) => void;
}) {
  function adicionar() {
    onMudar([...blocos, { inicio: '08:00', fim: '12:00' }]);
  }

  function remover(indice: number) {
    onMudar(blocos.filter((_, i) => i !== indice));
  }

  function atualizarCampo(indice: number, campo: 'inicio' | 'fim', valor: string) {
    onMudar(blocos.map((bloco, i) => (i === indice ? { ...bloco, [campo]: valor } : bloco)));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">{rotulo}</p>
        <button
          type="button"
          onClick={adicionar}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          + Adicionar intervalo
        </button>
      </div>

      {blocos.length === 0 && <p className="mt-2 text-xs text-slate-400">Fechado</p>}

      <div className="mt-2 flex flex-col gap-2">
        {blocos.map((bloco, indice) => (
          <div key={`${dia}-${indice}`} className="flex items-center gap-2">
            <input
              type="time"
              value={bloco.inicio}
              onChange={(e) => atualizarCampo(indice, 'inicio', e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="time"
              value={bloco.fim}
              onChange={(e) => atualizarCampo(indice, 'fim', e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => remover(indice)}
              aria-label={`Remover intervalo de ${rotulo}`}
              className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudioPage() {
  const { studio, carregando, atualizar } = useStudioConfig();
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [endereco, setEndereco] = useState('');
  const [horario, setHorario] = useState<HorarioFuncionamento>(horarioFuncionamentoVazio());
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!studio) return;
    setNome(studio.nome);
    setContato(studio.contato);
    setEndereco(studio.endereco);
    setHorario(studio.horarioFuncionamento);
  }, [studio]);

  function mudarBlocosDoDia(dia: DiaSemana, blocos: { inicio: string; fim: string }[]) {
    setHorario((atual) => ({ ...atual, [dia]: blocos }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvo(false);
    setSalvando(true);
    try {
      await atualizar({ nome, contato, endereco, horarioFuncionamento: horario });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-slate-500">Carregando…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900">Studio e horário de funcionamento</h1>
      <p className="mt-1 text-sm text-slate-500">
        Usados nas comunicações automáticas, no termo de aceite e como base para as datas e horários disponíveis na
        grade. Cada dia pode ter mais de um intervalo (ex.: manhã e noite, com pausa entre eles).
      </p>

      <form onSubmit={enviar} className="mt-5 flex flex-col gap-4">
        <TextField label="Nome do studio" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <TextField label="Contato" value={contato} onChange={(e) => setContato(e.target.value)} required />
        <TextField label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} required />

        <div>
          <p className="text-sm font-medium text-slate-700">Horário de funcionamento por dia</p>
          <div className="mt-2 flex flex-col gap-2">
            {DIAS_SEMANA.map((dia) => (
              <LinhaDia
                key={dia.valor}
                dia={dia.valor}
                rotulo={dia.rotulo}
                blocos={horario[dia.valor]}
                onMudar={(blocos) => mudarBlocosDoDia(dia.valor, blocos)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Sessões não poderão ser criadas fora destes intervalos.</p>
        </div>

        {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
        {salvo && <p className="text-sm font-medium text-emerald-600">Salvo com sucesso.</p>}

        <div>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
