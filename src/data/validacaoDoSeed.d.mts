/** Tipos de `validacaoDoSeed.mjs` — ver as regras no próprio módulo. */

export interface ResultadoDaValidacao {
  /** Inconsistências que impedem a carga: o protótipo mentiria com elas. */
  erros: string[];
  /** Cenários do guia indisponíveis naquele dia. Não impedem nada. */
  avisos: string[];
}

export function validarSeedResolvido(seed: unknown, hoje: string): ResultadoDaValidacao;

/** Lança se houver erro; devolve os avisos. */
export function exigirSeedCoerente(seed: unknown, hoje: string): string[];
