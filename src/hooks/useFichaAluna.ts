import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  anamneseRepositorio,
  ocorrenciaSessaoRepositorio,
  pacoteRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type {
  Agendamento,
  Aluna,
  Anamnese,
  Carteira,
  MovimentoCredito,
  Pacote,
  Usuario,
  Venda,
} from '../types/domain';
import { hojeISO } from '../utils/data';
import { lerCarteira, type LeituraDaCarteira, type LimiaresFinalizando } from '../utils/creditos';
import { carteirasDaAluna, extratoDaAluna, limiaresFinalizando } from './carteiraDeCreditos';
import { historicoDeComprasDaAluna } from './vendas';

export interface FrequenciaDaAluna extends Agendamento {
  dataAula: string;
}

export interface FichaAluna {
  aluna: Aluna;
  usuario: Usuario;
  /** Carteira vigente; indefinida quando a aluna está sem pacote ativo (RF-CRE-11). */
  carteira: Carteira | undefined;
  leitura: LeituraDaCarteira | undefined;
  pacote: Pacote | undefined;
  anamnese: Anamnese | undefined;
  /** Histórico permanente de carteiras, inclusive as encerradas (RF-HIS-01). */
  carteiras: Carteira[];
  /** Extrato de movimentos de crédito de todas as carteiras (RF-CRE-08). */
  movimentos: MovimentoCredito[];
  /** Histórico de compras (RF-VEN-06). */
  compras: Venda[];
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

    const [alunas, usuarios, pacotes, anamneses, agendamentos, ocorrencias, carteiras, movimentos, compras, limiares] =
      await Promise.all([
        alunaRepositorio.listar(),
        usuarioRepositorio.listar(),
        pacoteRepositorio.listar(),
        anamneseRepositorio.listar(),
        agendamentoRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        carteirasDaAluna(alunaId),
        extratoDaAluna(alunaId),
        historicoDeComprasDaAluna(alunaId),
        limiaresFinalizando(),
      ]);

    const aluna = alunas.find((a) => a.id === alunaId);
    const usuario = aluna && usuarios.find((u) => u.id === aluna.usuarioId);
    if (!aluna || !usuario) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    const carteira = carteiras.find((c) => c.situacao === 'ativa' && !lerCarteira(c, hoje, limiares).encerrada);

    const frequencia = agendamentos
      .filter((a) => a.alunaId === aluna.id)
      .map((agendamento) => ({
        ...agendamento,
        dataAula: ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId)?.data ?? '',
      }))
      .sort((a, b) => b.dataAula.localeCompare(a.dataAula));

    setFicha({
      aluna,
      usuario,
      carteira,
      leitura: carteira ? lerCarteira(carteira, hoje, limiares) : undefined,
      pacote: pacotes.find((p) => p.id === carteira?.pacoteId),
      anamnese: anamneses.find((a) => a.alunaId === aluna.id),
      carteiras,
      movimentos,
      compras,
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
