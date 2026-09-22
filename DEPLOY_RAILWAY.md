# Publicando o protótipo no Railway

O protótipo foi feito para rodar em dois processos no desenvolvimento — o Vite servindo o front e o json-server respondendo em outra porta, ligados pelo proxy `/api` do `vite.config.ts`. Um host como o Railway dá **uma porta só** e nenhum proxy do Vite: em produção o front vira arquivo estático e o `/api` precisa de alguém que atenda na mesma origem. É isso que o `server.mjs` faz.

## O que foi acrescentado ao projeto

| Arquivo | Para quê |
| --- | --- |
| `server.mjs` | Servidor de produção: serve `dist/`, monta o json-server em `/api` e devolve o `index.html` nas rotas do BrowserRouter. |
| `railway.json` | Diz ao Railway como construir (`npm run build`) e como subir (`npm start`). |
| `.nvmrc` | Fixa o Node 22 na construção (o json-server exige `>=22.12.0`). |
| `package.json` | Ganhou o script `start`, o campo `engines.node`, e `json-server` e `lowdb` passaram de dependência de desenvolvimento para dependência de produção — agora eles rodam no servidor, não só na sua máquina. |
| `scripts/seed.mjs` | Passou a exportar `garantirBancoDeDados()` além de continuar funcionando como `npm run seed`. O `server.mjs` carrega o backfill chamando essa função, no mesmo processo, para as datas relativas serem resolvidas no fuso certo. |

Nada disso muda o desenvolvimento: `npm run dev` continua igual, e `src/services/http.ts` continua chamando `/api` nos dois ambientes.

## Como o `server.mjs` resolve as rotas

```
/api/<recurso>   → json-server, com o prefixo /api removido
                   (a mesma reescrita que o proxy do Vite faz)
qualquer outra   → arquivo de dist/, ou index.html se não existir arquivo
```

A ordem importa: o json-server expõe os recursos na raiz (`/:recurso`). Sem o prefixo `/api`, uma rota do próprio app como `/alunas` cairia nele e devolveria JSON em vez da tela.

O fallback em `index.html` existe porque o app usa `BrowserRouter`: abrir ou recarregar direto em `/administracao/parametros` precisa devolver o HTML. Caminho com extensão que não existe (`/assets/xxx.js`) continua respondendo 404 — arquivo faltando é arquivo faltando, não rota.

## Passo a passo

1. No Railway, **New Project → Deploy from GitHub repo** e aponte para este repositório.
2. O `railway.json` já define a construção e o comando de início; não é preciso preencher Build Command nem Start Command na interface.
3. Em **Settings → Networking**, gere o domínio público (`Generate Domain`).
4. Em **Variables**, defina `TZ` (veja abaixo). As demais são opcionais.

O Railway injeta `PORT` sozinho, e o `server.mjs` escuta em `0.0.0.0` nessa porta.

## Variáveis de ambiente

| Variável | Padrão | Quando mexer |
| --- | --- | --- |
| `PORT` | injetada pelo Railway | Nunca; só o host define. |
| `TZ` | `America/Sao_Paulo` | Se o estúdio não estiver no fuso de Brasília. |
| `DB_PATH` | `db.json` na raiz do projeto | Se você montar um volume para os dados sobreviverem à publicação (veja abaixo). |

**Sobre o `TZ`:** nenhuma data do seed é literal — são tokens relativos resolvidos em relação a "hoje" (`src/data/datasDoSeed.mjs`). Quem resolve é o processo que carrega o banco, e um container roda em UTC por padrão. Sem `TZ`, uma publicação feita depois das 21h em Brasília resolveria os tokens para o dia seguinte, e o protótipo subiria com o "hoje" deslocado em relação ao navegador de quem o abre. Por isso o `server.mjs` assume `America/Sao_Paulo` quando a variável não vem de fora, e escreve no log qual fuso está valendo.

## O disco do Railway é efêmero

Sem volume, o `db.json` vive no sistema de arquivos do container: **tudo que for criado navegando some a cada nova publicação ou reinício**, e o banco é recriado a partir de `src/data/seed.json`. Para uma demonstração isso costuma ser o comportamento desejado — cada visita começa do backfill, e o botão "Resetar protótipo" continua disponível a qualquer momento.

Se quiser que os dados persistam entre publicações:

1. **Settings → Volumes → New Volume**, montado em `/data`.
2. Defina a variável `DB_PATH=/data/db.json`.

O `server.mjs` cria o arquivo no primeiro início e, nos seguintes, mantém os dados e só acrescenta coleções novas do backfill — a mesma regra do `npm run seed`.

## Conferindo localmente antes de publicar

```bash
npm run build
npm start
```

Abre em `http://localhost:8080`. É exatamente o que roda no Railway, então vale testar por aqui: navegação direta numa rota interna, uma escrita qualquer (criar uma modalidade, por exemplo) e o "Resetar protótipo".

Para não misturar com o `db.json` do desenvolvimento, aponte para outro arquivo:

```bash
DB_PATH=./db.producao.json npm start
```

## Limites que continuam valendo

O protótipo não tem autenticação real nem banco de dados real (ver "Fora de escopo" no `README.md`). Publicado, ele fica **acessível a quem tiver o endereço**, com os perfis simulados trocáveis na própria interface e a API REST aberta em `/api`. Trate o endereço como material de demonstração: nada de dado real de aluna ali.
