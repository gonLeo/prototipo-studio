import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(root, 'src', 'data', 'seed.json');
const dbPath = join(root, 'db.json');

if (!existsSync(dbPath)) {
  copyFileSync(seedPath, dbPath);
  console.log('db.json criado a partir do backfill (src/data/seed.json).');
} else {
  console.log('db.json já existe — mantendo dados atuais. Use o botão "Resetar protótipo" para restaurar o backfill.');
}
