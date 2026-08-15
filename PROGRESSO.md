# Progresso — Protótipo Sistema de Gestão do Studio

Controle de fases do desenvolvimento. Uma fase por ciclo; cada fase só avança após validação explícita do cliente.

- [x] Fase 0 — Fundação técnica (setup, tipos, serviços, roteamento, sessão simulada, reset)
- [x] Fase 1 — M1 Configuração Base + M4 Professoras e Categorias
- [x] Fase 2 — M5 Grade de Horários + M6 Calendário de Exceções
- [ ] Fase 3 — M2 Cadastro de Alunas + M3 Pacotes e Contratos
- [ ] Fase 4 — M7 Agendamento de Aulas + M8 Cancelamento e Justificativa
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
