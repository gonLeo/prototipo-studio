import {
  alunaRepositorio,
  notificacaoRepositorio,
  professoraRepositorio,
  usuarioRepositorio,
} from './repositorios';
import type { Notificacao } from '../types/domain';

/**
 * Camada de notificação (M15).
 *
 * Toda comunicação transacional do sistema passa por aqui — nenhuma regra
 * de negócio grava `Notificacao` direto. É isso que o RF-NOT-10 pede: as
 * regras dizem **o que** comunicar e **para quem**, e esta camada decide
 * **por qual canal**. Na Fase 1 tudo sai por e-mail; incluir WhatsApp
 * depois é mudar `canalDoEvento`, sem tocar em nenhuma regra de disparo.
 *
 * O destinatário também é resolvido aqui: as regras conhecem a aluna ou a
 * professora, e quem sabe traduzir isso para a usuária que recebe o
 * e-mail é a notificação, não o domínio.
 */

export type CanalNotificacao = Notificacao['canal'];

export type DestinatarioNotificacao =
  | { tipo: 'usuario'; id: string }
  | { tipo: 'aluna'; id: string }
  | { tipo: 'professora'; id: string }
  /** Todas as usuárias com perfil de administração (RF-NOT-09). */
  | { tipo: 'administracao' };

/**
 * Catálogo dos eventos disparados pelo sistema, com o rótulo usado no
 * registro de envios e o requisito que os origina. Serve de contrato:
 * evento novo entra aqui junto com a regra que o dispara.
 */
export const EVENTOS_NOTIFICACAO: Record<string, { rotulo: string; requisito: string }> = {
  acesso_de_primeiro_login: { rotulo: 'Primeiro acesso', requisito: 'RF-NOT-01' },
  matricula_concluida_pelo_site: { rotulo: 'Matrícula concluída pelo site', requisito: 'RF-NOT-01' },
  compra_confirmada: { rotulo: 'Confirmação de compra', requisito: 'RF-NOT-02' },
  agendamento_confirmado: { rotulo: 'Confirmação de agendamento', requisito: 'RF-NOT-03' },
  aula_experimental_confirmada: { rotulo: 'Aula experimental confirmada', requisito: 'RF-NOT-03' },
  agendamento_cancelado: { rotulo: 'Cancelamento pela aluna', requisito: 'RF-NOT-03' },
  alocacao_em_aula_excepcional: { rotulo: 'Alocação em aula excepcional', requisito: 'RF-NOT-04' },
  alocacao_cancelada: { rotulo: 'Alocação cancelada', requisito: 'RF-AEX-07' },
  agendamento_cancelado_pela_administracao: {
    rotulo: 'Cancelamento pela administração',
    requisito: 'RF-NOT-05',
  },
  aula_cancelada_pelo_studio: { rotulo: 'Cancelamento pelo studio', requisito: 'RF-NOT-05' },
  troca_de_professora: { rotulo: 'Substituição de professora', requisito: 'RF-NOT-06' },
  sessao_alterada: { rotulo: 'Alteração de sessão', requisito: 'RF-NOT-07' },
  link_de_pagamento_reenviado: { rotulo: 'Link de pagamento reenviado', requisito: 'RF-VEN-03' },
  reembolso_aplicado: { rotulo: 'Reembolso aplicado', requisito: 'RF-NOT-12' },
  pacote_trancado: { rotulo: 'Pacote trancado', requisito: 'RF-TRA-01' },
  retorno_de_trancamento: { rotulo: 'Retorno do trancamento', requisito: 'RF-TRA-02' },
  justificativa_aprovada: { rotulo: 'Justificativa aprovada', requisito: 'RF-NOT-10' },
  justificativa_recusada: { rotulo: 'Justificativa recusada', requisito: 'RF-NOT-10' },
  solicitacao_de_cancelamento_recebida: {
    rotulo: 'Nova solicitação de cancelamento',
    requisito: 'RF-NOT-11',
  },
  solicitacao_aprovada_com_substituta: { rotulo: 'Solicitação aprovada com substituta', requisito: 'RF-NOT-11' },
  solicitacao_aprovada_com_cancelamento: {
    rotulo: 'Solicitação aprovada com cancelamento',
    requisito: 'RF-NOT-11',
  },
  solicitacao_recusada: { rotulo: 'Solicitação recusada', requisito: 'RF-NOT-11' },
  presenca_corrigida: { rotulo: 'Correção de presença', requisito: 'RF-PRE-06' },
};

export function rotuloDoEvento(evento: string): string {
  return EVENTOS_NOTIFICACAO[evento]?.rotulo ?? evento.replaceAll('_', ' ');
}

export function requisitoDoEvento(evento: string): string | undefined {
  return EVENTOS_NOTIFICACAO[evento]?.requisito;
}

/**
 * Canal de saída do evento.
 *
 * Ponto único de decisão: na Fase 1 tudo é e-mail (decisão do escopo, M15).
 * Quando o WhatsApp entrar, é esta função que passa a devolver outro canal
 * por evento ou por preferência da usuária — nenhuma regra de disparo muda.
 */
export function canalDoEvento(_evento: string): CanalNotificacao {
  return 'email';
}

async function resolverUsuarioId(destinatario: DestinatarioNotificacao): Promise<string[]> {
  switch (destinatario.tipo) {
    case 'usuario':
      return [destinatario.id];
    case 'aluna': {
      const alunas = await alunaRepositorio.listar();
      const aluna = alunas.find((a) => a.id === destinatario.id);
      // Tolera receber o id da usuária: algumas regras já o conhecem.
      return [aluna?.usuarioId ?? destinatario.id];
    }
    case 'professora': {
      const professoras = await professoraRepositorio.listar();
      const professora = professoras.find((p) => p.id === destinatario.id);
      return [professora?.usuarioId ?? destinatario.id];
    }
    case 'administracao': {
      const usuarios = await usuarioRepositorio.listar();
      return usuarios.filter((u) => u.perfis.includes('administracao')).map((u) => u.id);
    }
  }
}

/**
 * Dispara uma notificação e registra o envio (RF-NOT-11): destinatário,
 * evento, canal, data e situação ficam gravados para consulta.
 */
export async function notificar(params: {
  destinatario: DestinatarioNotificacao;
  evento: string;
  conteudo: string;
  /** Só para forçar um canal específico; o normal é deixar a camada decidir. */
  canal?: CanalNotificacao;
}): Promise<Notificacao[]> {
  const { destinatario, evento, conteudo } = params;
  const canal = params.canal ?? canalDoEvento(evento);

  const destinatarios = await resolverUsuarioId(destinatario);
  const enviadas: Notificacao[] = [];

  for (const destinatarioId of destinatarios) {
    enviadas.push(
      await notificacaoRepositorio.criar({
        destinatarioId,
        evento,
        canal,
        conteudo,
        dataEnvio: new Date().toISOString(),
        // Sem provedor de e-mail real no protótipo, o envio é registrado
        // como concluído. É aqui que o retorno do provedor entraria.
        situacaoEnvio: 'enviada',
      }),
    );
  }

  return enviadas;
}
