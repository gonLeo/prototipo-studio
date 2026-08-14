# Protótipo — Sistema de Gestão do Studio

Protótipo funcional navegável do sistema de gestão descrito em `escopo_funcional_contratado.md`. Sem backend real: persistência via `json-server` sobre um backfill versionado.

Progresso do desenvolvimento por fase: [PROGRESSO.md](./PROGRESSO.md).

## Rodando localmente

```bash
npm install
npm run dev
```

Sobe dois processos: Vite (`http://localhost:5173`) e json-server (`http://localhost:4000`, acessado pelo front via proxy `/api`). Na primeira execução, `db.json` é criado a partir do backfill em `src/data/seed.json`.

## Arquitetura

- `src/types/domain.ts` — entidades do modelo conceitual de dados (seção 8 do escopo).
- `src/services/` — camada de acesso a dados. `criarRepositorio<T>` expõe `listar/buscarPorId/criar/atualizar/remover` sobre REST; componentes nunca chamam `fetch`/`localStorage` diretamente. Trocar por uma API real no futuro não deve exigir mudança nas telas.
- `src/hooks/` — regras de domínio e sessão (perfis simulados).
- `src/components/`, `src/pages/` — apresentação.
- `src/data/seed.json` — backfill versionado. Botão "Resetar protótipo" na interface restaura este estado a qualquer momento.

## Fora de escopo deste protótipo

Testes automatizados, autenticação real, banco de dados real, e tudo listado no capítulo "Evoluções Futuras" do documento de escopo.
