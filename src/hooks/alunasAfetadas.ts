import { useCallback, useEffect, useState } from 'react';
import {
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { AlunaAfetada, OcorrenciaSessao, OrigemCancelamentoDaOcorrencia } from '../types/domain';
import { diaSemanaDe, formatarDataBR } from '../utils/data';
import { rotuloDoDia } from '../utils/grade';
import { formatarCreditos } from '../utils/creditos';

/**
 * Aulas canceladas pelo studio e a relação preservada de alunas
 * (RF-CPR-09, RN-16, fluxo 6.6.1).
 *
 * A relação é gravada por `cancelarOcorrencia`, no momento do
 * cancelamento; aqui ela só é lida e enriquecida com o nome da modalidade,
 * do horário e da professora, que vêm da sessão.
 *
 * O botão "Enviar mensagem" abre o WhatsApp com um texto pronto. O sistema
 * **não registra** se a mensagem foi enviada: o requisito é explícito em
 * dizer que isso é apoio ao contato manual enquanto o canal não está
 * integrado.
 */

/**
 * Número usado por todas as mensagens do protótipo.
 *
 * Na Fase 1 real seria o telefone de cada aluna. Aqui é um número fixo, o
 * da própria cliente, para que a demonstração abra o WhatsApp de verdade
 * no aparelho de quem está testando em vez de discar para um contato
 * fictício.
 */
const NUMERO_DEMONSTRACAO = '556596806348';

export const ROTULO_ORIGEM_CANCELAMENTO: Record<OrigemCancelamentoDaOcorrencia, string> = {
  excecao: 'Exceção de calendário',
  exclusao_sessao: 'Sessão excluída ou encerrada',
  solicitacao_professora: 'Solicitação da professora',
  conflito_excepcional: 'Conflito com aula excepcional',
};

export interface AulaCancelada {
  ocorrenciaId: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  nomeModalidade: string;
  nomeProfessora: string;
  motivo: string;
  origem: OrigemCancelamentoDaOcorrencia;
  dataCancelamento: string | undefined;
  alunas: AlunaAfetada[];
}

/** "1 crédito devolvido" / "2 créditos devolvidos". */
export function creditosDevolvidos(quantidade: number): string {
  return `${formatarCreditos(quantidade)} ${quantidade === 1 ? 'devolvido' : 'devolvidos'}`;
}

/**
 * Texto que abre preenchido no WhatsApp.
 *
 * Muda com a origem do cancelamento porque é isso que a aluna precisa
 * saber: um feriado não se remarca como uma turma encerrada, e um evento
 * no lugar da aula regular é um convite, não só um aviso.
 *
 * O convite final também muda com a compensação: quem reserva pelo
 * convênio não "remarca" conosco, e quem não tem crédito de volta não é
 * convidada a escolher outro horário como se tivesse.
 *
 * Em nenhum caso a mensagem pede um horário à aluna: quem agenda é ela
 * própria, pelo sistema (RF-AGD-01). Pedir que ela respondesse com um dia
 * criaria uma fila de encaixe manual que o studio não opera.
 */
export function mensagemParaAluna(aula: AulaCancelada, afetada: AlunaAfetada): string {
  const quando = `${rotuloDoDia(diaSemanaDe(aula.data)).toLowerCase()}, ${formatarDataBR(aula.data)} às ${aula.horarioInicio}`;
  const abertura = `Oi, ${afetada.nome.split(' ')[0]}! Aqui é do studio.`;

  // O motivo da exceção já vem prefixado com "Exceção de calendário:";
  // repetir isso na mensagem soaria como jargão interno para a aluna.
  const motivo = aula.motivo.replace(/^Exceção de calendário:\s*/i, '').replace(/^Aula cancelada pelo studio:\s*/i, '');

  // Convênio não tem crédito no studio, e a experimental foi paga à parte:
  // prometer devolução de crédito a elas seria mentira.
  const compensacao = afetada.convenio
    ? 'Como sua reserva é pelo convênio, é só escolher outro horário no aplicativo do parceiro. '
    : afetada.experimental
      ? 'Sua aula experimental pode ser remarcada sem custo nenhum — me avisa por aqui qual horário você prefere. '
      : `${comoVoltou(afetada)} `;

  // A compensação da aluna de convênio já diz onde ela reserva; o convite
  // dela é só de contato, para não repetir a mesma instrução duas vezes.
  const convite = afetada.convenio
    ? 'Qualquer dúvida, é só me chamar por aqui.'
    : 'Para repor, entre no sistema, abra a "Grade disponível" e agende o melhor dia para você.';

  const corpo: Record<OrigemCancelamentoDaOcorrencia, string> = {
    excecao: `A aula de ${aula.nomeModalidade} de ${quando} não vai acontecer: ${motivo}. ${compensacao}${
      afetada.experimental ? '' : convite
    }`,
    exclusao_sessao: `A turma de ${aula.nomeModalidade} de ${quando} foi encerrada, e a sua aula foi cancelada. ${compensacao}${
      afetada.convenio
        ? convite
        : afetada.experimental
          ? ''
          : 'As outras turmas continuam na grade: entre no sistema, em "Grade disponível", e escolha a que couber na sua rotina.'
    }`,
    solicitacao_professora: `A professora ${aula.nomeProfessora} precisou cancelar a aula de ${aula.nomeModalidade} de ${quando}. ${compensacao}${
      afetada.experimental ? '' : convite
    }`,
    conflito_excepcional: `No dia ${formatarDataBR(aula.data)}, às ${aula.horarioInicio}, vai acontecer um evento no lugar da aula de ${aula.nomeModalidade}, que foi cancelada. ${compensacao}${
      afetada.convenio
        ? convite
        : afetada.experimental
          ? 'Se preferir participar do evento, me avisa que eu te aloco.'
          : 'Para repor, entre no sistema e agende outro horário em "Grade disponível". Se preferir participar do evento, me avisa que eu te aloco.'
    }`,
  };

  return `${abertura} ${corpo[aula.origem]}`;
}

/** O que a aluna recebeu de volta, em português corrente. */
function comoVoltou(afetada: AlunaAfetada): string {
  const creditos =
    afetada.creditosDevolvidos === 1
      ? 'Seu crédito voltou para o saldo'
      : `Seus ${afetada.creditosDevolvidos} créditos voltaram para o saldo`;
  return afetada.diasProrrogados > 0
    ? `${creditos} e a validade do seu pacote ganhou ${afetada.diasProrrogados} dias a mais.`
    : `${creditos}.`;
}

/** Link que abre o WhatsApp com a mensagem pronta. Abrir não registra nada. */
export function linkDoWhatsApp(aula: AulaCancelada, afetada: AlunaAfetada): string {
  return `https://wa.me/${NUMERO_DEMONSTRACAO}?text=${encodeURIComponent(mensagemParaAluna(aula, afetada))}`;
}

export function useAulasCanceladas() {
  const [aulas, setAulas] = useState<AulaCancelada[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [ocorrencias, sessoes, modalidades, professoras, usuarios] = await Promise.all([
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
    ]);

    const canceladas = ocorrencias.filter((o: OcorrenciaSessao) => o.situacao === 'cancelada');

    const lista: AulaCancelada[] = canceladas.map((ocorrencia) => {
      const sessao = sessoes.find((s) => s.id === ocorrencia.sessaoId);
      const professora = professoras.find((p) => p.id === (ocorrencia.professoraEfetivaId ?? sessao?.professoraId));
      return {
        ocorrenciaId: ocorrencia.id,
        data: ocorrencia.data,
        horarioInicio: sessao?.horarioInicio ?? '',
        horarioFim: sessao?.horarioFim ?? '',
        nomeModalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade removida',
        nomeProfessora: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
        motivo: ocorrencia.motivoCancelamento ?? '—',
        origem: ocorrencia.origemCancelamento ?? 'exclusao_sessao',
        dataCancelamento: ocorrencia.dataCancelamento,
        alunas: ocorrencia.alunasAfetadas ?? [],
      };
    });

    // Mais recente primeiro: o que acabou de ser cancelado é o que a
    // administração precisa avisar agora.
    setAulas(lista.sort((a, b) => b.data.localeCompare(a.data)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { aulas, carregando, recarregar };
}
