import { useCallback, useEffect, useState } from 'react';
import {
  alunaRepositorio,
  carteiraRepositorio,
  pacoteRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Aluna, Carteira, Pacote, SituacaoAluna, Usuario } from '../types/domain';
import { hojeISO } from '../utils/data';
import { lerCarteira, type LeituraDaCarteira, type LimiaresFinalizando } from '../utils/creditos';
import { limiaresFinalizando } from './carteiraDeCreditos';
import { pendenciasDasAlunas, SEM_PENDENCIA, type PendenciaDeAceite } from './pendenciasDeAceite';

export interface AlunaComDetalhes extends Aluna {
  usuario: Usuario;
  /** Carteira vigente; indefinida quando a aluna está sem pacote ativo. */
  carteira: Carteira | undefined;
  leitura: LeituraDaCarteira | undefined;
  pacote: Pacote | undefined;
  /** Termo e anamnese em aberto (RF-ALU-08). */
  pendencia: PendenciaDeAceite;
}

export const ROTULO_SITUACAO_ALUNA: Record<SituacaoAluna, string> = {
  ativa: 'Ativa',
  trancada: 'Trancada',
  aguardando_aceite: 'Aguardando aceite',
};

/**
 * Rótulo do acesso na lista: diz **qual** pendência está em aberto, em vez
 * de repetir "aguardando aceite" para os três casos (RF-ALU-08).
 */
export function rotuloDeAcesso(aluna: AlunaComDetalhes): string {
  if (aluna.situacao === 'trancada') return 'Trancada';
  if (aluna.pendencia.termo && aluna.pendencia.anamnese) return 'Aguardando aceite';
  if (aluna.pendencia.termo) return 'Termo pendente';
  if (aluna.pendencia.anamnese) return 'Anamnese pendente';
  return 'Ativa';
}

/**
 * Filtros da lista de alunas (RF-ALU-10, RF-BOL-07).
 *
 * "Com pacote ativo" e "sem pacote ativo" são leituras da carteira, não
 * situações do cadastro: o escopo não distingue carteira consumida de
 * vencida em lugar nenhum da interface (RF-CRE-11).
 */
export type FiltroAluna =
  | 'todas'
  | 'com_pacote_ativo'
  | 'sem_pacote_ativo'
  | 'trancada'
  | 'aguardando_aceite'
  | 'pacote_a_vencer'
  | 'bolsistas';

export const FILTROS_ALUNA: Array<{ valor: FiltroAluna; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'com_pacote_ativo', rotulo: 'Com pacote ativo' },
  { valor: 'sem_pacote_ativo', rotulo: 'Sem pacote ativo' },
  { valor: 'trancada', rotulo: 'Trancadas' },
  { valor: 'aguardando_aceite', rotulo: 'Aguardando aceite' },
  { valor: 'pacote_a_vencer', rotulo: 'Pacote a vencer' },
  { valor: 'bolsistas', rotulo: 'Bolsistas' },
];

export function aplicarFiltroDeAluna(aluna: AlunaComDetalhes, filtro: FiltroAluna): boolean {
  switch (filtro) {
    case 'todas':
      return true;
    case 'bolsistas':
      return aluna.bolsista;
    case 'com_pacote_ativo':
      return Boolean(aluna.carteira);
    case 'sem_pacote_ativo':
      return !aluna.carteira;
    case 'pacote_a_vencer':
      // Reaproveita o limiar do status Finalizando: é o mesmo conceito de
      // "está acabando" que dispara o aviso à aluna.
      return aluna.leitura?.motivoFinalizando !== undefined;
    case 'aguardando_aceite':
      // Vale o cálculo, não o campo: o filtro precisa pegar também a aluna
      // trancada que deixou termo ou anamnese em aberto (RF-ALU-08).
      return aluna.pendencia.alguma;
    default:
      return aluna.situacao === filtro;
  }
}

export function useAlunas() {
  const [alunas, setAlunas] = useState<AlunaComDetalhes[]>([]);
  const [limiares, setLimiares] = useState<LimiaresFinalizando | undefined>();
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const hoje = hojeISO();

    const [lista, usuarios, carteiras, pacotes, limiaresAtuais] = await Promise.all([
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
      carteiraRepositorio.listar(),
      pacoteRepositorio.listar(),
      limiaresFinalizando(),
    ]);
    const pendencias = await pendenciasDasAlunas(lista);

    const combinadas: AlunaComDetalhes[] = [];

    for (const aluna of lista) {
      const usuario = usuarios.find((u) => u.id === aluna.usuarioId);
      if (!usuario) continue;

      const daAluna = carteiras.filter((c) => c.alunaId === aluna.id);
      const carteira = daAluna.find(
        (c) => c.situacao === 'ativa' && !lerCarteira(c, hoje, limiaresAtuais).encerrada,
      );

      combinadas.push({
        ...aluna,
        usuario,
        carteira,
        leitura: carteira ? lerCarteira(carteira, hoje, limiaresAtuais) : undefined,
        pacote: pacotes.find((p) => p.id === carteira?.pacoteId),
        pendencia: pendencias[aluna.id] ?? SEM_PENDENCIA,
      });
    }

    setAlunas(combinadas.sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome)));
    setLimiares(limiaresAtuais);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function buscarPorId(alunaId: string) {
    return alunas.find((a) => a.id === alunaId);
  }

  return { alunas, limiares, carregando, recarregar, buscarPorId, hoje: hojeISO() };
}
