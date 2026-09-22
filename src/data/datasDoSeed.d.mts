/** Tipos de `datasDoSeed.mjs` — ver a gramática dos tokens no próprio módulo. */

/** Data de hoje no fuso local, como `YYYY-MM-DD`. */
export function hojeLocalISO(): string;

/** Resolve um token (`@hoje-5`, `@proxima(segunda,quarta)T10:15`, `@fixa(...)`) para uma data ISO. Lança erro se inválido. */
export function resolverToken(token: string, hoje?: string): string;

/** Cópia do seed com todos os tokens de data resolvidos em relação a `hoje`. */
export function resolverDatasDoSeed<T>(seed: T, hoje?: string): T;
