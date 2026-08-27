# Progresso — Atualização para o Escopo v2.0

Migração do protótipo do escopo v1.0 (contrato com mensalidade recorrente) para o **escopo v2.0** (pacote de créditos pré-pago). O plano completo, com o discovery e as decisões confirmadas, está em [PLANO_ATUALIZACAO_ESCOPO.md](./PLANO_ATUALIZACAO_ESCOPO.md).

O histórico das Fases 0 a 8, que construíram o protótipo sobre o escopo v1.0, continua em [PROGRESSO.md](./PROGRESSO.md).

- [x] Etapa 1 — Documento de escopo e configuração base do modelo de créditos
- [ ] Etapa 2 — Carteira de créditos e venda avulsa (a virada)
- [ ] Etapa 3 — Trancamento e reembolso
- [ ] Etapa 4 — Aulas excepcionais (M9, módulo novo)
- [ ] Etapa 5 — Agendamento, cancelamento e presença sobre créditos
- [ ] Etapa 6 — Comissão e convênios
- [ ] Etapa 7 — Experimental, painéis, notificações, perfis e relatórios
- [ ] Etapa 8 — Varredura final e consolidação

## Decisões fixadas para a migração

- **Renovação antecipada segue o PA-10**, não a letra do RF-CRE-13: a nova validade é a mais distante entre a atual e a do pacote comprado. A aluna nunca perde prazo por comprar mais créditos.
- **O escopo v1.0 foi arquivado**, não removido: `escopo_funcional_contratado_v1.md`, com aviso de substituído no topo. Serve para consultar o que mudou e justificar remoções.
- **O código dos módulos que saíram de escopo será removido de fato** (cobrança recorrente, inadimplência, alteração de plano, suspensão, encerramento, bolsa parcial), não mantido desativado. Contrato e carteira não coexistem depois da Etapa 2. O git preserva o histórico.
- **Pontos em aberto PA-01 a PA-12 adotam as sugestões da FGC** como valores de referência, parametrizados e alteráveis sem mudança de código — mesmo precedente da Fase 0 para o conjunto anterior.

---

## Etapa 1 — o que foi entregue

**Documento de escopo v2.0 no lugar da v1.0, e a configuração base do modelo de créditos.** Etapa deliberadamente aditiva: nada foi removido, o protótipo continua operando inteiro no modelo de contrato. O objetivo é ter o catálogo de créditos configurado e validado antes da virada da Etapa 2.

### Documentação

- **`escopo_funcional_contratado.md` agora é a versão 2.0**, convertida de `Escopo Funcional Atualizado.docx` para Markdown preservando a estrutura do documento: capítulos, tabelas de requisitos com os IDs em negrito, e os quadros de decisão (`Decisão de interface`, `Definido com a cliente`, `Dependência crítica`) como blocos de citação.
- **`escopo_funcional_contratado_v1.md`** guarda a versão anterior, com um aviso no topo explicando que foi substituída, o que mudou no modelo comercial e para onde ir.
- **`CLAUDE.md`** aponta para a v2.0 (M1-M17, modelo de dados na seção 7), lista os quatro documentos na ordem de leitura e troca "fase" por "etapa" na dinâmica de trabalho.
- **`README.md`** reflete o modelo de créditos e aponta para o plano e para este arquivo.

### M1 — Configuração Base

- **Nova entidade `CategoriaAula`** (`src/types/domain.ts`) com nome, custo em créditos, indicador de aula excepcional e situação. Chave `categoriasAula` no backfill, repositório em `src/services/repositorios.ts` e regras em `src/hooks/useCategoriasAula.ts`.
- **Nova tela "Categorias de aula"** (Configuração), cumprindo o RF-CFG-05: cadastro, edição do custo em créditos, inativação e exclusão, no mesmo padrão de `ModalidadesPage` — `Tabela` com busca, modal de formulário em grid de duas colunas, `useConfirm` na exclusão e `useToast` no retorno. Backfill com as três categorias de referência do escopo: aula regular 1 crédito, workshop 2, aula particular 4.
- **A categoria marcada como excepcional** já sinaliza na tela que não aparece na grade para a aluna agendar — é o gancho do M9, que chega na Etapa 4.
- **O item de menu "Categorias" virou "Categorias de professora"**, para não colidir com a tela nova.

### M3 — catálogo de pacotes (parte da Etapa 1)

- **`Pacote` ganhou os campos do modelo v2.0** — `creditos`, `validadeDias` e `valor` — convivendo com os campos do contrato, todos marcados com `@deprecated` e um comentário dizendo em qual etapa saem.
- **A tela de Pacotes passou a ser o catálogo de venda**: créditos, validade em dias e valor único no formulário principal, com o valor por crédito calculado na listagem. Os campos do contrato foram para um collapse "Campos do modelo antigo", fechado por padrão, com o aviso de que saem quando a carteira substituir o contrato.
- **Backfill com o catálogo de referência do escopo**: Starter (4 créditos, 45 dias, R$ 220), Flow (12 créditos, 90 dias, R$ 380) e Premium (24 créditos, 180 dias, R$ 690). Os ids `pac-4`, `pac-8` e `pac-12` foram preservados porque os contratos de exemplo apontam para eles; o "Pacote livre", que ninguém referenciava, saiu.

### Parâmetros operacionais

- **Oito parâmetros novos** do escopo v2.0, cada um com a frase em linguagem natural do efeito prático ao lado, como manda o RF-CFG-06: limiar de créditos e limiar de dias do status Finalizando; prazo de arrependimento e percentual máximo de créditos utilizados para reembolso (PA-06 e PA-07); tipo, quantidade e validade do benefício de conversão da aula experimental (PA-04); e o texto do prazo de processamento do reembolso exibido à aluna (PA-03).
- **A tela de parâmetros deixou de ser só numérica.** `useParametros` passou a declarar o tipo de cada parâmetro — `numero`, `texto` ou `opcao` — e a tela renderiza o controle correspondente: campo numérico, área de texto ou seleção. Era necessário porque dois dos parâmetros novos não são números, e resolve de uma vez para as etapas seguintes.
- **Os cinco parâmetros do modelo antigo** (inadimplência, multa, juros e os dois avisos de vencimento) ganharam a etiqueta **"Modelo antigo"** na listagem, para não serem confundidos com regra vigente durante a validação. Saem na Etapa 2.
- A frase de efeito dos parâmetros que sobrevivem foi reescrita no vocabulário de créditos: a antecedência de cancelamento agora "libera os créditos reservados", e o cancelamento pelo studio "prorroga em N dias a validade das carteiras afetadas".

### Decisões desta etapa

- **A convivência de campos no `Pacote` é uma ponte, não um modelo.** Manter os dois conjuntos permitiu configurar e validar o catálogo de créditos sem derrubar contrato, cobrança, agendamento e ficha da aluna no mesmo ciclo. Todo campo legado está marcado com `@deprecated` e some na Etapa 2.
- **`npm run seed` passou a acrescentar coleções novas ao `db.json` existente.** Antes ele só criava o arquivo quando não existia, e mantinha o banco de trabalho intocado. O problema é que uma coleção nova do backfill nunca passava a existir: o json-server responde 404 para chave ausente, e nem a tela nem o "Resetar protótipo" conseguem criá-la depois — o reset recria registros pela API REST, e não há endpoint para uma coleção que o `db.json` não declara. Agora as chaves que faltam entram com o conteúdo do backfill, sem tocar nos dados que já estavam lá. Sem isso, a tela de Categorias de aula nasceria quebrada em qualquer banco anterior a esta etapa.
- **A listagem de Pacotes tolera registro sem os campos novos**, exibindo "—" em vez de `NaN`. É a situação de quem abrir a tela antes de resetar o protótipo, com o `db.json` da versão anterior.
- **No formulário de pacote, o modelo antigo não informado é espelhado a partir do de créditos.** Um campo dentro de um collapse fechado não está no DOM, e o `required` do HTML não o alcança: quem cadastrasse pelos campos novos teria a criação recusada por um campo que nem viu. Enquanto a ponte existir, o valor mensal nasce igual ao valor do pacote, as aulas por ciclo iguais aos créditos, e assim por diante. Quem abrir o collapse e preencher continua mandando no que informou.
- **O menu ganhou "Categorias de aula" em Configuração**, ao lado de Pacotes: as duas telas juntas são o que define o preço em créditos de tudo que o studio vende.

### Como testar

1. `npm run dev` e **"Resetar protótipo"** — obrigatório nesta etapa: os pacotes e os parâmetros mudaram de conteúdo, e só o reset traz o catálogo novo.
2. Entrar como **Camila Duarte** → Administração.
3. **Configuração → Categorias de aula**: as três categorias de referência aparecem ordenadas por custo — Aula regular (1 crédito, Grade regular), Workshop (2 créditos, Fora da grade), Aula particular (4 créditos, Fora da grade). Criar uma categoria nova, editar o custo de uma existente, inativar e reativar, e tentar cadastrar um nome repetido (deve bloquear com mensagem inline no formulário). Excluir pede confirmação em modal.
4. **Configuração → Pacotes**: o catálogo mostra Starter, Flow e Premium com créditos, valor por crédito, validade e valor. Abrir "Editar" em qualquer um e conferir que os campos do modelo antigo estão recolhidos no collapse "Campos do modelo antigo". **Criar um pacote novo informando só nome, créditos, validade e valor** — deve salvar normalmente, e o pacote aparece na listagem com a coluna "Modelo antigo" espelhada a partir dos créditos.
5. **Configuração → Parâmetros**: os parâmetros novos aparecem com a frase de efeito prático. Alterar o **limiar de créditos do Finalizando** e ver a frase mudar enquanto se digita. O **tipo do benefício de conversão** é uma seleção, e o **texto do prazo de reembolso** é uma área de texto — os dois salvam ao sair do campo. Os cinco parâmetros com a etiqueta **"Modelo antigo"** são os que saem na Etapa 2.
6. **Confirmar que nada quebrou**: Alunas, Grade, Cobranças, Comissões e o painel da aluna continuam funcionando exatamente como antes — esta etapa não mexeu em nenhuma regra de contrato ou cobrança.

### Observações registradas durante a etapa

- **Divergência interna do documento v2.0**: as referências cruzadas entre capítulos estão deslocadas em relação à numeração real. O capítulo 2 remete aos "requisitos do capítulo 5" quando eles estão no capítulo 4; o capítulo 1 remete ao "capítulo 12" para as evoluções, que estão no 11, e ao "capítulo 14" para os pontos em aberto, que estão no 13. A conversão para Markdown preservou o texto como está — não cabe ao protótipo corrigir o documento da cliente. Vale sinalizar à FGC Digital na próxima revisão.
- **Quatro erros de tipagem preexistentes em `src/hooks/useAlunas.ts`**, anteriores a esta etapa e não introduzidos por ela: `AlunaComDetalhes.contrato` é declarado como obrigatório, mas a busca pode não encontrar contrato algum. Aparecem em `npm run build` (que roda `tsc -b`) e não em `npm run dev`, que é como o protótipo vem sendo validado. Não foram corrigidos aqui porque o arquivo é reescrito na Etapa 2, quando o contrato deixa de existir — o erro morre junto. `npx vite build` compila e o protótipo roda normalmente.
