# Instruções para o Claude Code neste projeto

Protótipo funcional navegável do sistema de gestão de studio descrito em `escopo_funcional_contratado.md`. Leia esse arquivo por completo antes de qualquer trabalho que você ainda não tenha feito — é a fonte única da verdade do escopo (seção "Papel deste documento").

## Leia antes de fazer qualquer coisa

1. `escopo_funcional_contratado.md` — escopo contratado **versão 2.0** (módulos M1-M17, requisitos, regras de negócio, modelo de dados na seção 7). O modelo comercial é **pacote de créditos pré-pago com pagamento único**, não contrato com mensalidade recorrente. `escopo_funcional_contratado_v1.md` é a versão anterior, substituída — registro histórico, nunca referência de desenvolvimento.
2. `PLANO_ATUALIZACAO_ESCOPO.md` — o que mudou da v1.0 para a v2.0 e as 8 etapas da migração do protótipo, com as decisões já confirmadas.
3. `PROGRESSO_ATUALIZACAO.md` — as 8 etapas da migração, o que cada uma implementou e como testar. **A migração para o v2.0 está concluída**; este arquivo é o registro dela e a referência de como testar cada parte.
4. `PROGRESSO.md` — histórico das Fases 0 a 8, que construíram o protótipo sobre o escopo v1.0. Consulta apenas; a parte referente aos módulos que saíram de escopo não vale mais.
5. `README.md` — arquitetura do projeto e padrões de UI obrigatórios (leia a seção "Padrões de UI" inteira antes de tocar em qualquer tela).

## Dinâmica de trabalho — regra mais importante

Desenvolvimento em etapas, **uma etapa por ciclo**. Nunca avance para a próxima etapa sem eu confirmar explicitamente que validei a anterior. As 8 etapas do `PLANO_ATUALIZACAO_ESCOPO.md` já foram concluídas; a regra continua valendo para qualquer nova frente de trabalho. Ao terminar uma etapa:

- Marque a checkbox da etapa em `PROGRESSO_ATUALIZACAO.md`.
- Escreva ali (seguindo o padrão das etapas já registradas) o que foi implementado, quais telas ficaram disponíveis e como testar.
- Pare e aguarde minha validação. Não comece a próxima etapa sozinho.

Se eu pedir ajuste numa etapa já entregue mas ainda não validada, aplique o ajuste e documente como "ajuste pós-entrega" na mesma seção da etapa — não crie uma etapa nova pra isso.

## Nunca faça commit

Eu commito manualmente depois de validar cada fase. Nunca rode `git commit` neste projeto, mesmo depois de terminar e validar uma tarefa sozinho.

## Arquitetura obrigatória (detalhada no README.md)

- Toda regra de negócio fica em `src/hooks/` (camada de domínio), nunca direto no componente.
- Todo acesso a dado passa por `src/services/repositorios.ts` (`criarRepositorio<T>`), nunca `fetch`/`localStorage` direto em componente ou hook de tela.
- Toda entidade nova precisa existir em `src/types/domain.ts` e ter sua chave em `src/data/seed.json` (mesmo que como array vazio) — json-server responde 404 para chave inexistente, não lista vazia, e isso quebra qualquer hook que dependa do recurso.
- Reuse o kit de UI em `src/components/ui/` (Button, Field, Badge, Modal, TimePicker, Tabela, NavegadorDeDatas, CartaoDeAula). Não estilize elementos HTML crus quando já existe um componente do kit para o caso.
- **Carregar uma tela nunca escreve no banco.** Status derivado (carteira "Finalizando", carteira vencida) é calculado na leitura; o que grava é ação explícita — inclusive as rotinas que no sistema real rodariam sozinhas, disparadas por botão da administração.
- **O vocabulário do modelo de créditos está no glossário do README** e é o do escopo v2.0. Não reintroduza "mensalidade", "contrato", "ciclo" ou "inadimplência": eles descrevem o modelo antigo, que saiu.
- Confirmação de ação: sempre `useConfirm()` (modal), nunca `window.confirm`/`alert`.
- Erro/sucesso de uma ação: sempre `useToast()`, nunca texto solto na tela (erro de validação de campo dentro de formulário continua inline, é exceção documentada no README).

## Fora de escopo do protótipo

Testes automatizados, autenticação real, banco de dados real, e qualquer item do capítulo "Evoluções Futuras" (EV-01 a EV-15) do escopo.
