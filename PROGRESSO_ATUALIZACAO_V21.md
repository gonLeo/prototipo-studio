# Progresso — Atualização para o Escopo v2.1

Atualização do protótipo do escopo v2.0 (25/08/2026) para o **escopo v2.1** (`docs/Escopo Funcional Atualizado v2.1.docx`). O plano completo — diff, decisões, mapeamento tela a tela, modelo de dados, mensagens, cenários e lotes — está em [PLANO_ATUALIZACAO_V21.md](./PLANO_ATUALIZACAO_V21.md). Este arquivo registra a execução: o que cada lote entregou, decisões tomadas durante o lote e como testar.

A migração v1.0 → v2.0 continua registrada em [PROGRESSO_ATUALIZACAO.md](./PROGRESSO_ATUALIZACAO.md); a construção original, em [PROGRESSO.md](./PROGRESSO.md).

Dinâmica: **um lote por ciclo.** O lote só começa com autorização explícita, termina com a seção correspondente preenchida aqui e para até a validação. Ajuste pedido num lote entregue e ainda não validado é registrado como "Ajuste pós-entrega" na seção do próprio lote. Nunca `git commit`.

- [x] Preparação — cenários prometidos à cliente (termo nominal, renovação antecipada, prorrogação em carteira vencida) — entregue em 21/09/2026, registrado em `PROGRESSO_ATUALIZACAO.md`
- [x] Lote 0 — Seed com datas relativas e telefone único das alunas
- [x] Lote 1 — Pendência de aceite e pagamento antes do termo (item 1)
- [x] Lote 2 — Cancelamento pelo studio com relação preservada e WhatsApp (item 2)
- [x] Lote 3 — Professora consulta a ficha; indicadores de professora (itens 3 e 9)
- [x] Lote 4 — Aula excepcional: participante sem cadastro e convênio à parte (item 4)
- [x] Lote 5 — Comprovante, prévia do reembolso, TotalPass em contingência, busca por telefone (itens 5, 6, 8, 10)
- [x] Lote 6 — Consolidação da documentação (README, CLAUDE.md, PROGRESSO_ATUALIZACAO.md)

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

**O termo deixou de ser porteiro.** Na v2.0 a aluna cadastrada não tinha menu, não tinha painel e não agendava até assinar o termo e preencher a anamnese. Na v2.1 ela paga, recebe os créditos e agenda; o que falta vira um alerta no painel dela e um cartão de pendência na administração. Bloquear o agendamento até o aceite virou a evolução EV-16, fora da Fase 1.

### O que foi entregue

**Domínio**

- **`src/hooks/pendenciasDeAceite.ts`** (novo) — a pendência é **derivada**, não um campo: falta termo quando não há aceite da versão vigente do termo de aluna; falta anamnese quando não há ficha. Expõe `pendenciasDaAluna`, `pendenciasDasAlunas` (uma leitura por coleção, não uma por aluna), `contarAlunasComPendencia`, `registrarAceiteDoTermo`, `registrarAnamnese`, `lembrarPendenciaDeAceite` e `sincronizarSituacaoDeAceite`, que regrava `Aluna.situacao` a cada conclusão. `registrarAceiteEAnamnese` e `liberarAcessoDaAluna` saíram de `useTermos.ts`, que voltou a tratar só do termo em si (versões, mesclagem, aceite da professora).
- **`Aluna.situacao = 'aguardando_aceite'` mudou de significado**: era bloqueio, virou rótulo de pendência. Continua gravada porque é o filtro da lista (RF-ALU-10) e o contador do painel (RF-PNL-03), mas quem manda é o cálculo. A aluna trancada não é sincronizada — trancamento é outro eixo.
- **`Usuario.situacao = 'aguardando_aceite'` passou a valer só para a professora** (RF-PRO-04). Toda aluna nasce `ativo`, nos três caminhos de entrada.
- **A carteira é ativada na confirmação do pagamento** (RF-CRE-01): `aplicarCompra` cria sempre `ativa`, com `dataAtivacao` de hoje. Quem cai aqui já teve o pagamento aprovado — a bolsista, pela concessão; as demais, pelo gateway.
- **A situação `aguardando_ativacao` da carteira foi removida** do tipo, do status derivado, do rótulo e das duas guardas que a citavam, junto com `carteiraAguardandoAtivacao` e `ativarCarteirasPendentes`. Ela existia só para representar "comprou mas ainda não pode usar", que a v2.1 eliminou; a lista de situações voltou a ser exatamente a da seção 7 do escopo (ativa, consumida, expirada). Antes do pagamento não há carteira nenhuma — o que existe é a venda pendente.
- **`bloqueioParaAgendar` perdeu o caso do aceite.** Os bloqueios que restam são os do escopo: trancamento, sem pacote, saldo insuficiente, data além da validade, turma lotada.
- **`pendenciasDeAcao` ganhou `alunasComPendenciaDeAceite`** e a soma do bloco passou a incluí-la (RF-PNL-03).
- **Evento de notificação novo** `pendencia_de_aceite_lembrada` (RF-ALU-08), disparado só pelo botão "Lembrar aceite" da ficha — nada sai sozinho.

**Telas**

- **`MatriculaPage`** — passos reordenados para Seus dados → Pacote → **Pagamento** → Termo → Anamnese → Primeira aula (fluxo 6.1). Termo e anamnese viraram passos separados, cada um com **"Pular e concluir depois"**, e a primeira aula com "Pular e agendar depois". A tela de conclusão diz o que ficou pendente. Sem termo publicado, o passo explica a situação e segue em vez de travar.
- **`ExperimentalPage`** — depois da vaga confirmada entram os passos Termo e Anamnese, também puláveis (fluxo 6.2). Antes a experimental não pedia nem um nem outro.
- **`PainelAlunaPage`** — saiu o fluxo bloqueante de primeiro acesso; entrou o **alerta amarelo persistente** com "Concluir agora", e o **alerta laranja de pagamento pendente** com "Pagar agora", para a aluna cadastrada pela administração sem bolsa (D2). O painel normal aparece por baixo dos dois.
- **`ModalPendencias`** (novo, `src/pages/aluna/`) — destino do atalho. Resolve uma pendência por vez: quem pulou só a anamnese não relê o termo.
- **`AceiteEAnamnese.tsx`** — o antigo `TermoEAnamnese` virou dois componentes, `AceiteDoTermo` e `FichaDeAnamnese`, porque agora são dois passos que se pulam separadamente. Usados pela matrícula, pela experimental e pelo modal.
- **`AppShell`** — o menu reduzido ficou só para a professora aguardando aceite. A aluna com pendência tem o menu inteiro.
- **`LoginPage`** — a aluna com pendência aparece como "Termo ou anamnese pendente"; "Aguardando aceite do termo" continua para a professora bloqueada.
- **`AdministracaoHome`** — quinto cartão de pendência, "Termo ou anamnese pendente", que leva à lista já filtrada.
- **`AlunasPage`** — o filtro passou a vir da URL (`?filtro=aguardando_aceite`), para o cartão do painel poder apontar para ele; a coluna "Acesso" diz **qual** pendência está aberta ("Termo pendente", "Anamnese pendente", "Aguardando aceite" quando são as duas), no CSV também; o filtro "Aguardando aceite" usa o cálculo, não o campo.
- **`AlunaFichaPage`** — "Situação do acesso" deu lugar a **dois dados separados**, "Termo de aceite" e "Ficha de anamnese", cada um com a data de conclusão; faixa de aviso com o botão **"Lembrar aceite"**; o texto da anamnese não preenchida deixou de dizer que ela é condição para agendar.

**Seed**

- **Fernanda Alves**: bolsista com **carteira ativa** (4 créditos, validade em 42 dias) e termo e anamnese pendentes — a persona do alerta.
- **Helena Castro** (nova): cadastrada pela administração sem bolsa, venda do Starter pendente de R$ 220,00, sem carteira, com as duas pendências — a persona do D2.
- **Juliana Rocha**: assinou o termo e pulou a anamnese, como acontece agora na experimental.
- **Aline e Renata** ganharam aceite e anamnese, para não aparecerem como pendentes sem motivo. Larissa e Patrícia já tinham.
- O e-mail de primeiro acesso da Larissa e o da Helena passaram a falar em confirmar o pagamento e concluir as pendências, no lugar de "os créditos são liberados após o aceite".

**Guia**

- Cenários novos: **"Matrícula pulando o termo e a anamnese"** e **"Aluna com pagamento pendente"**.
- Reescritos: "Matrícula pelo site" (nova ordem, pular), "Aula experimental" (termo e anamnese ao final), "Cadastro pela administração" (bolsista com carteira ativa; Helena como caso sem bolsa), "Quando a grade bloqueia" (passo da Helena e a nota de que pendência nunca bloqueia), "Termo único, com o nome da aluna" (atalho do alerta) e "Termo de aceite da professora" (o bloqueio que continua).
- Personas: Fernanda com o estado novo, Helena acrescentada, Juliana com a anamnese pendente. "O que é simulado" ganhou o item **Pendência de aceite**, citando a EV-16.

### Decisões deste lote

- **Remover `aguardando_ativacao` em vez de deixar o estado órfão.** Com a ativação no pagamento, nenhum caminho o produziria; mantê-lo seria código morto de um modelo que saiu, e o escopo nunca o teve na lista de situações.
- **A pendência é derivada, e a situação da aluna é cache.** Calcular na leitura evita um campo que mente quando alguém apaga um aceite pela API; regravar `Aluna.situacao` mantém baratos o filtro e o contador. `sincronizarSituacaoDeAceite` é o único ponto que grava.
- **Sem termo publicado não há pendência de termo.** Seria pendência de configuração do studio, não da aluna, e apareceria em todas as fichas de uma vez.
- **O alerta de pendência não promete o que o pagamento impede.** Para quem tem venda pendente, o texto é "conclua quando puder — isso é independente do pagamento abaixo", em vez de "você já pode agendar normalmente": a Helena não pode, por falta de crédito.
- **"Lembrar aceite" é a forma de a administração "solicitar o aceite"** que o RF-ALU-08 menciona. É a menor interpretação possível: um e-mail registrado em Notificações, disparado por botão.
- **O modal de pendência se chama "Concluir pendência"**, não "Termo de prestação de serviço": o bloco de dentro já tem esse título, e repetir era ruído.
- **A professora continua bloqueada** (D1). Nada do RF-PRO-04 mudou.

### Como testar

1. **Resetar protótipo.** No painel administrativo, o bloco de pendências tem cinco cartões, e "Termo ou anamnese pendente" conta **3** (Fernanda, Helena, Juliana). Clique nele: a lista abre filtrada, com a URL `?filtro=aguardando_aceite`, e a coluna "Acesso" mostra "Aguardando aceite" para Fernanda e Helena e "Anamnese pendente" para Juliana.
2. **Ficha da Fernanda**: "Termo de aceite — Pendente", "Ficha de anamnese — Pendente", a faixa de aviso e o botão "Lembrar aceite". Clique nele e confira o registro em Configuração → Notificações ("Lembrete de termo ou anamnese").
3. **Entre como Fernanda**: o menu está completo, a carteira tem 4 créditos e a grade permite agendar. O alerta amarelo está no topo; "Concluir agora" abre o termo com o nome dela mesclado. Aceite: o alerta passa a falar só da anamnese. Conclua a anamnese: o alerta some e o cartão do painel administrativo cai para 2.
4. **Entre como Helena**: dois alertas, o de pendência e o de pagamento. A grade diz "Nenhum pacote ativo" — não "aceite pendente". Clique em "Pagar agora": a carteira nasce ativa com a data de hoje, a grade libera e o alerta de termo continua.
5. **Matrícula pelo site** (`/matricula`): a trilha agora é Seus dados → Pacote → Pagamento → Termo → Anamnese → Primeira aula. Pague, pule o termo e a anamnese, agende a primeira aula: a tela final diz o que ficou pendente. Entre como a nova aluna e veja o alerta.
6. **Aula experimental** (`/experimental`): depois de "Vaga confirmada" vêm o termo e a anamnese, com "Pular e concluir depois" em cada um.
7. **Regressão da professora**: em Configuração → Professoras, cadastre uma. No login ela aparece como "Aguardando aceite do termo", o menu dela tem só "Painel" e o termo toma a tela — inalterado.

### Verificação executada

Percorrido no navegador, depois de um reset: contagem de pendências (3) e filtro pela URL; ficha da Fernanda com as duas pendências separadas e o lembrete gravado em Notificações; painel da Fernanda com menu completo, alerta e a conclusão das duas pendências pelo modal (alerta sumiu, situação virou `ativa`); painel da Helena com os dois alertas, grade bloqueada por falta de pacote, pagamento pelo botão e carteira ativa em 22/09/2026 com validade em 06/11/2026; matrícula completa de uma aluna nova pulando termo e anamnese, com carteira ativa, 1 crédito reservado na primeira aula e `Aluna.situacao = 'aguardando_aceite'` com `Usuario.situacao = 'ativo'`; experimental completa com aceite do termo e anamnese pulada; e uma professora nova criada para confirmar que o bloqueio dela continua. Os dados de teste foram apagados com um novo reset ao final.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes de fast-refresh.

**Ajustes feitos durante a verificação**, todos já no código: o e-mail do lembrete terminava com uma piada ("leva menos tempo do que aquecer"), trocada por "leva menos de dois minutos"; o modal repetia o título do bloco que continha; a tela da primeira aula exibia o código "RF-AGD-10" para a aluna; o alerta de pendência dizia à Helena que ela já podia agendar; e o usuário da Fernanda continuava `aguardando_aceite` no seed, o que a fazia aparecer no login como bloqueada.

---

## Lote 2 — Cancelamento pelo studio com relação preservada e WhatsApp

**Quem estava agendada deixou de sumir com o toast.** Antes, cancelar uma aula devolvia crédito, prorrogava validade, mandava e-mail e dizia "3 alunas notificadas" — e pronto: a informação de *quem* eram acabava ali. Agora a relação fica gravada na própria ocorrência cancelada, com o telefone de cada uma, e a administração avisa pelo WhatsApp a partir de uma tela (RF-CPR-09, RN-16, fluxo 6.6.1).

### O que foi entregue

**Modelo de dados**

- **`OcorrenciaSessao`** ganhou `origemCancelamento` (exceção de calendário, sessão excluída ou encerrada, solicitação da professora, conflito com aula excepcional), `alunasAfetadas` e `dataCancelamento`.
- **`AlunaAfetada`** (tipo novo) guarda `alunaId`, **nome e telefone copiados**, `creditosDevolvidos`, `diasProrrogados` e as marcas `experimental` e `convenio`. Copiados, e não resolvidos na leitura, porque a relação precisa continuar íntegra se o cadastro mudar — e porque ela é, literalmente, o registro de quem foi afetado naquele dia.

**Domínio**

- **`cancelarOcorrencia` passou a receber a origem e a gravar a relação.** Os quatro caminhos do fluxo 6.6.1 já convergiam nessa função; cada um agora diz de onde veio: `useExcecoesCalendario` (`excecao`), `useGradeHorarios` via `cancelarOcorrenciasFuturasDaSessao` (`exclusao_sessao`), `solicitacoesDeCancelamento` (`solicitacao_professora`) e `aulasExcepcionais` (`conflito_excepcional`).
- **`src/hooks/alunasAfetadas.ts`** (novo) — leitura das aulas canceladas, com modalidade, horário e professora vindos da sessão; `mensagemParaAluna` e `linkDoWhatsApp`; `ROTULO_ORIGEM_CANCELAMENTO`.
- **A mensagem muda com a origem e com a compensação.** Exceção convida a remarcar; turma encerrada oferece outra turma; solicitação da professora cita o nome dela; conflito com aula excepcional convida para o evento. Quem é de convênio não recebe promessa de crédito de volta — a reserva dela é do parceiro — e quem fez experimental é convidada a remarcar sem custo. O prefixo interno do motivo ("Exceção de calendário:") é removido do texto que vai para a aluna.
- **`src/services/reset.ts`** aprendeu a traduzir **chaves estrangeiras dentro de listas embutidas** (`CHAVES_ESTRANGEIRAS_EM_LISTAS`). Sem isso, o `alunaId` de cada item de `alunasAfetadas` continuaria apontando para o id do backfill depois de um reset. A ordenação por dependência também passou a considerar essas chaves.

**Telas**

- **`AulasCanceladasPage`** (nova, `/administracao/aulas-canceladas`, menu Operação) — lista das ocorrências canceladas, mais recente primeiro, com data, horário, modalidade, professora, origem e motivo. Expandindo uma linha aparece a relação: nome, telefone, o que cada aluna recebeu de volta e o botão **"Enviar mensagem"**, que abre o WhatsApp em outra aba com o texto pronto. Filtro entre "aulas que ainda iam acontecer" e todas, busca por modalidade, professora, motivo ou aluna, e exportação CSV com uma linha por aluna.
- **Os quatro toasts de cancelamento** passaram a apontar a tela: "Veja quem avisar pelo WhatsApp em «Aulas canceladas»". O toast é texto puro no kit atual; um link dentro dele exigiria mudar a API do `useToast`, o que não se justifica para isso.

**Seed**

- Uma **aula de dança já cancelada** por manutenção na próxima terça ou quinta, com **Larissa** (1 crédito devolvido, 7 dias de validade) e **Renata** (convênio, sem crédito) na relação — o cenário existe logo depois do reset, sem preparo. Vêm junto os agendamentos cancelados, os três movimentos de crédito da Larissa (reserva, liberação e prorrogação), a validade da carteira dela já com os 7 dias somados, a notificação e o registro de auditoria.

**Guia**

- Cenário novo **"Cancelamento pelo studio: avisar as alunas"**, com o fluxo 6.6.1.
- "Exceção no calendário", "A professora pede para cancelar" e "Conflito com a grade" ganharam o passo final de abrir a relação.
- "O que é simulado" ganhou o item **WhatsApp**, dizendo que o botão abre o aplicativo de verdade, sempre para +55 65 9680-6348, e que o envio não é registrado.

### Decisões deste lote

- **A relação é gravada, não derivada.** Daria para recalcular varrendo agendamentos cancelados com `origemCancelamento: 'studio'`, mas o requisito fala em *preservar* a relação: ela precisa sobreviver a uma aluna excluída ou renomeada, e precisa registrar quanto cada uma recebeu de volta naquele momento — informação que o agendamento sozinho não guarda.
- **Uma tela só, em Operação.** A alternativa era repetir a consulta nas quatro telas de origem. A cliente precisa de um lugar para procurar "quem eu tenho que avisar", não de quatro.
- **A mensagem é pré-escrita e muda com o caso.** Um texto genérico ("sua aula foi cancelada") obrigaria a reescrever tudo à mão, que é exatamente o trabalho que o botão existe para poupar.
- **O clique não registra nada.** O RF-CPR-09 é explícito: o sistema não controla se a mensagem foi enviada. Marcar "avisada" seria inventar comportamento.
- **Sem carteira não há dias a prorrogar.** `diasProrrogados` fica em zero quando a aluna não tinha carteira vigente, para a mensagem não prometer uma prorrogação que não houve.

### Como testar

1. **Resetar protótipo** e abrir **Operação → Aulas canceladas**: a aula de DANÇA da próxima terça ou quinta aparece com a origem "Exceção de calendário".
2. Clique em **"2 aluna(s)"**: a relação abre com Larissa (telefone, "1 crédito devolvido · +7 dias de validade") e Renata, com o selo "Convênio".
3. Clique em **"Enviar mensagem"** na Larissa: o WhatsApp abre em outra aba, para **+55 65 9680-6348**, com o texto citando o crédito e os dias. Faça o mesmo na Renata: a mensagem manda reservar pelo aplicativo do convênio, sem falar em crédito.
4. **Cadastre uma exceção nova** numa data com aula agendada (a próxima segunda ou quarta tem a aula da Larissa). O toast aponta a tela; volte a ela e veja as duas novas linhas — a das 08:00 com duas alunas e a das 09:00 com "Nenhuma aluna".
5. Troque o filtro para "Aulas que ainda iam acontecer" e exporte o CSV: uma linha por aluna, com telefone, créditos e dias.
6. Confira os outros caminhos: aprovar uma solicitação da professora com cancelamento, ou criar uma aula excepcional em conflito com a grade — as linhas aparecem com a origem correta e a mensagem muda de texto.

### Verificação executada

Percorrido no navegador depois de um reset: a tela com a aula do seed, a relação com as duas alunas, e os dois links do WhatsApp conferidos pelo `href` (número `556596806348` e a mensagem decodificada). Cadastrada uma exceção real em 23/09/2026: o toast citou a tela, as duas ocorrências foram canceladas com `origemCancelamento: 'excecao'`, e a relação foi gravada com Larissa (1 crédito, 7 dias) e Renata (0/0, convênio) — confirmando que o caminho de escrita funciona, não só o dado do backfill. Verificado também que o reset traduz o `alunaId` dentro de `alunasAfetadas` para os ids novos. Dados de teste apagados com um reset final.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes.

**Ajustes feitos durante a verificação**: o detalhe dizia "1 crédito devolvido(s)", agora flexiona; a mensagem para a aluna de convênio terminava convidando a remarcar conosco logo depois de mandá-la ao aplicativo do parceiro; faltava um espaço entre duas frases da mensagem; e o motivo aparecia com o prefixo interno "Exceção de calendário:" repetido dentro do texto enviado.

### Ajustes pós-entrega

- **A mensagem manda a aluna agendar, não pedir encaixe.** O texto terminava com "me diga um horário que combina com você que eu te encaixo", o que criaria uma fila de encaixe manual que o studio não opera: quem agenda é a própria aluna, pelo sistema (RF-AGD-01). Agora o convite é "Para repor, entre no sistema, abra a «Grade disponível» e agende o melhor dia para você", e o caso de turma encerrada aponta as outras turmas da grade. A aluna de convênio continua sendo mandada ao aplicativo do parceiro, sem repetir a instrução duas vezes; a aula experimental, que não tem grade para agendar, segue por contato direto.
- **A aula cancelada do seed colidia com a solicitação pendente da Beatriz**: as duas apontavam para a sessão de dança na próxima terça ou quinta, então aprovar a solicitação cancelava uma ocorrência já cancelada e sobrescrevia a relação do backfill. A aula cancelada passou para o **alongamento do próximo sábado** (ses-5, 09:00), que nenhum outro cenário usa, com a reserva de convênio da Renata registrada como cancelada. O cenário do guia foi atualizado.

---

## Lote 3 — Professora consulta a ficha; indicadores de professora

Dois requisitos novos da v2.1 que não tinham nada no protótipo: a professora passou a consultar a ficha de qualquer aluna, com a anamnese em destaque e auditoria por consulta (RF-PRE-09), e a administração ganhou os indicadores de retenção e frequência (RF-PNL-07, REL-14).

### O que foi entregue

**Domínio**

- **`src/hooks/fichaParaProfessora.ts`** (novo) — `useAlunasParaProfessora` (lista com nome, telefone e se a anamnese tem pontos de atenção) e `useFichaParaProfessora` (ficha reduzida: anamnese, contato, situação do pacote e próximas aulas). A leitura é **deliberadamente reduzida**: valores, compras, reembolsos e ajustes de carteira continuam só na ficha administrativa. Carregar a ficha **grava** o registro de auditoria `consulta_ficha_pela_professora` (RNF-05).
- **`src/hooks/indicadoresDeProfessoras.ts`** (novo) — `indicadoresDeProfessoras(periodo)` devolve, por professora, aulas atribuídas, conduzidas e a frequência, mais a retenção; e, por turma, a retenção da sessão. `frequenciaMedia` alimenta o cartão do painel. `periodoAnteriorA` resolve o mês de comparação, inclusive na virada de ano.
  - **Atribuída** é cada ocorrência da grade até hoje em que a professora estava escalada — projetada pelo calendário, porque a recorrência é derivada e a maioria das datas não existe como registro. Ocorrência cancelada e data de exceção saem do denominador: a professora não deixou de dar uma aula que não aconteceu.
  - **Conduzida** é a que virou chamada finalizada. Substituição conta para quem conduziu, não para a titular.
  - **Retenção** compara os conjuntos de alunas com presença no período anterior e no atual. Sem alunas no anterior, o indicador é "—", não 0%.

**Telas**

- **`AlunasDaProfessoraPage`** (`/professora/alunas`) — todas as alunas do studio, com busca por nome, CPF ou telefone, e um selo por aluna: "Com pontos de atenção" quando a anamnese declara lesão, dor articular, condição cardíaca, medicação contínua ou gestação; "Sem restrições declaradas"; "Não preenchida". Item **"Alunas"** no menu da professora.
- **`FichaDaAlunaProfessoraPage`** (`/professora/alunas/:alunaId`) — anamnese primeiro, com as respostas "Sim" destacadas; contato e contato de emergência; pacote só como situação (créditos disponíveis e validade, sem valores); próximas aulas. O rodapé avisa que a consulta foi registrada.
- **`ChamadaPage` e `ChamadaExcepcionalPage`** ganharam o link **"Ver ficha da aluna"** abaixo de cada cartão de presença — fora do botão, em linha própria, para um toque não virar o outro.
- **`IndicadoresDeProfessorasPage`** (`/administracao/indicadores-professoras`, menu Operação) — seletor de mês e ano, tabela por professora (aulas, frequência, alunas do mês anterior, retenção), tabela de retenção por turma e exportação CSV. Um quadro no topo explica as duas contas, porque "retenção" e "frequência" significam coisas diferentes em cada studio.
- **`AdministracaoHome`** ganhou o cartão **"Frequência das professoras"** e o link para a tela.
- **`AuditoriaPage`** passou a ter um mapa de rótulos para operações cujo nome cru não se lê bem: "Consulta à ficha pela professora".

**Seed**

- **Seis aulas de POLE INICIANTE já realizadas** por Beatriz, com chamada finalizada, presenças e comissão: quatro nas últimas semanas (Patrícia e Renata) e duas de cerca de dois meses atrás (Aline e Renata). Isso dá número aos dois indicadores e enche a tela de Comissões, que estava vazia.
- Os créditos consumidos por Patrícia (3) e Aline (2) deixaram de ser um lançamento em bloco ("Aulas realizadas em agosto") e passaram a **apontar cada aula**, agora que as aulas existem. A soma não mudou.
- A chamada pendente da Beatriz (o cenário de chamada não finalizada) continua intocada: o bloco de aulas realizadas começa uma semana antes dela, de propósito.

**Guia**

- Cenários novos: **"A professora consulta a ficha da aluna"** e **"Retenção e frequência das professoras"**.
- Persona da Beatriz atualizada, agora com aulas já realizadas.

### Decisões deste lote

- **A professora vê qualquer aluna, não só as das turmas dela.** É o que o requisito diz, e é o caso real: reposição, aula excepcional e substituição colocam alunas desconhecidas na frente dela.
- **A ficha da professora é reduzida por desenho.** Ela precisa saber se a aluna pode treinar, não quanto pagou. Isso também limita o alcance do acesso que a auditoria registra.
- **A consulta grava ao carregar a tela** — a única exceção à regra "carregar uma tela nunca escreve no banco", e documentada como tal, porque é o próprio RF-PRE-09 que exige o registro. O efeito é atrelado ao par aluna + professora, disparado pela navegação.
- **Os indicadores são só da administração** (D3). O painel da professora continua sendo o do RF-PNL-04.
- **A frequência começa baixa e isso é correto.** O protótipo só tem chamada finalizada em algumas aulas, e o indicador conta exatamente conduzidas sobre atribuídas. O cenário do guia transforma isso em demonstração: finalize a chamada pendente e veja o número subir.
- **O seletor é de mês, como em Comissões.** A retenção precisa de dois períodos comparáveis, e o escopo apura tudo por mês civil.

### Como testar

1. **Resetar protótipo.** No painel administrativo, o cartão "Frequência das professoras" traz a média do mês; clique em "Ver retenção e frequência por professora".
2. A tabela mostra **Beatriz com 4 de 16 aulas atribuídas (25%)** e retenção de **1 de 2 (50%)** — Renata voltou, Aline não. Camila aparece com 0 de 9, porque não há chamada finalizada nas turmas dela.
3. A segunda tabela traz a retenção por turma: POLE INICIANTE com 50%, as demais com "—".
4. Troque o mês para o anterior e compare; exporte o CSV.
5. Entre como **Beatriz** e abra **Alunas**: as sete alunas, com o selo de anamnese. Larissa e Aline aparecem como "Com pontos de atenção"; Fernanda, Helena e Juliana como "Não preenchida".
6. Abra a ficha da Larissa: a anamnese vem primeiro, com a lesão no ombro destacada. Não há valores em lugar nenhum.
7. Abra a chamada pendente da Beatriz e use **"Ver ficha da aluna"** sob qualquer cartão.
8. Como administração, em Configuração → Auditoria, procure **"Consulta à ficha pela professora"**: cada abertura de ficha deixou um registro.
9. Finalize a chamada pendente da Beatriz e volte aos indicadores: a frequência dela sobe.

### Verificação executada

Percorrido no navegador depois de um reset: o cartão do painel (16% de média), a tela de indicadores com Beatriz em 4 de 16 (25%) e retenção 1 de 2 (50%), POLE INICIANTE em 50% e as demais turmas em "—"; a lista de alunas da professora com os três selos de anamnese; a ficha da Larissa, conferindo que não há nenhum valor em reais na tela; o registro de auditoria criado na abertura (4 → 5 registros, operação `consulta_ficha_pela_professora` com aluna e professora); o link "Ver ficha da aluna" nos cartões da chamada. Finalizada a chamada pendente da Beatriz, a frequência subiu de 25% para 31% e a comissão foi gerada. Dados de teste apagados com um reset final.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes.

**Ajuste feito durante a verificação**: o link "Ver ficha" estava posicionado em cima do selo de presença, no canto do cartão; passou para uma linha própria abaixo dele, em ambas as chamadas.

---

## Lote 4 — Aula excepcional: participante sem cadastro e convênio à parte

A v2.1 abriu o workshop para duas pessoas que a v2.0 deixava de fora: quem não é aluna do studio (RF-AEX-06) e a aluna de convênio disposta a pagar à parte (RF-AEX-11). As duas entram pelo mesmo caminho — alocação **sem consumo de créditos**, com o pagamento tratado fora do sistema.

### O que foi entregue

**Modelo de dados**

- **`Alocacao.alunaId` virou opcional** e ganhou `participanteSemCadastro: { nome, telefone }`. Tipo novo `ParticipanteSemCadastro`.
- **`RegistroPresenca.alunaId` virou opcional** e ganhou `alocacaoId`: a presença de quem não tem cadastro é identificada pela alocação. A chave estrangeira nova entrou no mapa do reset.

**Domínio**

- **`alocarAluna` aceita os dois casos.** Participante sem cadastro exige nome e telefone e é **sempre** sem consumo — não há pacote de onde debitar. Aluna de convênio deixou de ser recusada sempre: é recusada só quando a alocação tentaria consumir créditos, com a mensagem explicando a saída ("registre a participação sem consumo, com o pagamento tratado à parte").
- **Notificação e estorno só acontecem quando há aluna.** Participante sem cadastro não tem acesso ao sistema nem carteira; `cancelarAlocacao` e `alocarAluna` passaram a testar isso em vez de assumir que toda alocação tem uma aluna atrás.
- **`listarAlocacoesDetalhadas`** devolve `nomeAluna`, `telefone` e `semCadastro`, resolvendo o nome da participante quando não há cadastro.
- **A chamada da aula excepcional** passou a listar participantes sem cadastro e alunas de convênio (RF-PRE-02). `AlunaNaChamada` ganhou `chave` — o id da aluna ou o da alocação —, `telefone` e `semCadastro`; as duas telas de chamada passaram a alternar a presença por essa chave. `gravarRegistrosDePresenca` casa o registro por `alunaId` **ou** por `alocacaoId`, e pula a conversão de reserva quando não há aluna.
- **A presença sem cadastro conta na comissão** (o número de presenças já vinha da lista) e **não conta na retenção**: quem não é aluna do studio não tem como "voltar" no período seguinte.

**Telas**

- **Modal de alocação**: caixa "Participante sem cadastro", que troca a lista de alunas por nome e telefone e marca "sem consumo de créditos" de forma travada; a lista de alunas passou a incluir as de convênio, com a marcação "convênio, só com pagamento à parte"; escolher uma delas sem dispensar o consumo mostra o aviso e bloqueia o envio. A lista de participantes mostra o selo "Sem cadastro" e o telefone.
- **`CheckboxField`** ganhou o estado `desabilitado`, para o caso em que a regra já decidiu o valor e a tela precisa mostrar por quê.
- **Chamada excepcional**: participante sem cadastro aparece com "Sem cadastro · telefone" e sem link de ficha; aluna de convênio, com "Convênio · participação paga à parte".

**Guia**

- Cenários novos: **"Convidada sem cadastro no workshop"** e **"Aluna de convênio paga à parte"**.
- "Criar um workshop e alocar as alunas" deixou de mandar testar a recusa da Renata, que agora é aceita; a persona dela diz que pode participar pagando à parte.

### Decisões deste lote

- **Participante sem cadastro não vira aluna.** Não aparece em Alunas, não tem ficha, não entra na retenção e não recebe notificação. Ela existe dentro da alocação, que é o escopo do requisito.
- **Sem cadastro implica sem consumo, e a tela trava a caixa** em vez de deixar a pessoa marcar e receber um erro depois.
- **A aluna de convênio continua na lista de alunas do modal**, com a condição escrita na própria opção. Escondê-la repetiria o comportamento da v2.0, que era justamente o que mudou.
- **A presença de quem não tem cadastro é identificada pela alocação.** Criar uma aluna-fantasma para pendurar o registro poluiria o cadastro e a retenção.

### Como testar

1. **Resetar protótipo**, criar uma aula excepcional (categoria Workshop) com uma professora vinculada e abrir **"Alocar alunas"**.
2. Escolha **Renata Souza**: a opção dela diz "convênio, só com pagamento à parte". Sem marcar nada, o aviso aparece e o botão fica bloqueado. Marque "Sem consumo de créditos", escolha "Pagamento avulso" e aloque.
3. Marque **"Participante sem cadastro"**: a lista de alunas dá lugar a Nome e Telefone, e "sem consumo" fica marcado e travado. Informe os dados e aloque.
4. Na lista de participantes, a convidada aparece com o selo "Sem cadastro" e o telefone.
5. Abra a chamada da aula (pela administração, se não houver professora vinculada, ou pela professora). As duas aparecem; só a aluna cadastrada tem "Ver ficha da aluna".
6. Finalize a chamada: a comissão da professora sai com **2 presenças**, e nenhum crédito é movimentado.
7. Confira que a convidada **não** aparece em Alunas nem nos indicadores de retenção.

### Verificação executada

Percorrido no navegador depois de um reset, com um workshop criado para o teste: a opção da Renata com a condição escrita, o aviso e o botão bloqueado sem dispensa de consumo, e a alocação aceita com "Pagamento avulso" (0 créditos); a troca para "Participante sem cadastro", com os campos de nome e telefone e a caixa de consumo travada; a alocação da convidada; a chamada listando as duas, com link de ficha só para a Renata; a finalização gerando um registro de presença por `alocacaoId` (sem cadastro) e outro por `alunaId`, mais a comissão de R$ 180,00 com 2 presenças; e a confirmação de que nenhuma usuária foi criada para a convidada. Dados de teste apagados com um reset final.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes.

**Ajustes feitos durante a verificação**: o botão de alocar ficava desabilitado no modo sem cadastro, porque a condição que bloqueia o convênio sem pagamento à parte também pegava esse caso; e o cabeçalho da chamada excepcional afirmava que "cada participação consumiu N créditos", o que passou a ser falso com participantes sem consumo — agora diz o custo da categoria por participação com consumo.

---

## Lote 5 — Comprovante, prévia do reembolso, TotalPass em contingência, busca por telefone

Os quatro itens menores da v2.1, cada um em um módulo diferente.

### O que foi entregue

**Item 5 — comprovante do fechamento (RF-COM-09)**

- `FechamentoComissao.comprovante` (opcional) e `marcarFechamentoComoPago({ comprovante? })`. Guarda o nome do arquivo com o mesmo prefixo `anexo-simulado://` do anexo da justificativa; `nomeDoComprovante` devolve o nome limpo para a tela.
- "Registrar pagamento" deixou de ser um `useConfirm` e virou modal com o campo **"Comprovante (opcional)"**. A linha do fechamento passou a dizer `comprovante: <arquivo>` ou **"sem comprovante anexado"** — o anexo é opcional, mas a tela não deixa a dúvida no ar.

**Item 6 — prévia do reembolso (RF-REE-03, RF-REE-07)**

- `PreviaDeReembolso` ganhou `prazoArrependimentoDias`, para a prévia dizer contra o que os dias foram comparados.
- O modal mostra, antes de qualquer valor, **data da compra**, **dias decorridos** (com o prazo vigente ao lado, no arrependimento) e o percentual consumido, que já existia.
- A recusa por mais de 50% consumidos passou a **indicar o motivo legal como saída**, como a recusa por prazo já fazia. O rótulo do tipo agora diz "Motivo legal (após o prazo ou com mais de 50% consumidos)", e a dica do campo resume a regra.

**Item 8 — TotalPass em contingência manual (RF-CNV-14, EV-21)**

- `CONVENIOS_COM_INTEGRACAO` e `temIntegracaoAutomatica` em `convenios.ts`: na Fase 1 só o Wellhub. Cadastrar credencial ou sincronizar a grade do TotalPass é recusado, com a mensagem apontando a reserva manual e a Fase 2.
- Em Credenciais, o TotalPass aparece com o selo "Contingência", o texto explicando a fase, sem "Sincronizar grade" e sem botão de credencial — no lugar, "Sem credencial nesta fase".
- Reserva manual, check-in, relatório e chamada continuam iguais para os dois: o que muda é quem registra.

**Item 10 — busca única por nome, CPF ou telefone (RF-ALU-10)**

- `alunaCorresponde` em `useAlunas.ts` compara nome e e-mail por texto e **CPF e telefone só pelos dígitos**: quem busca digita "65968" ou "12345678900" sem a pontuação que o cadastro guarda. A lista de alunas passou a usá-la, e o placeholder virou "Buscar por nome, CPF ou telefone".

**Seed**

- **TotalPass sem credencial, em contingência**, e sem data de sincronização.
- **Mariana Teixeira** (nova): aluna do TotalPass, com termo e anamnese em dia, agendamento e **reserva registrada em contingência** (`origemRegistro: 'contingencia'`) na última aula de dança, mais o registro de auditoria da reserva manual.

**Guia**

- Cenário novo **"TotalPass em contingência manual"**; persona da Mariana.
- "Fechar o mês e registrar o pagamento" ganhou o passo do comprovante e a conferência das duas linhas possíveis.
- "Reembolso por arrependimento" passou a citar os dias decorridos e a recusa por percentual, com o caminho para reproduzi-la.
- "Matrícula pulando o termo" ganhou o passo da busca por telefone.
- "O que é simulado": item **Anexos** (comprovante e justificativa guardam só o nome do arquivo) e o texto de convênio reescrito para separar Wellhub de TotalPass.

### Decisões deste lote

- **A tela diz "sem comprovante anexado" em vez de omitir.** Um campo opcional que simplesmente some deixa quem confere sem saber se o anexo não existe ou se a tela não mostra.
- **Recusar não é fechar a porta.** As duas recusas do arrependimento — prazo e percentual — agora terminam apontando o reembolso por motivo legal, que é exatamente o que o RF-REE-07 passou a prever.
- **O TotalPass perdeu o botão de credencial, não só a permissão.** Deixar o botão e recusar no salvamento faria a pessoa preencher um formulário para levar um "não".
- **CPF e telefone são comparados por dígitos.** Comparar o texto cru exigiria digitar a máscara exata do cadastro, o que na prática inutiliza a busca.

### Como testar

1. **Resetar protótipo.** Em **Alunas**, busque `9680`: todas aparecem (é o telefone comum do protótipo). Busque `121.212` ou `121212`: só Mariana Teixeira.
2. Em **Convênios → Credenciais**: o Wellhub tem credencial e "Sincronizar grade"; o TotalPass aparece com "Contingência", o texto da Fase 2 e "Sem credencial nesta fase".
3. Em **Convênios → Reservas**, veja a reserva da Mariana registrada em contingência, e registre outra pela "Reserva manual".
4. Em **Comissões**, "Fechar período" e depois **"Registrar pagamento"**: informe o nome de um arquivo. A linha do fechamento passa a mostrar `comprovante: <arquivo>`. Repita sem informar nada em outro período: a linha diz "sem comprovante anexado".
5. Na ficha da **Patrícia**, histórico de compras, "Reembolsar": a prévia mostra data da compra, **dias decorridos** com o prazo ao lado, e 75% consumidos. A recusa por prazo sugere o motivo legal.
6. Para ver a recusa por consumo: em **Parâmetros**, aumente o "Prazo de arrependimento" para 60 dias e repita — a recusa passa a ser pelo percentual, também indicando o motivo legal.

### Verificação executada

Percorrido no navegador depois de um reset: busca por `9680` (8 alunas) e por `121.212` (só Mariana); a aba Credenciais com o Wellhub completo e o TotalPass em contingência, sem sincronização e sem botão de credencial; fechamento do período de setembro e registro do pagamento com o comprovante `transferencia-beatriz-setembro.pdf`, gravado como `anexo-simulado://…` e exibido na linha do fechamento; a prévia de reembolso da Patrícia com "Data da compra 13/08/2026", "Dias decorridos 40 dias · prazo de arrependimento: 7 dias" e "3 de 4 (75%)", recusada pelo prazo com a indicação do motivo legal; e, com o prazo ampliado para 60 dias, a recusa pelo percentual com a mesma indicação. Dados de teste apagados com um reset final, que devolveu o parâmetro a 7 dias.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes.

**Ajustes feitos durante a verificação**: o TotalPass ainda exibia "Editar credenciais", que levaria a um formulário fadado à recusa — o botão deu lugar a "Sem credencial nesta fase"; e o passo do guia sobre a recusa por percentual prometia um resultado que a regra de prazo alcançava antes, então passou a dizer como reproduzir o caso.

---

## Ajustes de UX e correção de bug — área da professora

Pedidos depois da validação do Lote 6, sobre as telas entregues nos Lotes 3 e 5.

### O que foi entregue

**Correção de bug — a busca de alunas da professora não filtrava por nome (RF-ALU-10).**

Digitar um nome em *Professora → Alunas* não filtrava nada: a lista continuava inteira. A causa é sutil e vale registrar, porque é o tipo de erro que volta. A tela comparava os dígitos do termo com os do telefone:

```
aluna.telefone.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
```

Num termo sem dígito nenhum — qualquer busca por nome — `termo.replace(/\D/g,'')` vira string vazia, e **`'...'.includes('')` é sempre `true`**. Toda aluna casava pelo telefone, e o resultado parecia "o filtro por nome não funciona" quando na verdade nada era filtrado. A busca da administração (`alunaCorresponde`, Lote 5) já tinha a guarda `digitos.length > 0`; a da professora, escrita à parte no Lote 3, não.

A correção tira a duplicação que permitiu as duas versões divergirem: **`src/utils/busca.ts`** (novo) concentra a regra em `alunaCorrespondeAoTermo`, com a guarda e o comentário explicando por que ela existe, e as duas telas passam a chamá-la — `useAlunas.ts` e `AlunasDaProfessoraPage.tsx`.

**Próximas aulas com as alunas agendadas, no painel da professora (RF-PNL-04, RF-PRE-09).**

O painel mostrava as aulas de hoje em cartão e a contagem de ocupação, mas não *quem* vinha. Saber o nome antes da aula é o que permite chegar preparada — e, com a ficha da aluna entregue no Lote 3, abrir a anamnese de quem ela não conhece sem caçar o nome na lista.

- `useAgendaDaProfessora` ganhou `AulaDaProfessora.alunas: AlunaAgendada[]` — id, nome, e as marcas `experimental` e `convenio`, as mesmas que a chamada distingue (RF-EXP-06, RF-CNV-10). A relação é montada no mesmo ponto em que a ocupação já era contada; o hook passou a listar alunas e usuárias para resolver os nomes.
- Tabela nova **"Próximas aulas"** no painel, abaixo das aulas de hoje: quando, aula (com o selo "Substituindo" e a ocupação sobre a capacidade) e a relação de agendadas, **cada nome linkando para a ficha dela**. Cinco por página, ordenada por data — as próximas são as que importam. Aula sem ninguém agendada diz "Ninguém agendada ainda" em vez de ficar vazia.

**Fechamentos anteriores abrem as aulas do período e o comprovante (RF-COM-08, RF-COM-09).**

Em *Meus pagamentos*, o fechamento anterior mostrava só o total e o selo de pago — a professora via quanto recebeu, não pelo quê. Agora cada linha expande:

- **As aulas que compõem o valor**, com data, descrição, base de cálculo e valor, separando aula excepcional (selo "Excepcional") e lançamento de ajuste (selo "Ajuste"). É o mesmo detalhamento que a administração confere antes de pagar (`detalharComissoes`), agora do lado de quem recebe.
- **O comprovante anexado pela administração**, pelo nome do arquivo, com a ressalva de que é anexo simulado e não tem download. Quando não houve anexo, a tela diz "não anexado pela administração" em vez de omitir — quem recebeu o dinheiro e não encontra nada ali ficaria na dúvida.
- O cabeçalho da linha passou a trazer a contagem de aulas junto da data de pagamento.

### Decisões destes ajustes

- **A correção foi na origem, não na tela.** Dava para repetir a guarda `digitos.length > 0` no segundo lugar; em vez disso as duas telas passaram a usar a mesma função, que agora carrega no comentário o motivo de ela existir. Duas cópias da mesma regra foi o que produziu o bug.
- **A tabela de próximas aulas lista também as aulas vazias.** É a agenda dela: esconder as sem ninguém agendada daria a impressão de que a aula não existe. O texto diz explicitamente que ninguém se agendou ainda.
- **O nome da aluna na tabela é link para a ficha**, não texto. O caminho natural depois de ver quem vem é querer saber o que observar — e a ficha existe exatamente para isso (RF-PRE-09).

### Como testar

1. **Professora → Alunas**: buscar "larissa" devolve uma aluna; "mari", uma; `121.212` (CPF) e `9680` (telefone) continuam funcionando; campo vazio mostra todas.
2. **Professora → Painel**: abaixo de "Aulas de hoje", a tabela "Próximas aulas" lista as aulas futuras com quem está agendada. Clicar num nome abre a ficha da aluna. A aula de segunda ou quarta às 08:00 traz Larissa e Renata (essa com "· convênio").
3. **Fechar um período com pagamento**: como administração, em Comissões, "Fechar período" e depois "Registrar pagamento" informando um nome de arquivo.
4. **Professora → Meus pagamentos**: o fechamento aparece com "N aula(s)" e o botão "Ver aulas". Expandido, mostra o comprovante pelo nome e as aulas que compõem o valor. Repetindo o pagamento sem informar comprovante, a linha diz "não anexado pela administração".

### Verificação executada

Percorrido no navegador: a busca por nome, CPF e telefone na lista da professora (1, 1, 1 e 8 resultados, respectivamente, contra "todas casam" antes da correção); a tabela de próximas aulas no painel, com Larissa e Renata na aula de 23/09 e o selo de convênio; e o ciclo completo de fechamento — período fechado (R$ 140,00), pagamento registrado com `ted-beatriz-setembro-2026.pdf`, e a professora vendo o comprovante e as quatro aulas de POLE INICIANTE que compõem o valor. Dados de teste apagados com um reset ao final.

`tsc -b` sem erro, `vite build` compilando, `oxlint` só com os três avisos preexistentes.

---

## Lote 6 — Consolidação da documentação

**`escopo_funcional_contratado.md` passou a ser a v2.1.** A decisão em aberto do plano — converter o docx ou substituir pelo `.txt` de `docs/` — foi resolvida pela primeira opção: uma conversão completa do `.docx` para o mesmo padrão markdown da v2.0 (títulos por nível, tabelas com cabeçalho e coluna de ID em negrito, caixas de decisão como blockquote), não uma cópia do texto bruto de apoio. É o documento que `CLAUDE.md` chama de fonte única da verdade, e ele precisava continuar legível e navegável como tal.

### O que foi entregue

- **`escopo_funcional_contratado.md`** regravado a partir de `docs/Escopo Funcional Atualizado v2.1.docx`, por um conversor próprio (`python-docx`) que percorre o documento na ordem original — parágrafos e tabelas intercalados — e aplica as mesmas convenções da v2.0: `Heading 1/2/3` → `#`/`##`/`###`; parágrafo iniciado por marcador vira item de lista; tabela 1×1 (as caixas "Decisão de interface", "Definido com a cliente", "Sugestão da FGC Digital" etc.) vira blockquote, com o primeiro parágrafo como título em negrito; tabela de dados ganha cabeçalho em negrito, e a primeira coluna das linhas também quando o cabeçalho é "#" ou "ID" (módulos, RN, RF, RNF, REL, EV) — não quando é um nome comum (Ator, Pacote, Status). Negrito e itálico de dentro do texto vêm dos runs do próprio `.docx`, preservados como já estavam.
- **`escopo_funcional_contratado_v2.0.md`** (novo) — a v2.0 arquivada, com o mesmo aviso de "documento substituído" que a v1 já tinha, resumindo o que a v2.1 trouxe e apontando para este plano e para este progresso.
- **`CLAUDE.md`** — item 1 da leitura obrigatória passou a apontar para a v2.1; itens 2-4 passaram a citar as duas migrações (v1→v2.0 e v2.0→v2.1) e os arquivos de cada uma; "Nunca avance... sem validar" passou a falar em "etapa ou lote"; o vocabulário do glossário aponta para v2.1; nota nova de que "studio" sem acento é deliberado (D4); capítulo "Evoluções Futuras" corrigido de EV-01–15 para EV-01–21; nota de que PA Aberto/Em definição fica parametrizado, sem comportamento inventado.
- **`README.md`** — título e primeira linha para "Estúdio" e v2.1; segundo parágrafo passou a citar as duas migrações; nota da grafia "studio"/"estúdio"; bullet do `notificador.ts` ganhou a ressalva de que o botão de WhatsApp (RF-CPR-09) não passa por ele; dois bullets novos para `fichaParaProfessora.ts` (a exceção de escrita ao carregar) e `indicadoresDeProfessoras.ts`; a regra "carregar tela nunca escreve" ganhou o ponteiro para essa exceção; EV-01–15 corrigido para EV-01–21.
- **`PROGRESSO_ATUALIZACAO.md`** — aviso no topo de que a v2.1 foi absorvida, com os links para o plano e o progresso deste arquivo; o registro das Etapas 1-8 (v1→v2.0) permanece como está, é o primeiro degrau da migração.

### Decisões deste lote

- **Conversão completa, não substituição pelo `.txt`.** O `.txt` de `docs/` foi feito para leitura corrida durante a análise do diff; como documento de referência do projeto, precisava da mesma navegabilidade (títulos, tabelas, negrito nos ids) que a v2.0 já tinha — uma cópia crua teria sido um passo atrás.
- **A regra de negrito na coluna de ID é por cabeçalho, não por padrão do texto.** Testada contra as ~30 tabelas do documento (módulos, RN, RF, RNF, REL, EV, e as que não bolam a primeira coluna: Ator, Pacote, Status, Campo, Marcação, Etapa) e confere em todas.
- **Um trecho do `.docx` (a linha "Requisito/Bloqueia a partir de" das caixas PA-09 e PA-10) veio com itálico acidental no documento de origem** — as onze caixas equivalentes das outras PA-xx não têm essa marcação, e a combinação de negrito+itálico sem espaço entre trechos gerava `****` inválido no markdown. Normalizado para o mesmo padrão do resto do documento, e não replicado literalmente: o itálico ali não carrega sentido.

### Como testar

1. Abrir `escopo_funcional_contratado.md` e comparar a íntegra com `docs/Escopo Funcional Atualizado v2.1.docx` — capítulos 1 a 15, PA-01 a PA-12.
2. Conferir os três cenários prometidos e os itens novos: RF-CPR-09, RF-PRE-09, RF-AEX-06/11, RF-COM-09, RF-REE-03/07, RF-PNL-07/REL-14, RF-CNV-14/EV-21, RF-ALU-10 — todos presentes, com o texto batendo com o `.docx`.
3. `escopo_funcional_contratado_v2.0.md` abre com o aviso de substituído, como `escopo_funcional_contratado_v1.md`.
4. `CLAUDE.md` e `README.md` citam a v2.1 e os dois arquivos deste lote na ordem de leitura.

### Verificação executada

Conversor escrito e revisado por amostragem em toda a extensão do documento: cabeçalhos (15 `#`, 45 `##`, 13 `###`, batendo com a contagem de estilos do `.docx`), 208 requisitos `RF-` (205 na v2.0 + as três novas: RF-CPR-09, RF-PRE-09, RF-PNL-07), 38 `RN-` nas duas versões (confirma que nenhuma foi renumerada), 12 `PA-`, 21 `EV-`, 14 `REL-`; nenhuma tabela com contagem de colunas inconsistente; nenhum marcador de ênfase malformado (`****` ou contagem ímpar de `*` por linha) depois da correção do itálico acidental; nenhum caractere de mojibake ou marcador de lista (`•`) sobrando. Seções conferidas por leitura: capa e "Papel deste documento", atores, M1/M2 (RF-CFG-06, RF-ALU-04–10), regras de negócio (RN-01–38), modelo de dados (`OcorrênciaSessão`, `Alocação`, `FechamentoComissão` com os campos novos), requisitos não funcionais (RNF-05 com a professora), convênios (10.2 TotalPass, 10.3 dependência crítica), evoluções futuras (EV-16–21) e os doze PA-xx, inclusive o par PA-09/10 corrigido.

Não houve alteração de código neste lote — sem impacto em `tsc`, `vite build` ou `oxlint`.

---

