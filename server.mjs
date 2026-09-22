/**
 * Servidor de produção do protótipo (Railway e qualquer outro host que dê
 * uma porta só).
 *
 * Em desenvolvimento são dois processos: o Vite serve o front e repassa
 * `/api` para o json-server (ver `vite.config.ts`). Publicado, não existe
 * mais o proxy do Vite nem uma segunda porta — este arquivo faz o papel dos
 * dois:
 *
 *   /api/<recurso>   → json-server, montado sem o prefixo (a mesma reescrita
 *                      que o proxy do Vite faz, para `src/services/http.ts`
 *                      continuar chamando `/api` nos dois ambientes)
 *   qualquer outra   → arquivos estáticos de `dist/`, com fallback em
 *                      `index.html` (o app usa BrowserRouter: recarregar em
 *                      `/alunas` precisa devolver o HTML, não um 404)
 *
 * A ordem importa: o json-server expõe os recursos na raiz (`/:recurso`), e
 * sem o prefixo `/api` ele engoliria as rotas do próprio app.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, sep } from 'node:path';

// Container roda em UTC por padrão, e tanto o backfill quanto as telas
// tratam "hoje" pelo fuso local de quem calcula. Sem isto, uma carga feita
// depois das 21h em Brasília resolveria os tokens do seed para o dia
// seguinte e o protótipo subiria com o "hoje" deslocado em relação ao
// navegador de quem o abre. Definido antes de qualquer data ser calculada, e
// só quando o ambiente não mandou o seu.
process.env.TZ ??= 'America/Sao_Paulo';

// Import dinâmico: o módulo do seed calcula datas, e precisa ser carregado
// depois de TZ estar definido.
const { garantirBancoDeDados, caminhoPadraoDoBanco } = await import('./scripts/seed.mjs');

const raiz = dirname(fileURLToPath(import.meta.url));
const diretorioEstatico = join(raiz, 'dist');
const paginaInicial = join(diretorioEstatico, 'index.html');

const porta = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
// O disco do container é efêmero: sem um volume montado, os dados criados
// navegando somem a cada publicação. DB_PATH permite apontar para o volume.
const caminhoDoBanco = process.env.DB_PATH ?? caminhoPadraoDoBanco;

if (!existsSync(paginaInicial)) {
  console.error(`dist/index.html não encontrado em ${diretorioEstatico}. Rode "npm run build" antes de "npm start".`);
  process.exit(1);
}

console.log(`Fuso horário: ${process.env.TZ} (defina a variável TZ para mudar).`);
console.log(garantirBancoDeDados(caminhoDoBanco));

// ---------------------------------------------------------------------------
// json-server em processo, montado em /api
// ---------------------------------------------------------------------------
// Mesma montagem que o `json-server` faz na linha de comando (lib/bin.js),
// sem o servidor próprio: aqui ele é só o tratador das rotas de /api.
const { createApp } = await import('json-server/lib/app.js');
const { NormalizedAdapter } = await import('json-server/lib/adapters/normalized-adapter.js');
const { Observer } = await import('json-server/lib/adapters/observer.js');
const { Low } = await import('lowdb');
const { JSONFile } = await import('lowdb/node');

const banco = new Low(new Observer(new NormalizedAdapter(new JSONFile(caminhoDoBanco))), {});
await banco.read();
const api = createApp(banco, { logger: false });

// ---------------------------------------------------------------------------
// Arquivos estáticos
// ---------------------------------------------------------------------------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Traduz o caminho pedido para um arquivo dentro de `dist/`, ou `null` se
 * não existir ou escapar do diretório (`..` numa URL forjada).
 */
function arquivoEstatico(caminhoDaUrl) {
  const relativo = decodeURIComponent(caminhoDaUrl).replace(/^[/]+/, '');
  const alvo = normalize(join(diretorioEstatico, relativo));
  if (alvo !== diretorioEstatico && !alvo.startsWith(diretorioEstatico + sep)) return null;
  if (!existsSync(alvo) || !statSync(alvo).isFile()) return null;
  return alvo;
}

function responderArquivo(req, res, arquivo, cacheLongo) {
  const tipo = TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': statSync(arquivo).size,
    // Os nomes dos bundles do Vite carregam hash, então podem ficar no cache
    // do navegador; o index.html nunca, senão uma publicação nova não chega.
    'Cache-Control': cacheLongo ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(arquivo).pipe(res);
}

const servidor = createServer((req, res) => {
  const url = req.url ?? '/';

  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) {
    req.url = url.slice('/api'.length) || '/';
    return api.attach(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  const caminho = url.split('?')[0];
  const arquivo = arquivoEstatico(caminho === '/' ? '/index.html' : caminho);
  if (arquivo) {
    return responderArquivo(req, res, arquivo, caminho.startsWith('/assets/'));
  }

  // Rota do BrowserRouter: devolve o app. Caminho com extensão que não
  // existe é arquivo faltando de verdade — 404, não a página inicial.
  if (extname(caminho)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }
  return responderArquivo(req, res, paginaInicial, false);
});

servidor.listen(porta, host, () => {
  console.log(`Protótipo no ar em http://${host}:${porta} (API em /api, banco em ${caminhoDoBanco}).`);
});
