# Progresso — Atualização para o Escopo v2.1

Atualização do protótipo do escopo v2.0 (25/08/2026) para o **escopo v2.1** (`docs/Escopo Funcional Atualizado v2.1.docx`). O plano completo — diff, decisões, mapeamento tela a tela, modelo de dados, mensagens, cenários e lotes — está em [PLANO_ATUALIZACAO_V21.md](./PLANO_ATUALIZACAO_V21.md). Este arquivo registra a execução: o que cada lote entregou, decisões tomadas durante o lote e como testar.

A migração v1.0 → v2.0 continua registrada em [PROGRESSO_ATUALIZACAO.md](./PROGRESSO_ATUALIZACAO.md); a construção original, em [PROGRESSO.md](./PROGRESSO.md).

Dinâmica: **um lote por ciclo.** O lote só começa com autorização explícita, termina com a seção correspondente preenchida aqui e para até a validação. Ajuste pedido num lote entregue e ainda não validado é registrado como "Ajuste pós-entrega" na seção do próprio lote. Nunca `git commit`.

- [x] Preparação — cenários prometidos à cliente (termo nominal, renovação antecipada, prorrogação em carteira vencida) — entregue em 21/09/2026, registrado em `PROGRESSO_ATUALIZACAO.md`
- [x] Lote 0 — Seed com datas relativas e telefone único das alunas
- [ ] Lote 1 — Pendência de aceite e pagamento antes do termo (item 1)
- [ ] Lote 2 — Cancelamento pelo studio com relação preservada e WhatsApp (item 2)
- [ ] Lote 3 — Professora consulta a ficha; indicadores de professora (itens 3 e 9)
- [ ] Lote 4 — Aula excepcional: participante sem cadastro e convênio à parte (item 4)
- [ ] Lote 5 — Comprovante, prévia do reembolso, TotalPass em contingência, busca por telefone (itens 5, 6, 8, 10)
- [ ] Lote 6 — Consolidação da documentação (README, CLAUDE.md, PROGRESSO_ATUALIZACAO.md)

## Decisões fixadas (21/09/2026)

Resumo das decisões da seção 2 do plano, que valem para todos os lotes:

- **D1** — A professora continua bloqueada até o aceite (RF-PRO-04 não mudou). Só a aluna passa a ter pendência sem bloqueio.
- **D2** — Aluna cadastrada pela administração sem bolsa: alerta de pagamento pendente no painel e agendamento bloqueado por não haver carteira ativa. Termo e anamnese são pendências à parte, sem bloqueio.
- **D3** — Indicadores de professora (RF-PNL-07, REL-14) só na administração. O painel da professora não muda.
- **D4** — "Studio" permanece; a grafia "estúdio" não entra.
- **D5** — Comprovante simulado como nome de arquivo. "Enviar mensagem" abre o `wa.me` de verdade, sempre para +55 65 9680-6348, com mensagem pré-preenchida; todas as alunas do seed têm esse telefone.
- **D6** — Datas do seed geradas em relação ao dia da carga (tokens `@hoje`, `@ultima(...)`, `@proxima(...)`, `@fixa(...)`).
- **D7** — Renovação antecipada segue o PA-10 (validade mais distante), não a letra do RF-CRE-13.
- **D8** — O que a v2.1 marca como Aberto, Em definição ou Evolução fica pendente ou fora de escopo; nada é inventado.

Pressupostos assumidos no plano (seção 13) que ainda podem ser revertidos antes do lote correspondente: número do WhatsApp sem o nono dígito; tela própria "Aulas canceladas"; tela própria "Indicadores de professoras"; duas personas novas no seed (Helena Castro, Mariana Teixeira); `Aluna.situacao` continua gravada e recalculada; botão "Lembrar aceite" na ficha; Lote 0 antes do item 1.

---

## Preparação — cenários prometidos à cliente (entregue)

Entregue em 21/09/2026, antes deste plano, porque a cliente já esperava esses três cenários. O registro completo — o que existia, o que foi criado, os dois defeitos corrigidos na reabertura de carteira encerrada e como testar — está em `PROGRESSO_ATUALIZACAO.md`, seção "Preparação para a v2.1 — cenários prometidos à cliente". Cenários do guia: "Termo único, com o nome da aluna", "Comprar mais créditos antes de acabar", "Ajuste manual de créditos e prorrogação de validade".

---

## Lote 0 — Seed com datas relativas

**O seed deixou de envelhecer.** Nenhum campo de data em `src/data/seed.json` é mais literal: os 75 campos viraram tokens relativos ("@hoje-42", "@proxima(segunda,quarta)"), resolvidos em relação ao dia da carga pelo módulo novo `src/data/datasDoSeed.mjs`, nos dois pontos em que o seed vira banco. Antes, em 21/09/2026, a carteira "Finalizando" da Patrícia venceria em três dias, a justificativa da Larissa estava fora do prazo e a aula "futura" era de 17/08. Agora a aula futura é sempre a próxima segunda ou quarta, a passada é sempre a última, e a Patrícia vence sempre daqui a cinco dias.

### O que foi entregue

- **`src/data/datasDoSeed.mjs`** (novo) — resolvedor dos tokens, com a gramática documentada no cabeçalho e no README: `@hoje`, deslocamentos em dias e semanas (`-5`, `+1s`), `@ultima(dia,...)` e `@proxima(dia,...)` para o dia da semana anterior ou posterior a hoje, sufixo `T10:15` para ISO completo, `@fixa(...)` para a data intencionalmente fixa, e o token embutido em texto `{{@...}}` com formatos `br` (padrão), `mes` e `iso`. **Uma data literal fora de `@fixa` faz a carga falhar**, com a mensagem dizendo o caminho do campo — é a garantia de que o seed não volta a envelhecer sem ninguém notar. É JavaScript puro porque roda no Node do script e no bundle do Vite; `datasDoSeed.d.mts` traz os tipos.
- **`scripts/seed.mjs`** resolve o backfill antes de criar `db.json` (deixou de copiar o arquivo) e antes de acrescentar coleções novas. A mensagem de criação diz para que dia as datas foram resolvidas.
- **`src/services/reset.ts`** resolve o seed importado antes de recriar os registros — o "Resetar protótipo" passa a reconstruir o estado em relação ao dia do clique.
- **`src/data/seed.json`** — os 75 campos de data convertidos, mais os oito textos que citavam data por extenso (origens de movimentos de crédito, conteúdo de notificações) reescritos com token embutido ou com texto neutro ("Aulas realizadas ao longo do pacote"). A linha do tempo das personas ficou coerente:
  - Larissa: cadastrada pela administração com o Starter há 112 dias (aceite, anamnese, auditoria e e-mail de primeiro acesso nessa data; a notificação, que dizia "Flow", passou a dizer "Starter"); Starter consumido e encerrado há 73 dias; Flow comprado há 42 dias, validade daqui a 48; agendamento da próxima aula de segunda ou quarta feito ontem; cancelamento fora da antecedência na última aula de segunda ou quarta, com a justificativa pendente do mesmo dia.
  - Patrícia: Starter há 40 dias, validade daqui a 5, 1 crédito — "Finalizando" pelos dois critérios (limiar de 2 créditos e de 7 dias).
  - Aline: Starter há 93 dias, vencido há 48, encerrado há 47, 2 créditos perdidos.
  - Fernanda: bolsa concedida há 3 dias, carteira aguardando ativação com validade daqui a 42.
  - Juliana: experimental na última aula de dança (terça ou quinta), paga dois dias antes; compra recusada pelo gateway no dia seguinte à aula.
  - Renata: reserva com check-in na última aula de dança e reserva confirmada na próxima aula de segunda ou quarta.
  - Beatriz: solicitação de cancelamento para a próxima aula de dança, recebida ontem.
  - Exceção de calendário: "Feriado municipal" na sexta da semana que vem (antes era "Feriado da Independência" em 07/09, que já passou).
  - Sessões começam há 200 dias; termos publicados há 250 e 120 dias; categorias de professora vigentes há 260 e 195 dias; datas de nascimento em `@fixa(...)`.
- **Telefone único** (D5): as seis alunas passaram a ter `(65) 9680-6348`, para que o botão de WhatsApp do Lote 2 abra o aparelho da cliente.
- **Guia** (`src/data/guiaDoPrototipo.ts`): cabeçalho e item "Datas" de "O que é simulado" reescritos; os preparos que dependiam de data fixa ajustados — renovação antecipada (Larissa "validade daqui a 48 dias", sem "08/11"), benefício de conversão (Juliana fez a experimental na última terça ou quinta; o benefício de 3 dias vence na segunda e na terça, por isso o primeiro passo aumenta o parâmetro para 10 dias), justificativa (última aula, sempre no prazo), correção de chamada (para o caso fora do prazo, reduzir o parâmetro a 0 em vez de "as chamadas de agosto"), reembolso ("a Starter da Larissa, de mais de três meses atrás").
- **README**: seção nova "Seed com datas relativas" com a gramática e as regras que qualquer dado novo do seed precisa manter; bullets de `seed.json` e do guia atualizados.

### Decisões deste lote

- **Tokens no JSON, não um seed em código.** O `seed.json` continua legível e diffável, e a regra "toda entidade nova tem chave no seed" não muda de forma. O custo é um resolvedor de 150 linhas, que fica em um único lugar.
- **`@ultima`/`@proxima` são estritamente anteriores/posteriores a hoje.** Uma aula "de hoje" seria ambígua (já aconteceu ou não?) e mudaria de estado ao longo do dia. Assim, a ocorrência passada tem no máximo 5 dias (sessão de dois dias por semana) e a futura no mínimo 1.
- **Agendamento da aula futura é "ontem" (`@hoje-1T10:15`), não "N dias antes da aula".** A aula futura fica de 1 a 5 dias à frente; "3 dias antes dela" poderia cair no futuro.
- **`@fixa(...)` obrigatório para data fixa.** Deixa explícito que a data foi mantida de propósito, e permite ao resolvedor tratar toda outra data literal como erro.
- **Textos com data por extenso usam o token embutido**, para o extrato e as notificações do seed não contradizerem as datas dos registros que descrevem.
- **Benefício da Juliana continua dependente do dia da semana.** Com a experimental sempre na última terça ou quinta e prazo de 3 dias, na segunda e na terça o benefício já venceu. Trocar a sessão da experimental não resolve (toda sessão tem no máximo dois dias por semana), e mudar o parâmetro padrão trairia o PA-04. O cenário do guia passou a dizer isso e a aumentar o parâmetro no primeiro passo.

### Como testar

1. Com o `npm run dev` rodando, clique em **"Resetar protótipo"**. Em Administração → Alunas → Larissa: a carteira Flow mostra a validade daqui a 48 dias, o extrato tem "Agendamento de (data da próxima segunda ou quarta) às 08:00" feito ontem e o cancelamento fora da antecedência na última segunda ou quarta.
2. Patrícia: "Finalizando", 1 crédito, vence em 5 dias. Aline: vencida há semanas, "Créditos perdidos no vencimento de (data)". Fernanda: aguardando ativação.
3. Administração → Visão geral: a justificativa da Larissa e a solicitação da Beatriz estão nas pendências; Justificativas mostra a aula da última segunda ou quarta; Solicitações mostra a próxima terça ou quinta.
4. Aluna Larissa → Minhas aulas: uma aula futura (próxima segunda ou quarta às 08:00) e a passada com "1 crédito consumido — cancelamento fora do prazo" e o botão "Justificar" ainda dentro do prazo.
5. Administração → Exceções: "Feriado municipal" numa sexta da semana que vem; Grade da aluna avisa nesse dia.
6. Convênios: reserva da Renata com check-in na última aula de dança e reserva na próxima aula de segunda ou quarta.
7. Em qualquer ficha, o telefone é `(65) 9680-6348`.
8. Para ver a carga do zero: renomeie `db.json`, rode `npm run seed` e veja a mensagem "com as datas resolvidas para (hoje)"; depois volte o arquivo ou reset.
9. Para ver a guarda: coloque uma data literal em qualquer campo do seed e rode `npm run seed` — a carga falha dizendo o caminho do campo e sugerindo `@fixa(...)`.

### Verificação executada

- Resolvedor rodado contra o seed com quatro "hojes" — 21/09/2026 (segunda), 24/09 (quinta), 26/09 (sábado) e 31/10 (sábado, fim de mês): em todos, as três ocorrências caem em dia da própria sessão, todo agendamento antecede a ocorrência e não é futuro, Patrícia está "Finalizando", Aline vencida, a justificativa tem de 1 a 5 dias, a solicitação é futura, a exceção cai numa sexta, e os textos embutidos saem formatados ("Agendamento de 16/09/2026 às 08:00", "Aulas realizadas em setembro"). A data literal e o token desconhecido produzem os erros esperados.
- `npm run seed` com `db.json` presente mantém os dados; com `db.json` ausente cria o banco resolvido para o dia (conferido e o banco de trabalho restaurado em seguida).
- `tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes de fast-refresh. O Vite em desenvolvimento serve o `.mjs` importado por `reset.ts`.
- **O clique em "Resetar protótipo" no navegador não foi exercitado nesta entrega**: a extensão do Chrome estava desconectada. A alteração no `reset.ts` é uma linha (`resolverDatasDoSeed(seed)`), compilada e tipada; o passo 1 de "Como testar" é a confirmação que falta.

---

## Lote 1 — Pendência de aceite e pagamento antes do termo

_Não iniciado. Escopo nas seções 4.1, 4.2, 5, 6.1, 6.2 e no Lote 1 da seção 10 do plano._

### O que foi entregue

_— a preencher —_

### Decisões deste lote

_— a preencher —_

### Como testar

_— a preencher —_

### Verificação executada

_— a preencher —_

---

## Lote 2 — Cancelamento pelo studio com relação preservada e WhatsApp

_Não iniciado. Escopo nas seções 4.4, 5, 6.3 e no Lote 2 da seção 10 do plano._

### O que foi entregue

_— a preencher —_

### Decisões deste lote

_— a preencher —_

### Como testar

_— a preencher —_

### Verificação executada

_— a preencher —_

---

## Lote 3 — Professora consulta a ficha; indicadores de professora

_Não iniciado. Escopo nas seções 4.3, 4.4, 6.6 e no Lote 3 da seção 10 do plano._

### O que foi entregue

_— a preencher —_

### Decisões deste lote

_— a preencher —_

### Como testar

_— a preencher —_

### Verificação executada

_— a preencher —_

---

## Lote 4 — Aula excepcional: participante sem cadastro e convênio à parte

_Não iniciado. Escopo nas seções 4.3, 4.4, 5, 6.4 e no Lote 4 da seção 10 do plano._

### O que foi entregue

_— a preencher —_

### Decisões deste lote

_— a preencher —_

### Como testar

_— a preencher —_

### Verificação executada

_— a preencher —_

---

## Lote 5 — Comprovante, prévia do reembolso, TotalPass em contingência, busca por telefone

_Não iniciado. Escopo nas seções 4.4, 5, 6.5 e no Lote 5 da seção 10 do plano._

### O que foi entregue

_— a preencher —_

### Decisões deste lote

_— a preencher —_

### Como testar

_— a preencher —_

### Verificação executada

_— a preencher —_

---

## Lote 6 — Consolidação da documentação

_Não iniciado. README (seed relativo, padrões novos, glossário), CLAUDE.md apontando para a v2.1 como fonte da verdade e para estes dois arquivos, nota em `PROGRESSO_ATUALIZACAO.md` de que a v2.1 foi absorvida, `escopo_funcional_contratado.md` convertido da v2.1 (ou substituído pelo `.txt` de `docs/`, a decidir no lote)._

### O que foi entregue

_— a preencher —_

### Como testar

_— a preencher —_
