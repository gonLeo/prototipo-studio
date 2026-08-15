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
- `src/data/seed.json` — backfill versionado. Todo recurso já usado por algum repositório (mesmo que ainda sem tela) precisa existir aqui, nem que seja como array vazio — json-server responde 404 (não lista vazia) para uma chave que não existe no `db.json`, e um `listar()` que estoura 404 quebra qualquer regra de negócio que dependa dele. Botão "Resetar protótipo" na interface restaura este estado a qualquer momento.

## Padrões de UI (valem para todas as fases, não só a atual)

- **Identidade visual: sistema administrativo sóbrio, não marca de studio.** Paleta slate + azul como única cor de destaque (tokens `primary-*`, `neutral-*`, `ink` definidos em `src/index.css` via `@theme`), tipografia Inter em tudo — sem fonte serifada/decorativa em nenhum título. Antes de estilizar algo novo, use os tokens existentes (`text-ink`, `bg-primary-600`, `border-neutral-200` etc.), nunca cores cruas do Tailwind (`slate-*`, `indigo-*`...) nem uma fonte nova.
- **Toda listagem de cadastro usa o componente `Tabela` (`src/components/ui/Table.tsx`), não lista de cards.** `Tabela` (genérica sobre `itens`/`renderLinha`/`chave`) já embute busca por texto (prop `busca`) e paginação — funcionais de verdade, filtrando/paginando os dados reais, não decorativas. Linhas com `LinhaTabela`/`CelulaTabela`. Ver `ModalidadesPage`, `ProfessorasPage` etc. como referência.
- **Formulários (inclusive dentro de modal) usam grid de 2 colunas (`grid grid-cols-1 sm:grid-cols-2 gap-4`), não pilha vertical de campos.** Campo que precisa ocupar a linha toda usa `wrapperClassName="sm:col-span-2"` em `TextField`/`SelectField` (o `className` comum só chega no `<input>`/`<select>`, não no `<label>` que é o item do grid — é o `wrapperClassName` que controla o layout do campo inteiro).
- **Confirmação de ação nunca usa `window.confirm`/`alert`.** Use `useConfirm()` (`src/hooks/useConfirm.tsx`) — abre um modal (`titulo`, `mensagem`, `perigo?`) e retorna uma Promise<boolean>. Toda exclusão e toda ação destrutiva/irreversível passa por aqui.
- **Erros e confirmações de sucesso de uma ação (não de um campo de formulário) usam toast, nunca texto solto na página.** Use `useToast()` (`src/hooks/useToast.tsx`) — `mostrarToast(mensagem, 'sucesso' | 'erro' | 'aviso' | 'info')`. Aparece no canto superior, empilha, some sozinho.
  - Exceção deliberada: erro de validação de um campo dentro de um formulário/modal (ex.: "nome já cadastrado") continua inline, junto ao campo — é contexto imediato da ação que a usuária está fazendo, não um alerta global. Não vira toast.
- **Nenhum `input[type=time]` nativo.** Use `TimePicker` (`src/components/ui/TimePicker.tsx`) — botão que abre um mostrador analógico em modal (relógio com anel duplo para hora 1-12/13-23,00 e anel único de 5 em 5 para minuto, arrastável ou por toque), inspirado no seletor nativo de horário do Android. Valor vazio (`''`) é o padrão inicial; nunca pré-preencher um horário. Seleção fica em rascunho local até confirmar em "OK" — "Cancelar" descarta, "Limpar" zera.
- **Campos de intervalo (início/fim) que se repetem numa lista (ex.: horário de funcionamento) devem se reordenar automaticamente por horário de início assim que o intervalo fica completo**, e validar sobreposição em tempo real — não só no submit. Ver `src/utils/horarioFuncionamento.ts` (`reordenarBlocos`, `validarSobreposicao`) como referência do padrão para qualquer outra lista de intervalos que surgir (ex.: bloqueios de agenda).
- **Bloco de configuração longo repetido por item (ex.: um card por dia da semana) usa collapse, fechado por padrão, mostrando um resumo de uma linha quando fechado** (ex.: "08:00–11:00, 15:00–18:00" ou badge "Fechado"). Ver `LinhaDia` em `StudioPage.tsx` como referência do padrão.
- **Campo com histórico/auditoria (ex.: categoria vigente de uma professora, que gera registro em `HistoricoCategoria`) não é editável inline na tabela.** A tabela mostra o valor como texto; a troca só acontece pelo modal de edição do item, onde a ação tem contexto (confirmação, dica sobre o efeito). Evita trocas acidentais de um campo sensível direto na listagem.
- Kit de UI compartilhado em `src/components/ui/`: `Button`, `Field` (TextField/SelectField/CheckboxField), `Badge`, `Modal`, `TimePicker`, `Table` (Tabela/LinhaTabela/CelulaTabela). Novas telas devem reusar esses componentes em vez de estilizar elementos HTML crus.
- Utilize skill de frontend instalada para criar boas telas

## Fora de escopo deste protótipo

Testes automatizados, autenticação real, banco de dados real, e tudo listado no capítulo "Evoluções Futuras" do documento de escopo.
