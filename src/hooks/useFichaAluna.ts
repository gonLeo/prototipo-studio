import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  aceiteRegistradoRepositorio,
  anamneseRepositorio,
  chamadaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Agendamento,
  Aluna,
  Anamnese,
  Carteira,
  MovimentoCredito,
  Pacote,
  Reembolso,
  Trancamento,
  Usuario,
} from '../types/domain';
import { pendenciasDaAluna, type PendenciaDeAceite } from './pendenciasDeAceite';
import { hojeISO } from '../utils/data';
import { lerCarteira, type LeituraDaCarteira, type LimiaresFinalizando } from '../utils/creditos';
import { carteirasDaAluna, extratoDaAluna, limiaresFinalizando } from './carteiraDeCreditos';
import { historicoDeComprasDaAluna, type CompraDaAluna } from './vendas';
import { trancamentosDaAluna } from './trancamento';
import { alocacoesDaAluna } from './aulasExcepcionais';
import { reembolsosDaAluna } from './reembolsos';

export interface FrequenciaDaAluna extends Agendamento {
  dataAula: string;
  /** Nome da aula excepcional, quando a linha vem de uma alocação (RF-AEX-09). */
  nomeAulaExcepcional?: string;
  horarioInicio: string;
  horarioFim: string;
  nomeModalidade: string;
  /** A ocorrência daquela data foi cancelada pelo studio. */
  canceladaPeloStudio: boolean;
  /** Presença registrada na chamada, quando ela já foi finalizada (RF-PRE-07). */
  presenca: 'presente' | 'ausente' | undefined;
  /**
   * A administração pode cancelar e remarcar em nome da aluna (RF-AGD-08),
   * mas só faz sentido em aula da grade que ainda vai acontecer.
   */
  podeRemanejar: boolean;
}

export interface FichaAluna {
  aluna: Aluna;
  usuario: Usuario;
  /** Carteira vigente; indefinida quando a aluna está sem pacote ativo (RF-CRE-11). */
  carteira: Carteira | undefined;
  leitura: LeituraDaCarteira | undefined;
  pacote: Pacote | undefined;
  anamnese: Anamnese | undefined;
  /** Termo e anamnese em aberto (RF-ALU-08), e quando o termo foi aceito. */
  pendencia: PendenciaDeAceite;
  dataDoAceite: string | undefined;
  /** Histórico permanente de carteiras, inclusive as encerradas (RF-HIS-01). */
  carteiras: Carteira[];
  /** Extrato de movimentos de crédito de todas as carteiras (RF-CRE-08). */
  movimentos: MovimentoCredito[];
  /** Histórico de compras (RF-VEN-06). */
  compras: CompraDaAluna[];
  /** Trancamentos anteriores, apoio à decisão da administração (RF-TRA-07). */
  trancamentos: Trancamento[];
  /** Trancamento em curso, quando existe. */
  trancamentoAtivo: Trancamento | undefined;
  /**
   * Reembolsos aplicados ao cadastro desta aluna (RF-REE-10). Só existem
   * na ficha administrativa — o perfil da aluna não expõe o recurso.
   */
  reembolsos: Reembolso[];
  frequencia: FrequenciaDaAluna[];
  pacotes: Pacote[];
  limiares: LimiaresFinalizando;
}

/**
 * Visão consolidada da aluna (RF-ALU-09): dados cadastrais, anamnese,
 * pacote vigente, saldo de créditos, validade, histórico de frequência,
 * histórico de compras e histórico de pacotes.
 *
 * A situação da carteira é **derivada** por `lerCarteira`, não lida do
 * registro: uma carteira cuja validade já passou aparece como expirada
 * mesmo antes de a rotina de carteiras consolidar o encerramento — e
 * carregar a ficha continua não escrevendo no banco.
 */
export function useFichaAluna(alunaId: string | undefined) {
  const [ficha, setFicha] = useState<FichaAluna | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!alunaId) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    const hoje = hojeISO();

    const [
      alunas,
      usuarios,
      pacotes,
      anamneses,
      agendamentos,
      ocorrencias,
      sessoes,
      modalidades,
      chamadas,
      registrosPresenca,
      carteiras,
      movimentos,
      compras,
      trancamentos,
      reembolsos,
      limiares,
    ] = await Promise.all([
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
      pacoteRepositorio.listar(),
      anamneseRepositorio.listar(),
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      chamadaRepositorio.listar(),
      registroPresencaRepositorio.listar(),
      carteirasDaAluna(alunaId),
      extratoDaAluna(alunaId),
      historicoDeComprasDaAluna(alunaId),
      trancamentosDaAluna(alunaId),
      reembolsosDaAluna(alunaId),
      limiaresFinalizando(),
    ]);

    // RF-AEX-09: a participação em workshop e aula particular entra no
    // histórico de frequência, com o consumo de créditos correspondente.
    const alocacoes = await alocacoesDaAluna(alunaId);

    const aluna = alunas.find((a) => a.id === alunaId);
    const usuario = aluna && usuarios.find((u) => u.id === aluna.usuarioId);
    if (!aluna || !usuario) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    const carteira = carteiras.find((c) => c.situacao === 'ativa' && !lerCarteira(c, hoje, limiares).encerrada);

    const daGrade: FrequenciaDaAluna[] = agendamentos
      .filter((a) => a.alunaId === aluna.id)
      .map((agendamento) => {
        const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
        const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
        const dataAula = ocorrencia?.data ?? '';
        const chamada = chamadas.find((c) => c.ocorrenciaSessaoId === agendamento.ocorrenciaSessaoId);
        const registro =
          chamada?.situacao === 'finalizada'
            ? registrosPresenca.find((r) => r.chamadaId === chamada.id && r.alunaId === aluna.id)
            : undefined;
        const canceladaPeloStudio = ocorrencia?.situacao === 'cancelada';

        return {
          ...agendamento,
          dataAula,
          horarioInicio: sessao?.horarioInicio ?? '',
          horarioFim: sessao?.horarioFim ?? '',
          nomeModalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade removida',
          canceladaPeloStudio,
          presenca: registro?.situacao,
          podeRemanejar:
            agendamento.situacao === 'ativo' && !canceladaPeloStudio && dataAula >= hoje && !agendamento.experimental,
        };
      });

    const deAulasExcepcionais: FrequenciaDaAluna[] = alocacoes.map((alocacao) => ({
      id: alocacao.id,
      alunaId: alocacao.alunaId,
      ocorrenciaSessaoId: '',
      origem: 'administracao',
      dataHora: alocacao.data,
      situacao: alocacao.situacao === 'cancelada' ? 'cancelado' : 'realizado',
      experimental: false,
      creditosReservados: alocacao.creditosConsumidos,
      dataAula: alocacao.aula.data,
      nomeAulaExcepcional: alocacao.aula.nome,
      horarioInicio: alocacao.aula.horarioInicio,
      horarioFim: alocacao.aula.horarioFim,
      nomeModalidade: alocacao.aula.nome,
      canceladaPeloStudio: alocacao.aula.situacao === 'cancelada',
      presenca: undefined,
      // Quem remaneja alocação é a tela de aulas excepcionais (RF-AEX-07).
      podeRemanejar: false,
    }));

    const frequencia = [...daGrade, ...deAulasExcepcionais].sort((a, b) =>
      b.dataAula.localeCompare(a.dataAula),
    );

    setFicha({
      aluna,
      usuario,
      carteira,
      leitura: carteira ? lerCarteira(carteira, hoje, limiares) : undefined,
      pacote: pacotes.find((p) => p.id === carteira?.pacoteId),
      anamnese: anamneses.find((a) => a.alunaId === aluna.id),
      pendencia: await pendenciasDaAluna(aluna),
      dataDoAceite: (await aceiteRegistradoRepositorio.listar())
        .filter((a) => a.usuarioId === aluna.usuarioId)
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0]?.dataHora,
      carteiras,
      movimentos,
      compras,
      trancamentos,
      trancamentoAtivo: trancamentos.find((t) => t.situacao === 'em_curso'),
      reembolsos,
      frequencia,
      pacotes,
      limiares,
    });
    setCarregando(false);
  }, [alunaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ficha, carregando, recarregar, hoje: hojeISO() };
}
