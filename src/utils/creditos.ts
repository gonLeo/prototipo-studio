import type { Carteira, FormaPagamento, Pacote, SituacaoVenda } from '../types/domain';
import { diferencaEmDias, somarDias } from './data';

/**
 * Cálculos puros da carteira de créditos (M3). Ficam fora dos hooks porque
 * são as contas que a aluna e a administração conferem antes de confirmar
 * — prévia de compra, saldo disponível, projeção de validade — e porque a
 * API real vai reproduzir exatamente estas fórmulas.
 */

export function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarCreditos(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'crédito' : 'créditos'}`;
}

/** RF-CRE-02: totais menos utilizados menos reservados. */
export function creditosDisponiveis(carteira: Carteira): number {
  return Math.max(0, carteira.creditosTotais - carteira.creditosUtilizados - carteira.creditosReservados);
}

/** RF-REE-02: valor unitário do crédito, usado no cálculo do reembolso. */
export function valorUnitarioDoCredito(valor: number, creditos: number): number {
  if (creditos <= 0) return 0;
  return arredondarMoeda(valor / creditos);
}

/**
 * Status exibido da carteira.
 *
 * "Finalizando" não é uma situação persistida: coexiste com o estado ativo
 * (seção 4.3.3 do escopo) e é derivado dos limiares configuráveis, por isso
 * é calculado aqui e não gravado no registro.
 */
export type StatusCarteira = 'ativa' | 'finalizando' | 'consumida' | 'expirada';

export interface LimiaresFinalizando {
  creditos: number;
  dias: number;
}

export const LIMIARES_PADRAO: LimiaresFinalizando = { creditos: 2, dias: 7 };

export type MotivoFinalizando = 'poucos_creditos' | 'vencimento_proximo';

export interface LeituraDaCarteira {
  status: StatusCarteira;
  disponiveis: number;
  reservados: number;
  utilizados: number;
  totais: number;
  /** Negativo quando a validade já passou. */
  diasParaVencer: number;
  motivoFinalizando?: MotivoFinalizando;
  /** A carteira não permite mais agendar: consumida ou expirada. */
  encerrada: boolean;
  /** Situação que o registro deveria ter hoje — base do encerramento automático (RF-CRE-10). */
  situacaoCalculada: Carteira['situacao'];
}

export function lerCarteira(
  carteira: Carteira,
  hoje: string,
  limiares: LimiaresFinalizando = LIMIARES_PADRAO,
): LeituraDaCarteira {
  const disponiveis = creditosDisponiveis(carteira);
  const diasParaVencer = diferencaEmDias(hoje, carteira.dataValidade);

  const base = {
    disponiveis,
    reservados: carteira.creditosReservados,
    utilizados: carteira.creditosUtilizados,
    totais: carteira.creditosTotais,
    diasParaVencer,
  };

  // O encerramento acontece no primeiro dos dois eventos (RN-02). Créditos
  // reservados ainda não foram utilizados: a carteira só se esgota quando
  // não resta nada nem disponível nem reservado.
  const esgotada = carteira.creditosUtilizados >= carteira.creditosTotais;
  if (esgotada) {
    return { ...base, status: 'consumida', encerrada: true, situacaoCalculada: 'consumida' };
  }
  if (diasParaVencer < 0) {
    return { ...base, status: 'expirada', encerrada: true, situacaoCalculada: 'expirada' };
  }

  let motivoFinalizando: MotivoFinalizando | undefined;
  if (disponiveis > 0 && disponiveis <= limiares.creditos) motivoFinalizando = 'poucos_creditos';
  else if (diasParaVencer <= limiares.dias) motivoFinalizando = 'vencimento_proximo';

  return {
    ...base,
    status: motivoFinalizando ? 'finalizando' : 'ativa',
    motivoFinalizando,
    encerrada: false,
    situacaoCalculada: 'ativa',
  };
}

export function rotuloStatusCarteira(status: StatusCarteira): string {
  const rotulos: Record<StatusCarteira, string> = {
    ativa: 'Ativo',
    finalizando: 'Finalizando',
    consumida: 'Consumido',
    expirada: 'Expirado',
  };
  return rotulos[status];
}

export function explicarFinalizando(motivo: MotivoFinalizando, leitura: LeituraDaCarteira): string {
  // O verbo concorda com a quantidade: "Resta apenas 1 crédito", não
  // "Restam apenas 1 crédito" — e o caso de um crédito é justamente o
  // mais comum nesta mensagem.
  if (motivo === 'poucos_creditos') {
    const verbo = leitura.disponiveis === 1 ? 'Resta' : 'Restam';
    return `${verbo} apenas ${formatarCreditos(leitura.disponiveis)}.`;
  }
  const dias = leitura.diasParaVencer;
  return dias === 1 ? 'Falta 1 dia para o vencimento.' : `Faltam ${dias} dias para o vencimento.`;
}

export interface PreviaDeCompra {
  /** RF-CRE-13: a compra é absorvida pela carteira vigente, em vez de criar outra. */
  renovacaoAntecipada: boolean;
  /** Créditos que sobram da carteira vigente e serão somados. */
  creditosAtuais: number;
  creditosDoPacote: number;
  creditosResultantes: number;
  validadeAtual?: string;
  /** Validade que o pacote comprado concede por si só. */
  validadeDoPacote: string;
  validadeResultante: string;
  /**
   * A validade vigente era mais distante que a do pacote e foi mantida
   * (PA-10). A aluna nunca perde prazo por comprar mais créditos.
   */
  validadeMantida: boolean;
  valor: number;
}

/**
 * Prévia da compra (RF-CRE-16), com a regra de validade única.
 *
 * Carteira vigente ativa: os créditos restantes somam e passa a valer uma
 * validade única (RF-CRE-13). Carteira encerrada ou inexistente: nasce uma
 * carteira nova e nada é somado (RF-CRE-14).
 *
 * A validade única adota a **data mais distante** entre a vigente e a do
 * pacote comprado, conforme o PA-10 — não simplesmente a do pacote novo,
 * como a letra do RF-CRE-13 sugeriria. Nos casos normais, em que o pacote
 * novo estende o prazo, o resultado é o mesmo; a diferença aparece quando
 * a aluna compra um pacote curto tendo muito prazo pela frente, e sem esta
 * regra ela perderia validade por comprar créditos.
 */
export function calcularPreviaDeCompra(params: {
  carteiraVigente: Carteira | undefined;
  pacote: Pacote;
  hoje: string;
}): PreviaDeCompra {
  const { carteiraVigente, pacote, hoje } = params;

  const validadeDoPacote = somarDias(hoje, pacote.validadeDias);
  const renovacaoAntecipada = Boolean(carteiraVigente);

  if (!carteiraVigente) {
    return {
      renovacaoAntecipada: false,
      creditosAtuais: 0,
      creditosDoPacote: pacote.creditos,
      creditosResultantes: pacote.creditos,
      validadeDoPacote,
      validadeResultante: validadeDoPacote,
      validadeMantida: false,
      valor: pacote.valor,
    };
  }

  const creditosAtuais = creditosDisponiveis(carteiraVigente);
  const validadeAtual = carteiraVigente.dataValidade;
  const validadeMantida = validadeAtual > validadeDoPacote;

  return {
    renovacaoAntecipada,
    creditosAtuais,
    creditosDoPacote: pacote.creditos,
    creditosResultantes: creditosAtuais + pacote.creditos,
    validadeAtual,
    validadeDoPacote,
    validadeResultante: validadeMantida ? validadeAtual : validadeDoPacote,
    validadeMantida,
    valor: pacote.valor,
  };
}

export function rotuloFormaPagamento(forma: FormaPagamento, parcelas?: number): string {
  switch (forma) {
    case 'cartao_avista':
      return 'Cartão à vista';
    case 'cartao_parcelado':
      return parcelas ? `Cartão em ${parcelas}x` : 'Cartão parcelado';
    case 'pix':
      return 'Pix';
    case 'manual':
      return 'Registro manual';
  }
}

export function rotuloSituacaoVenda(situacao: SituacaoVenda): string {
  const rotulos: Record<SituacaoVenda, string> = {
    pendente: 'Pendente',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
    reembolsada: 'Reembolsada',
  };
  return rotulos[situacao];
}
