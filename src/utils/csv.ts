/**
 * Exportação em CSV das listagens (RF-PNL-06).
 *
 * Separador `;` e BOM UTF-8 de propósito: é o que faz o Excel em português
 * abrir o arquivo com as colunas certas e os acentos corretos sem pedir
 * importação manual.
 */

export interface ColunaCSV<T> {
  cabecalho: string;
  valor: (item: T) => string | number | undefined;
}

function escapar(valor: string | number | undefined): string {
  const texto = valor === undefined || valor === null ? '' : String(valor);
  // Aspas, separador e quebra de linha exigem o campo entre aspas.
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function gerarCSV<T>(colunas: ColunaCSV<T>[], itens: T[]): string {
  const linhas = [
    colunas.map((coluna) => escapar(coluna.cabecalho)).join(';'),
    ...itens.map((item) => colunas.map((coluna) => escapar(coluna.valor(item))).join(';')),
  ];
  return linhas.join('\r\n');
}

/** Dispara o download do arquivo no navegador. */
export function baixarCSV<T>(params: {
  nomeArquivo: string;
  colunas: ColunaCSV<T>[];
  itens: T[];
}): void {
  const { nomeArquivo, colunas, itens } = params;

  const conteudo = `﻿${gerarCSV(colunas, itens)}`;
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
