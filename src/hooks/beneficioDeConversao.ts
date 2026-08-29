import {
  agendamentoRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  vendaRepositorio,
} from '../services/repositorios';
import type { BeneficioAplicado, TipoBeneficioConversao } from '../types/domain';
import { hojeISO, somarDias } from '../utils/data';
import { formatarCreditos, formatarMoeda } from '../utils/creditos';

/**
 * Benefício de conversão da aula experimental (RF-EXP-08, PA-04).
 *
 * Vive em módulo próprio, e não junto do resto do M13, porque quem o
 * aplica é a venda: `aulasExperimentais` já importa de `vendas`, e pôr a
 * regra lá fecharia um ciclo entre os dois arquivos.
 */
export interface BeneficioDeConversao extends BeneficioAplicado {
  /** Data da aula experimental que deu origem ao benefício. */
  dataAula: string;
  /** Último dia em que ele pode ser usado. */
  validoAte: string;
  rotulo: string;
}

/**
 * Benefício a que a aluna tem direito por comprar depois da aula
 * experimental, ou `undefined` quando não há.
 *
 * As três condições são cumulativas: ela fez uma aula experimental, ainda
 * está dentro do prazo configurado (PA-04) e **ainda não comprou nenhum
 * pacote desde então**. A terceira é o que faz o benefício valer uma vez:
 * o escopo o concede a quem "adquire um pacote após realizar a aula
 * experimental" (RF-EXP-08), e não a cada compra futura.
 *
 * A quantidade zero desliga o benefício sem exigir mudança de código — é
 * como a administração o suspende pela tela de parâmetros.
 */
export async function beneficioDeConversaoDisponivel(
  alunaId: string,
  hoje = hojeISO(),
): Promise<BeneficioDeConversao | undefined> {
  const parametros = await parametroRepositorio.listar();
  const valorDe = (chave: string) => parametros.find((p) => p.chave === chave)?.valor;

  const tipo = String(valorDe('beneficio_conversao_tipo') ?? '') as TipoBeneficioConversao;
  const quantidade = Number(valorDe('beneficio_conversao_quantidade'));
  const validadeDias = Number(valorDe('beneficio_conversao_validade_dias'));

  if (tipo !== 'credito_adicional' && tipo !== 'desconto_valor') return undefined;
  if (!Number.isFinite(quantidade) || quantidade <= 0) return undefined;
  if (!Number.isFinite(validadeDias) || validadeDias < 0) return undefined;

  const [agendamentos, ocorrencias, vendas] = await Promise.all([
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    vendaRepositorio.listar(),
  ]);

  // A experimental mais recente da aluna que não foi cancelada.
  const datas = agendamentos
    .filter((a) => a.alunaId === alunaId && a.experimental && a.situacao !== 'cancelado')
    .map((a) => ocorrencias.find((o) => o.id === a.ocorrenciaSessaoId)?.data)
    .filter((data): data is string => Boolean(data) && data! <= hoje)
    .sort((a, b) => b.localeCompare(a));

  const dataAula = datas[0];
  if (!dataAula) return undefined;

  const validoAte = somarDias(dataAula, validadeDias);
  if (hoje > validoAte) return undefined;

  // Já comprou pacote depois da aula: o benefício foi usado (ou perdido
  // numa compra anterior a esta regra existir).
  const jaComprou = vendas.some(
    (v) =>
      v.alunaId === alunaId &&
      v.tipo === 'pacote' &&
      (v.situacao === 'confirmada' || v.situacao === 'pendente') &&
      v.data >= dataAula,
  );
  if (jaComprou) return undefined;

  return {
    tipo,
    quantidade,
    dataAula,
    validoAte,
    // As telas já dizem que o benefício vem da aula experimental; repetir
    // isso no rótulo produzia "ganhou R$ 50,00 de desconto pela aula
    // experimental" logo depois de "Você fez uma aula experimental".
    rotulo:
      tipo === 'credito_adicional'
        ? `${formatarCreditos(quantidade)} de bônus`
        : `${formatarMoeda(quantidade)} de desconto`,
  };
}

/** Aplica o benefício aos números da compra, sem tocar no catálogo. */
export function aplicarBeneficio(
  pacote: { creditos: number; valor: number },
  beneficio: BeneficioAplicado | undefined,
): { creditos: number; valor: number } {
  if (!beneficio) return { creditos: pacote.creditos, valor: pacote.valor };

  return beneficio.tipo === 'credito_adicional'
    ? { creditos: pacote.creditos + beneficio.quantidade, valor: pacote.valor }
    : // O desconto nunca deixa o valor negativo: um benefício maior que o
      // pacote zera a compra em vez de gerar crédito a devolver.
      { creditos: pacote.creditos, valor: Math.max(0, pacote.valor - beneficio.quantidade) };
}
