import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  chamadaRepositorio,
  justificativaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  professoraRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Agendamento, Aluna, Carteira, Justificativa, Pacote } from '../types/domain';
import { hojeISO, horasAteAula } from '../utils/data';
import { formatarCreditos, lerCarteira, type LeituraDaCarteira } from '../utils/creditos';
import { limiaresFinalizando } from './carteiraDeCreditos';
import { alocacoesDaAluna } from './aulasExcepcionais';
import {
  antecedenciaMinimaEmHoras,
  carregarSituacaoDeAgendamento,
  janelaDeAgendamentoEmDias,
  listarAulasDisponiveis,
  prazoDeJustificativaEmDias,
} from './agendamentoDeAulas';
import type { AulaDisponivel, BloqueioDaAluna } from './agendamentoDeAulas';

export interface AulaDaAluna extends Agendamento {
  /**
   * De onde a aula vem. A excepcional (M9) não tem agendamento: é montada
   * a partir da alocação, com os mesmos campos, para que as telas da aluna
   * possam listar as duas juntas — o RF-AEX-09 pede que ela apareça nas
   * próximas aulas e no histórico de frequência, e não num bloco à parte.
   */
  tipoDeAula: 'grade' | 'excepcional';
  data: string;
  horarioInicio: string;
  horarioFim: string;
  nomeModalidade: string;
  nomeProfessora: string;
  /** A ocorrência daquela data foi cancelada pelo studio. */
  canceladaPeloStudio: boolean;
  motivoCancelamento: string | undefined;
  justificativa: Justificativa | undefined;
  horasAteAAula: number;
  /** Presença registrada na chamada, quando ela já foi finalizada (RF-PRE-07). */
  presenca: 'presente' | 'ausente' | undefined;
}

/**
 * O que aconteceu com os créditos daquela aula (RF-PRE-07).
 *
 * O histórico da aluna precisa dizer não só quantos créditos a aula
 * custou, mas o que foi feito deles: uma aula cancelada dentro do prazo e
 * outra cancelada fora dele aparecem igual na lista e têm efeitos opostos
 * sobre o saldo. Sem essa linha, a aluna não consegue conferir o extrato.
 */
export type DestinoDosCreditos = 'reservados' | 'utilizados' | 'devolvidos' | 'sem_consumo';

export function destinoDosCreditos(aula: AulaDaAluna): {
  destino: DestinoDosCreditos;
  texto: string;
} {
  const creditos = aula.creditosReservados ?? 0;

  // Aula experimental é cobrada à parte (RF-EXP-06) e a reserva de
  // convênio não toca em crédito nenhum (RN-33). A origem é dita porque a
  // mesma aluna pode ter pacote **e** convênio (RF-CNV-09): sem isso, ela
  // veria uma aula "sem consumo" no meio das que gastaram crédito e não
  // saberia por quê.
  if (creditos === 0) {
    if (aula.origem === 'convenio') {
      return { destino: 'sem_consumo', texto: 'Reserva pelo convênio — sem consumo de créditos' };
    }
    return { destino: 'sem_consumo', texto: 'Sem consumo de créditos' };
  }

  const quantidade = formatarCreditos(creditos);
  // "1 crédito reservado", "3 créditos reservados": o particípio concorda
  // com a quantidade em vez de sair como "reservado(s)".
  const flexionar = (singular: string, plural: string) => `${quantidade} ${creditos > 1 ? plural : singular}`;

  // A justificativa aprovada devolve ao saldo o que já tinha sido
  // consumido (RF-JUS-04) — vale mais que qualquer outro estado.
  if (aula.justificativa?.situacao === 'aprovada') {
    return {
      destino: 'devolvidos',
      texto: `${flexionar('devolvido', 'devolvidos')} — justificativa aprovada`,
    };
  }

  // Cancelamento pelo studio nunca cobra da aluna (RF-CPR-04, RF-EXC-04).
  if (aula.canceladaPeloStudio) {
    return {
      destino: 'devolvidos',
      texto: `${flexionar('devolvido', 'devolvidos')} — aula cancelada pelo studio`,
    };
  }

  if (aula.tipoDeAula === 'excepcional') {
    // Quem cancela a alocação é a administração, e o estorno é a regra
    // (RF-AEX-07): não existe cancelamento "fora do prazo" aqui.
    if (aula.situacao === 'cancelado') {
      return {
        destino: 'devolvidos',
        texto: `${flexionar('estornado', 'estornados')} — alocação cancelada`,
      };
    }
    // A alocação consome na hora, sem passar por reserva (RF-AEX-04):
    // dizer "reservado" aqui contaria uma história que não aconteceu.
    return { destino: 'utilizados', texto: `${flexionar('consumido', 'consumidos')} na alocação` };
  }

  if (aula.situacao === 'cancelado') {
    return aula.creditoDevolvido === false
      ? {
          destino: 'utilizados',
          texto: `${flexionar('consumido', 'consumidos')} — cancelamento fora do prazo`,
        }
      : { destino: 'devolvidos', texto: `${flexionar('devolvido', 'devolvidos')} ao saldo` };
  }

  // RF-CRE-05: presença confirmada e falta sem justificativa aprovada
  // convertem a reserva em consumo, do mesmo jeito.
  if (aula.presenca === 'ausente') {
    return { destino: 'utilizados', texto: `${flexionar('consumido', 'consumidos')} — falta` };
  }
  if (aula.presenca === 'presente' || aula.situacao === 'realizado') {
    return { destino: 'utilizados', texto: flexionar('utilizado', 'utilizados') };
  }

  return { destino: 'reservados', texto: flexionar('reservado', 'reservados') };
}

/**
 * Agenda da aluna logada: grade disponível para agendar (M7) e as próprias
 * aulas, com o que é preciso para cancelar ou justificar (M8).
 */
export function useAgendaDaAluna(usuarioId: string | undefined) {
  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [carteira, setCarteira] = useState<Carteira | undefined>();
  const [leitura, setLeitura] = useState<LeituraDaCarteira | undefined>();
  const [pacote, setPacote] = useState<Pacote | undefined>();
  const [custoDaAula, setCustoDaAula] = useState(1);
  const [disponiveis, setDisponiveis] = useState<AulaDisponivel[]>([]);
  const [minhasAulas, setMinhasAulas] = useState<AulaDaAluna[]>([]);
  const [bloqueio, setBloqueio] = useState<BloqueioDaAluna | undefined>();
  const [janelaDias, setJanelaDias] = useState(0);
  const [antecedenciaHoras, setAntecedenciaHoras] = useState(4);
  const [prazoJustificativaDias, setPrazoJustificativaDias] = useState(7);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!usuarioId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);

    const [
      alunas,
      pacotes,
      agendamentos,
      ocorrencias,
      sessoes,
      modalidades,
      professoras,
      usuarios,
      justificativas,
      chamadas,
      registrosPresenca,
    ] = await Promise.all([
      alunaRepositorio.listar(),
      pacoteRepositorio.listar(),
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      justificativaRepositorio.listar(),
      chamadaRepositorio.listar(),
      registroPresencaRepositorio.listar(),
    ]);

    const minha = alunas.find((a) => a.usuarioId === usuarioId);
    setAluna(minha);

    if (!minha) {
      setCarteira(undefined);
      setLeitura(undefined);
      setPacote(undefined);
      setCarregando(false);
      return;
    }

    const situacao = await carregarSituacaoDeAgendamento(minha);
    const limiares = await limiaresFinalizando();

    setCarteira(situacao.carteira);
    setLeitura(situacao.carteira ? lerCarteira(situacao.carteira, hojeISO(), limiares) : undefined);
    setPacote(pacotes.find((p) => p.id === situacao.carteira?.pacoteId));
    setCustoDaAula(situacao.custoDaAula);
    setBloqueio(situacao.bloqueio);
    setJanelaDias(await janelaDeAgendamentoEmDias(minha));
    setAntecedenciaHoras(await antecedenciaMinimaEmHoras());
    setPrazoJustificativaDias(await prazoDeJustificativaEmDias());
    setDisponiveis(
      await listarAulasDisponiveis({
        aluna: minha,
        carteira: situacao.carteira,
        custoDaAula: situacao.custoDaAula,
      }),
    );

    const agora = new Date();

    // RF-AEX-09: as aulas excepcionais em que a aluna foi alocada aparecem
    // junto das demais, com o consumo de créditos correspondente.
    const alocacoes = await alocacoesDaAluna(minha.id);
    const excepcionais: AulaDaAluna[] = alocacoes.map((alocacao) => ({
      id: alocacao.id,
      alunaId: alocacao.alunaId,
      ocorrenciaSessaoId: '',
      // A alocação não passa por portal nem por convênio: quem inclui a
      // aluna é a administração (RF-AEX-04).
      origem: 'administracao',
      tipoDeAula: 'excepcional',
      dataHora: alocacao.data,
      situacao: alocacao.situacao === 'cancelada' ? 'cancelado' : 'ativo',
      experimental: false,
      creditosReservados: alocacao.creditosConsumidos,
      data: alocacao.aula.data,
      horarioInicio: alocacao.aula.horarioInicio,
      horarioFim: alocacao.aula.horarioFim,
      nomeModalidade: alocacao.aula.nome,
      nomeProfessora: alocacao.aula.professoras.map((prof) => prof.nome).join(', ') || 'Sem professora vinculada',
      canceladaPeloStudio: alocacao.aula.situacao === 'cancelada',
      motivoCancelamento: alocacao.motivoCancelamento,
      justificativa: undefined,
      horasAteAAula: horasAteAula(alocacao.aula.data, alocacao.aula.horarioInicio, agora),
      presenca: undefined,
    }));

    const daGrade: AulaDaAluna[] = agendamentos
      .filter((a) => a.alunaId === minha.id)
      .map((agendamento) => {
        const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
        const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
        const professora = professoras.find((p) => p.id === (ocorrencia?.professoraEfetivaId ?? sessao?.professoraId));
        const usuarioProfessora = usuarios.find((u) => u.id === professora?.usuarioId);
        const data = ocorrencia?.data ?? '';
        const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === agendamento.ocorrenciaSessaoId);
        const registro =
          chamada?.situacao === 'finalizada'
            ? registrosPresenca.find((r) => r.chamadaId === chamada.id && r.alunaId === minha.id)
            : undefined;

        return {
          ...agendamento,
          tipoDeAula: 'grade' as const,
          presenca: registro?.situacao,
          data,
          horarioInicio: sessao?.horarioInicio ?? '',
          horarioFim: sessao?.horarioFim ?? '',
          nomeModalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade removida',
          nomeProfessora: usuarioProfessora?.nome ?? 'Professora removida',
          canceladaPeloStudio: ocorrencia?.situacao === 'cancelada',
          motivoCancelamento: ocorrencia?.motivoCancelamento,
          justificativa: justificativas.find((j) => j.agendamentoId === agendamento.id),
          horasAteAAula: data && sessao ? horasAteAula(data, sessao.horarioInicio, agora) : 0,
        };
      });

    const aulas = [...daGrade, ...excepcionais].sort(
      (a, b) => b.data.localeCompare(a.data) || b.horarioInicio.localeCompare(a.horarioInicio),
    );

    setMinhasAulas(aulas);
    setCarregando(false);
  }, [usuarioId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const hoje = hojeISO();
  const proximas = minhasAulas.filter((a) => a.situacao === 'ativo' && a.data >= hoje && !a.canceladaPeloStudio);
  const historico = minhasAulas.filter((a) => !proximas.includes(a));

  return {
    aluna,
    carteira,
    leitura,
    pacote,
    custoDaAula,
    disponiveis,
    minhasAulas,
    proximas,
    historico,
    bloqueio,
    janelaDias,
    antecedenciaHoras,
    prazoJustificativaDias,
    carregando,
    recarregar,
    hoje,
  };
}
