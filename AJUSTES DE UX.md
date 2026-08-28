# Ajustes de UX

Melhorias de experiência identificadas depois que uma etapa já foi entregue e validada. Não são correções de bug nem mudança de escopo: são decisões de interface que o uso revelou.

Cada item aqui é uma proposta **documentada, ainda não implementada**. Quando for executado, o registro do que foi feito vai para a etapa correspondente em `PROGRESSO_ATUALIZACAO.md`, e o item aqui é marcado como aplicado.

- [x] **UX-01** — "Meu pacote" como página própria no perfil da aluna
- [x] **UX-02** — Grade disponível na tela inicial da aluna

Aplicados. O registro do que foi implementado está em `PROGRESSO_ATUALIZACAO.md`, na seção "Ajuste pós-entrega (UX-01 e UX-02)" ao final da Etapa 2.

Os dois são do mesmo movimento e devem ser executados juntos: o UX-01 libera o espaço nobre do painel, e o UX-02 diz o que entra no lugar. Aplicar só o primeiro deixaria um vazio onde hoje há conteúdo.

---

## UX-01 — "Meu pacote" como página própria no perfil da aluna

**Origem:** Etapa 2 (carteira de créditos e venda avulsa).
**Status:** aplicado. Ver "Como testar" abaixo e o registro em PROGRESSO_ATUALIZACAO.md (Etapa 2, ajuste pós-entrega).

### Como está hoje

O painel da aluna (`/aluna`, em `src/pages/aluna/PainelAlunaPage.tsx`) empilha, numa única tela:

1. Saudação e o `ResumoDoPacote` — disponíveis, reservados, validade e o aviso de "Finalizando";
2. O bloco **"Adquirir mais créditos"** (componente `ComprarPacote`, linha 38), com os três cartões de pacote, forma de pagamento, parcelamento e a prévia da compra;
3. Um eventual aviso de pacote trancado;
4. **Próximas aulas**;
5. **Frequência recente**;
6. **Histórico de compras** (linha 532).

O menu lateral da aluna tem três itens (`NAV_POR_PERFIL.aluna`, em `src/components/layout/AppShell.tsx`): Painel, Grade disponível e Minhas aulas.

### O problema

O bloco de compra ocupa a parte mais nobre da tela inicial — logo abaixo do saldo — para uma ação que a aluna faz **poucas vezes por ciclo**, enquanto empurra para baixo o que ela abre o painel para ver: quando é a próxima aula e quanto ainda pode agendar.

O efeito é duplo. A aluna que entrou para conferir a agenda passa por uma vitrine de pacotes toda vez. E o histórico de compras, que é consulta ocasional, fica no fim de uma página longa, sem relação visual com a compra que o originou.

Há ainda um efeito de tom: a tela inicial da aluna abre falando de dinheiro. O assunto financeiro tem lugar no sistema, mas não é o que ela vem fazer todo dia.

### A mudança

Criar uma página **"Meu pacote"** no menu lateral da aluna, reunindo tudo que é do pacote e do dinheiro:

- o detalhe da carteira (saldo nas três dimensões, validade, status, pacote vigente);
- **Adquirir mais créditos** — o bloco de compra, movido do painel;
- **Histórico de compras** — movido do painel.

O painel deixa de tratar de dinheiro e passa a tratar de aulas (ver UX-02).

### Arquivos afetados

| Arquivo | O que muda |
| --- | --- |
| `src/pages/aluna/MeuPacotePage.tsx` | **Novo.** Recebe o componente `ComprarPacote` e a seção de histórico de compras, hoje em `PainelAlunaPage`. |
| `src/pages/aluna/PainelAlunaPage.tsx` | Perde o bloco de compra e o histórico de compras. Ganha os pontos de entrada descritos abaixo. O fluxo de primeiro acesso (aceite do termo e pagamento) **permanece aqui**. |
| `src/components/layout/AppShell.tsx` | Novo item `{ to: '/aluna/meu-pacote', label: 'Meu pacote' }` em `NAV_POR_PERFIL.aluna`. |
| `src/App.tsx` | Nova rota `meu-pacote` dentro de `/aluna`. |
| `src/pages/aluna/ResumoDoPacote.tsx` | O aviso de "Finalizando" e a mensagem de "nenhum pacote ativo" ganham link para a nova página. |

O componente `ComprarPacote` já é autocontido — carrega os pacotes com `usePacotes`, calcula a prévia com `calcularPreviaDeCompra` e chama `comprarPacoteParaAluna`. A movimentação é um recorte, não uma reescrita.

### Pontos de entrada para a nova página

O ponto central da proposta: a compra deixa de ser oferecida o tempo todo e passa a aparecer **quando a aluna precisa dela**.

**1. Item fixo no menu lateral.** Sempre disponível, sem destaque — é o caminho de quem já sabe o que quer.

**2. Aviso de "Finalizando" vira link.** O `ResumoDoPacote` já mostra a faixa âmbar quando `leitura.motivoFinalizando` está preenchido — poucos créditos ou vencimento próximo, pelos limiares configuráveis. Essa faixa passa a terminar com um link para `/aluna/meu-pacote`, com o texto ajustado ao motivo:

- poucos créditos: *"Restam apenas 2 créditos. **Adquirir mais créditos** →"*
- vencimento próximo: *"Faltam 5 dias para o vencimento. **Renovar meu pacote** →"*

Como o `ResumoDoPacote` aparece no painel **e** na grade disponível, o convite alcança a aluna exatamente no momento em que ela está tentando agendar e o saldo está acabando — que é quando ele é útil em vez de intrusivo.

**3. Aluna sem pacote ativo ganha chamada explícita.** Este é o caso que exige atenção: hoje, quem está sem carteira vê o bloco de compra como caminho principal do painel. Se o bloco simplesmente sair, ela fica sem saída óbvia.

O `ResumoDoPacote` já trata esse estado com a mensagem *"Nenhum pacote ativo. Adquira um pacote no seu painel para voltar a agendar."* Duas mudanças:

- o texto passa a apontar para a página certa — *"Adquira um pacote em **Meu pacote**"*, com link;
- o painel exibe, no lugar onde ficava o bloco de compra, um cartão de chamada única com um botão que leva à página.

Vale o mesmo na **grade disponível**: quando `agenda.bloqueio` é "Nenhum pacote ativo" ou "Saldo de créditos insuficiente", o detalhe do bloqueio ganha o link.

### Decisões tomadas

**A aluna de convênio acessa o sistema como qualquer outra, e o item "Meu pacote" aparece para ela.**

Levantamos o escopo antes de decidir, e a mudança entre as versões é explícita. A v1.0 dizia, no capítulo de atores:

> Aluna de convênio — Agenda e cancela pelo aplicativo do convênio. No sistema do studio, aparece na grade e na lista de presença como qualquer outra aluna, **sem acesso próprio ao portal**.

A v2.0 **removeu essa restrição**:

> Aluna de convênio — Agenda e cancela pelo aplicativo do convênio. Não possui pacote nem créditos no sistema; ocupa vaga na sessão e realiza check-in.

E acrescentou o **RF-CNV-09**: *"Uma mesma pessoa pode possuir pacote de créditos no studio e também utilizar o convênio. Uma condição não bloqueia a outra, e cada agendamento registra sua origem."*

Ou seja: nada no v2.0 impede que uma aluna de convênio compre um pacote, e o requisito novo prevê explicitamente essa convivência. **A origem do cadastro não pode governar o que ela vê.** O item de menu e a página ficam disponíveis para todas, e o conteúdo responde ao que ela tem:

- **sem carteira e sem compras** — a página mostra o bloco de compra, exatamente como para qualquer aluna sem pacote ativo. Se ela veio do convênio e nunca comprou, essa é justamente a tela que a converte;
- **com carteira** — a página mostra a carteira, a compra e o histórico, sem distinção nenhuma.

O que continua específico do convênio é apenas a mensagem do painel explicando que as reservas do convênio acontecem no aplicativo do parceiro (RN-33) — e ela deve passar a conviver com o bloco de agendamento por créditos, em vez de substituí-lo, já que a mesma pessoa pode ter as duas coisas.

**Comprar durante o trancamento fica bloqueado.**

O RF-TRA-04 bloqueia a visualização da grade e o agendamento durante o trancamento. Comprar nesse período faria os créditos entrarem numa carteira congelada e mexeria na validade, que está sob a regra de prorrogação do RF-TRA-02 — o efeito seria imprevisível para a aluna e difícil de explicar.

A página fica acessível, com o bloco de compra **desabilitado** e a explicação de que a aquisição volta a ficar disponível no retorno. Ver a carteira e o histórico continua permitido: não há motivo para esconder da aluna o que é dela.

**O histórico de compras sai da tela inicial.**

O RF-PNL-05 lista o histórico de compras entre os itens do painel da aluna. A leitura adotada é **"no perfil da aluna"**, não "na tela inicial": ele continua acessível a um clique, em "Meu pacote", junto da compra que o originou. O objetivo declarado é não abrir a tela inicial com assunto financeiro.

### Comportamento por estado da aluna

| Estado | Item no menu | Painel | Página "Meu pacote" |
| --- | --- | --- | --- |
| Aguardando aceite | Não aparece — o `AppShell` já reduz o menu a "Painel" enquanto o termo não é aceito (RF-ALU-08) | Fluxo de primeiro acesso, sem alteração | Inacessível, coerente com o menu |
| Com pacote ativo | Sim | Saldo, grade, próximas aulas, frequência | Carteira, compra e histórico |
| Em "Finalizando" | Sim | Igual, com o aviso âmbar levando à página | Igual |
| Sem pacote ativo | Sim | Cartão de chamada com botão para a página | Compra em destaque |
| Trancada | Sim | Aviso de pacote trancado | Carteira e histórico visíveis; compra desabilitada, com explicação |
| De convênio | Sim | Aviso sobre o aplicativo do parceiro, **junto** do conteúdo normal | Conteúdo conforme ela tenha ou não carteira |

### O que não muda

- **O fluxo de primeiro acesso continua no painel.** Aceite do termo, anamnese e pagamento da venda pendente são a única coisa que a aluna pode fazer nesse estado, e o menu já está reduzido a "Painel". Movê-los quebraria isso.
- **A prévia da compra continua igual**, incluindo o aviso da regra do PA-10 quando a validade vigente é mantida.
- **A visibilidade do reembolso continua regida pelo RF-REE-09/10.** O histórico de compras muda de lugar, não de regra: a linha do valor devolvido só aparece para quem teve um reembolso aplicado ao próprio cadastro, e nenhum elemento novo pode sugerir a existência do recurso para quem não teve.
- **O `ResumoDoPacote` continua nas duas telas** (painel e grade), como exige o RF-AGD-02 — saldo e validade visíveis de forma persistente na jornada de agendamento.

### Requisitos do escopo envolvidos

- **RF-PNL-05** (painel da aluna) — histórico de compras passa a viver em "Meu pacote"; ver a decisão acima.
- **RF-AGD-02** — saldo e validade persistentes na jornada: preservado.
- **RF-CRE-16** (prévia da compra) e **RF-EXP-07** (conversão da experimental em pacote): o caminho de compra continua existindo, apenas deixa de ser a primeira coisa da tela.
- **RF-CNV-09** (convivência de pacote e convênio) — base da decisão sobre a aluna de convênio.
- **RF-TRA-04** — base da decisão sobre a compra durante o trancamento.
- **RF-CRE-11** — "nenhum pacote ativo" continua sendo a única mensagem, sem distinguir carteira consumida de vencida.

---

## UX-02 — Grade disponível na tela inicial da aluna

**Origem:** Etapa 2, mesma revisão que originou o UX-01.
**Status:** aplicado. Ver "Como testar" abaixo e o registro em PROGRESSO_ATUALIZACAO.md (Etapa 2, ajuste pós-entrega).

### O problema

Duas coisas, ligadas pelo mesmo espaço da tela.

**A primeira:** com a saída do bloco de compra (UX-01), sobra o lugar mais visível do painel. Ele deve receber a ação que a aluna faz com mais frequência — agendar aula —, não ficar vazio nem ser preenchido por sobra de conteúdo.

**A segunda:** hoje, quando a aluna não tem nenhuma aula marcada, o painel diz apenas:

> Nenhuma aula agendada. **Ver a grade disponível.**

É um texto discreto num bloco vazio. Quem está justamente no estado que mais precisa de ação — sem nada marcado — recebe o convite mais fraco da tela.

### A mudança

**1. A grade disponível ocupa o lugar liberado.** No espaço onde ficava "Adquirir mais créditos", o painel passa a mostrar as aulas que a aluna pode agendar, com o botão de agendar direto ali. É a ação frequente ocupando o lugar nobre, no lugar da ação rara.

**2. O estado vazio de "Próximas aulas" vira orientação.** Quando não há nenhuma aula agendada, o bloco deixa de ser um link discreto e passa a ser um aviso claro, orientando a aluna a marcar uma aula, com botão em vez de texto.

### Arquivos afetados

| Arquivo | O que muda |
| --- | --- |
| `src/pages/aluna/PainelAlunaPage.tsx` | Ganha o bloco de grade no lugar do bloco de compra removido pelo UX-01, e o estado vazio de "Próximas aulas" reescrito. |
| `src/pages/aluna/GradeDaAlunaPage.tsx` | Sem mudança de comportamento; serve de referência do que renderizar no painel. |

O painel já consome `useAgendaDaAluna`, que devolve `disponiveis: AulaDisponivel[]` — a mesma lista que a página de grade usa. O dado necessário já está carregado; falta decidir o recorte a exibir.

### Pontos a definir na execução

- **Qual recorte da grade aparece no painel.** A página completa tem navegador de datas e cobre a janela inteira de agendamento (30 dias por padrão). No painel, a sugestão é mostrar **as próximas aulas disponíveis a partir de hoje**, limitadas a três ou quatro, com um "Ver a grade completa →" ao final. Mostrar a grade inteira duplicaria a página e alongaria de novo o painel — o problema que o UX-01 resolve.
- **O item "Grade disponível" continua no menu.** A recomendação é manter: o painel mostra um recorte para ação rápida, e a página continua sendo onde se navega por data dentro da janela. Remover o item tiraria a navegação por data, que não cabe no painel.
- **Quando a aluna está bloqueada** — sem pacote ativo, saldo insuficiente ou trancada — o bloco de grade do painel deve exibir o mesmo motivo de bloqueio que a página de grade já exibe (`agenda.bloqueio`), com o link para "Meu pacote" quando o caso for de saldo ou de pacote. Não faz sentido listar aulas que ela não pode marcar sem dizer por quê.

### Efeito combinado no painel

Ordem proposta da tela inicial, depois dos dois ajustes:

1. Saudação;
2. `ResumoDoPacote` — saldo, validade e o aviso de "Finalizando" com link para "Meu pacote";
3. Aviso de trancamento, quando houver;
4. **Grade disponível** (recorte) — ou o motivo do bloqueio, com a saída correspondente;
5. **Próximas aulas** — ou, se não houver nenhuma, a orientação para marcar;
6. **Frequência recente**.

Sai da tela inicial: o bloco de compra e o histórico de compras, ambos para "Meu pacote".

### Como testar quando UX-01 e UX-02 forem implementados

1. Entrar como **Larissa Prado** (com pacote ativo): o painel abre com saldo, grade disponível e próximas aulas — **sem** bloco de compra e **sem** histórico de compras. Agendar pelo painel funciona e reserva o crédito.
2. Abrir **Meu pacote**: carteira, bloco de compra com a prévia funcionando e histórico de compras.
3. Entrar como **Patrícia Lima** (carteira em "Finalizando", 1 crédito): a faixa âmbar aparece no painel **e** na grade disponível, terminando com o link para "Meu pacote".
4. Entrar como uma aluna **sem pacote ativo** (Aline Martins, carteira expirada): o painel mostra o cartão de chamada com botão para a página, o bloco de grade exibe o motivo do bloqueio, e a grade disponível mostra o mesmo com link.
5. **Cancelar todas as aulas** de uma aluna e conferir que "Próximas aulas" exibe a orientação com botão, e não o link discreto de hoje.
6. Entrar como **Fernanda Alves** (aguardando aceite): o menu continua reduzido a "Painel", e o fluxo de aceite e pagamento segue inalterado.
7. Entrar como **Renata Souza** (convênio): o item "Meu pacote" aparece; a página oferece a compra, já que ela não tem carteira; o painel mostra o aviso sobre o aplicativo do parceiro **junto** do conteúdo normal, não no lugar dele.
8. **Trancar** o pacote de uma aluna pela administração e conferir, no perfil dela, que "Meu pacote" mostra carteira e histórico com a compra desabilitada e explicada.
9. Conferir que nenhuma tela da aluna passou a mencionar reembolso para quem não teve um aplicado (RF-REE-09/10).
