# Progresso — Protótipo Sistema de Gestão do Studio

Controle de fases do desenvolvimento. Uma fase por ciclo; cada fase só avança após validação explícita do cliente.

- [x] Fase 0 — Fundação técnica (setup, tipos, serviços, roteamento, sessão simulada, reset)
- [x] Fase 1 — M1 Configuração Base + M4 Professoras e Categorias
- [ ] Fase 2 — M5 Grade de Horários + M6 Calendário de Exceções
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

Próxima fase (Fase 2) usa essas modalidades, espaços, professoras e horário de funcionamento para construir a grade de horários (M5) e o calendário de exceções (M6).
