# Progresso — Protótipo Sistema de Gestão do Studio

Controle de fases do desenvolvimento. Uma fase por ciclo; cada fase só avança após validação explícita do cliente.

- [x] Fase 0 — Fundação técnica (setup, tipos, serviços, roteamento, sessão simulada, reset)
- [x] Fase 1 — M1 Configuração Base + M4 Professoras e Categorias
- [x] Fase 2 — M5 Grade de Horários + M6 Calendário de Exceções
- [x] Fase 3 — M2 Cadastro de Alunas + M3 Pacotes e Contratos
- [x] Fase 4 — M7 Agendamento de Aulas + M8 Cancelamento e Justificativa
- [ ] Fase 5 — M9 Presença e Chamada + M10 Comissão e Fechamento
- [ ] Fase 6 — M11 Cobranças e Financeiro
- [ ] Fase 7 — M12 Aula Experimental + M13 Convênios Corporativos
- [ ] Fase 8 — M14 Painéis e Indicadores + M15 Notificações + M16 Perfis e Permissões (fechamento)

## Decisões fixadas

- Persistência: json-server sobre `src/data/seed.json` (backfill versionado) → copiado para `db.json` (cópia de trabalho, git-ignorada) no início do dev.
- Camada de acesso a dados isolada em `src/services/` (repositório genérico `criarRepositorio<T>`), nunca chamada direta de `fetch`/`localStorage` em componentes.
- Tipos de domínio completos (seção 8 do escopo) em `src/types/domain.ts`, já modelados mesmo antes das telas que os usam.
- Pontos em aberto do escopo (PA-01 a PA-06) resolvidos com valores fictícios de referência, sinalizados como exemplo — não bloqueiam o desenvolvimento.
- Convênios (M13) e gateway de pagamento (M11) sem API real — simulados via ações administrativas.
- Sem autenticação real — perfis simulados por seleção de usuária de exemplo (tela de login).

## Fase 0 — o que foi entregue

**Infraestrutura, sem telas de módulo ainda.**

- Projeto Vite + React 19 + TypeScript, Tailwind v4, React Router 7.
- `src/types/domain.ts`: todas as entidades da seção 8 do escopo modeladas em TypeScript.
- `src/services/`: `http.ts` (cliente REST), `createRepository.ts` (fábrica de repositório com `listar/buscarPorId/criar/atualizar/remover`), `repositorios.ts` (uma instância por recurso), `reset.ts` (restaura o backfill original).
- `src/hooks/useSessao.tsx`: sessão simulada (perfil ativo, persistida em localStorage), sem senha.
- `src/components/layout/AppShell.tsx`: casca de navegação mobile-first (nav inferior no celular, lateral no desktop), com badge de perfil, troca de perfil e botão "Resetar protótipo".
- Rotas: `/login` (lista usuárias de exemplo do backfill, "Entrar como Administração/Professora/Aluna"), `/administracao`, `/professora`, `/aluna` (painéis-placeholder listando o que cada fase seguinte trará), com proteção por perfil.
- Backfill inicial (`src/data/seed.json`): dados do studio + 4 usuárias de exemplo cobrindo os 3 perfis, incluindo a proprietária acumulando Administração + Professora (conforme observação do documento) e uma usuária em "aguardando aceite".

### Como testar

1. `npm install` (se ainda não rodou).
2. `npm run dev` — sobe Vite em `http://localhost:5173` e json-server em `http://localhost:4000` juntos.
3. Abrir `http://localhost:5173` → redireciona para `/login`.
4. Escolher "Camila Duarte" → tem dois botões de perfil (Administração e Professora) — testar os dois, e o botão "Ver como Professora/Administração" no topo para trocar sem novo login (RF-PER-02).
5. Escolher "Larissa Prado" → perfil Aluna.
6. Testar "Resetar protótipo" no topo (com qualquer perfil ativo) — apaga e recria o backfill original e leva de volta ao login.
7. Recarregar a página com uma sessão ativa — deve manter o perfil logado (sessão persistida).

## Fase 1 — o que foi entregue

**Perfil Administração ganha telas reais de configuração (M1 + M4).**

- Casca de navegação do perfil Administração agora abre em `/administracao`, com abas: Visão geral, Modalidades, Espaços, Studio e horário, Parâmetros, Professoras, Categorias.
- **Modalidades** (RF-CFG-01/02): CRUD completo. Nome normalizado em maiúsculas ao salvar, duplicidade bloqueada, capacidade máxima por modalidade, ativar/inativar, exclusão bloqueada se houver sessão ativa vinculada (checagem já pronta para a Fase 2).
- **Espaços** (RF-CFG-03): CRUD simples, cadastro opcional.
- **Studio e horário** (RF-CFG-04/06): formulário com dados do studio (nome, contato, endereço) e horário de funcionamento configurável por dia, com múltiplos intervalos por dia (ex.: segunda 08h-11h e 15h-18h) — cada dia sem intervalo fica marcado como fechado.
- **Parâmetros operacionais** (RF-CFG-05): os 13 parâmetros do escopo, cada um editável inline com a frase de efeito prático atualizada em tempo real (ex.: "A aluna matriculada enxerga e agenda a grade até 30 dias à frente").
- **Categorias de professora** (RF-PRO-02): CRUD com nome e valor por aula; exclusão bloqueada se houver professora vinculada.
- **Professoras** (RF-PRO-01/03/05): cadastro (cria usuária + vínculo de categoria), edição de dados cadastrais, e-mail/CPF únicos, troca de categoria com registro automático em histórico (sem efeito retroativo), consulta ao histórico de categoria, inativação bloqueada se houver sessão futura atribuída (checagem pronta para a Fase 2).
- Kit de UI reutilizável (`src/components/ui/`: Button, Field, Modal, Badge) que vai sustentar todas as próximas telas de CRUD.
- Backfill expandido: 5 modalidades, 1 espaço, 13 parâmetros, 3 categorias de professora, 2 professoras (Camila com Categoria III, Beatriz com Categoria I) com histórico inicial.

Deixado de fora intencionalmente nesta fase: RF-PRO-04 (termo de aceite da professora) — depende do mecanismo de aceite/versionamento de termo que será construído junto com o M2 (Fase 3), aplicado a alunas e professoras juntas.

### Como testar

1. `npm run dev`.
2. Entrar como "Camila Duarte" → perfil Administração.
3. **Modalidades**: criar uma nova, tentar repetir um nome existente (deve bloquear), editar capacidade, inativar/ativar, tentar excluir (funciona — ainda não há sessões na Fase 2 para bloquear).
4. **Espaços**: criar/editar/excluir.
5. **Studio e horário**: alterar dias de funcionamento e horários, salvar, recarregar a página e conferir que persistiu.
6. **Parâmetros**: mudar o valor da "Janela de agendamento — alunas matriculadas" e ver a frase de efeito mudar em tempo real; sair do campo (blur) para salvar.
7. **Categorias**: criar uma categoria, tentar excluir uma que já tem professora vinculada (deve bloquear com mensagem).
8. **Professoras**: cadastrar uma nova professora, trocar a categoria de uma existente e conferir em "Ver histórico" que a troca ficou registrada, tentar cadastrar com e-mail já usado (deve bloquear).
9. "Resetar protótipo" continua funcionando e agora restaura todos esses recursos também.

### Ajustes pós-entrega (mesma fase, antes da validação)

- Corrigido bug real: excluir modalidade falhava porque `sessoes` (recurso só usado pela Fase 2) não existia no backfill — json-server devolve 404 para uma chave inexistente, não lista vazia, e isso quebrava a checagem de "sessão vinculada". Todos os recursos do modelo de dados agora existem no seed como array vazio desde o início.
- Horário de funcionamento do studio: era um único intervalo do dia. Agora é configurável por dia da semana, com múltiplos intervalos por dia (ex.: segunda 08h-11h e 15h-18h), reordenados automaticamente por horário de início assim que um intervalo fica completo, com validação de sobreposição em tempo real. Novo intervalo nasce vazio (não pré-preenchido).
- Padrões de UI fixados para o resto do projeto (documentados em `README.md`): confirmação sempre em modal (`useConfirm`), erros/sucessos de ação sempre em toast (`useToast`), seletor de horário próprio (`TimePicker`) no lugar do `input[type=time]` nativo.
- Corrigido bug real do `TimePicker`: era totalmente controlado pelo prop `value`, então escolher só a hora (minuto ainda vazio) disparava `onChange('')` e a seleção "sumia" visualmente. Passou a guardar hora/minuto em estado local, só resincronizando do prop quando é de fato uma mudança externa.
- Redesign completo das telas de Administração pós-validação visual da cliente: paleta trocada de plum/bronze para slate + azul sóbrio (tokens `primary-*`/`neutral-*`/`ink` em `src/index.css`), tipografia só Inter (sem serifada), navegação da Administração virou sidebar real. Listagens (Modalidades, Espaços, Categorias, Professoras, Parâmetros) trocaram de lista de cards para tabela de verdade (`src/components/ui/Table.tsx`), com busca por texto e paginação funcionais. Formulários em modal passaram de pilha vertical para grid de 2 colunas. Configuração de horário do studio (por dia) virou collapse, fechado por padrão, com resumo de uma linha quando fechado. Campo com histórico/auditoria (categoria vigente da professora) deixou de ser editável inline na tabela — só no modal de edição do item. Todos esses pontos foram documentados em `README.md` → "Padrões de UI" como regra para as próximas fases, não só ajuste pontual desta tela.

Próxima fase (Fase 2) usa essas modalidades, espaços, professoras e horário de funcionamento para construir a grade de horários (M5) e o calendário de exceções (M6) — seguindo os mesmos padrões de UI (tabela com busca/paginação para listagens, formulário em grid, collapse para configuração longa por item, campos com histórico só editáveis via modal).

### Ajuste pós-validação (Fase 1 já validada)

- `TimePicker` redesenhado como mostrador analógico em modal (anel duplo hora 1-12/13-23,00 arrastável ou por toque, anel único de minuto de 5 em 5), inspirado no seletor nativo de horário do Android — documentado em `README.md` → "Padrões de UI".

## Fase 2 — o que foi entregue

**Grade de horários (M5) e calendário de exceções (M6), no perfil Administração.**

A navegação da Administração passou a ter dois grupos: **Operação** (Grade de horários, Exceções) e **Configuração** (as telas da Fase 1).

- **Grade de horários** (RF-GRD-01 a 10):
  - Cadastro de sessão recorrente com modalidade, professora, espaço opcional, vigência (início e término opcional) e descrição. A **capacidade é herdada da modalidade**, não digitada (RF-GRD-01).
  - **Múltiplas faixas numa única operação** (RF-GRD-02): o formulário aceita várias combinações de dias + horário; cada faixa vira uma sessão e é validada individualmente, então o erro aponta exatamente a faixa a corrigir.
  - **Validação de conflito de professora** (RF-GRD-03) e **de espaço** (RF-GRD-04), informando qual sessão gera o conflito, em quais dias e horário.
  - **Validação de funcionamento** (RF-GRD-05): bloqueia dia em que o studio não abre e horário fora das faixas configuradas, citando as faixas válidas daquele dia.
  - **Visão semanal** (RF-GRD-06) com navegação por semana, dia de hoje destacado, e cada sessão exibindo horário, modalidade, professora, espaço e ocupação sobre a capacidade.
  - **Alteração com alunas agendadas** (RF-GRD-07) e **exclusão** (RF-GRD-08) exibem previamente quantas alunas são afetadas; a exclusão cancela os agendamentos futuros, devolve o crédito com prazo adicional de vigência (parâmetro `dias_adicionais_cancelamento_studio`) e registra notificação para cada aluna.
  - **Encerramento** (RF-GRD-09): a sessão sai da grade a partir do dia seguinte à data de término, preservando o histórico.
  - Tabela "Sessões cadastradas" com busca e paginação para gerenciar (editar, encerrar, excluir).
- **Calendário de exceções** (RF-EXC-01 a 07): calendário mensal navegável com as exceções do período, cadastro por clique no dia, tipo (feriado, recesso, manutenção, fechamento) e descrição. A **prévia de impacto** (RF-EXC-03) mostra, antes de confirmar, quais sessões serão canceladas e quantas alunas seriam afetadas. Ao confirmar, todas as sessões da data são canceladas com devolução de crédito e notificação (RF-EXC-04). O motivo aparece na grade (RF-EXC-05, RF-GRD-10) e a exceção só pode ser removida enquanto a data for futura, sem restabelecer os agendamentos cancelados (RF-EXC-07).

### Decisões de arquitetura desta fase

- **A recorrência não é materializada.** Uma `Sessao` guarda dias da semana + faixa de horário + vigência; as datas concretas são derivadas sob demanda (`sessaoOcorreEm` em `src/utils/grade.ts`). Uma `OcorrenciaSessao` só é gravada quando aquela data específica desvia da recorrência (cancelamento, troca de professora) ou precisa ser referenciada por um agendamento — o que evita explosão de registros e é o mesmo desenho que a API real vai querer.
- Regras puras (recorrência, conflito de horário e vigência, validação contra o funcionamento) ficam em `src/utils/grade.ts`; utilitários de data em `src/utils/data.ts`, sempre sobre string ISO `YYYY-MM-DD` e com contas em UTC para a data nunca "andar" um dia por fuso.
- O cancelamento com devolução de crédito é compartilhado por M5 e M6 em `src/hooks/cancelamentoDeAulas.ts`, porque exclusão de sessão e exceção de calendário aplicam exatamente a mesma regra.
- Notificações e registros de auditoria já são gravados nos cancelamentos. As telas que os exibem chegam na Fase 8 (M15/M16).
- Backfill expandido: 5 sessões de exemplo cobrindo os dias úteis e o sábado, e uma exceção futura (feriado da Independência, 07/09/2026).

### Como testar

1. `npm run dev`, entrar como "Camila Duarte" → Administração.
2. **Grade de horários**: navegar entre semanas com "← Anterior / Hoje / Próxima →"; a semana atual destaca o dia de hoje.
3. **Nova sessão** → escolher modalidade e professora, marcar **Segunda** e horário **08:00–09:00** com a professora Beatriz: deve bloquear com "Conflito de professora…". Trocar para Camila mantendo o espaço "Sala Principal": deve bloquear com "Conflito de espaço…".
4. Marcar **Domingo**: deve bloquear com "O studio não abre domingo". Marcar **Sábado 14:00–15:00**: deve bloquear informando que o studio funciona das 09:00–13:00.
5. Ainda em "Nova sessão", usar **"+ Adicionar faixa"** para cadastrar dois dias com horários diferentes de uma vez — o toast confirma quantas sessões foram criadas.
6. Na tabela "Sessões cadastradas": **Encerrar** uma sessão com data de término e conferir na grade que ela aparece até aquela data e some depois; **Excluir** outra e conferir a confirmação.
7. **Exceções**: clicar num dia com sessões → a prévia mostra quantas sessões serão canceladas antes de confirmar. Cadastrar e conferir na **Grade** que o dia aparece como "Studio fechado" com o motivo e as sessões riscadas.
8. Remover a exceção (só datas futuras) e conferir que as sessões voltam à grade.
9. Navegar na grade até a semana de 07/09/2026 para ver o feriado que já vem no backfill.

### Ajustes pós-entrega (mesma fase, antes da validação)

- Corrigido bug real e pré-existente no **"Resetar protótipo"**: o reset recria os registros via POST, e o json-server **ignora o `id` enviado** e gera um novo — então todas as chaves estrangeiras do backfill ficavam órfãs depois de um reset (a grade mostrava "Modalidade removida"/"Professora removida", e o mesmo valia para as professoras da Fase 1). O reset agora recria os recursos em ordem de dependência e traduz cada FK do id original para o id realmente gravado, com o mapa de chaves estrangeiras declarado em `src/services/reset.ts`. **Toda entidade nova que referencie outra precisa ser registrada nesse mapa.**

Próxima fase (Fase 3) usa esta grade para o cadastro de alunas (M2) e os pacotes e contratos (M3) — é ela que passa a preencher `alunas`, `contratos` e `agendamentos`, dando efeito visível às regras de ocupação e devolução de crédito que já estão implementadas aqui.

## Fase 3 — o que foi entregue

**Cadastro de alunas (M2) e pacotes/contratos (M3), com o perfil Aluna ganhando tela real.**

Novas telas na Administração: **Alunas** e **Pacotes** (mais **Termo de aceite**, em Configuração), além da **ficha da aluna**. Fora do sistema, o link público de **auto-matrícula** em `/matricula`.

### M2 — Cadastro de Alunas

- **Cadastro administrativo** (RF-ALU-01/02): dados pessoais + pacote + duração + data da primeira cobrança + bolsa, tudo na mesma tela. E-mail e CPF são únicos, e a mensagem de erro **aponta de quem é o cadastro existente** em vez de só recusar.
- **Envio de acesso** (RF-ALU-03): ao concluir, é registrada a notificação com o saldo creditado e a orientação de assinar o termo.
- **Auto-matrícula pelo site** (RF-ALU-04): fluxo público em quatro passos — dados, pacote, termo + anamnese, pagamento — com acesso liberado automaticamente ao final, sem aprovação manual.
- **Termo de aceite versionado** (RF-ALU-05/06): tela de publicação de versões; a versão vigente é a última publicada e as anteriores ficam preservadas. O aceite grava usuária, data, hora, IP e **o conteúdo integral** do texto aceito — se o termo mudar depois, o registro continua íntegro.
- **Anamnese** (RF-ALU-07): preenchida pela própria aluna junto do aceite, respostas autodeclaradas, sem validação da administração.
- **Bloqueio até o aceite** (RF-ALU-08): a aluna cadastrada pela administração nasce "aguardando aceite" e, ao entrar, só vê a tela de termo + anamnese. Depois de aceitar, o painel normal aparece.
- **Ficha da aluna** (RF-ALU-09): dados cadastrais, anamnese, pacote, saldo, validade, mensalidade com bolsa, e os históricos de contratos, alterações de plano, bolsas, pausas, frequência e pagamentos.
- **Lista com busca e filtros** (RF-ALU-10, RF-BOL-09): busca por nome, e-mail ou CPF e filtros por situação, "pacote a vencer" e "bolsistas".

### M3 — Pacotes e Contratos

- **Pacotes** (RF-PAC-01/02/06): CRUD com aulas por ciclo, aulas por semana, valor mensal, duração, validade do ciclo e limite de dias de pausa. Inativar tira o pacote das novas contratações sem afetar contratos vigentes; excluir é bloqueado se o pacote já foi contratado.
- **Vencimento e vigência** (RF-PAC-04/05): o ciclo vence sempre no dia de entrada da aluna, e o término do contrato sai da duração contratada (semestral = 6 meses).
- **Renovação de ciclo** (RF-PAC-07/08): credita as aulas do pacote **somando as não realizadas** do ciclo anterior e avança o vencimento em um mês.
- **Alteração de plano** (RF-PLN-01 a 07): comparativo lado a lado do plano atual e do novo, com o proporcional já consumido, o crédito da sobra, o custo do novo plano pelos dias restantes, a diferença a cobrar (ou creditar), o saldo resultante e a data de término — que **não se move**. Tudo registrado no histórico com autor e valores.
- **Bolsa** (RF-BOL-01 a 09): percentual de 0 a 100% exclusivo do cadastro administrativo, com o valor cobrado calculado e exibido na hora (valor cheio riscado ao lado) e "Isenta — nenhuma cobrança será gerada" em 100%. Alterações valem a partir do próximo ciclo e vão para o histórico com motivo.
- **Trancamento, suspensão, encerramento e reativação** (RF-CTR-01 a 09): o mecanismo é escolhido pela duração do contrato (semestral tranca, mensal suspende), com prévia do efeito na validade antes de confirmar, cancelamento das aulas do período com devolução de crédito, motivo estruturado no encerramento e reativação por novo pacote preservando o histórico.

### Decisões de arquitetura desta fase

- **`Aluna.percentualBolsa` e `Contrato.percentualBolsa` não são redundância acidental**: o da aluna é o percentual **vigente** (vale do próximo ciclo em diante) e o do contrato é o **aplicado no ciclo corrente**. É exatamente o que RF-BOL-07 pede ao dizer que a alteração não tem efeito retroativo.
- Cálculos de contrato (proporcional, saldo, bolsa, projeção de validade) ficam puros em `src/utils/contrato.ts`, separados das regras que gravam, em `src/hooks/contratosDeAluna.ts`. As duas fórmulas exemplificadas no escopo (RF-PLN-04 e RF-PAC-08) foram conferidas contra os números do próprio documento.
- **Aulas realizadas são contadas dos agendamentos**, não deduzidas do saldo — o número fica correto quando o M7/M9 existirem, e hoje resulta em zero sem inventar dado.
- A renovação de ciclo é disparada pela administração na ficha. No sistema final ela é automática na data de vencimento (RF-PAC-07); a regra aplicada é a mesma, só muda o gatilho, que aqui não tem agendador.
- **RF-ALU-11 (conteúdo da anamnese) está "Em definição" no escopo**: as perguntas em `src/data/anamnese.ts` são uma referência de exemplo, sinalizada como tal, no mesmo tratamento dado aos pontos em aberto PA-01 a PA-06.
- O pagamento da auto-matrícula é simulado — o gateway entra no M11 (Fase 6). O agendamento da primeira aula, previsto no mesmo fluxo pelo escopo, depende do M7 e entra na Fase 4.
- Backfill expandido: 4 pacotes, 1 versão do termo, e as duas alunas de exemplo que já existiam como usuárias agora têm cadastro completo — Larissa ativa (pacote 8 aulas, saldo 6, anamnese preenchida e aceite registrado) e Fernanda aguardando aceite (pacote 4 aulas, bolsista de 50%).

### Como testar

1. `npm run dev` e **"Resetar protótipo"** para carregar os pacotes e alunas novos.
2. **Pacotes**: criar, editar, inativar; tentar excluir o "Pacote 8 aulas" (bloqueia, porque a Larissa já o contratou).
3. **Alunas** → **Nova aluna**: cadastrar com o e-mail `larissa@example.com` (deve bloquear apontando o cadastro existente). Cadastrar uma nova válida com bolsa de 50% e conferir o valor calculado com o cheio riscado; com 100%, vira "Isenta".
4. Usar os filtros da lista (Aguardando aceite, Bolsistas, Pacote a vencer) e a busca por nome/e-mail/CPF.
5. **Abrir ficha** da Larissa: conferir dados, anamnese, contrato, saldo e validade.
   - **Alterar plano** para o de 12 aulas: confira o comparativo, a diferença proporcional e o saldo resultante; confirme e veja o histórico de alterações preenchido.
   - **Bolsa**: conceder 30% com motivo e conferir o histórico de bolsa.
   - **Renovar ciclo**: o saldo do ciclo atual é somado às aulas do novo e o vencimento avança um mês.
   - **Suspender** (contrato mensal): informar período e ver a prévia da validade projetada antes de confirmar; depois **Registrar retorno**.
   - **Encerrar** com motivo e, na sequência, **Reativar** com um novo pacote — o contrato encerrado permanece no histórico.
6. **Termo de aceite** (Configuração): publicar uma nova versão e conferir que a anterior fica "Substituída", com a contagem de aceites preservada.
7. Sair e entrar como **Fernanda Alves** (Aluna): ela está "aguardando aceite" e só vê o termo + anamnese. Aceitar e ver o painel com saldo, validade e mensalidade (com os 50% de bolsa aplicados).
8. Na tela de login, abrir **"Abrir a matrícula pública"** e percorrer o fluxo de auto-matrícula até a conclusão; depois entrar com a aluna criada — ela já entra liberada, sem passar pelo aceite de novo.

### Ajustes pós-entrega (mesma fase, antes da validação)

- O primeiro acesso da aluna cadastrada pela administração agora tem **duas etapas: termo/anamnese e pagamento da primeira mensalidade**, com indicador de progresso. O acesso ao agendamento só é liberado depois das duas — antes, o cadastro administrativo liberava a aluna sem nenhuma cobrança, enquanto a matrícula pelo site cobrava; os dois caminhos ficaram equivalentes. Exceção: bolsista com isenção total não gera cobrança (RF-BOL-03), então o passo de pagamento é pulado e o acesso abre no aceite. O pagamento grava uma `Cobranca` quitada, o que também dá conteúdo real ao "Histórico de pagamentos" da ficha. Se a aluna sair entre o aceite e o pagamento, ao voltar ela retoma direto no pagamento, sem registrar o aceite duas vezes.
- Para isso, `registrarAceiteEAnamnese` deixou de liberar o acesso — quem libera é a nova `liberarAcessoDaAluna`, chamada quando todas as pendências do primeiro acesso terminam.
- O botão de conclusão do aceite só exigia a marcação do termo — dava para liberar o acesso com a anamnese em branco, contrariando RF-ALU-08 ("o acesso permanece bloqueado até que o termo seja aceito **e a anamnese preenchida**"). Agora as perguntas de saúde (sim/não) são obrigatórias, marcadas com asterisco, e o botão fica desabilitado enquanto faltarem, com um aviso dizendo exatamente o que falta em vez de um botão mudo. As perguntas abertas seguem opcionais. A mesma trava foi aplicada ao passo do termo na auto-matrícula pelo site, que tinha a mesma brecha.

Próxima fase (Fase 4) usa estes contratos e saldos para o agendamento de aulas (M7) e o cancelamento com justificativa (M8) — é ela que passa a consumir o saldo, preencher a ocupação da grade e dar efeito visível às devoluções de crédito já implementadas nas fases 2 e 3.

## Fase 4 — o que foi entregue

**Agendamento (M7) e cancelamento com justificativa (M8). Os três perfis passam a ter tela real** — a professora deixou de ser placeholder e a aluna ganhou grade e histórico.

### M7 — Agendamento de Aulas

- **Grade da aluna** (RF-AGD-01/02): sessões agrupadas por dia dentro da janela de agendamento, com modalidade, horário, professora, espaço e vagas restantes. A janela é parametrizada e diferente para matriculada (30 dias) e convênio (7 dias).
- **Reserva de vaga** (RF-AGD-03): confirmar desconta uma aula do saldo e materializa a ocorrência daquela data.
- **Bloqueios com o motivo na própria tela** (RF-AGD-04/05/06/07/08): sem saldo, contrato pausado, inadimplência ou termo pendente aparecem como aviso no topo da grade com os botões desabilitados; turma lotada, aula já iniciada, data após o término do contrato e "você já está agendada" aparecem na própria aula. A aluna nunca descobre o impedimento só ao clicar.
- **Agendamento pela administração** (RF-AGD-09): botão "Agendar aula" na ficha da aluna, usando a mesma listagem e as mesmas validações do portal — muda só a autoria, que fica registrada na auditoria.
- **Agendamento na matrícula** (RF-AGD-10): a auto-matrícula ganhou um quinto passo, "Primeira aula", logo após o pagamento, com a opção de deixar para depois.
- **Confirmação** (RF-AGD-11): o toast e o e-mail trazem o novo saldo e a regra de cancelamento aplicável.

### M8 — Cancelamento e Justificativa

- **Cancelamento pela aluna** (RF-CAN-01/02/03): acima da antecedência mínima o crédito volta ao saldo; abaixo dela a aula é consumida — e o aviso disso aparece **antes** da confirmação, junto da oferta de justificar. O prazo é o parâmetro configurável (referência: 4h).
- **Reagendamento livre** (RF-CAN-04/05): sem limite de vezes, o crédito devolvido serve para qualquer sessão dentro da vigência.
- **Justificativa de falta** (RF-JUS-01 a 05): envio com texto e comprovante dentro do prazo parametrizado (referência: 7 dias), fila de análise no painel administrativo com aluna, aula, data e anexo, aprovação que devolve o crédito ou recusa que mantém o desconto, e o parecer visível no histórico da aluna.
- **Cancelamento pela professora** (RF-CPR-01 a 07): a professora **solicita** e a aula continua na grade até a decisão. A administração escolhe entre designar substituta (a aula acontece, as alunas são avisadas da troca), cancelar (crédito de volta com dias adicionais de vigência) ou recusar com motivo. A professora acompanha a situação de cada pedido na própria tela.

### Decisões de arquitetura desta fase

- **`Agendamento` ganhou `creditoDevolvido`.** Não está entre os atributos essenciais da seção 8 do escopo, mas é o que distingue um cancelamento dentro do prazo de um fora dele depois que a aula já passou — e é essa distinção que define quem pode justificar (RF-JUS-01). Sem gravar, a informação se perderia junto com a passagem do tempo.
- **A professora substituta fica na ocorrência, não na sessão** (`professoraEfetivaId`): a troca vale só para aquela data, e é de lá que o M10 vai tirar a comissão daquela aula (RF-CPR-03).
- O cancelamento por decisão do studio reaproveita `cancelamentoDeAulas.ts` das fases 2 e 3 — exceção de calendário, exclusão de sessão e aprovação de cancelamento aplicam exatamente a mesma regra de devolução com prazo adicional.
- Cancelamento **pela administração** devolve o crédito independentemente da antecedência: a regra das 4h existe para disciplinar a aluna, não o studio.
- A ocorrência continua sendo materializada só quando a data precisa existir como registro próprio — agora também quando recebe o primeiro agendamento.
- Backfill expandido com o que dá conteúdo às novas filas: uma aula futura já agendada pela Larissa, uma aula que ela perdeu cancelando em cima da hora (com justificativa pendente) e uma solicitação de cancelamento pendente da Beatriz.

### Como testar

1. `npm run dev` e **"Resetar protótipo"** para carregar os dados novos.
2. Entrar como **Larissa Prado** (Aluna) → **Grade disponível**: saldo e validade ficam no topo; agendar uma aula e conferir o toast com o novo saldo.
3. **Minhas aulas**: cancelar uma aula com bastante antecedência (crédito volta) e outra com menos de 4h (a confirmação avisa que a aula será consumida) — depois usar **Justificar** na que foi consumida.
4. Entrar como **Administração** → **Justificativas**: analisar a justificativa pendente da Larissa; aprovar devolve o crédito e o parecer aparece no histórico dela.
5. Entrar como **Beatriz Nogueira** (Professora) → **Minhas aulas**: solicitar o cancelamento de uma aula e acompanhar a situação em "Minhas solicitações".
6. Como **Administração** → **Solicitações**: decidir a solicitação pendente — testar as três saídas (substituta, cancelamento, recusa) e conferir o efeito na grade e no saldo das alunas.
7. Na **ficha de uma aluna** → **Agendar aula**: agendar em nome dela e conferir o desconto do saldo.
8. Testar os bloqueios: suspender o contrato de uma aluna e conferir que a grade dela mostra o aviso com os botões desabilitados; zerar o saldo agendando tudo e conferir a mensagem de saldo esgotado.
9. Abrir a **matrícula pública** e percorrer o fluxo até o novo passo "Primeira aula".

Próxima fase (Fase 5) usa estes agendamentos para a chamada e o registro de presença (M9) e para a apuração de comissão das professoras (M10) — é ela que passa a marcar as aulas como realizadas e a produzir os valores que a professora acompanha.
