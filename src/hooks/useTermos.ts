import { useCallback, useEffect, useState } from 'react';
import {
  aceiteRegistradoRepositorio,
  termoAceiteRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { AceiteRegistrado, PublicoDoTermo, TermoAceite } from '../types/domain';

/**
 * Mescla os dados da usuária no texto do termo (RF-ALU-05, PA-05).
 *
 * O termo é um só por versão — a aluna não assina um contrato por pacote —
 * e é esta mesclagem que o torna nominal: o texto exibido e o texto gravado
 * no aceite trazem o nome e o CPF de quem assinou. Placeholders que o texto
 * não tiver simplesmente não aparecem; um termo sem eles continua válido.
 */
export function mesclarTermo(conteudo: string, dados: { nome: string; cpf: string }): string {
  return conteudo.replaceAll('{{nome}}', dados.nome).replaceAll('{{cpf}}', dados.cpf);
}
import { RegraNegocioError } from './useModalidades';

/**
 * Termo de prestação de serviço versionado (RF-ALU-05/06, RF-PRO-04).
 *
 * Publicar uma nova versão nunca reescreve a anterior: a versão vigente
 * passa a ser a nova e as antigas ficam inativas, mas preservadas — é o
 * que permite saber exatamente qual texto cada usuária aceitou. O aceite
 * grava também o **conteúdo integral** da versão aceita, para que o
 * registro continue íntegro mesmo que o termo mude depois.
 *
 * Aluna e professora têm textos e versões independentes: publicar um novo
 * termo de aluna não pode inativar o que as professoras já aceitaram, e
 * por isso a vigência é apurada dentro de cada público.
 */
export function useTermos(publicoAlvo: PublicoDoTermo = 'aluna') {
  const [termos, setTermos] = useState<TermoAceite[]>([]);
  const [aceites, setAceites] = useState<AceiteRegistrado[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, listaAceites] = await Promise.all([
      termoAceiteRepositorio.listar(),
      aceiteRegistradoRepositorio.listar(),
    ]);
    setTermos(lista.filter((t) => (t.publicoAlvo ?? 'aluna') === publicoAlvo).sort((a, b) => b.versao - a.versao));
    setAceites(listaAceites);
    setCarregando(false);
  }, [publicoAlvo]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const vigente = termos.find((t) => t.situacao === 'ativo');

  async function publicarNovaVersao(conteudo: string) {
    const texto = conteudo.trim();
    if (!texto) throw new RegraNegocioError('O conteúdo do termo não pode ficar em branco.');

    const listaAtual = (await termoAceiteRepositorio.listar()).filter(
      (t) => (t.publicoAlvo ?? 'aluna') === publicoAlvo,
    );
    for (const termo of listaAtual.filter((t) => t.situacao === 'ativo')) {
      await termoAceiteRepositorio.atualizar(termo.id, { situacao: 'inativo' });
    }

    const proximaVersao = listaAtual.reduce((maior, t) => Math.max(maior, t.versao), 0) + 1;
    await termoAceiteRepositorio.criar({
      publicoAlvo,
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
 * Aceite do termo pela professora (RF-PRO-04).
 *
 * Usa o mesmo mecanismo de registro das alunas — mesma entidade, mesmo
 * conteúdo gravado por extenso —, e é o próprio aceite que libera o
 * acesso: diferente da aluna, não há pagamento nem anamnese a esperar.
 */
export async function registrarAceiteDaProfessora(params: {
  usuarioId: string;
  assinante: { nome: string; cpf: string };
  termo: TermoAceite;
}): Promise<void> {
  const { usuarioId, assinante, termo } = params;

  await aceiteRegistradoRepositorio.criar({
    usuarioId,
    termoVersaoId: termo.id,
    dataHora: new Date().toISOString(),
    enderecoIp: '203.0.113.10 (simulado no protótipo)',
    conteudoAceito: mesclarTermo(termo.conteudo, assinante),
  });

  await usuarioRepositorio.atualizar(usuarioId, { situacao: 'ativo' });
}
