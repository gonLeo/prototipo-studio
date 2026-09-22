# Progresso — Atualização para o Escopo v2.1

Atualização do protótipo do escopo v2.0 (25/08/2026) para o **escopo v2.1** (`docs/Escopo Funcional Atualizado v2.1.docx`). O plano completo — diff, decisões, mapeamento tela a tela, modelo de dados, mensagens, cenários e lotes — está em [PLANO_ATUALIZACAO_V21.md](./PLANO_ATUALIZACAO_V21.md). Este arquivo registra a execução: o que cada lote entregou, decisões tomadas durante o lote e como testar.

A migração v1.0 → v2.0 continua registrada em [PROGRESSO_ATUALIZACAO.md](./PROGRESSO_ATUALIZACAO.md); a construção original, em [PROGRESSO.md](./PROGRESSO.md).

Dinâmica: **um lote por ciclo.** O lote só começa com autorização explícita, termina com a seção correspondente preenchida aqui e para até a validação. Ajuste pedido num lote entregue e ainda não validado é registrado como "Ajuste pós-entrega" na seção do próprio lote. Nunca `git commit`.

- [x] Preparação — cenários prometidos à cliente (termo nominal, renovação antecipada, prorrogação em carteira vencida) — entregue em 21/09/2026, registrado em `PROGRESSO_ATUALIZACAO.md`
- [x] Lote 0 — Seed com datas relativas e telefone único das alunas
- [x] Lote 1 — Pendência de aceite e pagamento antes do termo (item 1)
- [x] Lote 2 — Cancelamento pelo studio com relação preservada e WhatsApp (item 2)
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
