import type { Cobranca } from '../types/domain';
import { arredondarMoeda } from './contrato';
import { diferencaEmDias } from './data';

/**
 * Cálculos puros do financeiro (M11): atraso, multa, juros de mora e valor
 * atualizado. Ficam fora do hook porque são as contas que a aluna vê no
 * painel (RF-FIN-07) e que a administração confere antes de receber — e
 * porque a API real vai reproduzir exatamente estas fórmulas.
 */

/** Dias corridos de atraso. Zero enquanto a cobrança não vence. */
export function diasEmAtraso(dataVencimento: string, hoje: string): number {
  return Math.max(0, diferencaEmDias(dataVencimento, hoje));
}

export interface Encargos {
  multa: number;
  juros: number;
  /** Valor original + multa + juros. */
  valorAtualizado: number;
}

/**
 * Multa e juros de mora sobre o valor em aberto (RF-FIN-06).
 *
 * A multa é um percentual único aplicado uma vez, assim que a cobrança
 * atrasa; os juros são ao mês, cobrados **pro rata die** — é como a
 * cobrança de mora funciona na prática, e evita o degrau de um mês inteiro
 * de juros no primeiro dia de atraso.
 */
export function calcularEncargos(params: {
  valorOriginal: number;
  diasDeAtraso: number;
  percentualMulta: number;
  percentualJurosMes: number;
}): Encargos {
  const { valorOriginal, diasDeAtraso, percentualMulta, percentualJurosMes } = params;

  if (diasDeAtraso <= 0) {
    return { multa: 0, juros: 0, valorAtualizado: arredondarMoeda(valorOriginal) };
  }

  const multa = arredondarMoeda(valorOriginal * (percentualMulta / 100));
  const juros = arredondarMoeda(valorOriginal * (percentualJurosMes / 100) * (diasDeAtraso / 30));

  return { multa, juros, valorAtualizado: arredondarMoeda(valorOriginal + multa + juros) };
}

/** Valor a receber de uma cobrança, já com os encargos gravados nela. */
export function valorAtualizadoDaCobranca(cobranca: Cobranca): number {
  return arredondarMoeda(cobranca.valorLiquido + (cobranca.multa ?? 0) + (cobranca.juros ?? 0));
}

/** Cobrança que ainda pode ser recebida: não foi paga nem cancelada. */
export function estaEmAberto(cobranca: Cobranca): boolean {
  return cobranca.situacao !== 'paga' && cobranca.situacao !== 'cancelada';
}
