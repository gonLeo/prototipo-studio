import { useCallback, useEffect, useState } from 'react';
import {
  aceiteRegistradoRepositorio,
  anamneseRepositorio,
  alunaRepositorio,
  termoAceiteRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { AceiteRegistrado, TermoAceite } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

/**
 * Termo de prestação de serviço versionado (RF-ALU-05/06).
 *
 * Publicar uma nova versão nunca reescreve a anterior: a versão vigente
 * passa a ser a nova e as antigas ficam inativas, mas preservadas — é o
 * que permite saber exatamente qual texto cada aluna aceitou. O aceite
 * grava também o **conteúdo integral** da versão aceita, para que o
 * registro continue íntegro mesmo que o termo mude depois.
 */
export function useTermos() {
  const [termos, setTermos] = useState<TermoAceite[]>([]);
  const [aceites, setAceites] = useState<AceiteRegistrado[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, listaAceites] = await Promise.all([
      termoAceiteRepositorio.listar(),
      aceiteRegistradoRepositorio.listar(),
    ]);
    setTermos(lista.sort((a, b) => b.versao - a.versao));
    setAceites(listaAceites);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const vigente = termos.find((t) => t.situacao === 'ativo');

  async function publicarNovaVersao(conteudo: string) {
    const texto = conteudo.trim();
    if (!texto) throw new RegraNegocioError('O conteúdo do termo não pode ficar em branco.');

    const listaAtual = await termoAceiteRepositorio.listar();
    for (const termo of listaAtual.filter((t) => t.situacao === 'ativo')) {
      await termoAceiteRepositorio.atualizar(termo.id, { situacao: 'inativo' });
    }

    const proximaVersao = listaAtual.reduce((maior, t) => Math.max(maior, t.versao), 0) + 1;
    await termoAceiteRepositorio.criar({
      versao: proximaVersao,
      conteudo: texto,
      dataPublicacao: new Date().toISOString(),
      situacao: 'ativo',
    });
    await recarregar();
  }

  function quantidadeDeAceites(termoId: string) {
    return aceites.filter((a) => a.termoVersaoId === termoId).length;
  }

  return { termos, aceites, vigente, carregando, publicarNovaVersao, quantidadeDeAceites, recarregar };
}

/**
 * Registra o aceite do termo e a anamnese de uma usuária, liberando o
 * acesso ao agendamento (RF-ALU-05/07/08).
 *
 * O endereço de IP é exigido pelo escopo como parte do registro. No
 * protótipo não há servidor que o informe, então gravamos um valor
 * simulado e sinalizado — na API real ele virá da requisição.
 */
export async function registrarAceiteEAnamnese(params: {
  usuarioId: string;
  alunaId?: string;
  termo: TermoAceite;
  respostasAnamnese: Record<string, string>;
}): Promise<void> {
  const { usuarioId, alunaId, termo, respostasAnamnese } = params;

  await aceiteRegistradoRepositorio.criar({
    usuarioId,
    termoVersaoId: termo.id,
    dataHora: new Date().toISOString(),
    enderecoIp: '203.0.113.10 (simulado no protótipo)',
    // Guarda o texto aceito, não só a referência: se o termo for
    // reescrito depois, o registro do aceite continua íntegro.
    conteudoAceito: termo.conteudo,
  });

  if (alunaId) {
    await anamneseRepositorio.criar({
      alunaId,
      respostas: respostasAnamnese,
      dataPreenchimento: new Date().toISOString(),
      versaoQuestionario: 1,
    });
    await alunaRepositorio.atualizar(alunaId, { situacao: 'ativa' });
  }

  await usuarioRepositorio.atualizar(usuarioId, { situacao: 'ativo' });
}
