import type { Contrato, Pacote, TipoContrato } from '../types/domain';
import { diferencaEmDias, somarDias, somarMeses } from './data';

/**
 * Cálculos puros de contrato (M3). Ficam fora dos hooks porque são as
 * contas que a administração precisa conferir antes de confirmar — prévia
 * de alteração de plano, valor com bolsa, projeção de validade — e porque
 * a API real vai reproduzir exatamente estas fórmulas.
 *
 * Valores monetários são arredondados em centavos só na saída; as contas
 * intermediárias mantêm a precisão para o total não escorregar.
 */

/** Contrato semestral vale sempre 6 meses, independente da duração cadastrada. */
export const MESES_CONTRATO_SEMESTRAL = 6;

export function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Valor efetivamente cobrado depois do desconto de bolsa (RF-BOL-02/03/04). */
export function valorComBolsa(valorCheio: number, percentualBolsa: number): number {
  return arredondarMoeda(valorCheio * (1 - percentualBolsa / 100));
}

/** Bolsa integral não gera cobrança nenhuma (RF-BOL-03). */
export function ehIsencaoTotal(percentualBolsa: number): boolean {
  return percentualBolsa >= 100;
}

/** Duração do contrato em meses conforme o tipo do pacote (RF-PAC-04). */
export function mesesDeVigencia(pacote: Pacote): number {
  return pacote.tipo === 'semestral' ? MESES_CONTRATO_SEMESTRAL : pacote.duracaoMeses;
}

/** Rótulo da duração do pacote, usado em telas e resumos. */
export function rotuloTipoContrato(tipo: TipoContrato): string {
  return tipo === 'semestral' ? 'Semestral' : 'Mensal';
}

/**
 * Datas de um contrato a partir da entrada da aluna (RF-PAC-05): o ciclo
 * vence sempre no mesmo dia do mês, e o contrato termina ao fim da
 * vigência contratada.
 */
export function calcularDatasDoContrato(
  dataInicio: string,
  pacote: Pacote,
): { dataVencimentoCiclo: string; dataTerminoContrato: string } {
  return {
    dataVencimentoCiclo: somarMeses(dataInicio, 1),
    dataTerminoContrato: somarMeses(dataInicio, mesesDeVigencia(pacote)),
  };
}

/** Início do ciclo corrente: um mês antes do vencimento vigente. */
export function inicioDoCicloCorrente(contrato: Contrato): string {
  return somarMeses(contrato.dataVencimentoCiclo, -1);
}

export interface PreviaAlteracaoPlano {
  diasDoCiclo: number;
  diasDecorridos: number;
  diasRestantes: number;
  /** Quanto do plano atual já foi consumido, em dinheiro. */
  valorConsumido: number;
  /** Sobra do que já foi pago no ciclo, aplicada como crédito. */
  creditoRestante: number;
  /** Custo do novo plano pelos dias que restam do ciclo. */
  custoNovoProporcional: number;
  /** Positivo: a aluna paga a diferença. Negativo: vira crédito na próxima cobrança. */
  diferenca: number;
  saldoAulasResultante: number;
  /** RF-PLN-05: a vigência original não muda. */
  dataTerminoContrato: string;
}

/**
 * Prévia da alteração de plano (RF-PLN-02/04/06).
 *
 * A conta é proporcional aos dias do ciclo corrente: apura o que já foi
 * consumido do plano atual, transforma a sobra em crédito e cobra (ou
 * devolve) a diferença para o novo plano no tempo que resta. O saldo de
 * aulas parte da quantidade do novo plano e desconta o que já foi
 * realizado no ciclo — sem prorrogar a data de término (RF-PLN-05).
 */
export function calcularPreviaAlteracaoPlano(params: {
  contrato: Contrato;
  pacoteAtual: Pacote;
  pacoteNovo: Pacote;
  aulasRealizadasNoCiclo: number;
  percentualBolsa: number;
  hoje: string;
}): PreviaAlteracaoPlano {
  const { contrato, pacoteAtual, pacoteNovo, aulasRealizadasNoCiclo, percentualBolsa, hoje } = params;

  const inicioCiclo = inicioDoCicloCorrente(contrato);
  const diasDoCiclo = Math.max(1, diferencaEmDias(inicioCiclo, contrato.dataVencimentoCiclo));
  const diasDecorridos = Math.min(Math.max(0, diferencaEmDias(inicioCiclo, hoje)), diasDoCiclo);
  const diasRestantes = diasDoCiclo - diasDecorridos;

  const valorAtual = valorComBolsa(pacoteAtual.valorMensal, percentualBolsa);
  const valorNovo = valorComBolsa(pacoteNovo.valorMensal, percentualBolsa);

  const valorConsumido = (valorAtual * diasDecorridos) / diasDoCiclo;
  const creditoRestante = valorAtual - valorConsumido;
  const custoNovoProporcional = (valorNovo * diasRestantes) / diasDoCiclo;

  return {
    diasDoCiclo,
    diasDecorridos,
    diasRestantes,
    valorConsumido: arredondarMoeda(valorConsumido),
    creditoRestante: arredondarMoeda(creditoRestante),
    custoNovoProporcional: arredondarMoeda(custoNovoProporcional),
    diferenca: arredondarMoeda(custoNovoProporcional - creditoRestante),
    // RF-PLN-04: parte das aulas do novo plano e desconta as já realizadas.
    saldoAulasResultante: Math.max(0, pacoteNovo.aulasPorCiclo - aulasRealizadasNoCiclo),
    dataTerminoContrato: contrato.dataTerminoContrato,
  };
}

/**
 * Saldo do próximo ciclo na renovação (RF-PAC-08): as aulas não realizadas
 * são somadas às do novo ciclo.
 */
export function saldoAposRenovacao(saldoAtual: number, pacote: Pacote): number {
  return Math.max(0, saldoAtual) + pacote.aulasPorCiclo;
}

export interface PreviaPausa {
  diasDePausa: number;
  saldoCongelado: number;
  validadeAtual: string;
  validadeProjetada: string;
}

/**
 * Prévia de trancamento ou suspensão (RF-CTR-06). Nos dois casos a
 * validade do ciclo é empurrada pelo tempo de pausa — o que muda entre
 * eles é a cobrança (trancamento pausa, suspensão mantém), tratada no
 * hook, não aqui.
 */
export function calcularPreviaPausa(params: {
  contrato: Contrato;
  dataInicio: string;
  dataTerminoPrevista: string;
}): PreviaPausa {
  const { contrato, dataInicio, dataTerminoPrevista } = params;
  const diasDePausa = Math.max(0, diferencaEmDias(dataInicio, dataTerminoPrevista));

  return {
    diasDePausa,
    saldoCongelado: contrato.saldoAulas,
    validadeAtual: contrato.dataVencimentoCiclo,
    validadeProjetada: somarDias(contrato.dataVencimentoCiclo, diasDePausa),
  };
}

/** Limite de dias de pausa do pacote (RF-CTR-05, parametrizável por pacote). */
export function excedeLimiteDePausa(pacote: Pacote, diasDePausa: number): boolean {
  return pacote.limiteDiasPausa > 0 && diasDePausa > pacote.limiteDiasPausa;
}
