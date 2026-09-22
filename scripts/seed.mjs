import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { hojeLocalISO, resolverDatasDoSeed } from '../src/data/datasDoSeed.mjs';
import { exigirSeedCoerente } from '../src/data/validacaoDoSeed.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(root, 'src', 'data', 'seed.json');

/** Caminho padrão da cópia de trabalho do json-server. */
export const caminhoPadraoDoBanco = join(root, 'db.json');

/**
 * Carrega o backfill com as datas já resolvidas para `hoje` e verifica a
 * coerência entre os registros.
 *
 * As datas do backfill são tokens relativos ("@hoje-5", "@proxima(segunda)")
 * e só viram datas de verdade aqui, em relação ao dia da carga — por isso o
 * arquivo nunca é copiado tal qual. A gramática está em datasDoSeed.mjs.
 *
 * Resolver as datas certo não basta: os registros precisam continuar
 * coerentes entre si. Erro aqui interrompe a carga de propósito — melhor o
 * `npm run seed` quebrar do que o protótipo subir com aula fora da grade.
 */
export function carregarBackfill(hoje = hojeLocalISO()) {
  const backfill = resolverDatasDoSeed(JSON.parse(readFileSync(seedPath, 'utf-8')), hoje);

  for (const aviso of exigirSeedCoerente(backfill, hoje)) {
    console.warn(`Aviso: ${aviso}`);
  }

  return backfill;
}

/**
 * Garante que o arquivo do json-server exista e tenha todas as coleções do
 * backfill. Devolve a mensagem do que foi feito, para quem chamou decidir
 * como registrar.
 */
export function garantirBancoDeDados(dbPath = caminhoPadraoDoBanco, hoje = hojeLocalISO()) {
  const backfill = carregarBackfill(hoje);

  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, `${JSON.stringify(backfill, null, 2)}\n`, 'utf-8');
    return `db.json criado a partir do backfill (src/data/seed.json), com as datas resolvidas para ${hoje}.`;
  }

  // O db.json existente é a cópia de trabalho e não é sobrescrito — os dados
  // que a usuária criou navegando continuam ali. Mas uma coleção nova do
  // backfill precisa passar a existir: o json-server responde 404 (não lista
  // vazia) para uma chave ausente, e nem a tela nem o "Resetar protótipo"
  // conseguem criá-la depois. Por isso as chaves que faltam entram aqui, já
  // com o conteúdo do backfill.
  const db = JSON.parse(readFileSync(dbPath, 'utf-8'));

  const novas = Object.keys(backfill).filter((recurso) => !(recurso in db));
  if (novas.length === 0) {
    return 'db.json já existe — mantendo dados atuais. Use o botão "Resetar protótipo" para restaurar o backfill.';
  }

  for (const recurso of novas) {
    db[recurso] = backfill[recurso];
  }
  writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf-8');
  return `db.json já existe — mantendo dados atuais e acrescentando coleção(ões) nova(s) do backfill: ${novas.join(', ')}.`;
}

// Executado como script (`npm run seed`) — quando importado, só expõe as
// funções acima, que é como o servidor de produção (server.mjs) carrega o
// banco antes de subir.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(garantirBancoDeDados());
}
