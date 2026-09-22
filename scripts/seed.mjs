import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hojeLocalISO, resolverDatasDoSeed } from '../src/data/datasDoSeed.mjs';
import { exigirSeedCoerente } from '../src/data/validacaoDoSeed.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(root, 'src', 'data', 'seed.json');
const dbPath = join(root, 'db.json');

// As datas do backfill são tokens relativos ("@hoje-5", "@proxima(segunda)")
// e só viram datas de verdade aqui, em relação ao dia da carga — por isso o
// arquivo nunca é copiado tal qual. A gramática está em datasDoSeed.mjs.
const hoje = hojeLocalISO();
const backfill = resolverDatasDoSeed(JSON.parse(readFileSync(seedPath, 'utf-8')), hoje);

// Resolver as datas certo não basta: os registros precisam continuar
// coerentes entre si. Erro aqui interrompe a carga de propósito — melhor o
// `npm run seed` quebrar do que o protótipo subir com aula fora da grade.
for (const aviso of exigirSeedCoerente(backfill, hoje)) {
  console.warn(`Aviso: ${aviso}`);
}

if (!existsSync(dbPath)) {
  writeFileSync(dbPath, `${JSON.stringify(backfill, null, 2)}\n`, 'utf-8');
  console.log(`db.json criado a partir do backfill (src/data/seed.json), com as datas resolvidas para ${hoje}.`);
} else {
  // O db.json existente é a cópia de trabalho e não é sobrescrito — os dados
  // que a usuária criou navegando continuam ali. Mas uma coleção nova do
  // backfill precisa passar a existir: o json-server responde 404 (não lista
  // vazia) para uma chave ausente, e nem a tela nem o "Resetar protótipo"
  // conseguem criá-la depois. Por isso as chaves que faltam entram aqui, já
  // com o conteúdo do backfill.
  const db = JSON.parse(readFileSync(dbPath, 'utf-8'));

  const novas = Object.keys(backfill).filter((recurso) => !(recurso in db));
  if (novas.length === 0) {
    console.log('db.json já existe — mantendo dados atuais. Use o botão "Resetar protótipo" para restaurar o backfill.');
  } else {
    for (const recurso of novas) {
      db[recurso] = backfill[recurso];
    }
    writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf-8');
    console.log(
      `db.json já existe — mantendo dados atuais e acrescentando coleção(ões) nova(s) do backfill: ${novas.join(', ')}.`,
    );
  }
}
