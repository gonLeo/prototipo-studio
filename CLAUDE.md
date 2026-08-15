# Instruções para o Claude Code neste projeto

Protótipo funcional navegável do sistema de gestão de studio descrito em `escopo_funcional_contratado.md`. Leia esse arquivo por completo antes de qualquer trabalho que você ainda não tenha feito — é a fonte única da verdade do escopo (seção "Papel deste documento").

## Leia antes de fazer qualquer coisa

1. `escopo_funcional_contratado.md` — escopo contratado (módulos M1-M16, requisitos, regras de negócio, modelo de dados na seção 8).
2. `PROGRESSO.md` — quais fases já foram entregues, o que cada uma implementou, como testar, e decisões já tomadas para pontos em aberto do escopo.
3. `README.md` — arquitetura do projeto e padrões de UI obrigatórios (leia a seção "Padrões de UI" inteira antes de tocar em qualquer tela).

## Dinâmica de trabalho — regra mais importante

Desenvolvimento em fases, **uma fase por ciclo**. Nunca avance para a próxima fase do `PROGRESSO.md` sem eu confirmar explicitamente que validei a anterior. Ao terminar uma fase:

- Marque a checkbox da fase em `PROGRESSO.md`.
- Escreva ali (seguindo o padrão das fases já registradas) o que foi implementado, quais telas ficaram disponíveis e como testar.
- Pare e aguarde minha validação. Não comece a próxima fase sozinho.

Se eu pedir ajuste numa fase já entregue mas ainda não validada, aplique o ajuste e documente como "ajuste pós-entrega" na mesma seção da fase — não crie uma fase nova pra isso.

## Nunca faça commit

Eu commito manualmente depois de validar cada fase. Nunca rode `git commit` neste projeto, mesmo depois de terminar e validar uma tarefa sozinho.

## Arquitetura obrigatória (detalhada no README.md)

- Toda regra de negócio fica em `src/hooks/` (camada de domínio), nunca direto no componente.
- Todo acesso a dado passa por `src/services/repositorios.ts` (`criarRepositorio<T>`), nunca `fetch`/`localStorage` direto em componente ou hook de tela.
- Toda entidade nova precisa existir em `src/types/domain.ts` e ter sua chave em `src/data/seed.json` (mesmo que como array vazio) — json-server responde 404 para chave inexistente, não lista vazia, e isso quebra qualquer hook que dependa do recurso.
- Reuse o kit de UI em `src/components/ui/` (Button, Field, Badge, Modal, TimePicker). Não estilize elementos HTML crus quando já existe um componente do kit para o caso.
- Confirmação de ação: sempre `useConfirm()` (modal), nunca `window.confirm`/`alert`.
- Erro/sucesso de uma ação: sempre `useToast()`, nunca texto solto na tela (erro de validação de campo dentro de formulário continua inline, é exceção documentada no README).

## Fora de escopo do protótipo

Testes automatizados, autenticação real, banco de dados real, e qualquer item do capítulo "Evoluções Futuras" (EV-01 a EV-12) do escopo.
