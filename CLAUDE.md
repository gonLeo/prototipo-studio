# Instruções para o Claude Code neste projeto

Protótipo funcional navegável do sistema de gestão de estúdio descrito em `escopo_funcional_contratado.md`. Leia esse arquivo por completo antes de qualquer trabalho que você ainda não tenha feito — é a fonte única da verdade do escopo (seção "Papel deste documento").

## Leia antes de fazer qualquer coisa

1. `escopo_funcional_contratado.md` — escopo contratado **versão 2.1** (módulos M1-M17, requisitos, regras de negócio, modelo de dados na seção 7). O modelo comercial é **pacote de créditos pré-pago com pagamento único**, não contrato com mensalidade recorrente. `escopo_funcional_contratado_v2.0.md` e `escopo_funcional_contratado_v1.md` são versões anteriores, substituídas — registro histórico, nunca referência de desenvolvimento.
2. `PLANO_ATUALIZACAO_ESCOPO.md` / `PROGRESSO_ATUALIZACAO.md` — a migração v1.0 → v2.0 (8 etapas, todas concluídas): o que mudou, as decisões confirmadas e como testar cada parte.
3. `PLANO_ATUALIZACAO_V21.md` — a migração v2.0 → v2.1: diff entre as versões, decisões fixadas (D1-D8), mapeamento tela a tela, modelo de dados, mensagens, cenários e os lotes de execução.
4. `PROGRESSO_ATUALIZACAO_V21.md` — os lotes da migração v2.1, o que cada um implementou e como testar. **A migração para a v2.1 está concluída** (Lotes 0 a 6); este arquivo é o registro dela.
5. `PROGRESSO.md` — histórico das Fases 0 a 8, que construíram o protótipo sobre o escopo v1.0. Consulta apenas; a parte referente aos módulos que saíram de escopo não vale mais.
6. `README.md` — arquitetura do projeto e padrões de UI obrigatórios (leia a seção "Padrões de UI" inteira antes de tocar em qualquer tela).

## Dinâmica de trabalho — regra mais importante

Desenvolvimento em etapas, **uma etapa (ou lote) por ciclo**. Nunca avance para a próxima sem eu confirmar explicitamente que validei a anterior. As etapas do `PLANO_ATUALIZACAO_ESCOPO.md` e os lotes do `PLANO_ATUALIZACAO_V21.md` já foram concluídos; a regra continua valendo para qualquer nova frente de trabalho. Ao terminar uma etapa ou lote:

- Marque a checkbox correspondente em `PROGRESSO_ATUALIZACAO.md` (etapas v1→v2.0) ou `PROGRESSO_ATUALIZACAO_V21.md` (lotes v2.0→v2.1).
- Escreva ali (seguindo o padrão dos itens já registrados) o que foi implementado, quais telas ficaram disponíveis e como testar.
- Pare e aguarde minha validação. Não comece a próxima etapa ou lote sozinho.

Se eu pedir ajuste numa etapa ou lote já entregue mas ainda não validado, aplique o ajuste e documente como "ajuste pós-entrega" na mesma seção — não crie uma etapa ou lote novo pra isso.

## Nunca faça commit

Eu commito manualmente depois de validar cada fase. Nunca rode `git commit` neste projeto, mesmo depois de terminar e validar uma tarefa sozinho.

## Arquitetura obrigatória (detalhada no README.md)

- Toda regra de negócio fica em `src/hooks/` (camada de domínio), nunca direto no componente.
- Todo acesso a dado passa por `src/services/repositorios.ts` (`criarRepositorio<T>`), nunca `fetch`/`localStorage` direto em componente ou hook de tela.
- Toda entidade nova precisa existir em `src/types/domain.ts` e ter sua chave em `src/data/seed.json` (mesmo que como array vazio) — json-server responde 404 para chave inexistente, não lista vazia, e isso quebra qualquer hook que dependa do recurso.
- **Nenhuma data do seed é literal**: são tokens relativos resolvidos na carga (`src/data/datasDoSeed.mjs`), e a coerência entre os registros é verificada por `src/data/validacaoDoSeed.mjs` — mexeu no seed, rode `npm run seed` ou o "Resetar protótipo" e leia o que ele disser. Ver "Seed com datas relativas" no README.
- Reuse o kit de UI em `src/components/ui/` (Button, Field, Badge, Modal, TimePicker, Tabela, NavegadorDeDatas, CartaoDeAula). Não estilize elementos HTML crus quando já existe um componente do kit para o caso.
- **Carregar uma tela nunca escreve no banco.** Status derivado (carteira "Finalizando", carteira vencida) é calculado na leitura; o que grava é ação explícita — inclusive as rotinas que no sistema real rodariam sozinhas, disparadas por botão da administração.
- **O vocabulário do modelo de créditos está no glossário do README** e é o do escopo v2.1. Não reintroduza "mensalidade", "contrato", "ciclo" ou "inadimplência": eles descrevem o modelo antigo, que saiu.
- **"Studio" permanece sem acento no código e nas telas**, apesar de o escopo v2.1 grafar "estúdio". É uma decisão deliberada (D4 do `PLANO_ATUALIZACAO_V21.md`): a troca é cosmética e toca mais de cem pontos do código para nenhum ganho funcional. Não "corrija" a grafia.
- Confirmação de ação: sempre `useConfirm()` (modal), nunca `window.confirm`/`alert`.
- Erro/sucesso de uma ação: sempre `useToast()`, nunca texto solto na tela (erro de validação de campo dentro de formulário continua inline, é exceção documentada no README).

## Fora de escopo do protótipo

Testes automatizados, autenticação real, banco de dados real, e qualquer item do capítulo "Evoluções Futuras" (EV-01 a EV-21) do escopo. O que o escopo marca como "Aberto" ou "Em definição" no capítulo "Pontos em Aberto" (PA-01, 02, 03, 07, 08) fica com o valor de referência já parametrizado — o protótipo não inventa comportamento para o que ainda não foi decidido.
