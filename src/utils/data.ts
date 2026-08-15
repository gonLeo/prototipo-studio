import type { DiaSemana } from '../types/domain';

/**
 * Utilitários de data do projeto. Datas de negócio trafegam sempre como
 * string ISO `YYYY-MM-DD` (nunca objeto `Date`), porque é assim que a API
 * real vai devolvê-las e porque comparação/ordenação de string ISO já é
 * cronológica.
 *
 * Toda conta interna usa UTC de propósito: `new Date('2026-08-14')` é
 * meia-noite UTC, e em fuso negativo (Brasil) `getDay()`/`getDate()`
 * devolveriam o dia anterior. Usando `Date.UTC` + `getUTC*` a data nunca
 * "anda" um dia por causa de fuso.
 */

const DIAS_SEMANA_POR_INDICE: DiaSemana[] = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
];

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function paraUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Data de hoje no fuso local da usuária, como `YYYY-MM-DD`. */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function diaSemanaDe(iso: string): DiaSemana {
  return DIAS_SEMANA_POR_INDICE[paraUTC(iso).getUTCDay()];
}

export function somarDias(iso: string, dias: number): string {
  const data = paraUTC(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraISO(data);
}

/**
 * Soma meses mantendo o dia do mês (RF-PAC-05: o vencimento é sempre o dia
 * de entrada da aluna). Quando o dia não existe no mês de destino — 31 de
 * janeiro + 1 mês —, cai no último dia daquele mês em vez de virar para o
 * mês seguinte.
 */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  return paraISO(new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(dia, ultimoDia))));
}

/** Dias inteiros de `inicioISO` até `fimISO` (negativo se `fim` for anterior). */
export function diferencaEmDias(inicioISO: string, fimISO: string): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((paraUTC(fimISO).getTime() - paraUTC(inicioISO).getTime()) / MS_POR_DIA);
}

/** Segunda-feira da semana em que a data cai. */
export function inicioDaSemana(iso: string): string {
  const diaDaSemana = paraUTC(iso).getUTCDay();
  const deslocamento = (diaDaSemana + 6) % 7;
  return somarDias(iso, -deslocamento);
}

/** As 7 datas da semana que começa em `inicioISO`. */
export function datasDaSemana(inicioISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicioISO, i));
}

/**
 * Momento da aula no relógio de quem está usando o sistema.
 *
 * Aqui o fuso **local** é proposital, ao contrário do resto do arquivo: a
 * antecedência de cancelamento é contada contra o relógio da aluna, não
 * contra UTC.
 */
export function dataHoraLocal(dataISO: string, horaHHMM: string): Date {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const [hora, minuto] = horaHHMM.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

/** Horas até o início da aula. Negativo quando ela já começou. */
export function horasAteAula(dataISO: string, horaHHMM: string, agora = new Date()): number {
  return (dataHoraLocal(dataISO, horaHHMM).getTime() - agora.getTime()) / 3_600_000;
}

/** `14/08/2026` */
export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** `14/08` */
export function formatarDiaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function nomeDoMes(mesZeroIndexado: number): string {
  return NOMES_MES[mesZeroIndexado];
}

/** Primeiro dia do mês, como `YYYY-MM-01`. */
export function primeiroDiaDoMes(ano: number, mesZeroIndexado: number): string {
  return paraISO(new Date(Date.UTC(ano, mesZeroIndexado, 1)));
}

export function quantidadeDeDiasNoMes(ano: number, mesZeroIndexado: number): number {
  return new Date(Date.UTC(ano, mesZeroIndexado + 1, 0)).getUTCDate();
}

/**
 * Grade de um mês para calendário: começa na segunda da semana do dia 1 e
 * termina no domingo da semana do último dia, para preencher linhas
 * completas de 7 colunas.
 */
export function gradeDoMes(ano: number, mesZeroIndexado: number): string[] {
  const primeiro = primeiroDiaDoMes(ano, mesZeroIndexado);
  const ultimo = paraISO(new Date(Date.UTC(ano, mesZeroIndexado, quantidadeDeDiasNoMes(ano, mesZeroIndexado))));
  const inicio = inicioDaSemana(primeiro);
  const fim = somarDias(inicioDaSemana(ultimo), 6);

  const datas: string[] = [];
  for (let data = inicio; data <= fim; data = somarDias(data, 1)) {
    datas.push(data);
  }
  return datas;
}

/** Último dia do mês, como `YYYY-MM-DD`. */
export function ultimoDiaDoMes(ano: number, mesZeroIndexado: number): string {
  return paraISO(new Date(Date.UTC(ano, mesZeroIndexado, quantidadeDeDiasNoMes(ano, mesZeroIndexado))));
}

/**
 * Quinto dia útil do mês — data em que as professoras são pagas, referente
 * ao período do mês anterior (definido na reunião, seção 5.10 do escopo).
 *
 * Considera apenas fins de semana: feriados nacionais não entram, porque o
 * sistema não tem calendário de feriados bancários. O calendário de
 * exceções do studio (M6) é outra coisa — fecha o studio, não o banco.
 */
export function quintoDiaUtil(ano: number, mesZeroIndexado: number): string {
  let uteisEncontrados = 0;
  const totalDeDias = quantidadeDeDiasNoMes(ano, mesZeroIndexado);

  for (let dia = 1; dia <= totalDeDias; dia++) {
    const data = new Date(Date.UTC(ano, mesZeroIndexado, dia));
    const diaDaSemana = data.getUTCDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) {
      uteisEncontrados++;
      if (uteisEncontrados === 5) return paraISO(data);
    }
  }
  return ultimoDiaDoMes(ano, mesZeroIndexado);
}

export function ehDoMes(iso: string, ano: number, mesZeroIndexado: number): boolean {
  const [anoData, mesData] = iso.split('-').map(Number);
  return anoData === ano && mesData - 1 === mesZeroIndexado;
}
