import {
  alunaRepositorio,
  cobrancaRepositorio,
  contratoRepositorio,
  notificacaoRepositorio,
  pacoteRepositorio,
  parametroRepositorio,
  registroAuditoriaRepositorio,
  tentativaCobrancaRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { cobrarNoGateway, linkDePagamento } from '../services/gatewayPagamento';
import type {
  Aluna,
  Cobranca,
  Contrato,
  FormaPagamento,
  OrigemCobranca,
  TentativaCobranca,
} from '../types/domain';
import { formatarDataBR, hojeISO, somarDias } from '../utils/data';
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../utils/contrato';
import { calcularEncargos, diasEmAtraso, estaEmAberto, valorAtualizadoDaCobranca } from '../utils/financeiro';
import { RegraNegocioError } from './useModalidades';

/**
 * Cobranças e financeiro (M11).
 *
 * Camada de domínio, no mesmo padrão de `contratosDeAluna.ts` e
 * `comissoes.ts` — nenhuma tela fala com repositório de cobrança direto.
 *
 * O sistema final executa a cobrança recorrente, a retentativa e os avisos
 * de vencimento por agendador, na virada do dia. O protótipo não tem
 * agendador: a mesma rotina é disparada pela administração em
 * `processarRotinaFinanceira`, com regra idêntica — muda só o gatilho, do
 * mesmo jeito que a renovação de ciclo (RF-PAC-07) foi tratada na Fase 3.
 */

export interface ParametrosFinanceiros {
  percentualMulta: number;
  percentualJurosMes: number;
  prazoBloqueioDias: number;
  avisosDeVencimento: number[];
}

async function numeroDoParametro(chave: string, padrao: number): Promise<number> {
  const parametros = await parametroRepositorio.listar();
  const valor = Number(parametros.find((p) => p.chave === chave)?.valor);
  return Number.isFinite(valor) ? valor : padrao;
}

export async function parametrosFinanceiros(): Promise<ParametrosFinanceiros> {
  const parametros = await parametroRepositorio.listar();
  const numero = (chave: string, padrao: number) => {
    const valor = Number(parametros.find((p) => p.chave === chave)?.valor);
    return Number.isFinite(valor) ? valor : padrao;
  };

  return {
    percentualMulta: numero('percentual_multa', 2),
    percentualJurosMes: numero('percentual_juros_mes', 1),
    prazoBloqueioDias: numero('prazo_bloqueio_inadimplencia_dias', 5),
    avisosDeVencimento: [
      numero('antecedencia_aviso_vencimento_dias_1', 15),
      numero('antecedencia_aviso_vencimento_dias_2', 3),
    ],
  };
}

async function notificarAluna(params: {
  alunaId: string;
  evento: string;
  conteudo: string;
}): Promise<void> {
  const alunas = await alunaRepositorio.listar();
  const aluna = alunas.find((a) => a.id === params.alunaId);

  await notificacaoRepositorio.criar({
    destinatarioId: aluna?.usuarioId ?? params.alunaId,
    evento: params.evento,
    canal: 'email',
    conteudo: params.conteudo,
    dataEnvio: new Date().toISOString(),
    situacaoEnvio: 'enviada',
  });
}

/**
 * Cria a cobrança de um ciclo (RF-FIN-01/02).
 *
 * Bolsista com isenção total não gera cobrança nenhuma (RF-BOL-03), e a
 * mesma competência nunca é cobrada duas vezes — a chave de negócio é
 * contrato + data de vencimento, não um id guardado por quem chamou.
 */
export async function gerarCobrancaDoCiclo(params: {
  contrato: Contrato;
  dataVencimento: string;
  origem: OrigemCobranca;
}): Promise<Cobranca | undefined> {
  const { contrato, dataVencimento, origem } = params;

  const percentual = contrato.percentualBolsa ?? 0;
  if (ehIsencaoTotal(percentual)) return undefined;

  const pacotes = await pacoteRepositorio.listar();
  const pacote = pacotes.find((p) => p.id === contrato.pacoteId);
  if (!pacote) throw new RegraNegocioError('O pacote deste contrato não existe mais.');

  const cobrancas = await cobrancaRepositorio.listar();
  const existente = cobrancas.find(
    (c) => c.contratoId === contrato.id && c.dataVencimento === dataVencimento && c.situacao !== 'cancelada',
  );
  if (existente) return existente;

  return cobrancaRepositorio.criar({
    contratoId: contrato.id,
    valorBruto: pacote.valorMensal,
    percentualBolsa: percentual,
    valorLiquido: valorComBolsa(pacote.valorMensal, percentual),
    multa: 0,
    juros: 0,
    dataVencimento,
    situacao: 'pendente',
    origem,
  });
}

export interface ResultadoTentativa {
  cobranca: Cobranca;
  tentativa: TentativaCobranca;
  sucesso: boolean;
  mensagem: string;
}

/**
 * Executa uma tentativa de cobrança no gateway (RF-FIN-02/03/04).
 *
 * Cada tentativa fica registrada com data, hora e o retorno do provedor —
 * é esse histórico que a administração consulta antes de decidir entre
 * insistir, reenviar o link ou receber por fora (RF-FIN-10).
 */
export async function tentarPagamento(params: {
  cobranca: Cobranca;
  origem: 'automatica' | 'manual';
}): Promise<ResultadoTentativa> {
  const { cobranca, origem } = params;

  if (!estaEmAberto(cobranca)) {
    throw new RegraNegocioError(
      cobranca.situacao === 'paga' ? 'Esta cobrança já está quitada.' : 'Esta cobrança foi cancelada.',
    );
  }

  const retorno = await cobrarNoGateway({
    referencia: cobranca.id,
    valor: valorAtualizadoDaCobranca(cobranca),
    forcarFalha: cobranca.simularFalhaGateway === true,
  });

  const tentativa = await tentativaCobrancaRepositorio.criar({
    cobrancaId: cobranca.id,
    dataHora: new Date().toISOString(),
    retornoGateway: retorno.mensagem,
    situacao: retorno.sucesso ? 'sucesso' : 'falha',
    origem,
  });

  if (!retorno.sucesso) {
    const atualizada = await cobrancaRepositorio.atualizar(cobranca.id, { situacao: 'falha' });
    await notificarAluna({
      alunaId: await alunaIdDaCobranca(cobranca),
      evento: 'cobranca_com_falha',
      conteudo: `Não conseguimos processar o pagamento de ${formatarMoeda(valorAtualizadoDaCobranca(cobranca))} com vencimento em ${formatarDataBR(cobranca.dataVencimento)}. Vamos tentar novamente amanhã — você também pode pagar pelo link: ${linkDePagamento(cobranca.id)}`,
    });
    return { cobranca: atualizada, tentativa, sucesso: false, mensagem: retorno.mensagem };
  }

  const quitada = await quitarCobranca({
    cobranca,
    formaPagamento: 'gateway',
    dataQuitacao: hojeISO(),
    identificadorGateway: retorno.identificador,
  });

  return { cobranca: quitada, tentativa, sucesso: true, mensagem: retorno.mensagem };
}

/**
 * Aluna dona da cobrança. A cobrança de mensalidade chega pela via do
 * contrato; a da aula experimental é avulsa e aponta direto para a aluna
 * (RF-EXP-04/05).
 */
async function alunaIdDaCobranca(cobranca: Cobranca): Promise<string> {
  if (cobranca.alunaId) return cobranca.alunaId;
  if (!cobranca.contratoId) return '';
  const contratos = await contratoRepositorio.listar();
  return contratos.find((c) => c.id === cobranca.contratoId)?.alunaId ?? '';
}

/**
 * Cobrança avulsa, sem contrato — hoje só a aula experimental, que tem
 * valor próprio e é paga antes de a vaga ser confirmada (RF-EXP-04/05).
 */
export async function gerarCobrancaAvulsa(params: {
  alunaId: string;
  valor: number;
  descricao: string;
  origem: OrigemCobranca;
}): Promise<Cobranca> {
  const { alunaId, valor, descricao, origem } = params;

  return cobrancaRepositorio.criar({
    alunaId,
    valorBruto: valor,
    percentualBolsa: 0,
    valorLiquido: valor,
    multa: 0,
    juros: 0,
    dataVencimento: hojeISO(),
    situacao: 'pendente',
    origem,
    observacao: descricao,
  });
}

/**
 * Quita a cobrança e regulariza a aluna (RF-FIN-08): confirmado o
 * pagamento, a situação volta a "ativa" e o agendamento é restabelecido
 * automaticamente — desde que não reste outra cobrança vencida em aberto.
 */
async function quitarCobranca(params: {
  cobranca: Cobranca;
  formaPagamento: FormaPagamento;
  dataQuitacao: string;
  identificadorGateway?: string;
  observacao?: string;
}): Promise<Cobranca> {
  const { cobranca, formaPagamento, dataQuitacao, identificadorGateway, observacao } = params;

  const quitada = await cobrancaRepositorio.atualizar(cobranca.id, {
    situacao: 'paga',
    dataQuitacao,
    formaPagamento,
    identificadorGateway,
    observacao,
  });

  const alunaId = await alunaIdDaCobranca(cobranca);
  await regularizarSePossivel(alunaId);

  await notificarAluna({
    alunaId,
    evento: 'pagamento_confirmado',
    conteudo: `Recebemos o pagamento de ${formatarMoeda(valorAtualizadoDaCobranca(quitada))} referente ao vencimento de ${formatarDataBR(cobranca.dataVencimento)}. Seu acesso ao agendamento segue liberado.`,
  });

  return quitada;
}

/** Uma cobrança é da aluna pelo contrato dela ou pelo vínculo direto (avulsa). */
function ehDaAluna(cobranca: Cobranca, alunaId: string, idsContratos: string[]): boolean {
  if (cobranca.alunaId) return cobranca.alunaId === alunaId;
  return cobranca.contratoId !== undefined && idsContratos.includes(cobranca.contratoId);
}

/** Cobranças vencidas e ainda em aberto de uma aluna. */
export async function debitosEmAbertoDaAluna(alunaId: string, hoje = hojeISO()): Promise<Cobranca[]> {
  const [contratos, cobrancas] = await Promise.all([
    contratoRepositorio.listar(),
    cobrancaRepositorio.listar(),
  ]);

  const idsContratos = contratos.filter((c) => c.alunaId === alunaId).map((c) => c.id);
  return cobrancas
    .filter((c) => ehDaAluna(c, alunaId, idsContratos) && estaEmAberto(c) && c.dataVencimento <= hoje)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}

/**
 * Volta a aluna para "ativa" quando não resta débito vencido (RF-FIN-08).
 * Só mexe em quem está inadimplente: trancada, suspensa ou encerrada tem
 * outro motivo de bloqueio, que o financeiro não resolve.
 */
export async function regularizarSePossivel(alunaId: string, hoje = hojeISO()): Promise<boolean> {
  const alunas = await alunaRepositorio.listar();
  const aluna = alunas.find((a) => a.id === alunaId);
  if (!aluna || aluna.situacao !== 'inadimplente') return false;

  const debitos = await debitosEmAbertoDaAluna(alunaId, hoje);
  if (debitos.length > 0) return false;

  await alunaRepositorio.atualizar(aluna.id, { situacao: 'ativa' });
  await notificarAluna({
    alunaId,
    evento: 'situacao_regularizada',
    conteudo: 'Sua situação financeira foi regularizada e o agendamento de novas aulas já está liberado.',
  });
  return true;
}

/** Registro de pagamento feito fora do gateway (RF-FIN-12). */
export async function registrarPagamentoManual(params: {
  cobranca: Cobranca;
  formaPagamento: FormaPagamento;
  dataPagamento: string;
  observacao: string;
  autorId: string;
}): Promise<Cobranca> {
  const { cobranca, formaPagamento, dataPagamento, observacao, autorId } = params;

  if (!estaEmAberto(cobranca)) {
    throw new RegraNegocioError(
      cobranca.situacao === 'paga' ? 'Esta cobrança já está quitada.' : 'Esta cobrança foi cancelada.',
    );
  }
  if (!dataPagamento) throw new RegraNegocioError('Informe a data do pagamento.');

  const quitada = await quitarCobranca({
    cobranca,
    formaPagamento,
    dataQuitacao: dataPagamento,
    observacao: observacao.trim() || undefined,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Cobranca',
    operacao: 'pagamento_manual',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: cobranca.situacao },
    valorNovo: {
      situacao: 'paga',
      formaPagamento,
      dataPagamento,
      valor: valorAtualizadoDaCobranca(quitada),
      observacao: observacao.trim(),
    },
  });

  return quitada;
}

/** Cancelamento de cobrança pendente, com motivo registrado (RF-FIN-13). */
export async function cancelarCobranca(params: {
  cobranca: Cobranca;
  motivo: string;
  autorId: string;
}): Promise<Cobranca> {
  const { cobranca, motivo, autorId } = params;

  if (cobranca.situacao === 'paga') {
    throw new RegraNegocioError('Cobrança já quitada não pode ser cancelada — registre um estorno com a aluna.');
  }
  if (cobranca.situacao === 'cancelada') throw new RegraNegocioError('Esta cobrança já está cancelada.');
  if (!motivo.trim()) throw new RegraNegocioError('Registre o motivo do cancelamento.');

  const cancelada = await cobrancaRepositorio.atualizar(cobranca.id, {
    situacao: 'cancelada',
    motivoCancelamento: motivo.trim(),
  });

  // Cancelar o débito pode ser justamente o que regulariza a aluna.
  const alunaId = await alunaIdDaCobranca(cobranca);
  await regularizarSePossivel(alunaId);

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Cobranca',
    operacao: 'cancelamento_de_cobranca',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: cobranca.situacao },
    valorNovo: { situacao: 'cancelada', motivo: motivo.trim() },
  });

  return cancelada;
}

/** Reenvio do link de pagamento à aluna (RF-FIN-04). */
export async function reenviarLinkDePagamento(cobranca: Cobranca): Promise<void> {
  if (!estaEmAberto(cobranca)) {
    throw new RegraNegocioError('Só faz sentido reenviar o link de uma cobrança em aberto.');
  }

  await notificarAluna({
    alunaId: await alunaIdDaCobranca(cobranca),
    evento: 'link_de_pagamento_reenviado',
    conteudo: `Link para pagamento de ${formatarMoeda(valorAtualizadoDaCobranca(cobranca))}, vencimento em ${formatarDataBR(cobranca.dataVencimento)}: ${linkDePagamento(cobranca.id)}`,
  });
}

/**
 * Liga ou desliga a recusa do gateway simulado para uma cobrança.
 * Existe só no protótipo — é o que permite demonstrar retentativa, multa,
 * juros e bloqueio por inadimplência sem depender de um provedor real.
 */
export async function alternarSimulacaoDeFalha(cobranca: Cobranca): Promise<Cobranca> {
  return cobrancaRepositorio.atualizar(cobranca.id, {
    simularFalhaGateway: !cobranca.simularFalhaGateway,
  });
}

/** Atualiza multa e juros de uma cobrança vencida (RF-FIN-06). */
async function aplicarEncargos(
  cobranca: Cobranca,
  hoje: string,
  parametros: ParametrosFinanceiros,
): Promise<Cobranca> {
  const dias = diasEmAtraso(cobranca.dataVencimento, hoje);
  if (dias <= 0) return cobranca;

  const encargos = calcularEncargos({
    valorOriginal: cobranca.valorLiquido,
    diasDeAtraso: dias,
    percentualMulta: parametros.percentualMulta,
    percentualJurosMes: parametros.percentualJurosMes,
  });

  const jaAtualizada =
    cobranca.situacao === 'atrasada' && cobranca.multa === encargos.multa && cobranca.juros === encargos.juros;
  if (jaAtualizada) return cobranca;

  return cobrancaRepositorio.atualizar(cobranca.id, {
    situacao: 'atrasada',
    multa: encargos.multa,
    juros: encargos.juros,
  });
}

export interface ResumoDaRotina {
  cobrancasGeradas: number;
  tentativasExecutadas: number;
  tentativasComSucesso: number;
  cobrancasAtrasadas: number;
  alunasBloqueadas: number;
  alunasRegularizadas: number;
  avisosDeVencimento: number;
}

/**
 * Rotina financeira do dia (RF-FIN-02/03/05/06/09).
 *
 * No sistema final é o agendador que executa isto na virada do dia; aqui é
 * a administração que dispara, e o resultado é o mesmo. A ordem importa:
 * gerar as cobranças do dia, retentar as que falharam, recalcular os
 * encargos das vencidas, bloquear quem passou do prazo e só então avisar
 * sobre contratos perto do fim.
 */
export async function processarRotinaFinanceira(params: {
  autorId: string;
  hoje?: string;
}): Promise<ResumoDaRotina> {
  const { autorId } = params;
  const hoje = params.hoje ?? hojeISO();
  const parametros = await parametrosFinanceiros();

  const resumo: ResumoDaRotina = {
    cobrancasGeradas: 0,
    tentativasExecutadas: 0,
    tentativasComSucesso: 0,
    cobrancasAtrasadas: 0,
    alunasBloqueadas: 0,
    alunasRegularizadas: 0,
    avisosDeVencimento: 0,
  };

  const contratos = await contratoRepositorio.listar();

  // RF-FIN-02: cobrança recorrente na data de vencimento do ciclo. Contrato
  // trancado não é cobrado; suspenso continua sendo (RF-CTR-03/04).
  for (const contrato of contratos) {
    if (contrato.situacao === 'encerrado' || contrato.situacao === 'trancado') continue;
    if (contrato.dataVencimentoCiclo > hoje) continue;
    if (contrato.dataVencimentoCiclo > contrato.dataTerminoContrato) continue;

    const cobrancasAntes = await cobrancaRepositorio.listar();
    const jaExiste = cobrancasAntes.some(
      (c) =>
        c.contratoId === contrato.id &&
        c.dataVencimento === contrato.dataVencimentoCiclo &&
        c.situacao !== 'cancelada',
    );
    if (jaExiste) continue;

    const cobranca = await gerarCobrancaDoCiclo({
      contrato,
      dataVencimento: contrato.dataVencimentoCiclo,
      origem: 'recorrencia',
    });
    if (!cobranca) continue;

    resumo.cobrancasGeradas += 1;
    const resultado = await tentarPagamento({ cobranca, origem: 'automatica' });
    resumo.tentativasExecutadas += 1;
    if (resultado.sucesso) resumo.tentativasComSucesso += 1;
  }

  // RF-FIN-03: retentativa automática no dia seguinte à falha — uma por
  // dia, para não repetir a mesma tentativa se a rotina rodar duas vezes.
  const tentativas = await tentativaCobrancaRepositorio.listar();
  const comFalha = (await cobrancaRepositorio.listar()).filter((c) => c.situacao === 'falha');

  for (const cobranca of comFalha) {
    const tentativasDaCobranca = tentativas
      .filter((t) => t.cobrancaId === cobranca.id)
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    const ultima = tentativasDaCobranca[0];
    if (ultima && ultima.dataHora.slice(0, 10) >= hoje) continue;

    const resultado = await tentarPagamento({ cobranca, origem: 'automatica' });
    resumo.tentativasExecutadas += 1;
    if (resultado.sucesso) resumo.tentativasComSucesso += 1;
  }

  // RF-FIN-06: multa e juros das cobranças vencidas em aberto.
  const cobrancasAtuais = await cobrancaRepositorio.listar();
  for (const cobranca of cobrancasAtuais) {
    if (!estaEmAberto(cobranca)) continue;
    if (cobranca.dataVencimento >= hoje) continue;

    const antes = cobranca.situacao;
    const atualizada = await aplicarEncargos(cobranca, hoje, parametros);
    if (antes !== 'atrasada' && atualizada.situacao === 'atrasada') resumo.cobrancasAtrasadas += 1;
  }

  // RF-FIN-05: passado o prazo configurado, a aluna é marcada inadimplente
  // e o agendamento fica bloqueado (a trava em si já vive no M7).
  const [alunas, contratosAtuais, cobrancasFinais] = await Promise.all([
    alunaRepositorio.listar(),
    contratoRepositorio.listar(),
    cobrancaRepositorio.listar(),
  ]);
  const limiteDeBloqueio = somarDias(hoje, -parametros.prazoBloqueioDias);

  for (const aluna of alunas) {
    if (aluna.situacao !== 'ativa' && aluna.situacao !== 'inadimplente') continue;

    const idsContratos = contratosAtuais.filter((c) => c.alunaId === aluna.id).map((c) => c.id);
    const debitos = cobrancasFinais.filter(
      (c) => ehDaAluna(c, aluna.id, idsContratos) && estaEmAberto(c) && c.dataVencimento <= hoje,
    );

    if (aluna.situacao === 'ativa' && debitos.some((c) => c.dataVencimento <= limiteDeBloqueio)) {
      await bloquearPorInadimplencia({ aluna, cobrancas: debitos, autorId, parametros });
      resumo.alunasBloqueadas += 1;
      continue;
    }

    if (aluna.situacao === 'inadimplente' && debitos.length === 0) {
      if (await regularizarSePossivel(aluna.id, hoje)) resumo.alunasRegularizadas += 1;
    }
  }

  // RF-FIN-09: avisos de proximidade do término do contrato.
  resumo.avisosDeVencimento = await enviarAvisosDeTerminoDeContrato(hoje, parametros);

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Cobranca',
    operacao: 'rotina_financeira_do_dia',
    autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { referencia: hoje, ...resumo },
  });

  return resumo;
}

async function bloquearPorInadimplencia(params: {
  aluna: Aluna;
  cobrancas: Cobranca[];
  autorId: string;
  parametros: ParametrosFinanceiros;
}): Promise<void> {
  const { aluna, cobrancas, autorId, parametros } = params;

  await alunaRepositorio.atualizar(aluna.id, { situacao: 'inadimplente' });

  const total = cobrancas.reduce((soma, c) => soma + valorAtualizadoDaCobranca(c), 0);
  await notificarAluna({
    alunaId: aluna.id,
    evento: 'bloqueio_por_inadimplencia',
    conteudo: `Consta em aberto o valor de ${formatarMoeda(total)}, vencido há mais de ${parametros.prazoBloqueioDias} dias. O agendamento de novas aulas fica bloqueado até a regularização; as aulas já marcadas continuam valendo.`,
  });

  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: 'bloqueio_por_inadimplencia',
    autorId,
    dataHora: new Date().toISOString(),
    valorAnterior: { situacao: aluna.situacao },
    valorNovo: { situacao: 'inadimplente', valorEmAberto: total },
  });
}

/**
 * Aviso de término de contrato (RF-FIN-09).
 *
 * O texto segue a decisão de UX do escopo: informa que a renovação é
 * automática e orienta procurar a administração para ajustar o plano, sem
 * oferecer o cancelamento como ação principal.
 */
async function enviarAvisosDeTerminoDeContrato(
  hoje: string,
  parametros: ParametrosFinanceiros,
): Promise<number> {
  const [contratos, notificacoes, alunas] = await Promise.all([
    contratoRepositorio.listar(),
    notificacaoRepositorio.listar(),
    alunaRepositorio.listar(),
  ]);

  let enviados = 0;

  for (const contrato of contratos) {
    if (contrato.situacao === 'encerrado') continue;

    for (const antecedencia of parametros.avisosDeVencimento) {
      if (somarDias(hoje, antecedencia) !== contrato.dataTerminoContrato) continue;

      const evento = `aviso_termino_contrato_${antecedencia}d`;
      const destinatarioId = alunas.find((a) => a.id === contrato.alunaId)?.usuarioId ?? contrato.alunaId;
      const jaEnviado = notificacoes.some(
        (n) => n.destinatarioId === destinatarioId && n.evento === evento && n.conteudo.includes(formatarDataBR(contrato.dataTerminoContrato)),
      );
      if (jaEnviado) continue;

      await notificarAluna({
        alunaId: contrato.alunaId,
        evento,
        conteudo: `Seu contrato chega ao fim da vigência em ${formatarDataBR(contrato.dataTerminoContrato)} (${antecedencia} dias). A renovação é automática e você não precisa fazer nada para continuar treinando. Se quiser ajustar o plano, fale com a administração do studio.`,
      });
      enviados += 1;
    }
  }

  return enviados;
}

export interface ResumoFinanceiro {
  recebido: number;
  aReceber: number;
  comFalha: number;
  emAtraso: number;
  quantidade: { recebido: number; aReceber: number; comFalha: number; emAtraso: number };
}

/** Consolidado do período por situação (RF-FIN-11). */
export function resumirCobrancas(cobrancas: Cobranca[]): ResumoFinanceiro {
  const resumo: ResumoFinanceiro = {
    recebido: 0,
    aReceber: 0,
    comFalha: 0,
    emAtraso: 0,
    quantidade: { recebido: 0, aReceber: 0, comFalha: 0, emAtraso: 0 },
  };

  for (const cobranca of cobrancas) {
    const valor = valorAtualizadoDaCobranca(cobranca);
    switch (cobranca.situacao) {
      case 'paga':
        resumo.recebido += valor;
        resumo.quantidade.recebido += 1;
        break;
      case 'pendente':
        resumo.aReceber += valor;
        resumo.quantidade.aReceber += 1;
        break;
      case 'falha':
        resumo.comFalha += valor;
        resumo.quantidade.comFalha += 1;
        break;
      case 'atrasada':
        resumo.emAtraso += valor;
        resumo.quantidade.emAtraso += 1;
        break;
      default:
        break;
    }
  }

  return resumo;
}

export interface CobrancaDetalhada extends Cobranca {
  alunaId: string;
  nomeAluna: string;
  nomePacote: string;
  tentativas: TentativaCobranca[];
  diasDeAtraso: number;
  valorAtualizado: number;
}

/** Cobranças com aluna, pacote e tentativas resolvidas — base das telas (RF-FIN-10/11). */
export async function listarCobrancasDetalhadas(hoje = hojeISO()): Promise<CobrancaDetalhada[]> {
  const [cobrancas, contratos, alunas, usuarios, pacotes, tentativas] = await Promise.all([
    cobrancaRepositorio.listar(),
    contratoRepositorio.listar(),
    alunaRepositorio.listar(),
    usuarioRepositorio.listar(),
    pacoteRepositorio.listar(),
    tentativaCobrancaRepositorio.listar(),
  ]);

  return cobrancas
    .map((cobranca) => {
      const contrato = contratos.find((c) => c.id === cobranca.contratoId);
      const aluna = alunas.find((a) => a.id === (cobranca.alunaId ?? contrato?.alunaId));
      const usuario = usuarios.find((u) => u.id === aluna?.usuarioId);

      return {
        ...cobranca,
        alunaId: aluna?.id ?? '',
        nomeAluna: usuario?.nome ?? 'Aluna removida',
        nomePacote:
          cobranca.origem === 'experimental'
            ? 'Aula experimental'
            : (pacotes.find((p) => p.id === contrato?.pacoteId)?.nome ?? 'Pacote removido'),
        tentativas: tentativas
          .filter((t) => t.cobrancaId === cobranca.id)
          .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
        diasDeAtraso: estaEmAberto(cobranca) ? diasEmAtraso(cobranca.dataVencimento, hoje) : 0,
        valorAtualizado: valorAtualizadoDaCobranca(cobranca),
      };
    })
    .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
}

export interface DebitoDaAluna {
  cobrancas: Cobranca[];
  valorOriginal: number;
  multa: number;
  juros: number;
  valorAtualizado: number;
  diasDeAtraso: number;
}

/**
 * Débito da aluna com a decomposição que ela vê no painel (RF-FIN-07):
 * valor original, multa, juros e valor atualizado.
 */
export async function debitoDaAluna(alunaId: string, hoje = hojeISO()): Promise<DebitoDaAluna | undefined> {
  const cobrancas = await debitosEmAbertoDaAluna(alunaId, hoje);
  if (cobrancas.length === 0) return undefined;

  const parametros = await parametrosFinanceiros();

  let valorOriginal = 0;
  let multa = 0;
  let juros = 0;
  let diasDeAtraso = 0;

  for (const cobranca of cobrancas) {
    const dias = diasEmAtraso(cobranca.dataVencimento, hoje);
    // Recalcula na leitura para a aluna nunca ver um valor congelado no dia
    // em que a rotina rodou pela última vez.
    const encargos = calcularEncargos({
      valorOriginal: cobranca.valorLiquido,
      diasDeAtraso: dias,
      percentualMulta: parametros.percentualMulta,
      percentualJurosMes: parametros.percentualJurosMes,
    });

    valorOriginal += cobranca.valorLiquido;
    multa += encargos.multa;
    juros += encargos.juros;
    diasDeAtraso = Math.max(diasDeAtraso, dias);
  }

  return {
    cobrancas,
    valorOriginal,
    multa,
    juros,
    valorAtualizado: valorOriginal + multa + juros,
    diasDeAtraso,
  };
}

/** Pagamento disparado pela própria aluna no painel (RF-FIN-07/08). */
export async function pagarDebitoDaAluna(alunaId: string): Promise<{ pagas: number; falhas: number }> {
  const cobrancas = await debitosEmAbertoDaAluna(alunaId);
  const parametros = await parametrosFinanceiros();
  let pagas = 0;
  let falhas = 0;

  for (const cobranca of cobrancas) {
    // Garante que o valor cobrado inclui os encargos do dia de hoje, e não
    // os da última execução da rotina.
    const atualizada = await aplicarEncargos(cobranca, hojeISO(), parametros);
    const resultado = await tentarPagamento({ cobranca: atualizada, origem: 'manual' });
    if (resultado.sucesso) pagas += 1;
    else falhas += 1;
  }

  return { pagas, falhas };
}

/** Prazo de bloqueio configurado, para as telas explicarem a regra. */
export async function prazoDeBloqueioEmDias(): Promise<number> {
  return numeroDoParametro('prazo_bloqueio_inadimplencia_dias', 5);
}
