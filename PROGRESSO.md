# Progresso — Protótipo Sistema de Gestão do Studio

Controle de fases do desenvolvimento. Uma fase por ciclo; cada fase só avança após validação explícita do cliente.

- [x] Fase 0 — Fundação técnica (setup, tipos, serviços, roteamento, sessão simulada, reset)
- [x] Fase 1 — M1 Configuração Base + M4 Professoras e Categorias
- [x] Fase 2 — M5 Grade de Horários + M6 Calendário de Exceções
- [x] Fase 3 — M2 Cadastro de Alunas + M3 Pacotes e Contratos
- [x] Fase 4 — M7 Agendamento de Aulas + M8 Cancelamento e Justificativa
- [x] Fase 5 — M9 Presença e Chamada + M10 Comissão e Fechamento
- [x] Fase 6 — M11 Cobranças e Financeiro
- [x] Fase 7 — M12 Aula Experimental + M13 Convênios Corporativos
- [x] Fase 8 — M14 Painéis e Indicadores + M15 Notificações + M16 Perfis e Permissões (fechamento)

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

### Ajustes pós-entrega (mesma fase, antes da validação)

- **Grade da aluna e agenda da professora ganharam navegação por dia**, no formato do modelo de referência: mês à esquerda, `<` / HOJE / `>` à direita, faixa de 7 dias clicáveis com o dia selecionado em destaque, e os cartões da data logo abaixo. A faixa começa em hoje (não existe agendamento retroativo) e vai até o limite da janela configurada. Componentes novos: `NavegadorDeDatas` e `CartaoDeAula` em `src/components/ui/`.
  - O cartão tem um espaço opcional para preço, hoje não usado: aulas do pacote não têm valor por aula. Ele existe para a **aula experimental** (M12, Fase 7), que é cobrada à parte.
- **Paginação com itens por página configurável** (5/10/25/50), extraída para `usePaginacao` + `ControlesDePaginacao` e aplicada tanto nas tabelas — que antes tinham página fixa e nenhum seletor — quanto na lista de próximas aulas da aluna.
- **Histórico de aulas da aluna virou collapse**, fechado por padrão, com paginação própria.
- **Saldo, validade e mensalidade ficam em uma única linha também no celular** (três colunas em qualquer largura, com tipografia reduzida no mobile em vez de empilhar).

Próxima fase (Fase 5) usa estes agendamentos para a chamada e o registro de presença (M9) e para a apuração de comissão das professoras (M10) — é ela que passa a marcar as aulas como realizadas e a produzir os valores que a professora acompanha.

## Fase 5 — o que foi entregue

**Chamada e presença (M9) e comissão com fechamento (M10).** A professora ganhou a tela de chamada e o painel de ganhos; a administração ganhou a apuração do período.

### M9 — Presença e Chamada

- **Aulas do dia com situação da chamada** (RF-PRE-01): na agenda da professora, cada aula passada mostra "Fazer chamada" ou "Ver chamada", conforme já tenha sido finalizada.
- **Lista de presença** (RF-PRE-02/03): só quem tem agendamento válido aparece — quem cancelou, não —, incluindo alunas de convênio, e **todas já vêm marcadas como presentes**. A tela é feita para o celular durante a aula: lista vertical, cartão inteiro clicável como alvo de toque, e a professora só aponta as ausências.
- **Finalização** (RF-PRE-04): consolida os registros, marca os agendamentos como realizados, gera a comissão e informa no toast o valor gerado e em qual período ele será pago.
- **Correção** (RF-PRE-05/06): dentro do prazo configurado (referência: 3 dias) a própria professora corrige; fora dele a tela dela fica bloqueada com a orientação de pedir à administração, que ajusta pela mesma tela **com justificativa obrigatória**, registrada na auditoria.
- **Histórico da aluna** (RF-PRE-07): "Minhas aulas" passou a mostrar Presente/Falta depois da chamada finalizada — e a falta agora habilita o envio de justificativa, fechando o RF-JUS-01, que na Fase 4 só cobria o cancelamento fora do prazo.
- **Chamadas pendentes sinalizadas** (RF-PRE-08) nos dois painéis: aviso no topo da agenda da professora e bloco de alerta na tela de comissões, com link direto para cada chamada em aberto.

### M10 — Comissão e Fechamento

- **Geração automática na finalização** (RF-COM-01/02), pelo **valor da categoria vigente na data da aula** — não a categoria atual. Se a professora mudou de categoria depois, a aula antiga continua valendo o que valia, que é o que torna a troca de categoria não retroativa (RF-PRO-03).
- **Comissão em substituição** (RF-COM-03): a chamada é criada para a professora **efetiva** da ocorrência, então a comissão vai para quem realmente deu a aula.
- **Período mensal** (RF-COM-04) e **painel da professora** (RF-COM-05): aulas do período, valor por aula vigente, total acumulado, data de fechamento e data prevista de pagamento — o quinto dia útil do mês seguinte, conforme definido na reunião.
- **Fechamento** (RF-COM-06/07/08): total por professora e total geral, detalhamento aula a aula para conferência antes de pagar, e registro do pagamento. O fechamento avisa quando há chamadas pendentes, porque cada uma é uma comissão que ainda não existe.
- **Histórico de fechamentos** (RF-COM-09) visível para administração e professora.
- **Ajuste em período fechado** (RF-COM-10): corrigir uma chamada de período já fechado não mexe no fechamento anterior — a comissão recalculada entra como lançamento de **ajuste**, identificado como tal, e é absorvida pelo próximo fechamento.

### Decisões desta fase

- **Presença e falta consomem a aula.** As duas situações mantêm o desconto feito no agendamento; o crédito só volta por justificativa aprovada (M8). Por isso a correção de chamada não mexe no saldo — o "quando aplicável" do RF-PRE-05 é justamente o caminho da justificativa.
- **A comissão é por aula dada, não por aluna presente**: o valor é o da categoria, e a quantidade de presenças aparece no detalhamento como informação de conferência (RF-COM-02).
- A agenda da professora passou a alcançar 14 dias para trás, para que ela consiga fazer ou corrigir chamadas recentes sem depender da administração.
- O quinto dia útil considera apenas fins de semana — o sistema não tem calendário de feriados bancários, e o calendário de exceções do studio (M6) é outra coisa: fecha o studio, não o banco.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Beatriz Nogueira** (Professora): o topo mostra a chamada pendente de 13/08. Abrir, deixar a aluna como presente (ou marcar ausência) e **finalizar** — o toast traz o valor da comissão.
3. Ainda como Beatriz, ir em **Meus pagamentos**: a aula aparece no período, com valor por aula, total acumulado e a data prevista de pagamento.
4. Voltar em **Minhas aulas** e abrir a mesma aula: agora é "Ver chamada" e permite correção enquanto estiver dentro do prazo de 3 dias.
5. Entrar como **Administração** → **Comissões**: conferir o total por professora, usar **Detalhar** para ver as aulas que compõem o valor, e **Fechar período**.
6. Depois de fechar, **Registrar pagamento** no fechamento criado.
7. Ainda como administração, abrir uma chamada já finalizada de período fechado e corrigi-la: o sistema exige justificativa e lança a comissão como **ajuste**, preservando o fechamento anterior.
8. Entrar como **Larissa Prado** (Aluna) → **Minhas aulas**: o histórico mostra Presente ou Falta; se estiver como falta, o botão **Justificar** aparece.

### Ajustes pós-entrega (mesma fase, antes da validação)

- **Corrigido erro 404 ao finalizar a chamada.** A tela de chamada *criava* o registro de `Chamada` ao carregar. Abrir uma tela não pode escrever no banco — e, pior, o React executa o efeito duas vezes em desenvolvimento (StrictMode), o que criava duas chamadas para a mesma aula e deixava a tela segurando um id que podia não ser o que sobrou; o `PATCH` na finalização então dava 404. Agora `carregarChamada` **só lê**, e a chamada nasce apenas na finalização ou correção, sempre resolvida **pela ocorrência** e não por um id guardado na tela — o que também torna a operação segura se a página estiver aberta desde antes de um "Resetar protótipo". Verificado no navegador: abrir a tela não grava nada, finalizar gera exatamente uma chamada, um registro de presença e uma comissão (R$ 35,00, da Categoria I), reabrir não duplica, e a correção estorna e relança a comissão em vez de somar outra.
- **Corrigido laço infinito de requisições em "Meus pagamentos" e "Comissões".** `periodoAtual()` devolve um objeto novo a cada chamada e estava direto nas dependências do `useCallback` que carrega os dados: a cada render nascia uma função nova, o `useEffect` disparava, o `setState` provocava outro render, e assim por diante — até o navegador derrubar as conexões com `ERR_INSUFFICIENT_RESOURCES`. O período do mês corrente não muda enquanto a tela está aberta, então passou a ser memoizado com `useMemo`. Depois da correção, a tela estabiliza em ~26 requisições e não cresce mais (verificado no navegador). Varri os outros 15 pontos do projeto com dependências de efeito e nenhum tinha o mesmo defeito.

Próxima fase (Fase 6) usa estes contratos e cobranças para o módulo financeiro (M11): cobrança recorrente, retentativa, multa e juros, bloqueio por inadimplência e avisos de vencimento.

## Fase 6 — o que foi entregue

**Cobranças e financeiro (M11).** A administração ganhou o painel de cobranças; a aluna passou a ver o próprio débito com multa e juros, e a pagar pelo painel.

### M11 — Cobranças e Financeiro

- **Cobrança na contratação** (RF-FIN-01): a primeira mensalidade deixou de nascer "já paga" e passa pelo mesmo caminho das demais — nasce pendente e é quitada por uma tentativa no gateway, então aparece no painel de cobranças com trilha de tentativas como qualquer outra.
- **Cobrança recorrente** (RF-FIN-02): gerada na data de vencimento do ciclo de cada contrato ativo, e cobrada automaticamente. Contrato **trancado não é cobrado**; suspenso continua sendo — é justamente o que separa os dois mecanismos no M3.
- **Retentativa automática** (RF-FIN-03) no dia seguinte à falha, com **cada tentativa registrada** com data, hora, origem (automática ou manual) e o retorno do provedor.
- **Retentativa manual e reenvio de link** (RF-FIN-04): as duas ações estão na linha da cobrança e no detalhamento, disponíveis a qualquer momento.
- **Marcação de inadimplência** (RF-FIN-05): passado o prazo configurado (referência: 5 dias) sem pagamento, a aluna é marcada como inadimplente — e o bloqueio do agendamento já estava pronto desde o M7, então passa a ter causa real.
- **Multa e juros** (RF-FIN-06): multa percentual única na virada do vencimento e juros ao mês **pro rata die**, os dois configuráveis nos parâmetros (referência: 2% e 1% ao mês).
- **Exibição do débito** (RF-FIN-07): o painel da aluna mostra valor original, multa, juros e valor atualizado, com o botão de pagar ao lado.
- **Regularização automática** (RF-FIN-08): confirmado o pagamento — pelo gateway ou por baixa manual —, a situação volta a "ativa" e o agendamento é restabelecido na hora, desde que não reste outro débito vencido.
- **Aviso de término de contrato** (RF-FIN-09) nas antecedências configuradas (referência: 15 e 3 dias), com o texto seguindo a decisão de UX do escopo: informa que a renovação é automática e orienta procurar a administração para ajustar o plano, sem oferecer o cancelamento como ação principal.
- **Histórico financeiro por aluna** (RF-FIN-10): a seção da ficha virou trilha completa — situação, valor original, encargos, quitação, número de tentativas e o retorno da última.
- **Painel de cobranças** (RF-FIN-11): consolidado do mês por situação (recebido, a receber, com falha, em atraso), alerta do total em atraso e tabela com busca, filtros por situação e paginação.
- **Registro manual de pagamento** (RF-FIN-12): baixa fora do gateway com forma de pagamento, data e observação, tudo registrado na auditoria.
- **Cancelamento de cobrança** (RF-FIN-13) pendente, com motivo obrigatório — e, se era ele que segurava a aluna, a regularização acontece junto.

### Decisões desta fase

- **O gateway ficou isolado em `src/services/gatewayPagamento.ts`.** O provedor está em aberto no escopo (RF-FIN-14 / PA-04), e todo o resto do módulo — retentativa, encargos, inadimplência, regularização — opera sobre o retorno dessas duas funções. Trocar pelo provedor real não deve mexer em regra nem em tela.
- **A simulação do gateway é determinística, não aleatória**: aprova sempre, exceto nas cobranças marcadas com "Simular falha no gateway" (ação no detalhamento da cobrança). Um resultado sorteado tornaria impossível demonstrar retentativa, multa, juros e bloqueio de forma reproduzível.
- **A rotina do dia é disparada pela administração.** No sistema final é o agendador que executa a cobrança recorrente, a retentativa, os encargos, o bloqueio e os avisos na virada do dia. O protótipo não tem agendador, então o botão "Executar rotina do dia" aplica exatamente a mesma regra — mesmo tratamento dado à renovação de ciclo (RF-PAC-07) na Fase 3.
- **A renovação de ciclo passou a gerar a cobrança do ciclo que vence**, antes de avançar o vencimento: sem isso, renovar manualmente antes da rotina financeira faria aquela competência nunca ser cobrada.
- **Multa e juros são recalculados na leitura do painel da aluna**, e não só quando a rotina roda: assim ela nunca vê um valor congelado na data da última execução. A gravação na cobrança continua sendo feita pela rotina, que é quem "fecha" o número usado na cobrança.
- `Cobranca` ganhou `origem`, `formaPagamento`, `observacao` e `motivoCancelamento` — os três últimos são exigência direta de RF-FIN-12 e RF-FIN-13, que pedem o registro estruturado dessas informações. `simularFalhaGateway` existe só no protótipo e não faz parte do modelo de dados do escopo.
- Backfill expandido com a aluna **Patrícia Lima**: contrato mensal iniciado em 30/08/2025, com término em 30/08/2026 (15 dias à frente da data de referência do backfill, para exercitar o aviso de término) e a mensalidade de 30/07/2026 recusada duas vezes pelo gateway — é o cenário que dá conteúdo a atraso, encargos e bloqueio por inadimplência.

### Como testar

1. `npm run dev` e **"Resetar protótipo"** para carregar a aluna e as cobranças novas.
2. Entrar como **Camila Duarte** → Administração → **Cobranças**: o painel mostra recebido, a receber, com falha e em atraso, e a cobrança da Patrícia aparece com as duas tentativas recusadas.
3. **Detalhar** a cobrança da Patrícia: valor, encargos e a trilha de tentativas com o retorno do gateway.
4. **Executar rotina do dia**: o toast resume o que aconteceu — a cobrança da Patrícia recebe multa e juros, ela é marcada como inadimplente e o aviso de término de contrato dela é enviado. Rodar de novo no mesmo dia não repete a tentativa nem o aviso.
5. Entrar como **Patrícia Lima** (Aluna): o painel mostra o débito decomposto (original, multa, juros, atualizado) e o aviso de que o agendamento está bloqueado; a grade de aulas confirma o bloqueio.
6. Voltar à Administração, **Detalhar** a cobrança e usar **Parar de simular falha**; entrar como Patrícia e **pagar pelo painel**: o pagamento é aprovado, ela volta a "ativa" e o agendamento é liberado na mesma hora.
7. Alternativamente, testar **Receber por fora**: informe forma, data e observação — a baixa quita a cobrança, regulariza a aluna e fica no histórico da ficha dela.
8. Testar **Cancelar cobrança** com motivo e conferir o registro no histórico financeiro da ficha.
9. Na ficha da **Larissa** → **Renovar ciclo**: além de creditar as aulas, a renovação gera e cobra a mensalidade daquele ciclo, que aparece no painel de cobranças.
10. Em **Parâmetros**, mudar multa, juros ou o prazo de bloqueio e rodar a rotina de novo para ver os valores acompanharem a configuração.

Próxima fase (Fase 7) usa este financeiro para a aula experimental (M12), que é paga à parte antes de confirmar a vaga, e para os convênios corporativos (M13).

## Fase 7 — o que foi entregue

**Aula experimental (M12) e convênios corporativos (M13).** O site ganhou um segundo fluxo público, e a administração ganhou o painel de convênios e o relatório de conversão.

### M12 — Aula Experimental

- **Fluxo iniciado pela agenda** (RF-EXP-01), em `/experimental`: a interessada vê a grade por dia, escolhe o horário e **só então** se cadastra e paga — a ordem inversa da matrícula, exatamente como definido na reunião, para evitar pagamento sem horário compatível.
- **Cadastro obrigatório sem pacote** (RF-EXP-02): a interessada vira usuária e aluna do sistema, sem contrato e sem saldo. É esse cadastro que ela reaproveita se decidir se matricular.
- **Limite por modalidade controlado por CPF** (RF-EXP-03): a grade já mostra a aula bloqueada com o motivo, e a regra é revalidada na confirmação — cadastrar-se de novo com outro e-mail não contorna o limite, porque a contagem é por CPF.
- **Valor único configurável** (RF-EXP-04, referência R$ 30,00) e **vaga confirmada só após o pagamento** (RF-EXP-05): a cobrança é avulsa, passa pelo mesmo gateway das mensalidades e a reserva só é criada com a aprovação em mãos.
- **Identificação na chamada** (RF-EXP-06): a aluna experimental aparece marcada como tal na lista de presença da professora.
- **Conversão em matrícula pelo painel** (RF-EXP-07): a aluna sem pacote passa a ver, no próprio painel, a escolha de pacote e duração com pagamento imediato — sem repetir cadastro. A conversão fica registrada na auditoria como tal.
- **Relatório de conversão** (RF-EXP-08): aulas do período, valor arrecadado, quantas viraram matrícula e a taxa.

### M13 — Convênios Corporativos

- **Espelhamento da grade** (RF-CNV-01/02): "Espelhar nos convênios" virou campo do cadastro de sessão, e a tela de convênios permite publicar ou retirar sessão a sessão. O botão "Sincronizar grade" registra a sincronização de cada parceiro.
- **Reserva, confirmação e recusa** (RF-CNV-03/04/07): a reserva ocupa vaga na sessão como qualquer agendamento e é **recusada com motivo** quando a turma está cheia — a capacidade da modalidade é a mesma para matriculada e convênio.
- **Cancelamento** (RF-CNV-05) libera a vaga na hora; **check-in validado** (RF-CNV-06) é aceito sem confirmação manual.
- **Janela própria** (RF-CNV-08): a oferta aos convênios respeita o parâmetro separado (referência: 7 dias), independente dos 30 dias das matriculadas.
- **Chamada** (RF-CNV-09/10): a aluna de convênio aparece com "check-in validado" ou "check-in pendente", e a professora pode marcá-la presente mesmo sem check-in — com o aviso, na própria tela, de que isso vale para o controle interno de ocupação e não gera repasse.
- **Relatório de conferência** (RF-CNV-11): por convênio e por período — reservas, check-ins validados, reservas sem check-in, ausências e cancelamentos.
- **Credenciais por convênio** (RF-CNV-12) com situação ativa/contingência/inativa, editáveis sem intervenção técnica.
- **Contingência** (RF-CNV-13): a mesma tela registra reserva manualmente, marcada como contingência e com registro na auditoria.

### Decisões desta fase

- **Não há API dos convênios no protótipo**, então as mensagens que viriam dos parceiros são disparadas pela administração — mesmo tratamento dado ao gateway no M11. O que entra e sai do sistema é idêntico ao da integração real; muda quem aperta o botão. Como efeito colateral bem-vindo, esse é exatamente o caminho da contingência (RF-CNV-13), que precisa existir de qualquer forma.
- **A aluna de convênio não tem contrato nem saldo** — o vínculo financeiro dela é com o parceiro. Por isso o bloqueio de agendamento dela no portal ganhou mensagem própria ("suas reservas acontecem pelo aplicativo do convênio") em vez do genérico "contrate um pacote".
- **A aula experimental não consome saldo** e é cobrada à parte, então `Cobranca` passou a aceitar vínculo direto com a aluna (`alunaId`), com `contratoId` opcional. Sem isso, uma cobrança sem contrato não teria dono — e ela precisa aparecer no painel de cobranças e no histórico financeiro da ficha como qualquer outra.
- **A conversão é contada por contrato iniciado a partir da data da aula experimental**, não por um campo "veio da experimental": assim o número continua correto mesmo quando a matrícula acontece pela administração, e não pelo painel da aluna.
- **A presença de convênio no relatório é casada pela chamada da ocorrência**, não pelo id da aluna solto — do contrário uma falta em qualquer outra aula contaminaria a conferência do repasse.
- A aula experimental **não pede termo nem anamnese**: o escopo exige apenas cadastro e pagamento (RF-EXP-02/05), e o termo é de prestação de serviço do pacote. Ele aparece quando ela converte em matrícula.
- Backfill expandido: sessões de Pole Iniciante, Dança e Alongamento marcadas como espelhadas; credenciais dos dois convênios; **Renata Souza** (aluna de convênio) com uma reserva já com check-in validado na aula de 13/08 e outra pendente para 17/08; e **Juliana Rocha**, que fez uma aula experimental paga em 13/08 e ainda não contratou pacote.

### Como testar

1. `npm run dev` e **"Resetar protótipo"** para carregar os dados novos.
2. Na tela de login, abrir **"Agendar aula experimental"**: navegue pelos dias, escolha uma aula, cadastre-se e pague — a vaga só é confirmada depois do pagamento aprovado.
3. Repita o fluxo com o **mesmo CPF na mesma modalidade**: a aula aparece bloqueada com o motivo do limite (RF-EXP-03). Em **Parâmetros**, aumente "Limite de aulas experimentais por modalidade" e veja o bloqueio sumir.
4. Entre como **Juliana Rocha** (Aluna): o painel dela oferece a contratação de pacote — contrate e confira que o saldo é creditado, a cobrança aparece no painel de cobranças e o agendamento é liberado.
5. Administração → **Experimentais**: aulas do período, valor arrecadado e a taxa de conversão, que sobe depois do passo anterior.
6. Administração → **Convênios** → aba **Grade espelhada**: publique ou retire uma sessão. Em **Credenciais**, edite as chaves e use "Sincronizar grade".
7. Ainda em Convênios → **Registrar reserva**: escolha convênio, aluna e uma aula espelhada; tente uma turma sem vaga para ver a recusa. Marque "Registro de contingência" para simular a integração fora do ar.
8. Na aba **Reservas**: **Validar check-in** de uma reserva pendente e **Cancelar** outra — a vaga volta à sessão na hora (confira na Grade).
9. Entre como **Beatriz Nogueira** (Professora) → chamada de 13/08: a Renata aparece como convênio com check-in validado e a Juliana como aula experimental. Finalize a chamada.
10. Volte em Convênios → **Relatório do período** e confira reservas, check-ins, sem check-in e ausências por convênio.

Próxima fase (Fase 8) fecha o protótipo com painéis e indicadores (M14), notificações (M15) e perfis e permissões (M16).

## Fase 8 — o que foi entregue

**Painéis e indicadores (M14), notificações (M15) e perfis e permissões (M16).** Fecha o escopo contratado: os três perfis passam a abrir num painel, e o que o sistema comunicou e alterou fica consultável.

### M14 — Painéis e Indicadores

- **Painel administrativo** (RF-PNL-01) na tela inicial da administração: alunas ativas e inadimplentes, receita recebida e em aberto, aulas realizadas, comissão gerada e contratos a vencer nos próximos 30 dias, com link direto para a ficha de cada aluna.
- **Bloco de pendências primeiro** (RF-PNL-03): solicitações de cancelamento, justificativas a analisar, chamadas não finalizadas e cobranças em atraso ou com falha. Cada cartão leva à fila correspondente e fica destacado só quando há algo a fazer — a decisão de UX do escopo é justamente abrir pelo que exige ação, não pelos números.
- **Ocupação das sessões** (RF-PNL-02): média de alunas por aula nos próximos 30 dias, com barra e classificação em lotada, saudável ou baixa procura — as duas pontas que apoiam abrir turma nova ou promover horário ocioso.
- **Painel da professora** (RF-PNL-04): virou a tela inicial dela, com as aulas de hoje, chamadas pendentes, aulas do período, valor por aula da categoria vigente, total acumulado, data de fechamento e data prevista de pagamento. A agenda completa passou para "Minhas aulas".
- **Painel da aluna** (RF-PNL-05): além de saldo, validade e mensalidade, agora traz a data da próxima cobrança, as próximas aulas agendadas, a frequência recente e o débito em aberto quando existe.
- **Exportação em CSV** (RF-PNL-06) nas listagens de alunas, cobranças, comissões e convênios — mais notificações e auditoria. Exporta o que está filtrado na tela, com separador `;` e BOM UTF-8 para abrir direto no Excel em português.

### M15 — Notificações

- **Camada de notificação independente de canal** (RF-NOT-10): `src/services/notificador.ts`. Nenhuma regra grava `Notificacao` direto — todas chamam `notificar({ destinatario, evento, conteudo })`, e a camada resolve quem recebe e por qual canal. Trocar ou acrescentar canal é mudar uma função.
- **Todos os disparos migrados** para essa camada: primeiro acesso (RF-NOT-01), confirmação de agendamento (RF-NOT-02), cancelamento pelo studio (RF-NOT-03), substituição de professora (RF-NOT-04), cobrança, inadimplência e pagamento (RF-NOT-07), aviso de término de contrato (RF-NOT-06), resultado de justificativa (RF-NOT-08) e solicitação de cancelamento (RF-NOT-09).
- **Duas lacunas fechadas**: a alteração de sessão passou a notificar as alunas com agendamento futuro (RF-NOT-05) — antes a confirmação prometia o aviso e nada era enviado —, e a nova solicitação de cancelamento passou a avisar a administração (RF-NOT-09), que só recebia a metade "decisão para a professora".
- **Registro de envio** (RF-NOT-11): tela com destinatária, evento, canal, data, situação e o conteúdo integral, com filtro por evento, busca e exportação.

### M16 — Perfis e Permissões

- **Trilha de auditoria** (RF-PER-05) ganhou tela: autor, data, hora, entidade, operação e os valores antes/depois de cada alteração de contrato, saldo, financeiro, chamada ou comissão. Somente leitura, com filtro por entidade e exportação.
- **Perfis e acúmulo** (RF-PER-01/02) já vinham da Fase 0 e seguem: rota protegida por perfil e troca de contexto sem novo login.
- **Operações críticas** (RF-PER-03) continuam exclusivas da administração — trancamento, suspensão, encerramento, bolsa e alteração de plano existem apenas nas telas sob `/administracao`, protegidas por `RotaComPerfil`.

### Decisões desta fase

- **A camada de notificação resolve o destinatário, não as regras.** Antes cada regra gravava `destinatarioId` com o que tinha em mãos — ora o id da aluna, ora o da professora, ora o da usuária —, o que deixava o registro inconsistente e impedia mostrar o nome de quem recebeu. Agora as regras dizem "aluna X" e a camada traduz para a usuária.
- **`canalDoEvento` é o único ponto que decide canal.** Está trivial hoje (tudo e-mail) de propósito: é o encaixe do WhatsApp da Fase 2, e deixá-lo explícito agora é o que cumpre o RF-NOT-10 sem inventar configuração que o escopo não pede.
- **O catálogo de eventos vive junto do notificador**, com rótulo e requisito de origem. É ele que dá nome legível ao registro de envios e serve de contrato: evento novo entra ali junto com a regra.
- **O painel da professora virou a tela inicial dela** e a agenda foi para `/professora/aulas`. O RF-PNL-04 pede uma visão consolidada, e ela é o melhor ponto de partida: mostra o que é de hoje e o quanto já rendeu, com um clique para a agenda inteira.
- **Autenticação real (RF-PER-04) segue fora do escopo do protótipo**, como registrado desde a Fase 0 — os perfis são simulados por seleção de usuária na tela de login. É o único requisito do M16 não exercitável aqui, e é assim por decisão de escopo, não por lacuna.
- Backfill expandido com notificações e registros de auditoria de exemplo, para que as duas telas novas nasçam com conteúdo em vez de vazias.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Camila Duarte** → Administração: o painel abre pelas pendências (solicitação da Beatriz, justificativa da Larissa, chamadas do dia 13 e a cobrança em atraso da Patrícia). Clicar em cada cartão leva à fila.
3. Conferir os **indicadores** e a **ocupação das sessões** logo abaixo — a barra e a etiqueta mostram turma lotada e baixa procura.
4. **Notificações** (Configuração): filtrar por evento, buscar por destinatária e abrir "Ver conteúdo" para ler o e-mail exatamente como foi enviado. Exportar CSV.
5. **Auditoria** (Configuração): filtrar por entidade e abrir "Ver valores" para comparar antes e depois. Exportar CSV.
6. Gerar comunicação nova para ver a trilha crescer: agendar uma aula pela ficha de uma aluna, ou alterar o horário de uma sessão com aluna agendada — as alunas afetadas recebem o aviso (RF-NOT-05).
7. Entrar como **Beatriz Nogueira** (Professora): o **Painel** mostra as aulas de hoje, chamadas pendentes e o resumo do período; "Minhas aulas" continua com a agenda completa.
8. Entrar como **Larissa Prado** (Aluna): o painel traz saldo, validade, mensalidade, próxima cobrança, próximas aulas e frequência recente.
9. Exportar CSV em **Alunas**, **Cobranças**, **Comissões** e **Convênios** — o arquivo respeita o filtro aplicado na tela.

---

**Escopo contratado concluído.** Os 16 módulos (M1 a M16) do documento de escopo estão implementados no protótipo. Fora de escopo, como registrado desde o início: testes automatizados, autenticação real (RF-PER-04), banco de dados real, integrações reais de gateway (RF-FIN-14 / PA-04) e de convênios, e os itens do capítulo "Evoluções Futuras" (EV-01 a EV-12).

### Ajustes pós-entrega (mesma fase, antes da validação)

- **A duração do contrato (mensal ou semestral) passou a ser atributo do pacote, não escolha de quem contrata.** Estava errado: a aluna (e a administração, na matrícula) escolhia mensal ou semestral no ato da contratação, sendo que isso é definido na criação do plano.
  - `Pacote` ganhou o campo `tipo: TipoContrato` (`src/types/domain.ts`), e o formulário de **Pacotes** (Configuração) passou a ter o seletor "Duração do contrato". Em pacote semestral o campo "Duração do contrato (meses)" some do formulário e é gravado como 6 (`MESES_CONTRATO_SEMESTRAL`, normalizado em `usePacotes`); a duração em meses só é editável no pacote mensal.
  - `DadosContratacao` perdeu o campo `tipo`: `criarContrato` agora copia `pacote.tipo` para o contrato. Os seletores de duração saíram da **matrícula pelo site** (`MatriculaPage`), do **cadastro de aluna pela administração** (`AlunasPage`), da **contratação/conversão pelo painel da aluna** (`PainelAlunaPage`) e do **modal de reativação** (`ModaisContrato`). No lugar deles, cada lista de pacotes e cada resumo mostra a duração que o pacote já define.
  - `mesesDeVigencia(pacote)` e `calcularDatasDoContrato(dataInicio, pacote)` não recebem mais `tipo` — leem `pacote.tipo`. Novo utilitário `rotuloTipoContrato(tipo)` para os rótulos de tela.
  - Na **alteração de plano**, `contrato.tipo` passa a acompanhar o pacote novo (é ele que define se a pausa é trancamento ou suspensão); a data de término continua inalterada, como manda o RF-PLN-05. O comparativo do modal ganhou a linha "Duração".
  - Seed: `pac-4` e `pac-8` são mensais; `pac-12` e `pac-livre` são semestrais (duração 6 meses). Os contratos de exemplo continuam coerentes com o pacote de cada aluna.

---

# Atualização para o escopo v2.0 — consolidação

As Fases 0 a 8 registradas acima construíram o protótipo sobre o **escopo v1.0**, cujo modelo comercial era contrato com mensalidade recorrente. Em agosto de 2026 o escopo foi substituído pela **versão 2.0**, com um modelo comercial diferente: **pacote de créditos pré-pago, pagamento único**.

A migração foi feita em 8 etapas, todas concluídas. O registro detalhado de cada uma — o que implementou, as decisões tomadas e como testar — está em **[PROGRESSO_ATUALIZACAO.md](./PROGRESSO_ATUALIZACAO.md)**. Este capítulo existe para quem chega ao `PROGRESSO.md` e precisa saber o que continua valendo do que está escrito acima.

## As 8 etapas

| Etapa | O que fez |
| --- | --- |
| 1 | Documento de escopo v2.0 no lugar da v1.0; catálogo de créditos e parâmetros novos configurados |
| 2 | **A virada**: carteira de créditos e venda avulsa substituem contrato e cobrança recorrente |
| 3 | Trancamento e reembolso (M3.6 e M12.2, ambos novos) |
| 4 | Aulas excepcionais — workshop e aula particular (M9, módulo novo) |
| 5 | Agendamento, cancelamento e presença refinados sobre créditos |
| 6 | Comissão de aula excepcional, aula sem presença e convênios ajustados |
| 7 | Benefício de conversão da experimental, notificações de carteira, relatórios |
| 8 | Varredura final, conferência requisito a requisito e consolidação |

## O que saiu do produto

Removido de fato — arquivos, tipos, chaves do seed, rotas e itens de menu —, não desativado:

- **Contrato** como entidade, com vigência, renovação e alteração de plano;
- **Cobrança recorrente**: mensalidade, régua de inadimplência, multa, juros e avisos de vencimento;
- **Suspensão de contrato** e **encerramento com motivo**;
- **Bolsa parcial** (a bolsa passou a ser sempre integral);
- **Saldo de aulas do ciclo**, substituído pela carteira de créditos com validade própria.

O histórico está no git. O escopo antigo ficou arquivado em `escopo_funcional_contratado_v1.md`.

## O que passou a existir

- **Carteira de créditos** com saldo em três dimensões (disponível, reservado, utilizado), validade única e extrato completo — todo movimento passa por `aplicarMovimento`, e o saldo é sempre reconstituível pelo histórico.
- **Venda** como registro comercial com créditos, validade e valor congelados na compra.
- **Trancamento** (congela a validade e a devolve prorrogada) e **reembolso** (com as regras de prazo, percentual e o caso PA-09 da renovação antecipada).
- **Aulas excepcionais** (M9): workshop e aula particular, com alocação, consumo imediato e comissão por professora vinculada.
- **Benefício de conversão** da aula experimental, parametrizado em tipo, quantidade e validade.

## Como está o atendimento ao escopo

Conferência feita na Etapa 8, requisito a requisito do capítulo 4 (RF-CFG-01 a RF-PER-05) e fluxo a fluxo do capítulo 6. Os **11 fluxos** do capítulo 6 são executáveis ponta a ponta no protótipo.

Ficam fora, com o motivo:

| Requisito | Por que está fora |
| --- | --- |
| RF-BOL-09 — desconto parcial | Marcado **Evolução** no escopo |
| RF-CPR-08 — filtro de professoras habilitadas | Marcado **Evolução** no escopo |
| RF-ALU-12 — anexo do contrato jurídico | Condicionado a documento que ainda não existe |
| RF-REE-11 — prazo de processamento do reembolso | **Em definição**; o texto exibido à aluna já é parametrizável |
| RF-EXP-08 — benefício de conversão | Estava "Em definição"; **implementado** com os valores do PA-04 |
| RF-VEN-08 — recebimento de venda parcelada | **Em definição** (PA-02); não altera o protótipo, que simula o gateway |
| RF-CNV-04 — resposta de confirmação ao convênio | Depende de integração real; no protótipo a resposta é a própria devolução da função |

Fora do protótipo por decisão de projeto, como sempre esteve: testes automatizados, autenticação real, banco de dados real e as evoluções EV-01 a EV-15.
