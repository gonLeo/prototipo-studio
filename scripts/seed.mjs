import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(root, 'src', 'data', 'seed.json');
const dbPath = join(root, 'db.json');

if (!existsSync(dbPath)) {
  copyFileSync(seedPath, dbPath);
  console.log('db.json criado a partir do backfill (src/data/seed.json).');
} else {
  // O db.json existente é a cópia de trabalho e não é sobrescrito — os dados
  // que a usuária criou navegando continuam ali. Mas uma coleção nova do
  // backfill precisa passar a existir: o json-server responde 404 (não lista
  // vazia) para uma chave ausente, e nem a tela nem o "Resetar protótipo"
  // conseguem criá-la depois. Por isso as chaves que faltam entram aqui, já
  // com o conteúdo do backfill.
  const backfill = JSON.parse(readFileSync(seedPath, 'utf-8'));
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
