import {
  aceiteRegistradoRepositorio,
  alunaRepositorio,
  anamneseRepositorio,
  termoAceiteRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { AceiteRegistrado, Aluna, Anamnese, TermoAceite } from '../types/domain';
import { mesclarTermo } from './useTermos';

/**
 * Pendência de aceite (RF-ALU-08).
 *
 * Na v2.1 o termo e a anamnese deixaram de bloquear: a aluna paga, recebe
 * os créditos e agenda: o que falta vira um alerta persistente no painel
 * dela e uma linha no bloco de pendências da administração. Bloquear o
 * agendamento até o aceite passou a ser a evolução EV-16, fora da Fase 1.
 *
 * As duas pendências são **derivadas**, não campos: falta termo quando não
 * há aceite da versão vigente do termo de aluna; falta anamnese quando não
 * há nenhuma ficha preenchida. `Aluna.situacao === 'aguardando_aceite'`
 * continua gravada porque é o filtro da lista (RF-ALU-10) e o contador do
 * painel (RF-PNL-03), mas quem manda é o cálculo: toda escrita que conclui
 * uma pendência chama `sincronizarSituacaoDeAceite`, que regrava a
 * situação a partir dele.
 *
 * Camada de domínio, não um hook React.
 */

export interface PendenciaDeAceite {
  /** Falta aceitar a versão vigente do termo. */
  termo: boolean;
  /** Falta preencher a ficha de anamnese. */
  anamnese: boolean;
  alguma: boolean;
}

const SEM_PENDENCIA: PendenciaDeAceite = { termo: false, anamnese: false, alguma: false };

function apurar(params: {
  aluna: Aluna;
  termoVigente: TermoAceite | undefined;
  aceites: AceiteRegistrado[];
  anamneses: Anamnese[];
}): PendenciaDeAceite {
  const { aluna, termoVigente, aceites, anamneses } = params;

  // Sem termo publicado não há o que aceitar: a pendência seria de
  // configuração do studio, não da aluna.
  const termo = termoVigente
    ? !aceites.some((a) => a.usuarioId === aluna.usuarioId && a.termoVersaoId === termoVigente.id)
    : false;
  const anamnese = !anamneses.some((a) => a.alunaId === aluna.id);

  return { termo, anamnese, alguma: termo || anamnese };
}

async function termoVigenteDeAluna(): Promise<TermoAceite | undefined> {
  const termos = await termoAceiteRepositorio.listar();
  return termos.find((t) => (t.publicoAlvo ?? 'aluna') === 'aluna' && t.situacao === 'ativo');
}

/** Pendências de uma aluna. */
export async function pendenciasDaAluna(aluna: Aluna): Promise<PendenciaDeAceite> {
  const [termoVigente, aceites, anamneses] = await Promise.all([
    termoVigenteDeAluna(),
    aceiteRegistradoRepositorio.listar(),
    anamneseRepositorio.listar(),
  ]);
  return apurar({ aluna, termoVigente, aceites, anamneses });
}

/**
 * Pendências de várias alunas de uma vez, indexadas pelo id da aluna.
 *
 * A lista e o painel precisam do estado de todas; apurar uma a uma faria
 * uma leitura de cada coleção por aluna.
 */
export async function pendenciasDasAlunas(alunas: Aluna[]): Promise<Record<string, PendenciaDeAceite>> {
  const [termoVigente, aceites, anamneses] = await Promise.all([
    termoVigenteDeAluna(),
    aceiteRegistradoRepositorio.listar(),
    anamneseRepositorio.listar(),
  ]);

  const mapa: Record<string, PendenciaDeAceite> = {};
  for (const aluna of alunas) {
    mapa[aluna.id] = apurar({ aluna, termoVigente, aceites, anamneses });
  }
  return mapa;
}

/** Quantas alunas têm termo ou anamnese pendente — o contador do RF-PNL-03. */
export async function contarAlunasComPendencia(): Promise<number> {
  const alunas = await alunaRepositorio.listar();
  const mapa = await pendenciasDasAlunas(alunas);
  return alunas.filter((a) => mapa[a.id]?.alguma).length;
}

/**
 * Regrava `Aluna.situacao` a partir das pendências apuradas.
 *
 * Não mexe na aluna trancada: o trancamento é outro eixo e tem regra
 * própria (RF-TRA-01), e uma pendência de anamnese não pode destrancá-la.
 */
export async function sincronizarSituacaoDeAceite(aluna: Aluna): Promise<PendenciaDeAceite> {
  const pendencia = await pendenciasDaAluna(aluna);
  if (aluna.situacao === 'trancada') return pendencia;

  const situacao = pendencia.alguma ? 'aguardando_aceite' : 'ativa';
  if (aluna.situacao !== situacao) {
    await alunaRepositorio.atualizar(aluna.id, { situacao });
  }
  return pendencia;
}

/**
 * Registra o aceite do termo (RF-ALU-05/06).
 *
 * Grava o **conteúdo integral** da versão aceita, já mesclado com nome e
 * CPF: se o termo for reescrito depois, o registro continua sendo o texto
 * que aquela pessoa leu e assinou.
 *
 * O endereço de IP é exigido pelo escopo. No protótipo não há servidor que
 * o informe, então gravamos um valor simulado e sinalizado.
 */
export async function registrarAceiteDoTermo(params: {
  usuarioId: string;
  assinante: { nome: string; cpf: string };
  termo: TermoAceite;
  aluna?: Aluna;
}): Promise<void> {
  const { usuarioId, assinante, termo, aluna } = params;

  await aceiteRegistradoRepositorio.criar({
    usuarioId,
    termoVersaoId: termo.id,
    dataHora: new Date().toISOString(),
    enderecoIp: '203.0.113.10 (simulado no protótipo)',
    conteudoAceito: mesclarTermo(termo.conteudo, assinante),
  });

  if (aluna) await sincronizarSituacaoDeAceite(aluna);
}

/** Registra a ficha de anamnese (RF-ALU-07). Respostas são autodeclaradas, sem análise. */
export async function registrarAnamnese(params: {
  aluna: Aluna;
  respostas: Record<string, string>;
}): Promise<void> {
  const { aluna, respostas } = params;

  await anamneseRepositorio.criar({
    alunaId: aluna.id,
    respostas,
    dataPreenchimento: new Date().toISOString(),
    versaoQuestionario: 1,
  });

  await sincronizarSituacaoDeAceite(aluna);
}

/** Texto do alerta persistente, para o painel da aluna e para a ficha. */
export function descreverPendencia(pendencia: PendenciaDeAceite): string | undefined {
  if (pendencia.termo && pendencia.anamnese) return 'Termo e anamnese pendentes';
  if (pendencia.termo) return 'Termo pendente';
  if (pendencia.anamnese) return 'Anamnese pendente';
  return undefined;
}

/**
 * Lembrete de aceite enviado pela administração (RF-ALU-08: "cabe à
 * administração acompanhar e solicitar o aceite"). É um disparo explícito,
 * por botão na ficha — nada é enviado sozinho.
 */
export async function lembrarPendenciaDeAceite(params: {
  aluna: Aluna;
  nomeAluna: string;
  pendencia: PendenciaDeAceite;
}): Promise<void> {
  const { aluna, nomeAluna, pendencia } = params;

  const oQueFalta =
    pendencia.termo && pendencia.anamnese
      ? 'o aceite do termo e a ficha de anamnese'
      : pendencia.termo
        ? 'o aceite do termo'
        : 'a ficha de anamnese';

  await notificar({
    destinatario: { tipo: 'aluna', id: aluna.id },
    evento: 'pendencia_de_aceite_lembrada',
    conteudo: `Olá, ${nomeAluna.split(' ')[0]}. Ainda falta ${oQueFalta} no seu cadastro no studio. Entre no seu painel e conclua quando puder — leva menos de dois minutos.`,
  });
}

export { SEM_PENDENCIA };
