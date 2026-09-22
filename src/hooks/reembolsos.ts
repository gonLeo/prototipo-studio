import {
  agendamentoRepositorio,
  alunaRepositorio,
  carteiraRepositorio,
  movimentoCreditoRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  reembolsoRepositorio,
  registroAuditoriaRepositorio,
  usuarioRepositorio,
  vendaRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import { estornarNoGateway } from '../services/gatewayPagamento';
import type { Carteira, Reembolso, TipoReembolso, Venda } from '../types/domain';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../utils/data';
import { arredondarMoeda, formatarCreditos, formatarMoeda, valorUnitarioDoCredito } from '../utils/creditos';
import { RegraNegocioError } from './useModalidades';
import { cancelarAgendamentosDaAlunaNoPeriodo } from './cancelamentoDeAulas';

/**
 * Reembolso (M12, seção 4.12.2).
 *
 * Recurso de mediação **exclusivo da administração** (RF-REE-09): a
 * solicitação chega pelos canais de atendimento do studio, e o sistema
 * serve para verificar as condições, calcular, executar pelo gateway e
 * registrar. Não existe, na Fase 1, jornada de solicitação pela aluna.
 *
 * Camada de domínio, não um hook React.
 */

async function parametroNumerico(chave: string, padrao: number): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const valor = Number(parametros.find((p) => p.chave === chave)?.valor);
  return Number.isFinite(valor) ? valor : padrao;
}

export interface RegrasDeReembolso {
  prazoArrependimentoDias: number;
  percentualMaximoUtilizado: number;
  /** Texto exibido à aluna sobre o prazo de processamento (PA-03). */
  textoPrazo: string;
}

export async function regrasDeReembolso(): Promise<RegrasDeReembolso> {
  const parametros = await parametroRepositorio.listar();
  const texto = parametros.find((p) => p.chave === 'texto_prazo_reembolso')?.valor;

  const [prazoArrependimentoDias, percentualMaximoUtilizado] = await Promise.all([
    parametroNumerico('prazo_arrependimento_dias', 7),
    parametroNumerico('percentual_maximo_creditos_reembolso', 50),
  ]);

  return {
    prazoArrependimentoDias,
    percentualMaximoUtilizado,
    textoPrazo: typeof texto === 'string' ? texto : '',
  };
}

/**
 * Créditos consumidos desde a compra, base do desconto (RF-REE-02).
 *
 * Conta os movimentos de consumo e expiração posteriores à venda, menos os
 * estornos do mesmo período, e limita ao que a compra concedeu — o PA-09
 * manda reembolsar **apenas a compra**, então o desconto não pode passar
 * dos créditos que ela trouxe.
 */
async function creditosUtilizadosDesdeACompra(venda: Venda): Promise<number> {
  if (!venda.carteiraId) return 0;

  const movimentos = await movimentoCreditoRepositorio.listar();
  const desdeACompra = movimentos.filter(
    (m) => m.carteiraId === venda.carteiraId && m.dataHora.slice(0, 10) >= venda.data,
  );

  const consumidos = desdeACompra
    .filter((m) => m.tipo === 'consumo' || m.tipo === 'expiracao')
    .reduce((soma, m) => soma + m.quantidade, 0);
  const estornados = desdeACompra
    .filter((m) => m.tipo === 'estorno')
    .reduce((soma, m) => soma + m.quantidade, 0);

  return Math.min(venda.creditos, Math.max(0, consumidos - estornados));
}

export interface PreviaDeReembolso {
  elegivel: boolean;
  /** Por que não é possível reembolsar, quando não é. */
  impedimento?: string;
  diasDesdeACompra: number;
  creditosComprados: number;
  creditosUtilizados: number;
  percentualUtilizado: number;
  /** Prazo vigente do arrependimento, para a prévia dizer contra o que os dias foram comparados. */
  prazoArrependimentoDias: number;
  valorPago: number;
  valorUnitario: number;
  valorDescontado: number;
  valorReembolsado: number;
  /** A carteira será encerrada, ou só perde os créditos desta compra (PA-09). */
  encerraCarteira: boolean;
  /** Validade restaurada quando a compra foi uma renovação antecipada. */
  validadeRestaurada?: string;
  aulasFuturas: number;
  textoPrazo: string;
}

/**
 * Prévia do reembolso (RF-REE-03), exibida antes de confirmar: valor pago,
 * créditos utilizados, valor descontado e valor líquido a reembolsar.
 *
 * Verifica também as condições do RF-REE-01 e RF-REE-06 — prazo de
 * arrependimento, percentual máximo de créditos utilizados e situação da
 * carteira — e devolve o impedimento quando alguma falha.
 */
export async function calcularPreviaDeReembolso(params: {
  venda: Venda;
  tipo: TipoReembolso;
  hoje?: string;
}): Promise<PreviaDeReembolso> {
  const { venda, tipo, hoje = hojeISO() } = params;

  const regras = await regrasDeReembolso();
  const carteiras = await carteiraRepositorio.listar();
  const carteira = carteiras.find((c) => c.id === venda.carteiraId);

  const creditosUtilizados = await creditosUtilizadosDesdeACompra(venda);
  const percentualUtilizado =
    venda.creditos > 0 ? Math.round((creditosUtilizados / venda.creditos) * 1000) / 10 : 0;

  const valorUnitario = valorUnitarioDoCredito(venda.valor, venda.creditos);
  const valorDescontado = arredondarMoeda(valorUnitario * creditosUtilizados);
  const valorReembolsado = Math.max(0, arredondarMoeda(venda.valor - valorDescontado));
  const diasDesdeACompra = diferencaEmDias(venda.data, hoje);

  const [agendamentos, ocorrencias] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);
  const aulasFuturas = agendamentos.filter((a) => {
    if (a.alunaId !== venda.alunaId || a.situacao !== 'ativo') return false;
    const data = ocorrencias.find((o) => o.id === a.ocorrenciaSessaoId)?.data;
    return data !== undefined && data >= hoje;
  }).length;

  // PA-09: quando a compra foi absorvida por uma carteira que já existia,
  // o reembolso desfaz só esta compra e a validade anterior é restaurada.
  const encerraCarteira = venda.validadeAnteriorDaCarteira === undefined;

  const base = {
    diasDesdeACompra,
    creditosComprados: venda.creditos,
    creditosUtilizados,
    percentualUtilizado,
    prazoArrependimentoDias: regras.prazoArrependimentoDias,
    valorPago: venda.valor,
    valorUnitario,
    valorDescontado,
    valorReembolsado,
    encerraCarteira,
    validadeRestaurada: venda.validadeAnteriorDaCarteira,
    aulasFuturas,
    textoPrazo: regras.textoPrazo,
  };

  const recusar = (impedimento: string): PreviaDeReembolso => ({ ...base, elegivel: false, impedimento });

  if (venda.tipo !== 'pacote') {
    return recusar('Só é possível reembolsar a compra de um pacote.');
  }
  if (venda.situacao === 'reembolsada') {
    return recusar('Esta compra já foi reembolsada.');
  }
  if (venda.situacao !== 'confirmada') {
    return recusar('Só é possível reembolsar uma venda confirmada.');
  }
  if (venda.bolsa) {
    return recusar('Concessão de bolsa não gera cobrança e, portanto, não gera reembolso.');
  }

  // RF-REE-06: não há reembolso de carteira consumida ou expirada.
  if (carteira && carteira.situacao !== 'ativa') {
    return recusar('A carteira desta compra já foi encerrada — não há reembolso de pacote consumido ou expirado.');
  }

  if (tipo === 'arrependimento') {
    if (diasDesdeACompra > regras.prazoArrependimentoDias) {
      return recusar(
        `O prazo de arrependimento é de ${regras.prazoArrependimentoDias} dias corridos e a compra foi há ${diasDesdeACompra}. Avalie o reembolso por motivo legal, mediante documentação.`,
      );
    }
    if (percentualUtilizado > regras.percentualMaximoUtilizado) {
      // RF-REE-07: passar do limite não fecha a porta — muda o caminho. A
      // recusa diz a saída, como já fazia a recusa por prazo.
      return recusar(
        `A aluna já utilizou ${percentualUtilizado}% dos créditos comprados, acima do limite de ${regras.percentualMaximoUtilizado}%. Avalie o reembolso por motivo legal, mediante documentação.`,
      );
    }
  }

  return { ...base, elegivel: true };
}

/**
 * Executa o reembolso (RF-REE-04/05/08).
 *
 * O estorno é processado na mesma forma de pagamento da compra. Em
 * seguida, os créditos desta compra saem da carteira: se a compra foi a
 * que originou a carteira, ela é encerrada e as aulas futuras canceladas;
 * se foi uma renovação antecipada, apenas os créditos comprados são
 * retirados e a validade anterior é restaurada (PA-09).
 */
export async function executarReembolso(params: {
  venda: Venda;
  tipo: TipoReembolso;
  motivo: string;
  documentacao?: string;
  /** Valor a devolver no reembolso por motivo legal, que admite parcial (RF-REE-07). */
  valorPersonalizado?: number;
  autorId: string;
  hoje?: string;
}): Promise<Reembolso> {
  const { venda, tipo, motivo, documentacao, valorPersonalizado, autorId, hoje = hojeISO() } = params;

  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do reembolso.');
  if (tipo === 'legal' && !documentacao?.trim()) {
    throw new RegraNegocioError('O reembolso por motivo legal exige a documentação datada apresentada pela aluna.');
  }

  const previa = await calcularPreviaDeReembolso({ venda, tipo, hoje });
  if (!previa.elegivel) throw new RegraNegocioError(previa.impedimento ?? 'Reembolso não permitido.');

  const valorReembolsado =
    valorPersonalizado !== undefined ? arredondarMoeda(valorPersonalizado) : previa.valorReembolsado;

  if (valorReembolsado < 0 || valorReembolsado > venda.valor) {
    throw new RegraNegocioError(`O valor reembolsado deve ficar entre R$ 0,00 e ${formatarMoeda(venda.valor)}.`);
  }

  const estorno = await estornarNoGateway({
    identificadorOriginal: venda.identificadorGateway,
    valor: valorReembolsado,
  });

  const carteiras = await carteiraRepositorio.listar();
  const carteira = carteiras.find((c) => c.id === venda.carteiraId);

  let agendamentosCancelados = 0;

  if (carteira) {
    agendamentosCancelados = await aplicarEfeitoNaCarteira({
      carteira,
      venda,
      encerraCarteira: previa.encerraCarteira,
      autorId,
      hoje,
    });
  }

  await vendaRepositorio.atualizar(venda.id, { situacao: 'reembolsada' });

  const reembolso = await reembolsoRepositorio.criar({
    vendaId: venda.id,
    alunaId: venda.alunaId,
    tipo,
    data: hoje,
    creditosComprados: previa.creditosComprados,
    creditosUtilizados: previa.creditosUtilizados,
    valorPago: venda.valor,
    valorDescontado: arredondarMoeda(venda.valor - valorReembolsado),
    valorReembolsado,
    documentacao: documentacao?.trim() || undefined,
    motivo: motivo.trim(),
    autorId,
    identificadorEstorno: estorno.identificador,
    agendamentosCancelados,
    carteiraEncerrada: previa.encerraCarteira,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Reembolso',
    operacao: `reembolso_${tipo}`,
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: {
      vendaId: venda.id,
      alunaId: venda.alunaId,
      valorPago: venda.valor,
      creditosUtilizados: previa.creditosUtilizados,
      valorReembolsado,
      carteiraEncerrada: previa.encerraCarteira,
      motivo: motivo.trim(),
      documentacao: documentacao?.trim(),
    },
  });

  // RF-NOT-12: a aluna é avisada do reembolso aplicado. Não há aviso de
  // recebimento de solicitação, porque a solicitação não passa pelo sistema.
  await notificar({
    destinatario: { tipo: 'aluna', id: venda.alunaId },
    evento: 'reembolso_aplicado',
    conteudo:
      `Um reembolso de ${formatarMoeda(valorReembolsado)} foi aplicado à sua compra de ${formatarDataBR(venda.data)}. ` +
      (previa.creditosUtilizados > 0
        ? `${formatarCreditos(previa.creditosUtilizados)} já utilizados foram descontados. `
        : '') +
      (previa.encerraCarteira
        ? 'Seu pacote foi encerrado e as aulas futuras agendadas foram canceladas. '
        : `Os créditos que você já tinha antes desta compra continuam disponíveis, com a validade original de ${formatarDataBR(previa.validadeRestaurada!)}. `) +
      previa.textoPrazo,
  });

  return reembolso;
}

/**
 * Tira da carteira os créditos da compra reembolsada.
 *
 * Encerrando a carteira, os remanescentes são anulados e as aulas futuras
 * canceladas (RF-REE-05). Na renovação antecipada, só os créditos
 * comprados saem e a validade anterior volta (PA-09) — e, se o que sobra
 * não cobrir o que está reservado, as aulas mais distantes são canceladas
 * até o saldo fechar.
 */
async function aplicarEfeitoNaCarteira(params: {
  carteira: Carteira;
  venda: Venda;
  encerraCarteira: boolean;
  autorId: string;
  hoje: string;
}): Promise<number> {
  const { carteira, venda, encerraCarteira, autorId, hoje } = params;

  if (encerraCarteira) {
    const remanescentes = Math.max(
      0,
      carteira.creditosTotais - carteira.creditosUtilizados - carteira.creditosReservados,
    );

    if (remanescentes > 0) {
      await movimentoCreditoRepositorio.criar({
        carteiraId: carteira.id,
        tipo: 'ajuste',
        // Negativa: o movimento retira saldo. Sem o sinal, o extrato
        // mostraria "+" num lançamento que zera a carteira.
        quantidade: -remanescentes,
        origem: `Créditos anulados pelo reembolso da compra de ${formatarDataBR(venda.data)}`,
        referenciaId: venda.id,
        autorId,
        dataHora: new Date().toISOString(),
      });
    }

    await carteiraRepositorio.atualizar(carteira.id, {
      situacao: 'consumida',
      motivoEncerramento: 'reembolso',
      dataEncerramento: hoje,
    });

    return cancelarAgendamentosDaAlunaNoPeriodo({
      alunaId: venda.alunaId,
      dataInicio: hoje,
      motivo: 'Pacote reembolsado',
      autorId,
    });
  }

  // Renovação antecipada: sai só o que esta compra trouxe, e a validade
  // anterior é restaurada.
  await movimentoCreditoRepositorio.criar({
    carteiraId: carteira.id,
    tipo: 'ajuste',
    quantidade: -venda.creditos,
    origem: `Créditos retirados pelo reembolso da compra de ${formatarDataBR(venda.data)}`,
    referenciaId: venda.id,
    autorId,
    dataHora: new Date().toISOString(),
  });

  const totaisDepois = Math.max(0, carteira.creditosTotais - venda.creditos);
  await carteiraRepositorio.atualizar(carteira.id, {
    creditosTotais: totaisDepois,
    dataValidade: venda.validadeAnteriorDaCarteira!,
  });

  // O saldo pode não cobrir mais o que estava reservado: as aulas mais
  // distantes são canceladas até caber.
  let reservados = carteira.creditosReservados;
  const disponivelParaReserva = Math.max(0, totaisDepois - carteira.creditosUtilizados);
  if (reservados <= disponivelParaReserva) return 0;

  const [agendamentos, ocorrencias] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
  ]);

  const futuros = agendamentos
    .filter((a) => a.alunaId === venda.alunaId && a.situacao === 'ativo')
    .map((a) => ({ agendamento: a, data: ocorrencias.find((o) => o.id === a.ocorrenciaSessaoId)?.data ?? '' }))
    .filter((a) => a.data >= hoje)
    .sort((a, b) => b.data.localeCompare(a.data));

  let cancelados = 0;
  for (const { agendamento, data } of futuros) {
    if (reservados <= disponivelParaReserva) break;
    await cancelarAgendamentosDaAlunaNoPeriodo({
      alunaId: venda.alunaId,
      dataInicio: data,
      dataFim: data,
      motivo: 'Saldo reduzido por reembolso',
      autorId,
    });
    reservados -= agendamento.creditosReservados ?? 0;
    cancelados += 1;
  }

  return cancelados;
}

export interface ReembolsoDetalhado extends Reembolso {
  nomeAluna: string;
  nomeAutor: string;
}

/** REL-13: reembolsos aplicados no período, para conferência. */
export async function listarReembolsos(params: { dataInicio?: string; dataFim?: string } = {}): Promise<
  ReembolsoDetalhado[]
> {
  const { dataInicio, dataFim } = params;

  const [reembolsos, alunas, usuarios] = await Promise.all([
    reembolsoRepositorio.listar(),
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
  ]);

  return reembolsos
    .filter((r) => (!dataInicio || r.data >= dataInicio) && (!dataFim || r.data <= dataFim))
    .map((reembolso) => {
      const aluna = alunas.find((a) => a.id === reembolso.alunaId);
      return {
        ...reembolso,
        nomeAluna: usuarios.find((u) => u.id === aluna?.usuarioId)?.nome ?? 'Aluna removida',
        nomeAutor: usuarios.find((u) => u.id === reembolso.autorId)?.nome ?? 'Autor removido',
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

/** Reembolsos aplicados a uma aluna — visíveis apenas na ficha dela (RF-REE-10). */
export async function reembolsosDaAluna(alunaId: string): Promise<Reembolso[]> {
  const lista = await reembolsoRepositorio.listar();
  return lista.filter((r) => r.alunaId === alunaId).sort((a, b) => b.data.localeCompare(a.data));
}

export const ROTULO_TIPO_REEMBOLSO: Record<TipoReembolso, string> = {
  arrependimento: 'Arrependimento',
  legal: 'Motivo legal',
};
