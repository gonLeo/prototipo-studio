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

export function blocoCompleto(bloco: BlocoHorario): boolean {
  return bloco.inicio !== '' && bloco.fim !== '';
}

/**
 * Reordena os intervalos de um dia por horário de início assim que ficam
 * completos (início e fim preenchidos). Intervalos ainda em edição (algum
 * campo vazio) permanecem no fim da lista, na posição em que estão sendo
 * preenchidos, para não "pular" enquanto a usuária ainda está escolhendo o
 * horário.
 */
export function reordenarBlocos(blocos: BlocoHorario[]): BlocoHorario[] {
  const completos = blocos.filter(blocoCompleto).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const incompletos = blocos.filter((b) => !blocoCompleto(b));
  return [...completos, ...incompletos];
}

/** Valida sobreposição apenas entre intervalos já completos — usado para feedback ao vivo enquanto a usuária edita. */
export function validarSobreposicao(blocosCompletos: BlocoHorario[], rotuloDia: string): string | undefined {
  for (const bloco of blocosCompletos) {
    if (bloco.inicio >= bloco.fim) {
      return `${rotuloDia}: o início deve ser anterior ao término.`;
    }
  }
  const ordenados = [...blocosCompletos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 0; i < ordenados.length - 1; i++) {
    if (ordenados[i].fim > ordenados[i + 1].inicio) {
      return `${rotuloDia}: os intervalos não podem se sobrepor.`;
    }
  }
  return undefined;
}

/** Validação completa usada ao salvar: exige que todo intervalo esteja preenchido, além de checar sobreposição. */
export function validarHorarioFuncionamento(horario: HorarioFuncionamento): string | undefined {
  for (const dia of DIAS_SEMANA) {
    const blocos = horario[dia.valor];
    if (blocos.some((b) => !blocoCompleto(b))) {
      return `${dia.rotulo}: preencha início e fim de todos os intervalos, ou remova o intervalo incompleto.`;
    }
    const erro = validarSobreposicao(blocos, dia.rotulo);
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
