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

export function ehDoMes(iso: string, ano: number, mesZeroIndexado: number): boolean {
  const [anoData, mesData] = iso.split('-').map(Number);
  return anoData === ano && mesData - 1 === mesZeroIndexado;
}
