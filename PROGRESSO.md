# Progresso — Protótipo Sistema de Gestão do Studio

Controle de fases do desenvolvimento. Uma fase por ciclo; cada fase só avança após validação explícita do cliente.

- [x] Fase 0 — Fundação técnica (setup, tipos, serviços, roteamento, sessão simulada, reset)
- [ ] Fase 1 — M1 Configuração Base + M4 Professoras e Categorias
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

Próxima fase (Fase 1) começa as telas reais: modalidades, espaços, horário de funcionamento, parâmetros operacionais, professoras e categorias — tudo no perfil Administração.
