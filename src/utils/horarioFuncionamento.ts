import type { BlocoHorario, DiaSemana, HorarioFuncionamento } from '../types/domain';

export const DIAS_SEMANA: Array<{ valor: DiaSemana; rotulo: string }> = [
  { valor: 'segunda', rotulo: 'Segunda' },
  { valor: 'terca', rotulo: 'Terça' },
  { valor: 'quarta', rotulo: 'Quarta' },
  { valor: 'quinta', rotulo: 'Quinta' },
  { valor: 'sexta', rotulo: 'Sexta' },
  { valor: 'sabado', rotulo: 'Sábado' },
  { valor: 'domingo', rotulo: 'Domingo' },
];

export function horarioFuncionamentoVazio(): HorarioFuncionamento {
  return {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: [],
    domingo: [],
  };
}

/**
 * Valida os blocos de um dia: início antes do fim em cada bloco e nenhuma
 * sobreposição entre blocos do mesmo dia. Retorna a mensagem de erro ou
 * undefined se válido.
 */
export function validarBlocosDoDia(blocos: BlocoHorario[], rotuloDia: string): string | undefined {
  for (const bloco of blocos) {
    if (!bloco.inicio || !bloco.fim || bloco.inicio >= bloco.fim) {
      return `${rotuloDia}: cada intervalo precisa de um horário de início anterior ao de término.`;
    }
  }
  const ordenados = [...blocos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 0; i < ordenados.length - 1; i++) {
    if (ordenados[i].fim > ordenados[i + 1].inicio) {
      return `${rotuloDia}: os intervalos não podem se sobrepor.`;
    }
  }
  return undefined;
}

export function validarHorarioFuncionamento(horario: HorarioFuncionamento): string | undefined {
  for (const dia of DIAS_SEMANA) {
    const erro = validarBlocosDoDia(horario[dia.valor], dia.rotulo);
    if (erro) return erro;
  }
  const algumDiaAberto = DIAS_SEMANA.some((dia) => horario[dia.valor].length > 0);
  if (!algumDiaAberto) return 'Configure ao menos um intervalo de funcionamento em algum dia.';
  return undefined;
}

/** Usado pela grade (Fase 2) para validar se uma sessão cabe dentro do funcionamento do studio. */
export function estaDentroDoFuncionamento(
  horario: HorarioFuncionamento,
  dia: DiaSemana,
  inicio: string,
  fim: string,
): boolean {
  return horario[dia].some((bloco) => inicio >= bloco.inicio && fim <= bloco.fim);
}
