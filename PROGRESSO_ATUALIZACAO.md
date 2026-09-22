# Progresso — Atualização para o Escopo v2.0

> **v2.1 absorvida.** O escopo evoluiu para a versão 2.1 (devolutiva da cliente de 28/08/2026), e o protótipo foi atualizado por completo — plano em [PLANO_ATUALIZACAO_V21.md](./PLANO_ATUALIZACAO_V21.md), progresso lote a lote em [PROGRESSO_ATUALIZACAO_V21.md](./PROGRESSO_ATUALIZACAO_V21.md). `escopo_funcional_contratado.md` já é a v2.1; este arquivo continua valendo como registro de como o protótipo chegou à v2.0, primeiro degrau da migração.

Migração do protótipo do escopo v1.0 (contrato com mensalidade recorrente) para o **escopo v2.0** (pacote de créditos pré-pago). O plano completo, com o discovery e as decisões confirmadas, está em [PLANO_ATUALIZACAO_ESCOPO.md](./PLANO_ATUALIZACAO_ESCOPO.md).

O histórico das Fases 0 a 8, que construíram o protótipo sobre o escopo v1.0, continua em [PROGRESSO.md](./PROGRESSO.md).

- [x] Etapa 1 — Documento de escopo e configuração base do modelo de créditos
- [x] Etapa 2 — Carteira de créditos e venda avulsa (a virada)
- [x] Etapa 3 — Trancamento e reembolso
- [x] Etapa 4 — Aulas excepcionais (M9, módulo novo)
- [x] Etapa 5 — Agendamento, cancelamento e presença sobre créditos
- [x] Etapa 6 — Comissão e convênios
- [x] Etapa 7 — Experimental, painéis, notificações, perfis e relatórios
- [x] Etapa 8 — Varredura final e consolidação
- [x] Guia do protótipo — tela `/guia` com os cenários do escopo e como reproduzir cada um

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

---

## Etapa 2 — o que foi entregue

**A carteira de créditos e a venda com pagamento único substituíram o contrato e a cobrança recorrente.** É a virada do modelo comercial: contrato, mensalidade, inadimplência, alteração de plano, suspensão e bolsa parcial deixaram de existir no protótipo. A partir daqui, tudo que a aluna faz gasta crédito.

### O modelo de dados mudou de núcleo

- **Entidades removidas** (`src/types/domain.ts`, `seed.json`, repositórios e chaves estrangeiras do reset): `Contrato`, `HistoricoPlano`, `HistoricoBolsa`, `Pausa`, `Cobranca` e `TentativaCobranca`.
- **Entidades novas**: `Carteira`, `MovimentoCredito` e `Venda`.
- **`Pacote`** perdeu os campos-ponte da Etapa 1 e ficou só com nome, créditos, validade em dias e valor.
- **`Aluna`** perdeu `percentualBolsa` e ganhou `pacoteConcedidoId`; `SituacaoAluna` passou a ser apenas `ativa`, `trancada` e `aguardando_aceite` — ter ou não pacote é leitura da carteira, não estado do cadastro (RF-CRE-11).
- **`Agendamento`** ganhou `creditosReservados`, congelado no momento da reserva: alterar o custo da categoria depois não pode mudar o que já foi reservado.

### M3 — Carteira de créditos

- **`src/utils/creditos.ts`** (no lugar de `utils/contrato.ts`): saldo disponível, leitura de status, prévia de compra e formatação. Cálculo puro, conferível.
- **`src/hooks/carteiraDeCreditos.ts`**: ativação, reserva, liberação, consumo, consumo direto, estorno, expiração, ajuste administrativo e a rotina de encerramento. **Toda escrita de saldo passa por `aplicarMovimento`**, que grava o `MovimentoCredito` na mesma operação — é o que mantém o saldo reconstituível a partir do extrato (RNF-07).
- **Status derivado, não persistido**: "Finalizando" coexiste com "Ativo" (seção 4.3.3 do escopo) e é calculado pelos limiares configuráveis. Uma carteira vencida já aparece como expirada em todas as telas mesmo antes de a rotina consolidar o encerramento.
- **Renovação antecipada** com a regra do PA-10: os créditos somam e a validade passa a ser a **mais distante** entre a atual e a do pacote comprado. A prévia diz explicitamente quando a validade vigente foi mantida.
- **Ajuste administrativo** (RF-CRE-09): conceder, estornar e prorrogar, com motivo obrigatório. Conceder ou prorrogar em carteira encerrada **reabre** a carteira — é justamente o caso que o requisito prevê.
- **Bolsa integral** (RF-BOL-02/03): a concessão cria uma venda de valor zero, sem gateway, e a carteira é reposta automaticamente pela rotina quando encerra.

### M12 — Vendas e pagamentos

- **`src/hooks/vendas.ts`** (no lugar de `cobrancas.ts`): venda de pacote, confirmação pelo gateway, venda mantida pendente, cancelamento com motivo, registro manual fora do gateway, venda da aula experimental, histórico por aluna e resumo por situação.
- **`src/services/gatewayPagamento.ts`** reescrito: pagamento único com forma e parcelas, e estorno para o reembolso da Etapa 3. Continua determinístico — aprova sempre, exceto na venda marcada para recusar.
- **Créditos, validade e valor ficam congelados na venda**: alterar o catálogo depois não altera uma compra já feita.
- A **venda da aula experimental** entra como `tipo: 'aula_experimental'`, sem pacote e sem créditos, para que a receita do período inclua o que foi cobrado à parte.

### M2 — Cadastro de alunas

- **`src/hooks/cadastroDeAlunas.ts`** (o que sobrou de `contratosDeAluna.ts`): cadastro administrativo, matrícula pelo site, compra por aluna existente, concessão e revogação de bolsa.
- **Cadastro administrativo** deixa a venda **pendente** e a carteira aguardando ativação; a aluna paga no primeiro acesso. Bolsista não gera cobrança nenhuma.
- **Matrícula pelo site** confirma o pagamento dentro do fluxo e a carteira nasce ativa.
- **A carteira é ativada em `liberarAcessoDaAluna`**, não na confirmação do pagamento: o RF-CRE-01 exige as três condições juntas — pagamento confirmado, termo aceito e anamnese preenchida. É também daí que a validade passa a correr.

### Telas

- **Cobranças → Vendas**: totais por situação, confirmação de pagamento, reenvio de link, cancelamento com motivo, simulação de recusa do gateway e exportação. O botão **"Rodar rotina de carteiras"** dispara o encerramento automático e a renovação das bolsistas.
- **Ficha da aluna** reescrita: carteira com as três dimensões do saldo, extrato de créditos, histórico de pacotes, histórico de compras e as ações de comprar pacote, registrar venda manual, ajustar créditos e conceder bolsa.
- **Painel da aluna** reescrito: saldo disponível, reservado e utilizado, validade, aviso de "Finalizando", compra de pacote com prévia, próximas aulas, frequência e histórico de compras.
- **Lista de alunas**: filtros do RF-ALU-10 (com pacote ativo, sem pacote ativo, trancada, aguardando aceite, pacote a vencer, bolsistas), colunas de créditos e validade, e o status da carteira.
- **Matrícula pelo site**: pacote em créditos, forma de pagamento com parcelamento e resumo com a validade projetada.
- **Grade da aluna**: o custo em créditos aparece em cada aula (RF-AGD-01) e o resumo de saldo continua persistente na tela (RF-AGD-02).
- **Painel administrativo**: alunas com pacote ativo, receita confirmada e pendente, créditos em circulação e pacotes a vencer. "Cobranças em atraso" virou "Vendas aguardando pagamento".
- **Pacotes** e **Parâmetros** perderam os campos e as linhas do modelo antigo.

### Ciclo de créditos ligado ponta a ponta

- **Agendamento** reserva os créditos da categoria (RF-AGD-04, RF-CRE-03) e valida saldo, validade e trancamento.
- **Cancelamento pela aluna** libera a reserva dentro da antecedência e a converte em consumo fora dela (RF-CAN-01/02).
- **Chamada finalizada** converte reservado em utilizado (RF-PRE-04, RF-CRE-05), uma única vez — a correção reescreve a presença sem cobrar de novo.
- **Justificativa aprovada** estorna os créditos consumidos (RF-JUS-04).
- **Cancelamento pelo studio** libera a reserva e prorroga a validade da carteira, de forma cumulativa por ocorrência cancelada (PA-11).

### Decisões desta etapa

- **Toda escrita de saldo grava o movimento na mesma função.** `aplicarMovimento` é o único caminho que altera os totais da carteira. Sem isso, extrato e saldo divergiriam na primeira regra que esquecesse de registrar, e o RNF-07 — "o saldo é sempre reconstituível a partir do histórico de movimentos" — deixaria de valer na prática.
- **O encerramento da carteira é derivado na leitura e consolidado por uma rotina explícita.** Carregar uma tela nunca escreve no banco (regra do README), então `lerCarteira` calcula a situação de hoje e as telas mostram a carteira vencida como expirada mesmo antes de a rotina rodar. O que a rotina faz é gravar a situação, anular os créditos remanescentes e conceder a carteira nova da bolsista. É o mesmo padrão que a rotina financeira tinha na Fase 6.
- **`aguardando_ativacao` entrou como situação da carteira**, embora a seção 7 do escopo liste só ativa, consumida e expirada. O RF-CRE-01 descreve exatamente esse estado — os créditos existem mas não permitem agendamento — e sem ele a carteira comprada e ainda não liberada seria indistinguível de uma ativa.
- **O agendamento guarda quantos créditos reservou.** Ler o custo da categoria de novo no cancelamento devolveria a quantidade errada se a administração tivesse alterado o custo no meio do caminho.
- **A venda do cadastro administrativo nasce pendente sem acionar o gateway** (`manterPendente`), em vez de nascer marcada para recusar. As duas alternativas deixam a venda pendente, mas só a primeira diz a verdade sobre o motivo.
- **"Nenhum pacote ativo" é a única mensagem**, tanto para carteira consumida quanto para vencida, em todas as telas — é o que o RF-CRE-11 determina.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Camila Duarte** → Administração. O painel mostra 2 alunas com pacote ativo, R$ 630,00 de receita confirmada, 10 créditos em circulação, 1 pacote a vencer e 1 venda aguardando pagamento.
3. **Alunas**: os filtros novos funcionam. **Aline Martins** aparece como "Nenhum pacote ativo" (carteira expirada) e **Patrícia Lima** como "Finalizando" (1 crédito restante) — a distinção entre consumida e vencida não existe em lugar nenhum da interface.
4. **Ficha da Larissa Prado**: carteira com 9 disponíveis, 2 reservados, 1 utilizado, validade 08/11/2026. O extrato lista a concessão, as reservas e o consumo do cancelamento fora do prazo. O histórico de pacotes mostra a carteira Starter anterior, já consumida.
5. **Renovação antecipada com a regra do PA-10**: na ficha da Larissa, "Comprar pacote" e escolher **Starter**. A prévia mostra 13 créditos resultantes e avisa que a validade atual (08/11/2026, mais distante que os 45 dias do Starter) foi **mantida**. Confirme e veja a concessão entrar no extrato.
6. **Ajustar créditos**: conceder 2 créditos com motivo e conferir o movimento de ajuste no extrato. Tente estornar mais créditos do que os utilizados — deve recusar.
7. **Vendas**: a venda pendente da Juliana Rocha está marcada como "Gateway simulando recusa". Clique em **"Aprovar no gateway"** e depois em **"Confirmar pagamento"** — a carteira dela nasce com 12 créditos. Ou cancele a venda com motivo.
8. **Rodar rotina de carteiras**: encerra a carteira expirada da Aline (2 créditos perdidos, registrados como expiração no extrato) e, havendo bolsista com carteira encerrada, concede a carteira nova.
9. Entrar como **Larissa Prado** (Aluna): o painel traz o saldo em três dimensões e a compra de pacote com a mesma prévia. **Grade disponível** mostra o custo em créditos de cada aula. Agende uma — o disponível cai 1 e o reservado sobe 1.
10. Entrar como **Fernanda Alves** (bolsista, aguardando aceite): o primeiro acesso termina no aceite do termo, **sem passo de pagamento**, e a carteira de 4 créditos é ativada na hora, com a validade contada dali.
11. **Chamada** (Administração, pelo cartão de chamadas não finalizadas, ou pelo painel da professora): finalize a chamada de 13/08 da DANÇA. O crédito reservado da Larissa vira utilizado, com o movimento "Aula realizada em 13/08/2026" no extrato.
12. **Matrícula pública** (`/matricula`): escolha um pacote, veja a validade projetada no resumo, selecione cartão parcelado e conclua — a carteira nasce ativa e a primeira aula pode ser agendada no mesmo fluxo.

### Verificação executada

O ciclo completo foi percorrido no navegador antes da entrega: compra com renovação antecipada (validade mantida pela regra do PA-10), agendamento reservando crédito, finalização da chamada convertendo a reserva em consumo, e **"Resetar protótipo"** restaurando as cinco carteiras, sete vendas e treze movimentos com todas as chaves estrangeiras traduzidas. `tsc` sem erros, `vite build` compilando, `oxlint` apenas com os três avisos preexistentes de fast-refresh.

Os quatro erros de tipagem que existiam em `src/hooks/useAlunas.ts` desde antes da migração desapareceram: o arquivo foi reescrito nesta etapa, e o `Contrato` que os causava não existe mais.

### Observações registradas durante a etapa

- **O texto do termo de aceite foi reescrito** (`src/data/anamnese.ts` e o backfill): saiu a cláusula de cobrança mensal recorrente, entraram as cláusulas de créditos e validade, e uma cláusula de reembolso alinhada ao RF-REE-01. O termo definitivo continua sendo responsabilidade da cliente (capítulo 12 do escopo) — este é o texto provisório do protótipo.
- **O catálogo de eventos de notificação foi limpo**: saíram os eventos de cobrança, inadimplência, aviso de término de contrato, alteração de plano e encerramento de contrato; entrou a confirmação de compra. Os eventos de pacote finalizando, pacote encerrado, alocação em aula excepcional e reembolso aplicado entram na Etapa 7, junto com o restante do M16.
- **O trancamento ainda não existe como operação**: a situação `trancada` da aluna já bloqueia o agendamento e a interface já responde a ela, mas a entidade `Trancamento` e a tela de concessão são a Etapa 3.

### Ajuste pós-entrega (UX-01 e UX-02, aplicado depois da Etapa 4)

Melhoria de UX identificada pelo uso, documentada em `AJUSTES DE UX.md` antes de ser implementada:

- **Nova página "Meu pacote"** (`src/pages/aluna/MeuPacotePage.tsx`, rota `/aluna/meu-pacote`, item no menu lateral): reúne a carteira, a compra de pacote (`ComprarPacote`, extraído de `PainelAlunaPage.tsx` para `src/pages/aluna/ComprarPacote.tsx` e reaproveitado nas duas telas) e o histórico de compras — os três saíram do painel. Acessível a qualquer aluna, inclusive de convênio (RF-CNV-09). Durante o trancamento a página continua acessível, mas a compra fica desabilitada com a explicação (RF-TRA-04).
- **O painel (`PainelAlunaPage.tsx`) passou a tratar de aulas, não de dinheiro**: no lugar do bloco de compra removido, entrou um recorte da **grade disponível** (até 4 aulas, com agendamento direto ali) ou o motivo do bloqueio, com link para "Meu pacote" quando o bloqueio é de saldo ou de pacote inexistente. O estado vazio de "Próximas aulas" trocou o link discreto por um bloco de orientação com botão "Marcar uma aula".
- **`ResumoDoPacote.tsx`** ganhou os links de saída: a mensagem de "Nenhum pacote ativo" e a faixa de "Finalizando" (com texto diferente por motivo — poucos créditos vs. vencimento próximo) levam para `/aluna/meu-pacote`. **`GradeDaAlunaPage.tsx`** ganhou o mesmo link quando o bloqueio é de saldo ou de pacote.
- Verificado no navegador: agendamento pela grade do painel (saldo e reservado atualizando), a faixa "Finalizando" da Patrícia Lima levando a "Meu pacote", a aluna de convênio (Renata Souza) vendo o aviso do parceiro **junto** do conteúdo normal e podendo comprar pacote, a aluna sem carteira (Aline Martins) com o cartão de bloqueio e o link de saída, o trancamento (Larissa Prado) com a compra desabilitada mas carteira e histórico visíveis, e o primeiro acesso (Fernanda Alves) inalterado. `tsc` e `vite build` sem erros.
- `AJUSTES DE UX.md`: os dois itens foram marcados como aplicados.

---

## Etapa 3 — o que foi entregue

**Trancamento e reembolso: os dois recursos de mediação da administração.** Nenhum dos dois tem jornada de solicitação pela aluna — ela procura o studio pelos canais de atendimento, e o sistema serve para dar contexto, calcular, executar e registrar.

### M3 — Trancamento (seção 4.3.6)

- **Entidade `Trancamento`** + `src/hooks/trancamento.ts`: concessão, prévia, retorno e histórico.
- **Prévia antes de confirmar** (RF-TRA-05): créditos congelados, validade atual, validade projetada no retorno e a lista das aulas que serão canceladas, com data e créditos de cada uma.
- **Apoio à decisão no topo do modal** (RF-TRA-07): pacote vigente, créditos disponíveis, validade e os trancamentos anteriores da aluna. O escopo decidiu não impor teto de dias (RF-TRA-03), então o que o sistema faz é dar contexto antes de a administração arbitrar.
- **Efeitos da concessão** (RF-TRA-04): a aluna passa a `trancada` e deixa de visualizar a grade; as aulas agendadas no período são canceladas e os créditos reservados voltam ao saldo disponível.
- **Retorno** (RF-TRA-02): a validade é acertada pelo tempo em que a carteira ficou de fato trancada, e o agendamento é liberado.
- **Registro completo** (RF-TRA-06): data de início, término previsto, retorno efetivo, dias prorrogados, motivo e autor, com trilha de auditoria e notificação à aluna nas duas pontas.
- Seção **"Trancamentos"** na ficha da aluna e faixa de aviso no topo enquanto o trancamento está em curso.

### M12 — Reembolso (seção 4.12.2)

- **Entidade `Reembolso`** + `src/hooks/reembolsos.ts`: verificação das condições, cálculo, prévia, execução pelo gateway e registro.
- **Condições verificadas** (RF-REE-01/06): prazo de arrependimento, percentual máximo de créditos utilizados, situação da carteira, tipo e situação da venda. Quando alguma falha, a prévia devolve o **impedimento em texto** e o botão de confirmar fica desabilitado — a administração vê por que não dá, não só que não dá.
- **Cálculo pelo valor unitário do crédito** (RF-REE-02): valor pago dividido pelos créditos comprados, multiplicado pelos créditos consumidos desde a compra.
- **Prévia** (RF-REE-03): valor pago, créditos utilizados, valor descontado e valor líquido a reembolsar, mais o efeito na carteira.
- **Execução** (RF-REE-04/05): estorno pelo gateway na mesma forma de pagamento, venda marcada como reembolsada, créditos retirados da carteira e aulas futuras canceladas.
- **Reembolso por motivo legal** (RF-REE-07): fora do prazo de arrependimento, a operação segue mediante documentação datada, e o valor admite ajuste — o requisito prevê reembolso parcial.
- **Registro** (RF-REE-08): data, motivo, documentação, decisão, autor e valor, com trilha de auditoria e e-mail à aluna (RF-NOT-12).
- **REL-13** na página de Vendas: reembolsos aplicados no período, com aluna, tipo, créditos utilizados, valor descontado, valor devolvido, motivo e autor, exportável em CSV.

### A regra do PA-09, implementada

O escopo tem uma tensão aqui: o RF-REE-05 manda encerrar a carteira, e o PA-09 manda devolver **apenas a compra**, com os créditos anteriores voltando pela validade original. Os dois valem, em situações diferentes:

- **A compra originou a carteira** → carteira encerrada, remanescentes anulados, aulas futuras canceladas.
- **A compra foi absorvida por uma carteira que já existia** (renovação antecipada) → só os créditos dela saem, a validade anterior é restaurada, e a carteira segue ativa com o que a aluna já tinha.

Para o segundo caso funcionar, a `Venda` passou a gravar `validadeAnteriorDaCarteira` no momento da compra: sem essa data registrada antes de ser substituída pela validade única, não haveria como restaurá-la depois. A prévia diz explicitamente qual dos dois caminhos será tomado.

### Decisões desta etapa

- **A prorrogação do trancamento é aplicada na concessão, não só no retorno.** O RF-TRA-02 fala em congelar a contagem da validade; como a validade aqui é uma data, congelar significa empurrá-la. Empurrar já na concessão evita que a carteira expire no meio da pausa — que é exatamente o que o requisito quer impedir. O retorno acerta a diferença: volta antes, devolve os dias; volta depois, acrescenta.
- **O acerto do retorno gera movimento no extrato.** A primeira versão ajustava a data direto na carteira, e o extrato ficava afirmando uma prorrogação de 30 dias que tinha sido desfeita. Toda mudança de validade passa a ser um movimento, pelo mesmo motivo que todo crédito é: o registro precisa explicar o estado.
- **`MovimentoCredito` ganhou `unidade` e admite quantidade negativa.** Prorrogação movimenta dias, não créditos — sem a distinção, o extrato mostrava "+30" numa carteira cujo saldo não mudou. E os lançamentos que retiram saldo (créditos anulados por reembolso, dias devolvidos no retorno antecipado) são gravados com sinal negativo, senão apareceriam como entrada.
- **Reembolso parcial só existe no motivo legal.** No arrependimento o valor é o cálculo do RF-REE-02, sem edição: abrir o campo ali convidaria a negociar o que a regra já resolve. No motivo legal o RF-REE-07 prevê explicitamente decisão caso a caso.
- **Quando o reembolso parcial deixa o saldo abaixo do reservado**, as aulas mais distantes são canceladas até caber. É o caso de reembolsar uma renovação antecipada de quem já agendou usando os créditos comprados.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Camila Duarte** → Administração → **Alunas** → **Larissa Prado**.
3. **Trancar**: o modal abre com pacote, disponíveis, validade e trancamentos anteriores no topo. Escolha um período e veja a prévia — a validade projetada avança pelos dias do período, e as aulas agendadas dentro dele aparecem listadas. Confirme: a aluna vira "Trancada", uma faixa amarela explica o período, "Agendar aula" fica desabilitado e o extrato recebe um ajuste de validade em dias.
4. **Registrar retorno**: a validade é acertada pelo tempo real de trancamento, e o extrato registra o acerto. Retornando no mesmo dia, os 30 dias concedidos voltam.
5. **Entrar como Larissa** e conferir que a grade fica bloqueada durante o trancamento, com a mensagem de pacote trancado.
6. **Reembolso fora do prazo**: na ficha da **Patrícia Lima**, "Histórico de compras" → **Reembolsar**. A prévia calcula R$ 220,00 pagos, 3 de 4 créditos (75%), R$ 55,00 por crédito, R$ 165,00 descontados, R$ 55,00 líquidos — e recusa o arrependimento, porque a compra foi há mais de 7 dias. Troque para **Motivo legal**: aparecem os campos de documentação e valor, e a operação passa a ser possível.
7. **Confirme o reembolso** da Patrícia: a carteira é encerrada, a venda vira "Reembolsada" e a seção "Reembolsos aplicados" surge na ficha dela.
8. **A regra do PA-09**: na ficha da Larissa, compre o pacote **Premium** (renovação antecipada: 9 + 24 = 33 disponíveis, validade 23/02/2027). Depois clique em **Reembolsar** nessa compra. A prévia avisa que a compra foi absorvida por uma carteira que já existia, então apenas os créditos dela saem e a validade anterior (08/11/2026) é restaurada. Confirme e confira: a carteira volta a 12 créditos com validade 08/11/2026, **sem** ser encerrada.
9. **Vendas**: o bloco "Reembolsos aplicados" lista os dois reembolsos com aluna, tipo, cálculo, motivo e autor, com exportação em CSV.
10. **Perfil da aluna**: confirme que nenhuma tela da aluna menciona reembolso — não há botão, aba, rótulo, coluna nem filtro. A informação só aparece no histórico de compras dela, como a situação "Reembolsada" da venda (RF-REE-09/10).

### Verificação executada

Os dois fluxos foram percorridos no navegador: trancamento com prévia, concessão, bloqueio e retorno; reembolso recusado por prazo, aceito por motivo legal com valor parcial e encerramento da carteira; e o ramo do PA-09, confirmado pela API — carteira de 36 volta a 12 créditos, validade restaurada para 08/11/2026, `carteiraEncerrada: false`. `tsc` sem erros, `vite build` compilando, `oxlint` apenas com os três avisos preexistentes.

Dois defeitos apareceram no teste e foram corrigidos antes da entrega: o acerto de validade no retorno não gerava movimento no extrato, e os lançamentos de retirada de crédito apareciam com sinal positivo.

### Observação registrada durante a etapa

- **A notificação de reembolso aplicado (RF-NOT-12) entrou nesta etapa**, e não na Etapa 7 como o plano previa. O reembolso encerra a carteira e cancela aulas já agendadas; deixar a aluna sem aviso até a etapa das notificações seria entregar um fluxo que age sobre ela em silêncio. Os avisos de trancamento e de retorno entraram pelo mesmo motivo. O restante do M16 continua na Etapa 7.

### Ajustes pós-entrega (mesma etapa, antes da validação)

- **A lista de vendas mostrava o preço do pacote nas vendas reembolsadas.** O reembolso desconta os créditos já utilizados (RF-REE-02), então o valor devolvido quase nunca é o que foi pago — a Patrícia recebeu R$ 55,00 de uma compra de R$ 220,00, e a coluna dizia R$ 220,00. `VendaDetalhada` passou a trazer `valorReembolsado`, cruzado com o registro de reembolso, e a coluna exibe o valor devolvido com o valor pago em linha secundária.
- **O card "Reembolsado" somava o preço das vendas reembolsadas, não o que foi devolvido.** `resumirVendas` passou a receber os reembolsos e somar `valorReembolsado`. Com os quatro reembolsos de exemplo, o card sai de R$ 1.510,00 (soma dos pacotes) para R$ 1.085,00 (soma do que saiu do caixa) — que é o número que a administração precisa conferir.
- **A lista de reembolsos aplicados virou `Tabela`**, com busca por aluna ou motivo e paginação, no mesmo padrão das outras listagens do sistema. A exportação em CSV continua no cabeçalho da seção.
- **O histórico de compras mostrava o mesmo preço do pacote**, nos dois lugares em que aparece: na ficha da aluna (administração) e no painel da própria aluna. `historicoDeComprasDaAluna` passou a devolver `CompraDaAluna`, com o `valorReembolsado` cruzado do registro de reembolso, e as duas telas exibem o valor devolvido com o valor pago logo abaixo — "R$ 55,00 · de R$ 220,00 pagos" na ficha, "R$ 55,00 · reembolsado de R$ 220,00" no painel da aluna. Continua valendo o RF-REE-10: a linha só aparece para quem teve um reembolso aplicado ao próprio cadastro.

- **Bug de paginação em todas as tabelas — causa raiz corrigida.** A `Tabela` usava `itensPorPagina = 8` como valor padrão, mas o seletor de itens por página oferece 5, 10, 25 e 50. Um `<select>` cujo `value` não corresponde a nenhuma `<option>` não fica vazio: o navegador exibe a primeira opção. O resultado era a tabela paginando de 8 em 8 enquanto o seletor afirmava 5, e a inconsistência só sumia depois de escolher qualquer valor da lista — aí o estado passava a ser um valor que existe.

  A correção tem duas partes. O padrão da `Tabela` passou a ser 10, que existe nas opções. E `usePaginacao` passou a **normalizar o valor inicial** para a opção mais próxima, de modo que nenhum valor fora da lista consiga criar de novo um estado que a interface não sabe refletir.

  **Alcance:** todas as tabelas do sistema tinham o problema, porque nenhuma delas passava `itensPorPagina` — a única exceção era "Meus pagamentos" da professora, que já passava 10 explicitamente. As listas em cartão de "Minhas aulas" usam `usePaginacao` com 5, que está nas opções, e nunca foram afetadas.

---

## Etapa 4 — o que foi entregue

**M9, o módulo novo do escopo v2.0: workshops e aulas particulares.** Acontecem fora da grade recorrente, são criados pela administração e não podem ser agendados pelas alunas (RN-12). Ambos compartilham o mesmo cadastro — o que os diferencia é a categoria de aula escolhida e o custo em créditos dela.

### Modelo de dados

- **`AulaExcepcional`**, **`ProfessoraDaAula`** e **`Alocacao`**, com repositórios, chaves estrangeiras no reset e chaves no backfill.
- **`Chamada`** passou a aceitar ocorrência de sessão **ou** aula excepcional, e `professoraId` virou opcional: sem professora vinculada, a chamada é da administração e não há a quem atribuir a condução (RF-AEX-10).
- **`Comissao`** ganhou `baseDeCalculo` — descrição legível do que originou o valor (RF-COM-02) — e `aulaExcepcionalId`. A `categoriaAplicadaId` virou opcional, porque a aula excepcional não usa categoria de professora.

### O cadastro (RF-AEX-01/02/03/13)

- **Categoria, nome, data, horário e espaço**, sem recorrência: cada ocorrência é criada individualmente.
- **Conflito de espaço e de professora bloqueia** (RN-23), com a mensagem dizendo qual aula gera o conflito.
- **Horário fora do funcionamento apenas alerta.** O escopo é explícito: workshop de sábado e aula particular em horário atípico são justamente os casos em que isso acontece, e bloquear obrigaria a administração a alterar a configuração do studio para cadastrar um evento pontual. A tela oferece as duas saídas — confirmar assim mesmo ou ajustar —, e a aula fica marcada com o selo "Fora do funcionamento".
- **Conflito com a grade regular informa e oferece o cancelamento** das sessões daquele horário. Havendo alunas agendadas, o cancelamento devolve os créditos, prorroga a validade e avisa cada uma — pelo mesmo caminho já usado pelo calendário de exceções. Não havendo, a grade daquele horário apenas deixa de ser ofertada.
- **A checagem roda enquanto a administração preenche**, não no envio: o alerta e o conflito precisam aparecer antes de confirmar, não depois.

### Professoras e comissão (RF-AEX-12)

- **Vínculo opcional, uma ou mais**, cada uma com **seu próprio valor de comissão**, informado no cadastro da aula.
- **Não usa a categoria da professora.** Uma aula particular remunera mais que a regular, porque o valor cobrado da aluna também é maior, e num workshop a quatro mãos cada professora pode receber um valor distinto.
- **Aula sem professora vinculada não gera comissão nenhuma** — acontece normalmente, tem chamada e consome créditos. A tela explica quando não cadastrar: aula conduzida pela proprietária, ou convidado remunerado por fora.

### Alocação (RF-AEX-04 a 08, 11)

- **Consumo imediato, sem reserva** (RN-13): quem aloca é a administração, e não há janela de cancelamento pela aluna que justifique segurar o crédito.
- **Custo integral por participante**, não dividido entre elas.
- **Alocação sem consumo** para quando o pagamento é tratado fora do sistema, com motivo obrigatório de lista curta — pagamento avulso, convidada ou cortesia (PA-12). Sem esse registro, a diferença entre quem consumiu crédito e quem pagou por fora desapareceria na conferência.
- **Cancelamento da alocação estorna os créditos**, com autor e motivo, e avisa a aluna.
- **Sem controle de capacidade**: a tela mostra quantas estão alocadas e diz explicitamente que a lotação é decisão da administração.
- **Aluna de convênio é recusada**, com a explicação de que o convênio cobre apenas a grade regular.
- A aluna sem pacote ativo também é recusada, com a saída oferecida na própria mensagem: registrar sem consumo ou vender um pacote antes.

### Chamada e visibilidade

- **Chamada própria** (RF-AEX-10), na mesma interface de toque da chamada da grade, mostrando quanto cada participação consumiu e quanto cada professora vai receber ao finalizar. Os créditos já saíram na alocação, então a finalização não converte reserva nenhuma: ela registra a presença e gera **um lançamento por professora vinculada**.
- **Na agenda da professora**, as aulas em que ela está vinculada aparecem junto das sessões do dia, com o valor da comissão dela e o botão de chamada.
- **Para a aluna** (RF-AEX-09), a aula alocada entra nas próximas aulas e no histórico de frequência, com o consumo de créditos — e sem botão de cancelar, porque quem cancela é a administração.
- **Na ficha da aluna**, a participação aparece no histórico de frequência, identificada pelo nome da aula.

### Decisões desta etapa

- **A comissão da aula excepcional entrou agora, não na Etapa 6.** O plano deixou o M11 para depois, mas o RF-AEX-12 diz que a finalização da chamada gera o lançamento: entregar a chamada sem a comissão seria entregar meio fluxo. O que fica para a Etapa 6 é o restante do M11 — sessão sem presenças não gera comissão (RF-COM-03) e o detalhamento do fechamento separando regulares de excepcionais.
- **A aula excepcional da aluna é montada como um agendamento sintético.** `AulaDaAluna` ganhou `tipoDeAula` e as alocações entram na mesma lista, com os mesmos campos. O RF-AEX-09 pede que ela apareça **nas próximas aulas e no histórico de frequência** — não num bloco à parte —, e uma lista separada teria sido mais fácil de escrever e pior de usar.
- **O badge da aula excepcional diz "Alocada", não "Agendada".** Chamar de agendada atribuiria à aluna uma ação que não foi dela.
- **A chamada da aula excepcional ficou em funções próprias**, e não como condicional dentro da chamada da grade: a lista de participantes vem de outra entidade e a comissão segue outra regra. Sobrecarregar as funções existentes espalharia condicionais por todo o fluxo.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Camila Duarte** → Administração → **Aulas excepcionais**.
3. **Criar um workshop fora do horário**: categoria Workshop, nome, data de hoje, início 22:00 e término 23:00. O alerta "Fora do horário de funcionamento" aparece assim que os campos ficam completos, e o botão passa a dizer **"Confirmar assim mesmo"**. Vincule **Beatriz Nogueira** com comissão de R$ 180,00 e confirme. A aula aparece na listagem com o selo "Fora do funcionamento".
4. **Testar o conflito com a grade**: crie outra aula numa segunda ou quarta às 08:00, no mesmo espaço da sessão de POLE INICIANTE. A tela informa a sessão em conflito, quantas alunas estão agendadas, e oferece cancelá-la — com o aviso do que acontece com os créditos.
5. **Alocar alunas**: escolha **Fernanda Alves** (bolsista aguardando aceite) — a alocação é recusada, porque ela ainda não tem carteira ativa, e a mensagem oferece a saída. Escolha **Larissa Prado**: os 2 créditos do workshop saem na hora, sem passar por reserva. Confira na ficha dela: o extrato recebe um consumo com a origem `Alocação em "…"`.
6. **Alocação sem consumo**: marque a opção e escolha um motivo. A participação é registrada sem tocar na carteira, e o motivo fica visível na lista.
7. **Aluna de convênio**: tente alocar **Renata Souza** — recusada, porque o convênio cobre apenas a grade regular (RF-AEX-11).
8. **Chamada**: clique em "Chamada" na aula. A tela mostra quanto cada participação consumiu e quanto a professora vai receber. Finalize — o toast confirma **1 lançamento de comissão de R$ 180,00**, e não os R$ 35–55 da categoria dela.
9. **Comissões**: o lançamento aparece no período, com a base de cálculo dizendo que o valor veio do cadastro da aula.
10. Entrar como **Beatriz Nogueira** (Professora) → **Minhas aulas**, na data da aula: o workshop aparece junto das sessões, com o valor da comissão dela.
11. Entrar como **Larissa Prado** (Aluna) → **Minhas aulas**: o workshop aparece nas próximas aulas, marcado como **Alocada**, sem botão de cancelar.
12. **Cancelar a alocação** pela administração e conferir o estorno dos 2 créditos no extrato da aluna.

### Verificação executada

O fluxo foi percorrido no navegador: criação com alerta de horário fora do funcionamento, vínculo de professora com comissão própria, recusa da aluna sem pacote ativo, alocação com consumo imediato (9 → 7 disponíveis, sem passar por reserva), chamada finalizada gerando R$ 180,00 pelo valor do cadastro, e a aula aparecendo nas próximas aulas da aluna. `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes.

Um problema apareceu no teste e foi corrigido: **os dois campos de horário não tinham rótulo visível**. O `TimePicker` carrega só um rótulo acessível, o que basta nas telas onde a posição diz qual é qual (as faixas de horário da grade e do studio), mas não num formulário em grid com outros campos rotulados — não dava para saber qual era início e qual era término.

---

## Etapa 5 — o que foi entregue

**O refino do ciclo reserva → consumo que a Etapa 2 deixou no mínimo.** Boa parte do que o plano lista para esta etapa já tinha sido entregue junto com a virada do modelo comercial — a grade com custo em créditos, o saldo persistente, os bloqueios, a janela diferenciada, a reserva no agendamento, o cancelamento dentro e fora da antecedência, o estorno por justificativa aprovada e a conversão de reserva em consumo na chamada. O trabalho aqui foi fechar as lacunas que sobraram e que só apareceram ao percorrer o ciclo inteiro.

### O histórico da aluna passou a dizer o destino dos créditos (RF-PRE-07)

O requisito pede que a aluna veja **os créditos consumidos em cada ocorrência**, e a tela mostrava só data, modalidade, professora e situação. Duas aulas canceladas apareciam idênticas na lista tendo efeitos opostos sobre o saldo — sem isso, a aluna não conseguia conferir o extrato contra o próprio histórico.

Cada linha agora traz uma frase que diz o que aconteceu, derivada em `destinoDosCreditos` (`useAgendaDaAluna.ts`):

- **1 crédito reservado** — aula marcada, ainda não realizada;
- **1 crédito utilizado** — presença confirmada;
- **1 crédito consumido — falta** — ausência sem justificativa aprovada (RF-CRE-05);
- **1 crédito consumido — cancelamento fora do prazo** (RF-CAN-02);
- **1 crédito devolvido ao saldo** — cancelamento dentro da antecedência (RF-CAN-01);
- **1 crédito devolvido — justificativa aprovada** (RF-JUS-04);
- **1 crédito devolvido — aula cancelada pelo studio** (RF-CPR-04, RF-EXC-04);
- **1 crédito consumido na alocação** — aula excepcional, que consome na hora sem passar por reserva (RF-AEX-04);
- **Sem consumo de créditos** — aula experimental e reserva de convênio.

O que é devolução aparece em verde; o particípio concorda com a quantidade, em vez de sair como "devolvido(s)".

### A correção da chamada passou a ajustar o crédito, não só a comissão (RF-PRE-05)

O requisito diz que a correção ajusta "a comissão apurada **e o saldo de créditos da aluna quando aplicável**". A comissão já era recalculada; o crédito, não.

O caso aplicável é um só, e ele acontece: a aluna faltou, o crédito foi consumido, ela justificou, a administração aprovou e o crédito voltou ao saldo — então a correção da chamada mostra que ela **estava presente**. A aula aconteceu para ela, e o crédito precisa voltar a ser consumido. A justificativa passa à situação **`sem_efeito`**: ela justificava uma falta que não existiu. Marcá-la como "recusada" mentiria sobre o que a administração decidiu.

O caminho inverso não existe e o código não finge que existe: presença e ausência consomem igual, então corrigir de presente para ausente não mexe no saldo. O crédito só volta por justificativa aprovada.

### A administração passou a cancelar e remarcar (RF-AGD-08)

O requisito é "agendar, cancelar **e remarcar** em nome de qualquer aluna, com registro de autoria". Só o agendar existia. No histórico de frequência da ficha, as aulas da grade ainda por acontecer ganharam os dois botões:

- **Cancelar** devolve o crédito sempre, mesmo em cima da hora — a antecedência mínima existe para a aluna desistir, não para o studio desmarcar. A confirmação diz isso antes de executar.
- **Remarcar** reaproveita a mesma listagem do portal, em `remarcarAgendamento`: cancela e agenda **nessa ordem**, para que a vaga e o crédito da aula antiga voltem antes de a nova ser reservada. Sem isso, mover uma aluna para um horário quase cheio exigiria dela um crédito a mais do que precisa, e a última vaga da sessão de origem ficaria presa. Se o novo horário falhar (turma lotou entre abrir a tela e confirmar), a mensagem diz explicitamente que a aula original foi desmarcada e o crédito voltou — em vez de deixar quem opera sem saber o que ficou.

O histórico de frequência da ficha também deixou de exibir a situação crua do registro (`ativo`, `realizado`) e passou a usar os mesmos selos da tela da aluna, com horário e modalidade em cada linha.

### O botão de justificar respeita o prazo (RF-JUS-02)

O envio já era recusado no domínio depois do prazo configurado, mas a tela oferecia o botão assim mesmo — a aluna clicava, preenchia e só então descobria que não dava. Agora o botão só aparece dentro do prazo.

### Decisões desta etapa

- **`sem_efeito` entrou como situação de justificativa**, e não como recusa. As três situações do escopo descrevem decisões da administração; esta descreve um fato posterior que as tornou obsoletas. Reusar "recusada" registraria uma decisão que ninguém tomou, e a aluna leria como se a justificativa dela tivesse sido rejeitada.
- **O parecer da análise é omitido quando a justificativa fica sem efeito.** Ele descreve uma decisão que a correção desfez — apareceu no teste como "Justificativa sem efeito … — Justificativa aceita, crédito devolvido", dizendo o oposto do que tinha acabado de acontecer com o saldo.
- **A remarcação cancela antes de agendar**, com a consequência assumida de que uma falha no segundo passo deixa a aluna sem aula. A ordem inversa evitaria isso, mas cobraria um crédito extra e prenderia a vaga de origem — e o erro, quando acontece, é recuperável com uma segunda tentativa pela própria ficha.
- **A prorrogação cumulativa do PA-11 já valia nos três caminhos** e foi conferida, não reescrita: solicitação da professora aprovada sem substituta, exceção de calendário e exclusão de sessão passam todas por `cancelarOcorrencia`, que prorroga uma vez por ocorrência cancelada. O conflito com aula excepcional (RF-AEX-03) usa o mesmo caminho.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. Entrar como **Larissa Prado** (Aluna) → **Minhas aulas**. Cada aula, nas próximas e no histórico, traz a linha de créditos: a agendada diz "1 crédito reservado", e a de 12/08 diz "1 crédito consumido — cancelamento fora do prazo".
3. **Agendar** uma aula pela grade e conferir que ela entra como "1 crédito reservado". **Cancelar** com mais de 4h de antecedência: a linha vira "1 crédito devolvido ao saldo", em verde.
4. **Ciclo da correção (RF-PRE-05)**, o teste central da etapa:
   - Como **Beatriz Nogueira** (Professora), abrir a chamada pendente de 17/08, marcar **Larissa como ausente** e finalizar. Na ficha da Larissa, o extrato recebe "Consumo — Aula realizada em 17/08/2026".
   - Como **Larissa**, a aula aparece como "Falta", com "1 crédito consumido — falta". Clicar em **Justificar** e enviar. (Se a data já estiver fora dos 7 dias, o botão não aparece — é a regra do RF-JUS-02; aumente o prazo em Parâmetros para testar.)
   - Como **Camila Duarte** (Administração) → **Justificativas**, aprovar. O extrato recebe "Estorno — Justificativa de falta aprovada", e o crédito volta ao saldo.
   - Ainda na administração, abrir a chamada de 17/08, marcar **Larissa como presente**, escrever a justificativa do ajuste e salvar. O extrato recebe **"Consumo — Correção da chamada de 17/08/2026: presença confirmada"**, e na tela da aluna a linha vira "1 crédito utilizado" com "Justificativa sem efeito — a chamada foi corrigida e você consta como presente".
5. **Remarcação (RF-AGD-08)**: na ficha da Larissa, no histórico de frequência, clicar em **Remarcar** numa aula futura. O texto do modal explica que a troca não custa crédito adicional. Escolher outro horário e conferir que **o saldo não muda** — o extrato mostra o par "Liberação +1" e "Reserva −1".
6. **Cancelamento pela administração**: clicar em **Cancelar** na mesma aula. A confirmação avisa que o crédito volta ao saldo e que o registro fica como feito pela administração.
7. **Prazo da justificativa**: em **Parâmetros**, reduzir "Prazo para envio de justificativa de falta" e conferir que o botão **Justificar** some das aulas fora do prazo.

### Verificação executada

O ciclo completo foi percorrido no navegador: chamada finalizada com falta (reservados 3 → 2, utilizados 1 → 2), justificativa enviada, aprovada com estorno, e a correção da chamada reconsumindo o crédito — os três movimentos aparecem no extrato na ordem certa, e o saldo final bate. A remarcação de 28/08 para 31/08 manteve o saldo em 8 disponíveis e 2 reservados, e o cancelamento pela ficha devolveu o crédito. `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes de fast-refresh.

Um defeito de texto apareceu no teste e foi corrigido: o parecer da análise continuava sendo exibido depois que a justificativa ficava sem efeito, afirmando que o crédito tinha sido devolvido logo abaixo da linha que dizia que ele voltou a ser consumido.

---

## Etapa 6 — o que foi entregue

**Os dois módulos ajustados ao que mudou na v2.0.** A comissão de aula excepcional já tinha entrado na Etapa 4, junto com a chamada que a gera. O que faltava aqui era a regra da aula sem presenças, o detalhamento que separa os dois tipos de aula, e as regras novas do convênio que o protótipo cumpria por construção mas não dizia em lugar nenhum.

### RF-COM-03 — sessão sem presenças não gera comissão

A chamada era finalizada e a comissão saía igual, tivesse comparecido a turma inteira ou ninguém. Agora `lancarComissao` recebe a quantidade de presenças e **não lança quando ela é zero**.

A ordem importa: gerar o lançamento e esperar que alguém o remova depois inverteria o requisito — o padrão passaria a ser pagar. Como o escopo manda não gerar, a decisão sobre pagamento fica com a administração, e para isso a aula precisa continuar visível:

- **A professora sabe na hora.** O toast da finalização passa a dizer que nenhuma comissão foi gerada e por quê, em vez de deixá-la descobrir no fechamento do mês.
- **A administração vê no fechamento.** `sessoesSemPresencaNoPeriodo` lista as aulas finalizadas sem nenhuma presença, e a tela de Comissões as destaca em bloco próprio, com link para a chamada. Sem isso, a aula desapareceria da conferência: ela não gera lançamento, não entra em nenhum total, e a professora esteve no studio.

O bloco é separado do de chamadas pendentes, que já existia e diz outra coisa — lá a comissão ainda não existe porque a chamada não foi feita; aqui ela não vai existir.

### RF-COM-02 — quantidade de presenças gravada no lançamento

`Comissao` ganhou o campo `presencas`. Ele é gravado, e não recontado na tela: a chamada pode ser corrigida depois, e o detalhamento precisa dizer o que valeu quando a comissão foi apurada.

### REL-07 — detalhamento separando regulares e excepcionais

A tela resolvia a descrição da aula apenas pela ocorrência de sessão. Uma comissão de aula excepcional não tem ocorrência, então aparecia como **"Aula ·"** — sem nome e sem horário, no relatório que existe justamente para conferir antes de pagar.

A descrição saiu da tela e virou `detalharComissoes` no domínio, que resolve cada lançamento pelo caminho certo e devolve o `tipoDeAula`. Com isso:

- o resumo por professora mostra quanto veio de cada tipo ("R$ 35,00 em regulares, R$ 180,00 em excepcionais");
- o detalhamento marca a aula excepcional com selo, exibe a **base de cálculo** de cada linha e fecha com os dois subtotais;
- o CSV ganhou as colunas de tipo e de base de cálculo;
- a tela da professora usa a mesma função, e a aula excepcional dela deixou de aparecer sem nome.

### Convênios — as regras novas do v2.0 passaram a aparecer na tela

Três regras que o protótipo já cumpria, mas que ninguém que abrisse a tela saberia:

- **RF-CNV-01 — aulas excepcionais não são espelhadas.** Só sessões da grade recorrente chegam aos convênios. A ausência delas na lista de espelhamento parecia falha; agora está dita.
- **RF-CNV-08 — o studio não controla quantas aulas a aluna de convênio pode fazer.** A falta de um "usadas / restantes" no relatório é decisão de escopo, e o relatório explica que o limite é do parceiro.
- **RF-CNV-09 — pacote e convênio convivem na mesma pessoa.** A lista de reservas marca a aluna que também tem carteira no studio, e o histórico de frequência — na ficha e na tela dela — identifica cada aula pela origem: "reserva pelo convênio" não consome crédito, e agora diz isso em vez de um "sem consumo de créditos" sem explicação.

### Referências de requisito realinhadas ao v2.0

A numeração do M11 e do M14 mudou entre as versões do escopo, e os comentários do código ainda apontavam para os IDs da v1.0 — RF-CNV-13 para credenciais (hoje RF-CNV-13 é isso, mas era 12), presença sem check-in como RF-CNV-10 (hoje RF-CNV-11), fechamento como RF-COM-06/08 (hoje RF-COM-07/09), substituição como RF-COM-03 (hoje RF-COM-04), entre outros. Todos corrigidos, porque a Etapa 8 confere requisito a requisito e um comentário desatualizado vira uma conferência errada.

### Decisões desta etapa

- **A regra do RF-COM-03 não se aplica à aula excepcional.** Ela fala de "sessão", que no escopo é a aula da grade recorrente (M5), e o RF-AEX-12 condiciona o lançamento da excepcional à finalização da chamada, não ao comparecimento. O valor foi combinado individualmente para aquela aula, que a professora conduziu — um workshop em que só uma aluna apareceu continua gerando a comissão acordada.
- **A aula sem presença não é destacada como erro.** O bloco é neutro, não âmbar: nada deu errado, apenas ninguém foi. O que a tela precisa é lembrar que existe uma decisão a tomar.
- **`presencas` é gravado, não derivado.** Recontar na tela pareceria equivalente e não é: depois de uma correção de chamada, a contagem de hoje deixa de ser a que originou o valor.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. **RF-COM-03**: entrar como **Beatriz Nogueira** (Professora), abrir a chamada pendente de 17/08 e marcar **as duas alunas como ausentes**. Ao finalizar, o toast avisa que nenhuma comissão foi gerada. Em **Meus pagamentos**, o total continua zerado.
3. Entrar como **Camila Duarte** (Administração) → **Comissões**: a aula de 17/08 aparece no bloco "1 aula(s) finalizada(s) sem nenhuma presença", com o nome da professora e a quantidade de faltas, separada do bloco de chamadas não finalizadas.
4. **Comissão regular**: finalizar a chamada de 13/08 (DANÇA) com presenças — R$ 35,00 entram no período.
5. **REL-07**: em **Aulas excepcionais**, criar um workshop com **Beatriz Nogueira** e comissão de R$ 180,00, alocar a **Larissa Prado** e finalizar a chamada. Em **Comissões**, o resumo dela passa a dizer "R$ 35,00 em regulares, R$ 180,00 em excepcionais". Em **Detalhar**, o workshop aparece **com nome e horário**, com selo "Excepcional", a base de cálculo de cada linha e os dois subtotais antes do total.
6. **Exportar CSV** e conferir as colunas **Tipo** e **Base de cálculo**.
7. **Painel da professora**: como Beatriz, em **Meus pagamentos**, as duas aulas aparecem com a base de cálculo — a categoria numa, o valor combinado na outra.
8. **RF-CNV-01**: Administração → **Convênios** → aba **Grade espelhada**. A nota explica que workshops e aulas particulares não são espelhados.
9. **RF-CNV-08**: aba **Relatório do período** — a nota explica que o limite de aulas é do convênio, não do studio.
10. **RF-CNV-09**: na ficha da **Renata Souza** (aluna de convênio), usar **Comprar pacote**. Depois: na aba **Reservas**, as reservas dela passam a trazer "Também tem pacote de créditos no studio"; a ficha mostra a carteira convivendo com o histórico de "reserva pelo convênio"; e, entrando como ela, o painel traz o aviso do parceiro **junto** do saldo e da grade — ela agenda por crédito normalmente.

### Verificação executada

O ciclo foi percorrido no navegador: chamada com duas faltas finalizada sem gerar comissão e destacada no fechamento; comissão regular de R$ 35,00 e excepcional de R$ 180,00 convivendo no mesmo período, com os subtotais corretos e o workshop identificado por nome no detalhamento; e a aluna de convênio comprando pacote, aparecendo marcada na lista de reservas e agendando pelo portal com o aviso do convênio ao lado. `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes.

Um defeito de texto apareceu no teste e foi corrigido: a base de cálculo da aula regular saía como **"Categoria Categoria I"**, porque o nome da categoria cadastrada já traz a palavra e o código a prefixava de novo.

---

## Etapa 7 — o que foi entregue

**Os módulos de superfície.** Os painéis já estavam completos — o administrativo desde a Etapa 2 (sem inadimplência, com créditos em circulação e valor não faturado das bolsas) e o da aluna desde o UX-01/02. O que faltava de fato era o benefício de conversão, que existia como parâmetro e não fazia nada, e dois avisos que o escopo v2.0 criou.

### RF-EXP-08 e PA-04 — o benefício de conversão passou a existir

Os três parâmetros (tipo, quantidade e validade) estavam configuráveis desde a Etapa 1 e não eram lidos por ninguém: quem fazia a aula experimental e comprava um pacote pagava o preço cheio.

A regra vive em `src/hooks/beneficioDeConversao.ts` — módulo próprio, e não junto do M13, porque quem aplica o benefício é a venda, e `aulasExperimentais` já importa de `vendas`: pôr a regra lá fecharia um ciclo entre os dois arquivos.

**Três condições cumulativas** para ter direito: fez uma aula experimental que já aconteceu, está dentro do prazo contado **da aula** (não da compra), e ainda não comprou nenhum pacote desde então. A terceira é o que faz o benefício valer uma vez só — o escopo o concede a quem "adquire um pacote após realizar a aula experimental", não a cada compra futura. Uma venda cancelada não consome o direito; uma pendente sim, porque a compra existe.

**Os dois tipos funcionam:**
- **crédito adicional** soma à quantidade da compra — o extrato registra "Compra do pacote Starter + 1 crédito de bônus da aula experimental", porque a concessão diverge do catálogo e isso precisa estar explicado;
- **desconto no valor** reduz o preço, sem nunca deixá-lo negativo: um benefício maior que o pacote zera a compra em vez de gerar crédito a devolver.

O benefício aparece **antes de confirmar**, nas duas telas de compra — a da aluna e a da administração —, com a data da aula que o originou e até quando vale. Descobri-lo só no extrato seria tarde.

**A quantidade zero desliga o benefício** sem mudança de código: é como a administração o suspende pela tela de parâmetros.

Junto disso, `aplicarCompra` passou a usar os créditos **da venda**, não do catálogo. É onde os números da compra ficam congelados (RF-PAC-01) e onde o bônus já foi somado; ler o pacote de novo na hora de creditar descartaria o benefício e usaria um catálogo que pode ter mudado desde que a venda ficou pendente.

O registro de auditoria da conversão também foi corrigido: ele era gravado em **toda** compra, inclusive de quem nunca fez uma aula experimental. Agora só quem tinha benefício disponível é registrado como conversão.

### RF-NOT-08 e RF-NOT-09 — os dois avisos que faltavam

- **Pacote finalizando.** O status é derivado na leitura, então quem dispara o aviso é a rotina de carteiras — carregar a tela não escreve nada, nem notificação. O aviso sai uma vez por carteira: a rotina reavalia a cada passagem e a `referenciaId` da notificação impede a repetição.
- **Pacote encerrado.** Vai junto com o encerramento, dizendo o motivo — e, no vencimento, quantos créditos foram perdidos. É a informação que a aluna cobra depois.

`Notificacao` ganhou `referenciaId` para isso, e o registro de envios (RF-NOT-14) ficou mais útil de modo geral. A rotina agora reporta quantos avisos enviou.

### Relatórios e realinhamento

- **REL-09**: a exportação de alunas ganhou a coluna de **valor não faturado** da bolsa. A marcação "bolsista" sozinha não atende ao requisito, que pede o valor.
- **Referências do M16 realinhadas ao v2.0**: o módulo é M16 (era M15), a abstração de canal é RF-NOT-13 (era 10) e o registro de envio é RF-NOT-14 (era 11).
- **REL-01 a REL-13 conferidos** contra as telas: os treze têm cobertura. REL-11 (aulas excepcionais) já traz participantes, créditos e comissão; REL-13 (reembolsos) tem tela e exportação desde a Etapa 3; REL-07 saiu na Etapa 6. Nenhum relatório menciona motivos de encerramento de contrato, que saíram com o modelo antigo.
- **RF-PER-03 conferido**: trancamento, ajuste de créditos, bolsa, aulas excepcionais e reembolso vivem apenas sob `/administracao`, protegido por perfil, e nenhuma tela de aluna ou professora oferece caminho de solicitação para eles.

### Decisões desta etapa

- **O prazo do benefício conta da aula, não da compra da experimental.** O PA-04 fala em validade "após a aula experimental", e é a aula que a pessoa experimentou — pagar dois dias antes não deveria encurtar o prazo dela.
- **Venda cancelada não consome o direito ao benefício.** Se a compra não se concretizou, a aluna não usufruiu de nada. Foi assim que o teste conseguiu ser feito: a venda pendente que o gateway recusou foi cancelada, e o direito voltou.
- **A venda manual não aplica benefício.** Ali a administração informa o valor efetivamente cobrado; descontar por cima do valor digitado o descontaria duas vezes.
- **O aviso de "Finalizando" é uma vez por carteira, não por passagem da rotina.** Repetir a cada execução transformaria um aviso útil em ruído, e a aluna deixaria de ler.

### Como testar

1. `npm run dev` e **"Resetar protótipo"**.
2. **Benefício de crédito adicional (padrão do seed)**: em **Parâmetros**, aumente a "Validade do benefício de conversão" para 30 dias. Em **Vendas**, cancele a venda pendente da **Juliana Rocha** (ela fez experimental em 13/08 e a compra recusada bloqueava o direito). Na ficha dela, **Comprar pacote**: o aviso verde mostra o direito a 1 crédito de bônus e a prévia passa de 4 para **5 créditos**. Confirme e veja o extrato: "Compra do pacote Starter + 1 crédito de bônus da aula experimental — +5".
3. **Uma vez só**: abra **Comprar pacote** de novo na mesma aluna — o aviso não aparece mais e a prévia soma só os créditos do pacote.
4. **Benefício de desconto**: em **Parâmetros**, troque o tipo para "Desconto no valor do pacote" e a quantidade para 50. Faça o fluxo público em `/experimental` com uma pessoa nova, escolhendo uma aula **de hoje**, e conclua o pagamento. Entre como ela → **Meu pacote**: o aviso mostra R$ 50,00 de desconto, e ao escolher o Starter o botão diz **"Pagar R$ 170,00"**. O histórico de compras registra R$ 170,00.
5. **RF-NOT-08**: em **Vendas**, "Rodar rotina de carteiras". O toast informa "1 aviso(s) de pacote finalizando" — é a **Patrícia Lima**, com 1 crédito. Em **Notificações**, o envio aparece com o requisito RF-NOT-08 e o texto "Resta apenas 1 crédito…". Rode a rotina de novo: agora são **0 avisos**, porque o aviso não se repete.
6. **RF-NOT-09**: encerre uma carteira (consumindo todos os créditos, ou aguardando o vencimento) e rode a rotina. A notificação de pacote encerrado registra o motivo e, no vencimento, os créditos perdidos.
7. **REL-09**: em **Alunas**, "Exportar CSV" — a coluna "Valor não faturado (bolsa)" traz o valor do pacote das bolsistas.

### Verificação executada

O benefício foi percorrido nos dois tipos: crédito adicional na compra pela administração (4 → 5 créditos, com a origem explicada no extrato) e desconto em valor pelo fluxo público completo — experimental agendada e paga, depois compra do Starter por R$ 170,00 em vez de R$ 220,00. A regra de uma vez só foi confirmada abrindo a compra outra vez na mesma aluna. As duas notificações novas foram disparadas pela rotina e conferidas no registro de envios, incluindo a não-repetição do aviso de "Finalizando". `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes.

Dois defeitos apareceram no teste e foram corrigidos:

- **A deduplicação do aviso de "Finalizando" não funcionava.** A condição casava `destinatarioId` da notificação com o id da **aluna**, mas o campo guarda o id da **usuária** — nunca batia, e o aviso saía de novo a cada rotina. A comparação passou a ser só por evento e carteira, que já identifica a aluna.
- **"Restam apenas 1 crédito"**, em `explicarFinalizando`. O verbo não concordava com a quantidade, justamente no caso mais comum da mensagem. Corrigido também para o prazo ("Falta 1 dia" / "Faltam N dias").

---

## Etapa 8 — o que foi entregue

**A varredura final.** O objetivo era não deixar resíduo do modelo antigo e conferir o protótipo contra o escopo inteiro. A varredura encontrou o código limpo — e a conferência encontrou dois requisitos MVP que ninguém tinha implementado.

### Varredura de vocabulário: limpa

Nenhum resíduo. As oito palavras do modelo antigo foram procuradas em todo o `src/`:

- **"saldo de aulas", "alteração de plano", "suspensão"**: zero ocorrências;
- **"mensalidade", "cobrança recorrente", "inadimplência"**: aparecem apenas em **negações** — no termo de aceite ("Não há cobrança recorrente nem mensalidade automática"), no aviso de pagamento da matrícula e em comentários que explicam o que o modelo novo não tem. É vocabulário correto: afirmam a mudança em vez de arrastá-la;
- **"contrato"**: uma ocorrência, em `notificador.ts`, no sentido de contrato de código ("serve de contrato: evento novo entra aqui junto com a regra que o dispara") — nada a ver com o modelo antigo.

Nenhum tipo, campo `@deprecated` ou chave de seed do modelo antigo sobrou. As 36 chaves do `seed.json` são todas do v2.0.

### Conferência requisito a requisito: dois gaps reais

Os 205 requisitos do capítulo 4 foram cruzados com as citações no código. Trinta apareceram sem menção — a maioria implementada sem comentário citando o RF (cadastro de modalidades, espaços, horário de funcionamento, acúmulo de perfis, inativação de professora, uso do crédito liberado). Cada um foi verificado individualmente. Dois eram gaps de verdade:

**RF-EXC-05 — o motivo da exceção não aparecia para a aluna.** A data de feriado simplesmente sumia da grade: `listarAulasDisponiveis` pulava a data, e a tela dizia "Nenhuma aula nesta data" — a mesma frase de um dia sem sessão cadastrada. A aluna não tinha como distinguir "o studio não abre" de "não há aula neste horário", e um feriado parecia falha do sistema. Agora a grade mostra **"O studio não abre em 07/09/2026 — Feriado da Independência"**.

**RF-PRO-04 — a professora não assinava termo nenhum.** O requisito pede o mesmo mecanismo aplicado às alunas, com o acesso bloqueado até o aceite, e nada disso existia. Foi implementado reaproveitando a estrutura que já havia:

- `TermoAceite` ganhou **`publicoAlvo`**, e cada público tem sua própria sequência de versões. Publicar um termo novo de aluna não pode inativar o que as professoras já aceitaram — sem essa separação, uma publicação invalidaria o aceite do outro grupo.
- A tela de **Termo de aceite** ganhou as abas "Alunas" e "Professoras", com o texto padrão de partida de cada uma.
- **Professora nova nasce aguardando aceite**, aparece assim no login, e o painel dela dá lugar à tela do termo — mesmo desenho do primeiro acesso da aluna. O menu fica reduzido a "Painel" até ela assinar.
- Diferente da aluna, **o aceite sozinho libera o acesso**: não há pagamento nem anamnese a esperar.

### Os 11 fluxos do capítulo 6

Todos executáveis ponta a ponta, e todos foram percorridos no navegador ao longo das etapas. O único que ainda não tinha sido fechado inteiro — **6.11, fechamento de comissão** — foi percorrido nesta etapa: chamada finalizada, período fechado com o aviso das chamadas pendentes, e pagamento registrado.

### Consolidação da documentação

- **`PROGRESSO.md`** ganhou o capítulo "Atualização para o escopo v2.0", com a tabela das 8 etapas, o que saiu do produto, o que passou a existir e a **lista do que ficou fora do escopo com o motivo de cada item** — os marcados "Evolução", os "Em definição" e os que dependem de integração real.
- **`README.md`** ganhou o **glossário do modelo de créditos** (pacote, carteira, as três dimensões do saldo, movimento, Finalizando, venda, categoria de aula, aula excepcional, trancamento, reembolso) e dois padrões de UI que surgiram durante a migração: o aviso que explica em vez de esconder, e a concordância das frases geradas por código.
- **`CLAUDE.md`** registra que a migração está concluída, acrescenta a regra de que carregar tela nunca escreve no banco, e aponta para o glossário.

### Decisões desta etapa

- **Os dois gaps foram implementados, não apenas registrados.** A etapa previa "a lista do que ficou fora e por quê", mas RF-EXC-05 e RF-PRO-04 são MVP e o mecanismo de ambos já existia — deixá-los na lista seria registrar como escolha o que era esquecimento.
- **Termo de professora é texto próprio, não o mesmo da aluna.** Os dois falam de coisas diferentes: um de créditos, validade e cancelamento; o outro de remuneração por aula, apuração mensal e responsabilidade pela chamada.
- **O texto do termo da professora é provisório**, como o da aluna: o definitivo é responsabilidade da cliente (capítulo 12 do escopo).

### Como testar

1. `npm run dev` e **"Resetar protótipo"** — o reset traz o termo da professora, que é chave nova no seed.
2. **RF-EXC-05**: entrar como **Larissa Prado** → **Grade disponível**. Navegar até **07/09/2026** (feriado cadastrado no seed): em vez do dia vazio, a tela informa que o studio não abre e mostra o motivo.
3. **RF-PRO-04**: como **Camila Duarte** (Administração) → **Termo de aceite**. As abas "Alunas" e "Professoras" mostram versões independentes. Em **Professoras** → **Nova professora**, cadastre alguém. No login, ela aparece com "Aguardando aceite do termo"; ao entrar, o painel dá lugar ao termo e o menu fica só com "Painel". Aceite: o acesso abre e o menu completo aparece.
4. **Fluxo 6.11**: finalize uma chamada, vá em **Comissões**, **Fechar período** (a confirmação avisa se há chamadas pendentes) e **Registrar pagamento** — o fechamento passa a "Pago".
5. **Varredura**: `grep -rin "mensalidade\|inadimpl\|cobrança recorrente" src/` — todas as ocorrências devem ser negações.

### Verificação executada

A varredura de vocabulário e a conferência dos 205 requisitos foram feitas sobre o código. No navegador: o motivo do feriado aparecendo na grade da aluna, o ciclo completo do termo da professora (cadastro → login bloqueado → aceite → acesso liberado) e o fechamento de comissão com registro de pagamento. O **"Resetar protótipo" foi verificado** trazendo a chave nova do seed — sem ele, a tela de termos nasceria sem o termo de professora. `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes de fast-refresh.

Um defeito de texto apareceu no teste e foi corrigido: na aba de professoras, o contador de aceites dizia **"0 aluna(s)"**, porque o rótulo estava fixo em vez de acompanhar o público selecionado.

---

## Migração concluída

As 8 etapas do `PLANO_ATUALIZACAO_ESCOPO.md` estão entregues. O protótipo opera inteiramente sobre o escopo v2.0 — pacote de créditos pré-pago com pagamento único —, sem resíduo do modelo de contrato com mensalidade. O panorama consolidado está em `PROGRESSO.md`, no capítulo "Atualização para o escopo v2.0".

---

## Guia do protótipo — o que foi entregue

**Uma tela que ensina a reproduzir o escopo no protótipo**, pedida depois da migração concluída. Quem abre o protótipo pela primeira vez — a cliente, alguém da equipe — não tem como saber que a Patrícia serve para ver o "Finalizando", que o gateway se aprova em Vendas, ou que a rotina de carteiras é um botão. O guia diz isso, por cenário.

### Como é

Rota pública `/guia`, fora da casca do sistema. Chega-se a ela pelo link "Ver o guia de como usar o protótipo" no login e pelo botão **"Guia do protótipo"** no topo de qualquer tela, ao lado de "Resetar protótipo" — as duas ferramentas do protótipo, não do produto. O botão abre em outra aba: o guia fica ao lado enquanto se navega.

A página tem três partes:

1. **Antes de começar** — as oito usuárias de exemplo e o estado de cada uma depois do reset; o que "Resetar protótipo" faz; e o que é simulado (pagamento, e-mail, convênio, rotinas automáticas, datas).
2. **Cenários** — 28, em 8 grupos: como a aluna entra; créditos e carteira; agendar, cancelar e frequentar; workshop e aula particular; quando o studio cancela; trancamento e reembolso; convênios; comissão. A lista mostra só título e uma linha por cenário. Ao abrir: o preparo (quando o estado inicial não basta), os passos numerados, "O que conferir" e as etiquetas de RN, RF e fluxo do capítulo 6.
3. **Busca e filtro** — por texto (título, passos, códigos de regra e requisito) e por perfil.

### A escolha de desenho

**Cada passo diz com quem entrar.** Os fluxos do studio cruzam três perfis — a aluna agenda, a professora faz a chamada, a administração fecha —, e o que trava quem testa é a pergunta "com quem eu entro agora?". A coluna à esquerda dos passos rotula o perfil, mas **só quando ele muda** de um passo para o seguinte: a troca salta aos olhos, e os passos seguidos do mesmo perfil ficam limpos. É a única coisa que a página faz de diferente do resto do sistema, e é informação real do conteúdo, não decoração. Todo o resto usa os tokens, a tipografia e os padrões de tela já existentes.

**O conteúdo é dado.** `src/data/guiaDoPrototipo.ts` tem os grupos, cenários e passos tipados; a página só renderiza. Um cenário novo é uma entrada no arquivo.

**Os cenários escrevem contra o estado pós-reset e evitam datas.** Os dados de exemplo são de agosto de 2026 e o protótipo usa a data real como hoje — um passo que dissesse "abra a aula de 17/08" quebraria em poucas semanas. Onde um cenário precisa de aula futura, ele manda agendar uma. Onde um dado de exemplo já está fora de prazo (a justificativa da Larissa, o benefício da Juliana), o preparo diz o que ajustar.

### Decisões

- **Fora da casca, em outra aba.** Dentro do `AppShell`, o guia carregaria o menu de um perfil que raramente é o do passo atual. Fora dele, e aberto ao lado, ele acompanha a troca de perfil em vez de atrapalhá-la.
- **Vinte e oito cenários, não trinta e oito regras.** As RNs não viram uma lista à parte: cada uma aparece como etiqueta no cenário que a exercita, e a busca por "RN-17" leva a ele. Uma lista de regras com texto seria o documento de escopo de novo, e ele já existe.
- **Persona pelo nome, botão pelo rótulo.** "Entre como Larissa", "clique em Remarcar" — os passos usam as palavras que estão na tela, para que quem lê encontre o que procura sem traduzir.

### Como testar

1. Na tela de login, clique em **"Ver o guia de como usar o protótipo"**. Ou, logada em qualquer perfil, no botão **"Guia do protótipo"** do topo — abre em outra aba.
2. Leia "Antes de começar": as usuárias e o que é simulado.
3. Abra qualquer cenário e siga os passos numa segunda aba. Observe o rótulo de perfil aparecer só quando o perfil troca.
4. Busque **"RN-17"**: sobra só o trancamento. Busque **"experimental"**: sobram dois. Filtre por **Professora**: ficam os cenários em que ela participa.
5. Reduza a janela: os cartões empilham e a coluna do perfil encolhe sem quebrar os passos.

### Verificação executada

A página foi aberta no navegador: lista fechada, cenário aberto com o trilho de perfil (Sem login → Aluna → Professora no da aula experimental), busca por código e por palavra, filtro por perfil. `tsc` sem erros, `vite build` compilando, `oxlint` com os três avisos preexistentes.

---

## Preparação para a v2.1 — cenários prometidos à cliente

Antes de planejar a atualização para o escopo v2.1 (`docs/Escopo Funcional Atualizado v2.1.docx`), três cenários prometidos à cliente foram conferidos no protótipo. Dois estavam incompletos e foram completados; o registro do que existia e do que faltava está na resposta do plano.

- **Termo único com o nome da aluna (RF-ALU-05, PA-05).** O termo era exibido cru, sem identificar quem assina. O texto passou a trazer `{{nome}}` e `{{cpf}}`, mesclados na exibição e no `conteudoAceito` gravado (`mesclarTermo`, em `useTermos.ts`) — na matrícula pelo site, no primeiro acesso e no aceite da professora. A tela de termos explica os placeholders. Continua um termo por versão; a compra seguinte não pede novo aceite.
- **Prorrogação de validade em carteira já encerrada (RF-CRE-09).** O domínio já reabria a carteira, mas a ficha só oferecia "Ajustar créditos" com carteira vigente — quem viu o pacote vencer esperando a fatura não tinha como ser atendida. O botão passou a valer para a carteira mais recente, e o modal abre em "Prorrogar validade" quando ela está encerrada. Ao exercitar o caminho, dois defeitos da reabertura apareceram e foram corrigidos: os créditos dados por perdidos no vencimento voltavam ao saldo sem contrapartida no extrato (agora há uma linha de estorno, e o saldo volta a ser reconstituível — RNF-07), e "encerrada em" continuava na carteira reaberta, porque o PATCH com `undefined` não apaga a chave.
- **Renovação antecipada (RF-CRE-13, PA-10)**: já existia com a regra da validade mais distante. O cenário do guia passou a citar o exemplo literal do escopo e a usar Patrícia Lima como estado equivalente.

O guia (`/guia`) ganhou o cenário "Termo único, com o nome da aluna" e o de ajuste manual passou a cobrir a carteira vencida.
