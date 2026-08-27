/**
 * Gateway de pagamento **simulado** (M12).
 *
 * O provedor real é responsabilidade da cliente (capítulo 12 do escopo),
 * então o protótipo isola aqui a única coisa que muda quando ele for
 * contratado: a cobrança do valor único da compra e o estorno do
 * reembolso. Todo o resto do M12 — venda pendente até a confirmação,
 * ativação da carteira, cancelamento e histórico — já opera sobre o
 * retorno destas funções, e continuará valendo com o gateway verdadeiro.
 *
 * A simulação é **determinística de propósito**: aprova sempre, exceto
 * quando a venda está marcada para falhar (`simularFalhaGateway`). Um
 * resultado aleatório tornaria impossível demonstrar a venda pendente e o
 * cancelamento de forma reproduzível.
 */

import type { FormaPagamento } from '../types/domain';

export interface RetornoGateway {
  sucesso: boolean;
  /** Texto devolvido pelo provedor, guardado na venda. */
  mensagem: string;
  identificador?: string;
}

/**
 * RF-VEN-02/03: pagamento único no ato da compra. No cartão parcelado o
 * valor total é debitado do limite na hora — para o sistema, a venda é
 * confirmada de uma vez, e o parcelamento é assunto entre a aluna e a
 * operadora (PA-02).
 */
export async function cobrarNoGateway(params: {
  referencia: string;
  valor: number;
  formaPagamento: FormaPagamento;
  parcelas?: number;
  forcarFalha?: boolean;
}): Promise<RetornoGateway> {
  const { referencia, valor, formaPagamento, parcelas, forcarFalha = false } = params;

  if (forcarFalha) {
    return {
      sucesso: false,
      mensagem:
        formaPagamento === 'pix'
          ? 'Pix não compensado dentro do prazo (simulação do protótipo).'
          : 'Recusada pelo emissor do cartão (simulação do protótipo).',
    };
  }

  const detalheParcelas = formaPagamento === 'cartao_parcelado' && parcelas ? ` em ${parcelas}x` : '';

  return {
    sucesso: true,
    mensagem: `Aprovada — R$ ${valor.toFixed(2)}${detalheParcelas} (simulação do protótipo).`,
    identificador: `sim-${referencia}-${Date.now()}`,
  };
}

/**
 * RF-REE-04: o reembolso é processado na mesma forma de pagamento da
 * compra, com registro da transação de estorno.
 */
export async function estornarNoGateway(params: {
  identificadorOriginal?: string;
  valor: number;
}): Promise<RetornoGateway> {
  const { identificadorOriginal, valor } = params;

  return {
    sucesso: true,
    mensagem: `Estorno de R$ ${valor.toFixed(2)} enviado ao emissor (simulação do protótipo).`,
    identificador: `est-${identificadorOriginal ?? 'sem-origem'}-${Date.now()}`,
  };
}

/** Link de pagamento reenviado à aluna quando a venda fica pendente. */
export function linkDePagamento(vendaId: string): string {
  return `https://pagamento.simulado/prototipo/${vendaId}`;
}
