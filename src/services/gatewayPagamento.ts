/**
 * Gateway de pagamento **simulado** (RF-FIN-14 / PA-04).
 *
 * O provedor real ainda está em definição no escopo, então o protótipo
 * isola aqui a única coisa que muda quando ele for escolhido: a chamada de
 * cobrança e o link de pagamento. Todo o resto do M11 — retentativa,
 * multa e juros, inadimplência, regularização — já opera sobre o retorno
 * desta função, e continuará valendo com o gateway verdadeiro.
 *
 * A simulação é **determinística de propósito**: aprova sempre, exceto
 * quando a cobrança está marcada para falhar (`simularFalhaGateway`). Um
 * resultado aleatório tornaria impossível demonstrar a retentativa e o
 * bloqueio por inadimplência de forma reproduzível.
 */

export interface RetornoGateway {
  sucesso: boolean;
  /** Texto devolvido pelo provedor, guardado na tentativa (RF-FIN-03). */
  mensagem: string;
  identificador?: string;
}

export async function cobrarNoGateway(params: {
  referencia: string;
  valor: number;
  forcarFalha?: boolean;
}): Promise<RetornoGateway> {
  const { referencia, valor, forcarFalha = false } = params;

  if (forcarFalha) {
    return {
      sucesso: false,
      mensagem: 'Recusada pelo emissor do cartão (simulação do protótipo).',
    };
  }

  return {
    sucesso: true,
    mensagem: `Aprovada — R$ ${valor.toFixed(2)} (simulação do protótipo).`,
    identificador: `sim-${referencia}-${Date.now()}`,
  };
}

/** Link de pagamento reenviado à aluna (RF-FIN-04). */
export function linkDePagamento(cobrancaId: string): string {
  return `https://pagamento.simulado/prototipo/${cobrancaId}`;
}
