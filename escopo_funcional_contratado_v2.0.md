> **DOCUMENTO SUBSTITUÍDO — NÃO USAR COMO REFERÊNCIA DE DESENVOLVIMENTO**
>
> Esta é a versão 2.0 do escopo, de 25/08/2026. Foi substituída pela versão 2.1 (19/09/2026),
> que está em [`escopo_funcional_contratado.md`](./escopo_funcional_contratado.md) e é a única
> fonte da verdade do projeto.
>
> A v2.1 incorpora a devolutiva da cliente sobre a v2.0 (28/08/2026): pendência de aceite sem
> bloqueio de agendamento (RF-ALU-08), relação preservada de alunas em cancelamento pelo estúdio
> com aviso por WhatsApp (RF-CPR-09), consulta da professora à ficha da aluna (RF-PRE-09),
> participante sem cadastro e convênio pagando à parte em aula excepcional (RF-AEX-06/11),
> comprovante do fechamento de comissão (RF-COM-09), prévia de reembolso com dias decorridos
> (RF-REE-03/07), indicadores de retenção e frequência de professora (RF-PNL-07), TotalPass em
> contingência manual (RF-CNV-14, EV-21) e busca de alunas por telefone (RF-ALU-10) — nenhuma
> regra de negócio foi renumerada (RN-01 a RN-38 mantêm os mesmos ids). O plano da migração está
> em [`PLANO_ATUALIZACAO_V21.md`](./PLANO_ATUALIZACAO_V21.md) e o progresso em
> [`PROGRESSO_ATUALIZACAO_V21.md`](./PROGRESSO_ATUALIZACAO_V21.md).
>
> Este arquivo permanece no repositório apenas como registro histórico, para consultar o que
> mudou e justificar remoções.

**ESCOPO FUNCIONAL ATUALIZADO**

Sistema de Gestão do Studio — Fase 1

Documento de referência para validação, desenvolvimento e aceite do projeto

| **Campo** | **Valor** |
| --- | --- |
| Versão | 2.0 — Para validação |
| Data de emissão | 25/08/2026 |
| Status | Aguardando validação da cliente |
| Elaboração | FGC Digital |
| Fontes | Levantamento de regras de negócio; reunião de validação de 13/08/2026; Modelo de Comercialização e Controle de Pacotes; definições da cliente por áudio e mensagem; protótipo navegável da Fase 1 |

> **Papel deste documento**
>
> **Fonte única da verdade.** Durante o desenvolvimento, este documento prevalece sobre conversas informais, mensagens e demais registros. Dúvidas de escopo são resolvidas aqui.
>
> **Critério de entrega.** O projeto será considerado ENTREGUE quando todos os requisitos com prioridade MVP estiverem implementados, testados e validados conforme o capítulo 15.
>
> **Limite de escopo.** Tudo que não estiver descrito aqui é considerado fora de escopo desta contratação, incluindo os itens do capítulo 12.
>
> **Pontos em aberto.** Os itens do capítulo 14 devem ser resolvidos antes do início do desenvolvimento do módulo correspondente. Cada um traz uma sugestão da FGC Digital.

| **Marcação** | **Significado** |
| --- | --- |
| MVP | Obrigatório para o aceite desta contratação. |
| Importante | Incluído nesta contratação, podendo ser entregue em incremento posterior. |
| Evolução | Fora desta contratação. Registrado no capítulo 12. |
| Em definição | Depende de definição pendente. Consolidado no capítulo 14. |

# 1. Introdução e Objetivo

Este documento define, de forma completa e verificável, o sistema de gestão a ser desenvolvido para o studio. O sistema centraliza cadastro de alunas, comercialização de pacotes de créditos, agendamento de aulas, registro de presença, apuração de comissão das professoras e integração com os convênios corporativos em uma única aplicação, acessível por navegador em computador e celular.

## 1.1 Objetivos de negócio

- Comercializar o acesso às aulas por meio de **pacotes de créditos pré-pagos**, com pagamento único no ato da compra e validade definida por pacote.
- Permitir que a aluna utilize seus créditos com autonomia, escolhendo livremente quando e em quais aulas irá gastá-los, respeitando as regras de antecedência e a validade do pacote.
- Controlar de forma precisa o saldo de créditos, distinguindo o que está disponível, o que está reservado em agendamentos futuros e o que já foi consumido.
- Preservar a integração com Wellhub e TotalPass, responsável por parcela relevante da ocupação das turmas.
- Oferecer trancamento de pacote com congelamento e prorrogação automática da validade.
- Apurar automaticamente a comissão das professoras a partir do registro de presença, com fechamento mensal conferível antes do pagamento.
- Comercializar workshops e aulas particulares com custo próprio em créditos, sob controle da administração.
- Manter visibilidade sobre ocupação das turmas, receita, pacotes a vencer e conversão de aulas experimentais.

## 1.2 Características da operação

- Um único espaço físico em operação, sem previsão de expansão no curto prazo.
- Modalidades de pole dance e correlatas, com capacidade variável por modalidade em função do equipamento utilizado.
- Aproximadamente 20 alunas ativas provenientes de Wellhub e TotalPass, com cerca de 100 check-ins mensais.
- Comissão paga mensalmente, até o quinto dia útil do mês seguinte.
- Aula experimental cobrada, valor único, independente da modalidade.
- A proprietária acumula a administração do studio e a condução de aulas.

# 2. Visão Geral do Escopo

A Fase 1 é composta pelos módulos abaixo. Todos os requisitos do capítulo 5 pertencem a um destes módulos.

| **#** | **Módulo** | **Resumo** |
| --- | --- | --- |
| **M1** | Configuração Base | Modalidades com capacidade, espaços, horário de funcionamento, categorias de aula com custo em créditos e parâmetros operacionais configuráveis. |
| **M2** | Cadastro de Alunas | Cadastro administrativo, auto-matrícula pelo site, termo de aceite digital, ficha de anamnese e ficha da aluna. |
| **M3** | Pacotes e Créditos | Catálogo de pacotes, carteira de créditos, validade, status, renovação antecipada, trancamento, bolsa e histórico. |
| **M4** | Professoras e Categorias | Cadastro de professoras, categorias com valor por aula e termo de aceite. |
| **M5** | Grade de Horários | Cadastro de sessões regulares recorrentes, validação de conflitos, alteração e exclusão com impacto controlado. |
| **M6** | Calendário de Exceções | Feriados, recessos e fechamentos, com cancelamento automático das sessões e devolução de créditos. |
| **M7** | Agendamento de Aulas Regulares | Reserva de vaga pela aluna dentro da janela de agendamento, com reserva de créditos e regras de disponibilidade. |
| **M8** | Cancelamento e Justificativa | Cancelamento pela aluna com regra de antecedência, justificativa de falta e cancelamento pela professora com aprovação da administração. |
| **M9** | Aulas Excepcionais | Workshops e aulas particulares criados pela administração, fora da grade regular, com alocação manual de alunas. |
| **M10** | Presença e Chamada | Registro de presença pela professora, correção dentro do prazo e histórico de frequência. |
| **M11** | Comissão e Fechamento | Geração automática de comissão, fechamento mensal e registro de pagamento. |
| **M12** | Vendas, Pagamentos e Reembolso | Venda de pacotes com pagamento único, formas de pagamento, confirmação, reembolso e histórico financeiro. |
| **M13** | Aula Experimental | Agendamento e pagamento de aula experimental, com limite por modalidade e conversão em pacote. |
| **M14** | Convênios Corporativos | Integração com Wellhub e TotalPass: espelhamento da grade, recebimento de reservas, validação de check-in e conciliação. |
| **M15** | Painéis e Indicadores | Painel administrativo, painel da professora e painel da aluna. |
| **M16** | Notificações | Comunicações transacionais por e-mail, com arquitetura preparada para WhatsApp na Fase 2. |
| **M17** | Perfis e Permissões | Perfis de acesso de administração, professora e aluna. |

# 3. Atores e Perfis de Acesso

| **Ator** | **Papel no sistema** |
| --- | --- |
| Administração | Acesso completo: configuração do studio, cadastros, pacotes e créditos, grade, calendário de exceções, aulas excepcionais, aprovações, trancamento, vendas e reembolsos, comissão, convênios e painéis. |
| Professora | Consulta às próprias sessões, registro e correção de presença, solicitação de cancelamento de sessão e acompanhamento dos próprios ganhos. |
| Aluna | Consulta à grade disponível, agendamento e cancelamento das próprias aulas regulares, envio de justificativa de falta, compra de pacotes, consulta ao próprio saldo de créditos, validade, histórico de frequência e histórico de compras. |
| Aluna de convênio | Agenda e cancela pelo aplicativo do convênio. Não possui pacote nem créditos no sistema; ocupa vaga na sessão e realiza check-in. |
| Interessada (visitante) | Acesso público ao fluxo de matrícula e ao agendamento de aula experimental, sem autenticação prévia. |

A proprietária acumula os perfis de Administração e Professora. O sistema permite que um mesmo usuário possua mais de um perfil, alternando o contexto de navegação sem necessidade de segundo cadastro.

# 4. Requisitos Funcionais

**Prioridades:** MVP = obrigatório para o aceite; Importante = incluído na contratação, podendo ser entregue em incremento posterior; Evolução = fora desta contratação; Em definição = depende de definição pendente (capítulo 14).

## 4.1 M1 — Configuração Base

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CFG-01** | Cadastro de modalidades | Cadastro das modalidades oferecidas, com nome único e capacidade máxima de alunas. Nomes normalizados em maiúsculas e duplicidade bloqueada. Modalidade vinculada a sessões ativas não pode ser excluída, apenas inativada. | MVP |
| **RF-CFG-02** | Capacidade por modalidade | A capacidade máxima é definida na modalidade, refletindo a limitação por equipamento. A sessão herda a capacidade da modalidade, com possibilidade de ajuste pontual. | MVP |
| **RF-CFG-03** | Cadastro de espaços | Cadastro opcional de espaços do studio, utilizado para validação de conflito quando houver mais de um espaço em operação. | MVP |
| **RF-CFG-04** | Horário de funcionamento | Configuração dos dias da semana e da faixa de horário em que o studio opera. Sessões regulares não podem ser criadas fora dessa faixa. | MVP |
| **RF-CFG-05** | Categorias de aula e custo em créditos | Cadastro das categorias de aula com o respectivo custo em créditos. Valores iniciais: aula regular = 1 crédito; workshop = 2 créditos; aula particular = 4 créditos. A administração pode alterar os custos e cadastrar novas categorias sem intervenção técnica. | MVP |
| **RF-CFG-06** | Parâmetros operacionais | Tela única de parâmetros configuráveis pela administração: janela de agendamento para alunas com pacote, janela para alunas de convênio, antecedência mínima de cancelamento, prazo de correção de chamada, dias de prorrogação por cancelamento do studio, limite de aulas experimentais, valor da aula experimental, prazo para envio de justificativa, limiares do status Finalizando e antecedências dos avisos. | MVP |
| **RF-CFG-07** | Dados do studio | Cadastro dos dados de identificação do studio (nome, contato, endereço), utilizados nas comunicações automáticas e no termo de aceite. | MVP |

> **Decisão de interface**
>
> A tela de parâmetros exibe, ao lado de cada campo, uma frase em linguagem natural com o efeito prático do valor informado. Exemplo: ao definir a janela de agendamento em 15 dias, o sistema exibe "A aluna enxerga a grade até 15 dias à frente". O objetivo é permitir que a administração ajuste regras sem depender de suporte.

## 4.2 M2 — Cadastro de Alunas

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-ALU-01** | Cadastro administrativo | Cadastro de aluna pela administração com nome, e-mail, CPF, telefone, data de nascimento e contato de emergência. E-mail e CPF são únicos e a duplicidade é bloqueada com mensagem que orienta a localizar o cadastro existente. | MVP |
| **RF-ALU-02** | Atribuição de pacote no cadastro | Na mesma tela de cadastro é possível selecionar o pacote a ser adquirido e registrar a condição de bolsista, sem navegar para outra área. | MVP |
| **RF-ALU-03** | Envio de acesso | Ao concluir o cadastro, o sistema envia e-mail com credencial de primeiro acesso, informação dos créditos disponíveis e orientação para assinatura do termo de aceite. | MVP |
| **RF-ALU-04** | Matrícula pelo site | Link público no qual a interessada preenche seus dados, escolhe o pacote, aceita o termo, preenche a ficha de anamnese, efetua o pagamento e agenda a primeira aula em fluxo único. O acesso é liberado automaticamente após a confirmação do pagamento, sem aprovação manual. | MVP |
| **RF-ALU-05** | Termo de aceite digital | Exibição do termo de prestação de serviço com aceite explícito. O sistema registra identidade do usuário, data, hora, endereço IP e o conteúdo integral da versão aceita. | MVP |
| **RF-ALU-06** | Versionamento do termo | O termo é versionado. Alterações geram nova versão e o sistema identifica qual versão cada usuária aceitou, mantendo o histórico. | MVP |
| **RF-ALU-07** | Ficha de anamnese | Questionário de saúde apresentado junto ao termo de aceite, com respostas autodeclaradas pela aluna. Não há validação ou aprovação pela administração. As respostas ficam registradas na ficha da aluna. | MVP |
| **RF-ALU-08** | Bloqueio até o aceite | O acesso ao agendamento permanece bloqueado até que o termo seja aceito e a anamnese preenchida. A aluna nessa condição aparece na lista com situação "aguardando aceite". | MVP |
| **RF-ALU-09** | Ficha da aluna | Visão consolidada: dados cadastrais, respostas da anamnese, pacote vigente, saldo de créditos, validade, histórico de frequência, histórico de compras e histórico de pacotes. | MVP |
| **RF-ALU-10** | Lista de alunas | Listagem com busca por nome e filtros por situação (com pacote ativo, sem pacote ativo, trancada, aguardando aceite), por pacote a vencer e por condição de bolsista. | MVP |
| **RF-ALU-11** | Conteúdo da anamnese | Definição das perguntas que compõem o questionário de saúde. | Em definição |
| **RF-ALU-12** | Anexo do contrato assinado | Quando o contrato jurídico estiver disponível, possibilidade de anexar o documento à versão do termo, mantendo o mesmo fluxo de aceite dentro do sistema. | Importante |

## 4.3 M3 — Pacotes e Créditos

O acesso às aulas é comercializado por meio de **pacotes de créditos pré-pagos**. A aluna compra um pacote com quantidade definida de créditos e prazo de validade, e utiliza esses créditos livremente dentro do prazo, conforme o custo de cada categoria de aula.

### 4.3.1 Catálogo de pacotes

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-PAC-01** | Cadastro de pacotes | Cadastro de pacotes com nome, quantidade de créditos, validade em dias, valor e situação. Os valores podem ser alterados a qualquer momento sem impacto nos pacotes já adquiridos. | MVP |
| **RF-PAC-02** | Acesso universal a modalidades | Qualquer pacote dá acesso a todas as modalidades ofertadas, sem restrição por tipo de aula. O que diferencia o uso é o custo em créditos de cada categoria. | MVP |
| **RF-PAC-03** | Inativação de pacote | Pacote pode ser inativado para novas vendas sem afetar as carteiras já ativas que o originaram. | MVP |

Pacotes iniciais previstos, alteráveis pela administração:

| **Pacote** | **Créditos** | **Validade** |
| --- | --- | --- |
| Starter | 4 | 45 dias |
| Flow | 12 | 90 dias |
| Premium | 24 | 180 dias |

### 4.3.2 Carteira de créditos

A **carteira de créditos** é o saldo vivo da aluna. Ela nasce na primeira compra e é alimentada pelas compras seguintes, mantendo sempre uma única validade corrente.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CRE-01** | Ativação da carteira | A carteira é ativada após a confirmação do pagamento, o aceite do termo e o preenchimento da anamnese. Antes disso, os créditos existem mas não permitem agendamento. | MVP |
| **RF-CRE-02** | Composição do saldo | O saldo é composto por créditos totais, créditos reservados em agendamentos futuros e créditos já utilizados. O disponível para agendamento é: totais menos utilizados menos reservados. | MVP |
| **RF-CRE-03** | Reserva no agendamento | O agendamento de uma aula reserva a quantidade de créditos correspondente à categoria daquela aula. A reserva bloqueia o crédito, mas ainda não o consome. | MVP |
| **RF-CRE-04** | Liberação da reserva | Cancelamento realizado dentro da antecedência mínima libera os créditos reservados, que voltam a ficar disponíveis. | MVP |
| **RF-CRE-05** | Consumo do crédito | Os créditos reservados convertem-se em utilizados quando ocorrer: presença confirmada na chamada; cancelamento realizado fora da antecedência mínima; ou ausência sem justificativa aprovada. | MVP |
| **RF-CRE-06** | Bloqueio por saldo | O agendamento é bloqueado quando o saldo disponível for insuficiente para o custo da aula pretendida, com mensagem orientando a aquisição de novo pacote. | MVP |
| **RF-CRE-07** | Bloqueio por validade | O agendamento é bloqueado para datas posteriores à validade da carteira. | MVP |
| **RF-CRE-08** | Histórico de movimentos | Todo movimento de crédito é registrado com data, tipo (concessão, reserva, liberação, consumo, expiração, estorno ou ajuste), quantidade, origem e autor. | MVP |
| **RF-CRE-09** | Ajuste administrativo | A administração pode conceder créditos, estornar créditos utilizados e prorrogar a validade de uma carteira, inclusive de carteira já encerrada, sempre com registro de motivo e autor. | MVP |

### 4.3.3 Validade e status

A carteira permanece ativa enquanto houver créditos disponíveis e a validade não tiver expirado. O encerramento ocorre no primeiro dos dois eventos.

| **Status** | **Quando ocorre** | **Efeito** |
| --- | --- | --- |
| Ativo | Há créditos disponíveis e a validade não expirou. | Permite agendamentos normalmente. |
| Finalizando | Restam poucos créditos ou faltam poucos dias para o vencimento. Limiares configuráveis; valores de referência: até 2 créditos ou até 7 dias. | Informativo. Coexiste com o status Ativo e permite agendamentos normalmente. Dispara lembretes automáticos. |
| Consumido | Todos os créditos foram utilizados antes do vencimento. | Não permite novos agendamentos. A aluna passa a ser exibida como sem pacote ativo. |
| Expirado | A validade foi atingida com créditos remanescentes. | Créditos remanescentes são perdidos. Não permite novos agendamentos. A aluna passa a ser exibida como sem pacote ativo. |

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CRE-10** | Encerramento automático | O sistema encerra a carteira automaticamente quando os créditos se esgotam ou quando a validade é atingida, registrando o motivo do encerramento. | MVP |
| **RF-CRE-11** | Exibição sem pacote ativo | Não há diferença visual entre carteira encerrada por consumo total e por vencimento. Em ambos os casos o sistema exibe "Nenhum pacote ativo", bloqueia novos agendamentos e oferece a aquisição de um novo pacote. | MVP |
| **RF-CRE-12** | Exibição do saldo | Com pacote ativo, a aluna visualiza nome do pacote, créditos totais, utilizados, reservados e disponíveis, e a data de vencimento. O sistema também exibe o custo em créditos de cada categoria de aula. | MVP |

### 4.3.4 Renovação antecipada e nova compra

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CRE-13** | Renovação antecipada | Quando a aluna adquire um novo pacote antes do encerramento da carteira vigente, os créditos restantes são somados aos créditos do novo pacote, a validade anterior é descartada e passa a valer uma validade única, contada a partir da ativação do novo pacote. | MVP |
| **RF-CRE-14** | Compra após encerramento | Quando a aluna adquire um pacote depois que a carteira anterior foi consumida ou expirou, é criada uma carteira nova e independente. Créditos de carteiras encerradas não são somados. | MVP |
| **RF-CRE-15** | Carteira única | A aluna possui no máximo uma carteira ativa por vez. Toda nova compra ou é absorvida pela carteira vigente (RF-CRE-13) ou inicia uma nova (RF-CRE-14). | MVP |
| **RF-CRE-16** | Prévia da compra | Antes de confirmar a compra, o sistema exibe o saldo resultante e a nova data de validade, deixando claro o efeito da operação sobre a carteira vigente. | MVP |
| **RF-CRE-17** | Sem renovação automática | Não há renovação automática para pacotes pagos. Encerrada a carteira, a aluna precisa adquirir um novo pacote para continuar agendando. | MVP |

> **Exemplo de renovação antecipada**
>
> Restam 3 créditos com validade até 10/10. Em 01/10 a aluna adquire o pacote Flow, de 12 créditos e 90 dias de validade.
>
> Resultado: saldo total de 15 créditos e validade única em 30/12, contada a partir de 01/10.

### 4.3.5 Bolsa

A aluna bolsista utiliza o sistema exatamente como qualquer outra: possui carteira, agenda, cancela e está sujeita às mesmas regras de antecedência e validade. O que muda é apenas a dimensão financeira.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-BOL-01** | Marcação de bolsista | No cadastro da aluna, a administração pode marcá-la como bolsista e escolher qual pacote lhe será atribuído. A condição é da aluna, não do pacote — qualquer pacote do catálogo pode ser concedido. Recurso exclusivo do perfil de administração. | MVP |
| **RF-BOL-02** | Isenção total | Na Fase 1 a bolsa é sempre de 100%. Nenhuma cobrança é gerada e nenhum pagamento é exigido para ativar a carteira. | MVP |
| **RF-BOL-03** | Renovação automática da bolsa | A carteira da aluna bolsista é renovada automaticamente ao ser encerrada, com o mesmo pacote concedido, sem geração de cobrança e sem ação da aluna. | MVP |
| **RF-BOL-04** | Paridade operacional | A aluna bolsista agenda, cancela, perde crédito em cancelamento fora do prazo, pode enviar justificativa e visualiza histórico de frequência, sem qualquer distinção operacional. | MVP |
| **RF-BOL-05** | Alteração e revogação | A administração pode alterar o pacote concedido ou revogar a bolsa a qualquer momento. A revogação vale a partir do encerramento da carteira vigente, sem efeito retroativo. | MVP |
| **RF-BOL-06** | Registro de concessão | Toda concessão, alteração ou revogação registra autor, data, pacote e motivo. | MVP |
| **RF-BOL-07** | Identificação na ficha | A condição de bolsista é exibida na ficha da aluna e na lista de alunas, com filtro específico. | MVP |
| **RF-BOL-08** | Indicador de isenção | O painel administrativo apresenta a quantidade de alunas bolsistas ativas e o valor mensal não faturado em razão das isenções. | Importante |
| **RF-BOL-09** | Desconto parcial | Concessão de desconto percentual sobre o valor do pacote, no ato da venda, em alternativa à isenção total. | Evolução |

### 4.3.6 Trancamento

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-TRA-01** | Trancamento de carteira | A administração pode trancar a carteira de uma aluna informando data de início, data de término prevista e motivo. Recurso exclusivo do perfil de administração. | MVP |
| **RF-TRA-02** | Congelamento da validade | Durante o trancamento a contagem da validade fica congelada. Ao final, a data de vencimento é prorrogada automaticamente pelo número de dias em que a carteira ficou trancada. | MVP |
| **RF-TRA-03** | Duração definida na concessão | A duração do trancamento é definida pela administração no próprio formulário de concessão, caso a caso. O sistema não impõe teto de dias nem exige configuração prévia. | MVP |
| **RF-TRA-04** | Bloqueio durante o trancamento | Aluna com carteira trancada não visualiza a grade nem agenda aulas. Aulas já agendadas para o período são canceladas e os créditos reservados são devolvidos ao saldo disponível. | MVP |
| **RF-TRA-05** | Prévia do efeito | Antes de confirmar, o sistema exibe o saldo que será congelado, a validade atual, a validade projetada no retorno e as aulas que serão canceladas. | MVP |
| **RF-TRA-06** | Registro do trancamento | O sistema registra data de início, data de término, motivo, quantidade de dias prorrogados e autor da operação. | MVP |
| **RF-TRA-07** | Informações de apoio à decisão | Na tela de trancamento, o sistema apresenta o pacote da aluna, o saldo de créditos, a validade atual e o histórico de trancamentos anteriores. | MVP |

> **Decisão de escopo**
>
> O trancamento é um controle administrativo de mediação: a administração arbitra, caso a caso e a partir da solicitação da aluna, se concede a pausa e por quantos dias. O sistema não impõe teto nem tabela de dias por pacote.
>
> A tela de concessão apresenta o pacote, o saldo, a validade e o histórico de trancamentos anteriores da aluna para embasar a decisão. Como o recurso é exclusivo do perfil de administração e toda concessão fica registrada com autor e motivo, o controle é exercido pelo critério de quem concede, sem necessidade de um limite configurado previamente que precisaria ser alterado a cada exceção.

### 4.3.7 Histórico de pacotes

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-HIS-01** | Histórico permanente | Mesmo após encerrada, a carteira permanece no histórico da aluna contendo data de contratação, data de ativação, créditos adquiridos, créditos utilizados, créditos expirados, data e motivo do encerramento, valor pago, forma de pagamento, registros de trancamento e eventuais ajustes administrativos. | MVP |

## 4.4 M4 — Professoras e Categorias

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-PRO-01** | Cadastro de professoras | Cadastro de professoras como prestadoras de serviço, com dados cadastrais, categoria vigente e acesso ao sistema. | MVP |
| **RF-PRO-02** | Categorias de professora | Cadastro de categorias com nome e valor por aula regular. A quantidade de categorias e os valores são livremente configuráveis pela administração. | MVP |
| **RF-PRO-03** | Vínculo e histórico de categoria | Cada professora possui uma categoria vigente. A alteração registra data de vigência e preserva o histórico, sem efeito retroativo sobre comissões já apuradas. | MVP |
| **RF-PRO-04** | Termo de aceite da professora | A professora assina termo de aceite no sistema, com o mesmo mecanismo de registro aplicado às alunas. O acesso permanece bloqueado até o aceite. | MVP |
| **RF-PRO-05** | Inativação de professora | Professora pode ser inativada. A inativação é bloqueada enquanto houver sessões futuras atribuídas a ela, com orientação para reatribuição. | MVP |

## 4.5 M5 — Grade de Horários

A grade contempla apenas as **aulas regulares**, que são recorrentes. Workshops e aulas particulares não fazem parte da grade e são tratados no M9.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-GRD-01** | Cadastro de sessão | Cadastro de sessão regular recorrente com modalidade, professora, espaço, dias da semana, horário de início e término, capacidade herdada da modalidade, data de início, data de término opcional e descrição. | MVP |
| **RF-GRD-02** | Múltiplos horários por sessão | O cadastro permite informar vários dias e horários em uma única operação, com validação individual de cada faixa. | MVP |
| **RF-GRD-03** | Validação de conflito de professora | O sistema bloqueia a criação ou alteração quando a professora já possui outra sessão no mesmo dia e horário, informando qual sessão gera o conflito. | MVP |
| **RF-GRD-04** | Validação de conflito de espaço | O sistema bloqueia a criação ou alteração quando o espaço já está ocupado no mesmo dia e horário, incluindo ocupação por aula excepcional. | MVP |
| **RF-GRD-05** | Validação de funcionamento | A sessão não pode ser criada fora dos dias e da faixa de horário de funcionamento do studio. | MVP |
| **RF-GRD-06** | Visão semanal da grade | Visualização em calendário semanal com as sessões posicionadas por dia e horário, exibindo modalidade, horário, espaço, professora e ocupação atual sobre a capacidade. | MVP |
| **RF-GRD-07** | Alteração com alunas agendadas | Alteração de sessão com alunas agendadas exige confirmação explícita, exibindo previamente quantas alunas serão afetadas e o tratamento dos créditos. | MVP |
| **RF-GRD-08** | Exclusão de sessão | A exclusão de sessão com alunas agendadas cancela os agendamentos futuros, devolve os créditos reservados, prorroga a validade das carteiras afetadas e dispara notificação. | MVP |
| **RF-GRD-09** | Encerramento de sessão | Definição de data de término para retirar a sessão da grade a partir de determinada data, sem excluir o histórico de aulas realizadas. | MVP |
| **RF-GRD-10** | Respeito ao calendário de exceções | Sessões não são ofertadas em datas marcadas como exceção no calendário. | MVP |

## 4.6 M6 — Calendário de Exceções

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-EXC-01** | Cadastro de exceção | Cadastro de datas em que o studio não opera, com tipo (feriado, recesso, manutenção, fechamento) e descrição. | MVP |
| **RF-EXC-02** | Seleção de período | O calendário permite navegação por mês e ano, exibindo as exceções já cadastradas. | MVP |
| **RF-EXC-03** | Prévia de impacto | Antes de confirmar, o sistema exibe as sessões que serão canceladas e as alunas agendadas afetadas. | MVP |
| **RF-EXC-04** | Cancelamento automático | A confirmação cancela todas as sessões da data, devolve os créditos reservados, prorroga a validade das carteiras afetadas e dispara notificação. | MVP |
| **RF-EXC-05** | Exibição do motivo | O motivo da exceção é exibido à aluna na grade, para que ela compreenda a indisponibilidade da data. | MVP |
| **RF-EXC-06** | Bloqueio de agendamento | Datas marcadas como exceção não aparecem como disponíveis para agendamento. | MVP |
| **RF-EXC-07** | Remoção de exceção | Exceção pode ser removida enquanto a data for futura. As sessões voltam a ficar disponíveis, sem restabelecimento automático dos agendamentos cancelados. | MVP |

> **Definido com a cliente**
>
> Quando houver aula em data de feriado, a exceção simplesmente não é cadastrada. Para cancelar apenas a sessão de uma professora específica naquela data, utiliza-se o fluxo de cancelamento de sessão, não o calendário de exceções.

## 4.7 M7 — Agendamento de Aulas Regulares

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-AGD-01** | Grade disponível para a aluna | A aluna visualiza as sessões disponíveis dentro da janela de agendamento, com modalidade, data, horário, professora, vagas restantes e o custo em créditos da aula. | MVP |
| **RF-AGD-02** | Saldo visível na jornada | O saldo de créditos disponíveis e a data de validade permanecem visíveis de forma persistente no painel da aluna e na tela de grade. | MVP |
| **RF-AGD-03** | Janela de agendamento diferenciada | A janela de agendamento é configurável e admite valores distintos para alunas com pacote e para alunas de convênio, permitindo priorizar o acesso das alunas com pacote. | MVP |
| **RF-AGD-04** | Reserva de vaga | O agendamento reserva a vaga e reserva os créditos correspondentes no momento da confirmação. | MVP |
| **RF-AGD-05** | Validação de saldo e validade | O agendamento é bloqueado quando o saldo disponível é insuficiente ou quando a data pretendida é posterior à validade da carteira. | MVP |
| **RF-AGD-06** | Validação de capacidade | O agendamento é bloqueado quando a sessão atinge a capacidade da modalidade, com indicação de que a lista de espera estará disponível em fase futura. | MVP |
| **RF-AGD-07** | Bloqueio por trancamento | Aluna com carteira trancada não visualiza a grade para agendamento. | MVP |
| **RF-AGD-08** | Agendamento pela administração | A administração pode agendar, cancelar e remarcar aulas em nome de qualquer aluna, com registro de autoria. | MVP |
| **RF-AGD-09** | Reagendamento livre | A aluna pode cancelar e reagendar quantas vezes desejar dentro da validade da carteira, inclusive para outra sessão no mesmo dia, desde que haja vaga e saldo. | MVP |
| **RF-AGD-10** | Agendamento na matrícula | No fluxo de matrícula pelo site, a aluna agenda a primeira aula imediatamente após a confirmação do pagamento. | MVP |
| **RF-AGD-11** | Confirmação de agendamento | Após o agendamento, o sistema exibe o novo saldo disponível, a regra de cancelamento aplicável e envia confirmação por e-mail. | MVP |

> **Decisão de escopo**
>
> Não há limite de aulas por semana. A aluna organiza o uso dos créditos como preferir, inclusive concentrando todos em uma única semana. O sistema não emite alertas sobre ritmo de uso — apenas mantém o saldo visível durante a jornada de agendamento.

## 4.8 M8 — Cancelamento e Justificativa

### 4.8.1 Cancelamento pela aluna

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CAN-01** | Cancelamento com antecedência | Cancelamento realizado com antecedência igual ou superior ao parâmetro configurado libera os créditos reservados, que voltam ao saldo disponível. | MVP |
| **RF-CAN-02** | Cancelamento sem antecedência | Cancelamento realizado abaixo da antecedência mínima consome os créditos reservados, com aviso explícito antes da confirmação e oferta de envio de justificativa. | MVP |
| **RF-CAN-03** | Antecedência configurável | O prazo de antecedência mínima é configurável pela administração. Valor de referência: 4 horas. | MVP |
| **RF-CAN-04** | Uso do crédito liberado | O crédito liberado pode ser utilizado em qualquer aula disponível dentro da validade da carteira. | MVP |

### 4.8.2 Justificativa de falta

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-JUS-01** | Envio de justificativa | Aluna que cancelou abaixo da antecedência mínima ou faltou pode enviar justificativa com texto e anexo (atestado, comprovante ou imagem). | MVP |
| **RF-JUS-02** | Prazo de envio | Prazo máximo para envio contado da data da aula, configurável pela administração. Valor de referência: 7 dias. | MVP |
| **RF-JUS-03** | Fila de análise | As justificativas compõem fila no painel administrativo, com identificação da aluna, aula, data e anexo. | MVP |
| **RF-JUS-04** | Aprovação e recusa | A administração aprova ou recusa. A aprovação estorna os créditos consumidos, devolvendo-os ao saldo disponível. A recusa mantém o consumo. | MVP |
| **RF-JUS-05** | Retorno à aluna | A aluna é notificada do resultado e visualiza o parecer no próprio histórico. | MVP |

### 4.8.3 Cancelamento pela professora

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CPR-01** | Solicitação de cancelamento | A professora solicita o cancelamento de uma sessão específica informando data e motivo. A sessão permanece ativa até a decisão da administração. | MVP |
| **RF-CPR-02** | Fila de aprovação | As solicitações compõem fila no painel administrativo, com professora, sessão, data, motivo e alunas agendadas. | MVP |
| **RF-CPR-03** | Aprovação com substituição | Ao aprovar, a administração pode designar professora substituta. A sessão é mantida, as alunas são notificadas da troca e a comissão daquela aula é atribuída à substituta. | MVP |
| **RF-CPR-04** | Aprovação com cancelamento | Ao aprovar sem substituta, a sessão daquela data é cancelada, os créditos reservados são devolvidos, a validade das carteiras afetadas é prorrogada e as alunas são notificadas. | MVP |
| **RF-CPR-05** | Recusa da solicitação | A administração pode recusar a solicitação, mantendo a sessão e notificando a professora. | MVP |
| **RF-CPR-06** | Acompanhamento pela professora | A professora acompanha a situação da solicitação: aguardando aprovação, aprovada com substituta, aprovada com cancelamento ou recusada. | MVP |
| **RF-CPR-07** | Prorrogação de validade | Sessão cancelada por iniciativa do studio concede dias adicionais de validade às carteiras afetadas. Valor de referência: 7 dias, configurável. | MVP |
| **RF-CPR-08** | Filtro por habilitação | Filtro de professoras habilitadas na modalidade na seleção de substituta. | Evolução |

## 4.9 M9 — Aulas Excepcionais: Workshop e Aula Particular

Workshops e aulas particulares são **aulas excepcionais**: acontecem fora da grade recorrente, são criadas pela administração e não podem ser agendadas pelas alunas. Ambas compartilham o mesmo cadastro, diferenciando-se pela categoria de aula escolhida e pelo respectivo custo em créditos.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-AEX-01** | Cadastro de aula excepcional | Cadastro com categoria de aula, nome, data, horário de início e término e espaço. O vínculo de professoras é opcional e segue o RF-AEX-12. O cadastro é único, sem recorrência: cada ocorrência é criada individualmente. | MVP |
| **RF-AEX-02** | Fora da grade regular | A aula excepcional não aparece na grade disponível para agendamento pelas alunas e não é ofertada aos convênios. Ela ocupa o espaço e, havendo professora vinculada, o horário dela, para efeito de validação de conflito. | MVP |
| **RF-AEX-03** | Conflito com a grade | Ao criar uma aula excepcional em data e horário que coincidam com sessões regulares, o sistema informa o conflito e oferece o cancelamento das sessões afetadas. Havendo alunas agendadas, o cancelamento devolve os créditos, prorroga a validade e dispara notificação. Não havendo, o sistema apenas informa que a grade daquele horário deixará de ser ofertada. | MVP |
| **RF-AEX-04** | Alocação de alunas | A administração aloca as alunas participantes. A alocação consome imediatamente os créditos correspondentes à categoria da aula, sem passar pelo estado de reserva. | MVP |
| **RF-AEX-05** | Custo por participante | Cada aluna alocada consome integralmente o custo em créditos da categoria. O custo não é dividido entre participantes. | MVP |
| **RF-AEX-06** | Alocação sem consumo de créditos | A administração pode alocar participante sem consumo de créditos, para os casos em que o pagamento é tratado fora do sistema. A operação exige registro de motivo. | MVP |
| **RF-AEX-07** | Cancelamento da alocação | A administração pode cancelar a alocação de uma aluna a qualquer momento. Os créditos consumidos são estornados ao saldo disponível, com registro de autor e motivo. | MVP |
| **RF-AEX-08** | Sem controle de capacidade | A aula excepcional não possui limite de participantes controlado pelo sistema. A tela exibe a quantidade de alunas alocadas, cabendo à administração decidir sobre a lotação. | MVP |
| **RF-AEX-09** | Visibilidade para a aluna | A aluna visualiza as aulas excepcionais em que foi alocada nas suas próximas aulas e no histórico de frequência, com o consumo de créditos correspondente, ainda que não possa agendá-las por conta própria. | MVP |
| **RF-AEX-10** | Presença | A aula excepcional possui chamada, como qualquer outra aula, e aparece na lista de sessões do dia de cada professora vinculada. Não havendo professora vinculada, a chamada é realizada pela administração. | MVP |
| **RF-AEX-11** | Restrição para convênio | Alunas de convênio não participam de workshops nem de aulas particulares. | MVP |
| **RF-AEX-12** | Professoras e comissão | O vínculo de professoras é opcional. Quando houver, é possível vincular uma ou mais professoras, informando para cada uma o seu próprio valor de comissão no cadastro da aula. Na finalização da chamada, cada professora vinculada gera um lançamento de comissão com o valor que lhe foi atribuído. Aula sem professora vinculada não gera comissão. | MVP |
| **RF-AEX-13** | Horário fora do funcionamento | A aula excepcional pode ser criada fora dos dias e da faixa de horário de funcionamento do studio. O sistema não bloqueia: exibe alerta informando que o horário está fora do funcionamento e oferece duas saídas — confirmar assim mesmo ou ajustar a data e o horário. A validação de conflito de espaço e de professora permanece bloqueante. | MVP |

> **Definido com a cliente**
>
> A aula particular é sempre criada pela administração, nunca deduzida automaticamente a partir de uma aula regular que tenha ficado com uma única aluna.
>
> A comissão em aula excepcional não usa a categoria da professora: o valor é informado diretamente no cadastro da aula, individualmente para cada professora vinculada. Isso permite remunerar de forma diferente cada participação — em uma aula particular a comissão é maior que a da aula regular, porque o valor cobrado da aluna também é maior, e em um workshop conduzido a quatro mãos cada professora pode receber um valor distinto.
>
> **Orientação de uso:** vincule as professoras e informe o valor da comissão sempre que a aula gerar pagamento. Quando não houver comissão a pagar — por exemplo, um workshop conduzido pela própria proprietária ou por convidado externo remunerado por fora —, a orientação é **não cadastrar a professora**. A aula acontece normalmente, tem chamada e consome créditos, apenas sem lançamento de comissão.
>
> **Horário fora do funcionamento.** Diferentemente da grade regular, a aula excepcional não é bloqueada quando cai fora dos dias e horários de funcionamento do studio. Workshop de sábado e aula particular em horário atípico são justamente os casos em que isso acontece, e um bloqueio obrigaria a administração a alterar a configuração do studio para cadastrar um evento pontual. O sistema alerta e deixa a decisão com quem está cadastrando.

## 4.10 M10 — Presença e Chamada

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-PRE-01** | Sessões do dia | A professora visualiza suas sessões do dia — regulares e excepcionais — com horário, modalidade, espaço, quantidade de alunas e situação da chamada. | MVP |
| **RF-PRE-02** | Lista de presença | A lista exibe as alunas com agendamento ativo ou alocação, incluindo alunas de convênio. Alunas que cancelaram não aparecem. | MVP |
| **RF-PRE-03** | Marcação padrão | As alunas são apresentadas como presentes por padrão, cabendo à professora marcar apenas as ausências. | MVP |
| **RF-PRE-04** | Finalização da chamada | A finalização consolida os registros, converte os créditos reservados em utilizados, gera a comissão da professora e encerra a edição ordinária. A tela exibe o valor da comissão gerada e o período em que será paga. | MVP |
| **RF-PRE-05** | Correção de chamada | A chamada pode ser corrigida dentro do prazo configurado. A correção ajusta automaticamente a comissão apurada e o saldo de créditos da aluna quando aplicável. | MVP |
| **RF-PRE-06** | Bloqueio fora do prazo | Após o prazo, a chamada não pode ser alterada pela professora. A administração pode ajustar mediante registro de justificativa. | MVP |
| **RF-PRE-07** | Histórico da aluna | A aluna visualiza o histórico com data, modalidade, professora, registro de presença, falta ou cancelamento, e os créditos consumidos em cada ocorrência. | MVP |
| **RF-PRE-08** | Chamada não finalizada | Sessões com chamada não finalizada são sinalizadas no painel administrativo e no painel da professora. | MVP |

> **Decisão de interface**
>
> A tela de chamada é otimizada para uso em celular durante a aula: lista vertical com área de toque ampla e todas as alunas pré-marcadas como presentes, exigindo da professora apenas a marcação das ausências.

## 4.11 M11 — Comissão e Fechamento

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-COM-01** | Geração automática | A comissão é gerada automaticamente na finalização da chamada. Para aula regular, utiliza o valor por aula da categoria vigente da professora na data. Para aula excepcional, gera um lançamento por professora vinculada, com o valor informado para cada uma no cadastro da aula. Aula excepcional sem professora vinculada não gera comissão. | MVP |
| **RF-COM-02** | Registro por aula | Cada comissão registra data, sessão, categoria de aula, professora, base de cálculo aplicada, valor e quantidade de presenças. | MVP |
| **RF-COM-03** | Aula sem presenças | Sessão finalizada sem nenhuma presença registrada não gera comissão. A sessão é destacada no fechamento do mês para que a administração decida sobre eventual pagamento manual. | MVP |
| **RF-COM-04** | Comissão em substituição | Em caso de substituição, a comissão da aula é atribuída à professora que efetivamente conduziu a sessão. | MVP |
| **RF-COM-05** | Período de apuração | O período de apuração é mensal, do primeiro ao último dia do mês. | MVP |
| **RF-COM-06** | Painel da professora | A professora acompanha aulas realizadas, valor por aula vigente, total acumulado no período, data de fechamento e data prevista de pagamento. | MVP |
| **RF-COM-07** | Fechamento de período | A administração fecha o período, visualizando o total a pagar por professora e o total geral. | MVP |
| **RF-COM-08** | Detalhamento conferível | Relatório com o detalhamento das aulas que compõem o valor de cada professora, para conferência antes do pagamento. | MVP |
| **RF-COM-09** | Registro de pagamento | Após o pagamento, a administração marca o fechamento como pago. O período fechado não aceita novos lançamentos. | MVP |
| **RF-COM-10** | Histórico de fechamentos | Consulta aos fechamentos anteriores, com valores e situação, disponível para administração e professora. | MVP |
| **RF-COM-11** | Ajuste em período fechado | Correção de chamada referente a período já fechado gera lançamento de ajuste no período seguinte, preservando o fechamento anterior. | MVP |

> **Definido com a cliente**
>
> O pagamento das professoras ocorre mensalmente, até o quinto dia útil do mês subsequente ao período apurado. Essa informação é exibida no painel da professora junto ao total acumulado.

## 4.12 M12 — Vendas, Pagamentos e Reembolso

Todo pagamento é **único**, realizado no ato da compra do pacote. Não existe cobrança recorrente, mensalidade automática, régua de inadimplência, multa ou juros.

### 4.12.1 Venda e pagamento

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-VEN-01** | Venda de pacote | A compra de pacote gera uma venda com pacote adquirido, quantidade de créditos, validade, valor, forma de pagamento, data e identificador da transação no gateway. | MVP |
| **RF-VEN-02** | Formas de pagamento | Cartão de crédito à vista, cartão de crédito parcelado com o valor total debitado do limite no momento da compra, e Pix à vista. | MVP |
| **RF-VEN-03** | Ativação por confirmação | A carteira só é ativada após a confirmação do pagamento pelo gateway. Entre a compra e a confirmação, a venda permanece pendente e a aluna não agenda. | MVP |
| **RF-VEN-04** | Registro manual de venda | A administração pode registrar venda realizada fora do gateway, informando forma de pagamento, valor, data e observação. | MVP |
| **RF-VEN-05** | Cancelamento de venda pendente | A administração pode cancelar uma venda ainda não confirmada, com registro de motivo. | MVP |
| **RF-VEN-06** | Histórico de compras | Histórico de compras por aluna com pacote, valor, forma de pagamento, data, situação e eventual reembolso. | MVP |
| **RF-VEN-07** | Painel de vendas | Visão consolidada do período com totais por situação: confirmado, pendente, cancelado e reembolsado. | MVP |
| **RF-VEN-08** | Recebimento de venda parcelada | Definição sobre o repasse ao studio em vendas parceladas: recebimento antecipado do valor integral ou recebimento conforme as parcelas. | Em definição |

### 4.12.2 Reembolso

O reembolso é um **recurso de mediação da administração**, operado exclusivamente pelo perfil de administração, no mesmo espírito do trancamento. A solicitação da aluna chega pelos canais de atendimento do studio — presencialmente, por telefone ou por mensagem — e a administração avalia e executa a operação no sistema. **Não existe, na Fase 1, jornada de solicitação de reembolso pela aluna dentro do sistema.**

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-REE-01** | Cancelamento por arrependimento | A administração pode cancelar o pacote com reembolso quando a solicitação da aluna ocorrer em até 7 dias corridos após a data da compra e a aluna tiver utilizado no máximo 50% dos créditos adquiridos. | MVP |
| **RF-REE-02** | Cálculo do reembolso | São descontados do valor a reembolsar os créditos já utilizados, calculados pelo valor unitário do crédito (valor total do pacote dividido pela quantidade de créditos). | MVP |
| **RF-REE-03** | Prévia do reembolso | Antes de confirmar, o sistema exibe o valor pago, os créditos utilizados, o valor descontado e o valor líquido a reembolsar. | MVP |
| **RF-REE-04** | Execução do reembolso | O reembolso é processado na mesma forma de pagamento da compra, por meio do gateway, com registro da transação de estorno. | MVP |
| **RF-REE-05** | Encerramento da carteira | Confirmado o reembolso, a carteira é encerrada, os créditos remanescentes são anulados e as aulas futuras agendadas são canceladas. | MVP |
| **RF-REE-06** | Pacotes não reembolsáveis | Não há reembolso quando a carteira já foi consumida, quando já expirou, ou quando mais de 50% dos créditos foram utilizados. | MVP |
| **RF-REE-07** | Cancelamento por motivo legal | Após o prazo de 7 dias, situações amparadas em legislação são analisadas pela administração mediante documentação datada e assinada, apresentada em até 7 dias a partir do evento. A administração pode conceder prorrogação de validade, crédito para uso futuro ou reembolso parcial. | MVP |
| **RF-REE-08** | Registro da operação | Toda operação de reembolso registra data, motivo, documentação anexada, decisão, autor e valor reembolsado. | MVP |
| **RF-REE-09** | Operação exclusiva da administração | O reembolso é executado exclusivamente pelo perfil de administração. O sistema não oferece à aluna qualquer caminho para solicitar reembolso, e nenhum elemento de interface do perfil da aluna sugere a existência do recurso. | MVP |
| **RF-REE-10** | Visibilidade para a aluna | A aluna visualiza o reembolso no próprio histórico de compras apenas quando tiver havido um reembolso efetivamente aplicado ao seu cadastro. Não havendo, nenhuma menção, rótulo, coluna ou filtro relacionado a reembolso é exibido no perfil dela. | MVP |
| **RF-REE-11** | Prazo de processamento | Definição do prazo informado à aluna para o processamento do reembolso. | Em definição |

> **Decisão de escopo e de interface**
>
> O reembolso é recurso de mediação da administração, não uma jornada da aluna. A solicitação chega pelos canais de atendimento do studio e a administração decide caso a caso, com o sistema servindo para executar, calcular e registrar a operação — nunca para receber o pedido.
>
> **Nenhuma evidência do recurso aparece para quem não passou por ele.** O perfil da aluna não exibe botão, aba, rótulo, coluna nem filtro de reembolso. A informação só surge no histórico de compras daquela aluna se um reembolso tiver sido efetivamente aplicado ao cadastro dela.
>
> O motivo é evitar que o sistema anuncie um recurso para o qual a aluna não tem caminho. Expor um filtro de "reembolsos" no painel de quem nunca teve nenhum cria a expectativa de uma jornada que não existe, e gera pedido no atendimento em vez de reduzi-lo.

## 4.13 M13 — Aula Experimental

A aula experimental é a porta de entrada para quem ainda não possui pacote. Ela é cobrada à parte e **não consome créditos**.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-EXP-01** | Fluxo iniciado pela agenda | A interessada visualiza primeiro a grade de horários disponíveis, seleciona a aula desejada e apenas então efetua o pagamento. | MVP |
| **RF-EXP-02** | Cadastro obrigatório | O agendamento exige cadastro no sistema, ainda que sem aquisição de pacote. | MVP |
| **RF-EXP-03** | Limite por modalidade | Cada pessoa pode realizar uma aula experimental por modalidade, controlado por CPF. O limite é configurável pela administração. | MVP |
| **RF-EXP-04** | Valor configurável | A aula experimental possui valor único, independente da modalidade, configurável na tela de parâmetros. Valor de referência: R$ 30,00. | MVP |
| **RF-EXP-05** | Confirmação por pagamento | A vaga é confirmada após a confirmação do pagamento. | MVP |
| **RF-EXP-06** | Presença na chamada | A aluna experimental aparece na lista de presença identificada como experimental, sem consumo de créditos. | MVP |
| **RF-EXP-07** | Conversão em pacote | Após a aula, a interessada pode adquirir um pacote pelo próprio painel, preservando o cadastro existente. | MVP |
| **RF-EXP-08** | Benefício de conversão | Definição do benefício concedido a quem adquire um pacote após realizar a aula experimental, e do prazo de validade desse benefício. | Em definição |
| **RF-EXP-09** | Relatório de conversão | Relação de aulas experimentais realizadas no período e taxa de conversão em pacote. | Importante |

## 4.14 M14 — Convênios Corporativos

O studio atende Wellhub e TotalPass. A aluna de convênio **não possui pacote nem créditos no sistema**: ela reserva pelo aplicativo do convênio, ocupa vaga na sessão e realiza check-in no local. O controle de quantas aulas ela pode fazer é do próprio convênio.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-CNV-01** | Espelhamento da grade | As sessões regulares são publicadas nos convênios, com modalidade, data, horário, professora e vagas disponíveis, mantendo-se sincronizadas a cada alteração. Aulas excepcionais não são espelhadas. | MVP |
| **RF-CNV-02** | Seleção de sessões espelhadas | A administração define quais sessões são disponibilizadas aos convênios, podendo excluir sessões específicas do espelhamento. | MVP |
| **RF-CNV-03** | Recebimento de reserva | O sistema recebe as reservas originadas nos aplicativos dos convênios e as registra na sessão correspondente, ocupando vaga. | MVP |
| **RF-CNV-04** | Confirmação de reserva | O sistema responde à solicitação de reserva confirmando ou recusando conforme a disponibilidade de vaga, dentro do prazo exigido pelo convênio. | MVP |
| **RF-CNV-05** | Recebimento de cancelamento | Cancelamentos realizados pela aluna no aplicativo do convênio liberam a vaga na sessão. | MVP |
| **RF-CNV-06** | Validação de check-in | O check-in realizado pela aluna no aplicativo do convênio é recebido e validado automaticamente, sem necessidade de confirmação manual. | MVP |
| **RF-CNV-07** | Controle de vagas | As vagas ocupadas por alunas de convênio compõem a capacidade total da sessão, respeitando o limite da modalidade. | MVP |
| **RF-CNV-08** | Sem controle de limite | O sistema não controla a quantidade de aulas que a aluna de convênio pode realizar. Esse controle é feito pelo próprio convênio. | MVP |
| **RF-CNV-09** | Convivência com pacote | Uma mesma pessoa pode possuir pacote de créditos no studio e também utilizar o convênio. Uma condição não bloqueia a outra, e cada agendamento registra sua origem. | MVP |
| **RF-CNV-10** | Identificação na chamada | Alunas de convênio aparecem na lista de presença identificadas, com indicação de check-in realizado ou pendente. | MVP |
| **RF-CNV-11** | Presença sem check-in | A professora pode registrar a presença de aluna de convênio que compareceu sem realizar o check-in, para fins de controle interno de ocupação. O registro não substitui o check-in nem gera repasse. | MVP |
| **RF-CNV-12** | Relatório de convênios | Relatório com reservas, check-ins validados, ausências e reservas sem check-in por período e por convênio, para conferência do repasse. | MVP |
| **RF-CNV-13** | Registro de credenciais | Área de configuração para registro das credenciais de integração de cada convênio, sem intervenção técnica. | MVP |
| **RF-CNV-14** | Contingência | Havendo indisponibilidade da integração, a administração pode registrar manualmente a reserva e a presença da aluna de convênio. | MVP |

> **Dependência crítica**
>
> A integração exige homologação prévia da FGC Digital como sistema de gestão parceiro junto a Wellhub e TotalPass. Trata-se de processo comercial e técnico conduzido por essas plataformas, com prazo não controlado pela FGC Digital. O detalhamento consta no capítulo 11.

## 4.15 M15 — Painéis e Indicadores

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-PNL-01** | Painel administrativo | Visão consolidada com alunas com pacote ativo, pacotes a vencer, receita do período, aulas realizadas, comissão gerada e créditos em circulação. | MVP |
| **RF-PNL-02** | Ocupação das sessões | Indicador de ocupação por sessão, destacando turmas com lotação máxima e turmas com baixa procura. | MVP |
| **RF-PNL-03** | Pendências de ação | Bloco de pendências reunindo solicitações de cancelamento de sessão, justificativas aguardando análise e chamadas não finalizadas. | MVP |
| **RF-PNL-04** | Painel da professora | Sessões do dia, aulas realizadas no período, valor por aula vigente, total acumulado, data de fechamento e data prevista de pagamento. | MVP |
| **RF-PNL-05** | Painel da aluna | Saldo de créditos disponíveis, reservados e utilizados, validade do pacote, próximas aulas agendadas, histórico de frequência e histórico de compras. | MVP |
| **RF-PNL-06** | Exportação | Exportação em CSV das listagens de alunas, vendas, comissões e convênios. | Importante |

> **Decisão de interface**
>
> O painel administrativo abre pelo bloco de pendências, e não pelos indicadores. A primeira informação apresentada é o que exige ação naquele momento, reduzindo o risco de solicitações e justificativas ficarem sem tratamento.

## 4.16 M16 — Notificações

Na Fase 1 todas as comunicações transacionais são enviadas por e-mail. A arquitetura é construída com abstração de canal, de modo que a inclusão do WhatsApp na Fase 2 não exija reescrita das regras de disparo.

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-NOT-01** | Primeiro acesso | E-mail com credencial de primeiro acesso e orientação para aceite do termo. | MVP |
| **RF-NOT-02** | Confirmação de compra | E-mail confirmando a aquisição do pacote, com créditos, validade e valor pago. | MVP |
| **RF-NOT-03** | Confirmação de agendamento | E-mail com data, horário, modalidade, professora, créditos reservados e regra de cancelamento aplicável. | MVP |
| **RF-NOT-04** | Alocação em aula excepcional | E-mail à aluna informando a alocação em workshop ou aula particular, com data, horário e créditos consumidos. | MVP |
| **RF-NOT-05** | Cancelamento pelo studio | E-mail às alunas afetadas informando os créditos devolvidos e a prorrogação de validade concedida. | MVP |
| **RF-NOT-06** | Substituição de professora | E-mail às alunas agendadas informando a troca na data específica. | MVP |
| **RF-NOT-07** | Alteração de sessão | E-mail às alunas agendadas quando a sessão tem horário ou dia alterado. | MVP |
| **RF-NOT-08** | Pacote finalizando | E-mail quando a carteira entra no status Finalizando, informando o motivo (poucos créditos ou proximidade do vencimento) e convidando à renovação. | MVP |
| **RF-NOT-09** | Pacote encerrado | E-mail quando a carteira é encerrada por consumo total ou por vencimento. | MVP |
| **RF-NOT-10** | Resultado de justificativa | E-mail à aluna com o resultado da análise. | MVP |
| **RF-NOT-11** | Solicitação de cancelamento | E-mail à administração sobre nova solicitação e à professora sobre a decisão. | MVP |
| **RF-NOT-12** | Reembolso aplicado | E-mail à aluna quando a administração aplica um reembolso ao seu cadastro, informando o valor reembolsado e o encerramento da carteira. Não há notificação de recebimento de solicitação, porque a solicitação não ocorre pelo sistema. | MVP |
| **RF-NOT-13** | Abstração de canal | Camada de notificação independente de canal, permitindo inclusão do WhatsApp sem alteração das regras de disparo. | MVP |
| **RF-NOT-14** | Registro de envio | Registro de todas as notificações disparadas com destinatário, evento, canal, data e situação. | MVP |

## 4.17 M17 — Perfis e Permissões

| **ID** | **Requisito** | **Descrição** | **Prio.** |
| --- | --- | --- | --- |
| **RF-PER-01** | Perfis de acesso | Três perfis na Fase 1: Administração, Professora e Aluna, cada um com acesso restrito às funcionalidades correspondentes. | MVP |
| **RF-PER-02** | Acúmulo de perfis | Um mesmo usuário pode possuir mais de um perfil, alternando o contexto de navegação sem novo cadastro. | MVP |
| **RF-PER-03** | Restrição de operações críticas | Trancamento, ajuste de créditos, concessão de bolsa, criação e alocação em aulas excepcionais e reembolso são exclusivos do perfil de administração. Nenhuma dessas operações possui caminho de solicitação pelos perfis de aluna ou professora. | MVP |
| **RF-PER-04** | Autenticação | Autenticação por e-mail e senha, com definição de senha no primeiro acesso e recuperação por e-mail. | MVP |
| **RF-PER-05** | Trilha de auditoria | Registro de autor, data e hora em todas as operações que alterem carteira, créditos, situação financeira, chamada ou comissão. | MVP |

# 5. Regras de Negócio

| **ID** | **Regra** |
| --- | --- |
| **RN-01** | O acesso às aulas é comercializado por pacotes de créditos pré-pagos, com pagamento único no ato da compra. Não há cobrança recorrente nem mensalidade automática. |
| **RN-02** | A carteira permanece ativa enquanto houver créditos disponíveis e a validade não tiver expirado. O encerramento ocorre no primeiro dos dois eventos. |
| **RN-03** | Créditos remanescentes em carteira expirada são perdidos. |
| **RN-04** | A aluna possui no máximo uma carteira ativa por vez. |
| **RN-05** | Compra realizada antes do encerramento da carteira vigente soma os créditos e adota como validade única a validade do novo pacote, contada da sua ativação. |
| **RN-06** | Compra realizada após o encerramento da carteira anterior cria carteira nova e independente, sem somar créditos encerrados. |
| **RN-07** | O saldo disponível para agendamento é: créditos totais menos utilizados menos reservados. |
| **RN-08** | O agendamento reserva créditos. O cancelamento dentro da antecedência mínima libera a reserva. A presença confirmada, o cancelamento fora do prazo e a ausência sem justificativa aprovada convertem a reserva em consumo. |
| **RN-09** | O custo em créditos é definido pela categoria da aula. Valores iniciais: aula regular 1 crédito, workshop 2 créditos, aula particular 4 créditos. |
| **RN-10** | Não há limite de aulas por semana. A aluna organiza o uso dos créditos como preferir dentro da validade. |
| **RN-11** | A capacidade máxima de alunas em aula regular é definida pela modalidade, não pelo espaço físico, refletindo a limitação por equipamento. |
| **RN-12** | Aulas excepcionais — workshop e aula particular — são criadas pela administração, ocorrem fora da grade regular e não podem ser agendadas pelas alunas. |
| **RN-13** | Em aula excepcional, os créditos são consumidos no momento da alocação, sem passar pelo estado de reserva. Cada participante consome o custo integral da categoria. |
| **RN-14** | O cancelamento da alocação em aula excepcional é exclusivo da administração e estorna os créditos consumidos. |
| **RN-15** | Aula excepcional não possui limite de participantes controlado pelo sistema. |
| **RN-16** | Sessão cancelada por iniciativa do studio devolve os créditos reservados e concede dias adicionais de validade às carteiras afetadas. |
| **RN-17** | Durante o trancamento a validade fica congelada e é prorrogada, ao final, pelo número de dias trancados. Aulas agendadas no período são canceladas com devolução dos créditos. |
| **RN-18** | A aluna bolsista tem isenção total na Fase 1 e sua carteira é renovada automaticamente ao encerrar, com o pacote concedido pela administração. Todas as demais regras operacionais são idênticas às das outras alunas. |
| **RN-19** | A carteira só é ativada após a confirmação do pagamento, o aceite do termo e o preenchimento da anamnese. |
| **RN-20** | O reembolso por arrependimento exige solicitação em até 7 dias corridos da compra e utilização de no máximo 50% dos créditos, descontando-se os créditos já utilizados pelo valor unitário do pacote. |
| **RN-21** | Não há reembolso de carteira consumida, expirada ou com mais de 50% dos créditos utilizados. |
| **RN-22** | O reembolso é operação exclusiva do perfil de administração. Não existe jornada de solicitação pela aluna no sistema, e nenhum elemento de interface do perfil da aluna revela a existência do recurso enquanto não houver reembolso aplicado ao seu cadastro. |
| **RN-23** | Sessão regular não pode ser criada quando houver conflito de horário para a professora ou para o espaço, nem fora do horário de funcionamento do studio. Para aula excepcional, o conflito de professora e de espaço permanece bloqueante, mas o horário fora do funcionamento é apenas alertado, cabendo à administração confirmar ou ajustar. |
| **RN-24** | A comissão da professora é gerada na finalização da chamada. Aula regular utiliza o valor da categoria vigente na data. Aula excepcional admite o vínculo opcional de uma ou mais professoras, cada uma com valor de comissão próprio informado no cadastro da aula, e gera um lançamento por professora vinculada. Aula excepcional sem professora vinculada não gera comissão. |
| **RN-25** | Sessão finalizada sem nenhuma presença registrada não gera comissão. |
| **RN-26** | Em substituição, a comissão é atribuída à professora que efetivamente conduziu a sessão. Alteração de categoria não tem efeito retroativo. |
| **RN-27** | Correção de chamada referente a período de comissão já fechado gera lançamento de ajuste no período seguinte. |
| **RN-28** | O período de apuração de comissão é mensal, com pagamento até o quinto dia útil do mês subsequente. |
| **RN-29** | Datas marcadas no calendário de exceções não ficam disponíveis para agendamento e cancelam automaticamente as sessões da data, com devolução de créditos. |
| **RN-30** | A janela de agendamento é configurável e pode ser distinta para alunas com pacote e alunas de convênio. |
| **RN-31** | Alunas que cancelaram não aparecem na lista de presença. |
| **RN-32** | Solicitação de cancelamento feita pela professora não cancela a sessão. A sessão permanece ativa até a decisão da administração. |
| **RN-33** | A aluna de convênio não possui pacote nem créditos no sistema. O limite de aulas é controlado pelo próprio convênio. Uma mesma pessoa pode ter pacote e usar convênio. |
| **RN-34** | Alunas de convênio não participam de workshops nem de aulas particulares. |
| **RN-35** | Cada pessoa pode realizar uma aula experimental por modalidade, controlado por CPF. A aula experimental é cobrada à parte e não consome créditos. |
| **RN-36** | No fluxo de aula experimental, a escolha do horário precede o pagamento. Na compra de pacote, o pagamento precede o agendamento. |
| **RN-37** | Toda operação que altere carteira, créditos, situação financeira, chamada ou comissão registra autor, data e hora. |
| **RN-38** | Na Fase 1 todas as comunicações transacionais são enviadas por e-mail. |

# 6. Fluxos de Processo

## 6.1 Matrícula pelo site

**1.** A interessada acessa o link público de matrícula.

**2.** Preenche os dados cadastrais e escolhe o pacote entre os disponíveis.

**3.** Visualiza o termo de prestação de serviço e registra o aceite. O sistema grava identidade, data, hora, IP e versão do termo.

**4.** Preenche a ficha de anamnese, com respostas autodeclaradas.

**5.** Efetua o pagamento pelo gateway integrado.

**6.** Com o pagamento confirmado, a carteira é ativada, os créditos são creditados e o acesso é liberado automaticamente.

**7.** A aluna agenda a primeira aula na grade disponível, ainda dentro do fluxo de inscrição.

**8.** O sistema envia e-mail de boas-vindas com a credencial de acesso, os dados do pacote e a confirmação da aula agendada.

## 6.2 Aula experimental

**1.** A interessada acessa a página pública de aula experimental.

**2.** Visualiza a grade de horários disponíveis e seleciona a aula desejada.

**3.** Preenche os dados cadastrais, incluindo CPF, utilizado para o controle de limite por modalidade.

**4.** O sistema verifica se já houve aula experimental naquela modalidade para o CPF informado.

**5.** Aceita o termo e preenche a ficha de anamnese.

**6.** Efetua o pagamento do valor configurado.

**7.** Confirmado o pagamento, a vaga é reservada e a interessada recebe confirmação por e-mail.

**8.** Na chamada, a aluna aparece identificada como experimental, sem consumo de créditos.

**9.** Após a aula, pode adquirir um pacote pelo próprio painel, preservando o cadastro.

## 6.3 Cadastro administrativo com bolsa

**1.** A administração inicia novo cadastro de aluna.

**2.** Preenche os dados e marca a aluna como bolsista.

**3.** Escolhe qual pacote do catálogo será concedido.

**4.** O sistema indica que nenhuma cobrança será gerada.

**5.** A administração confirma. O sistema registra a concessão com autor, data, pacote e motivo.

**6.** A aluna recebe e-mail de primeiro acesso, e a carteira é ativada após o aceite do termo e o preenchimento da anamnese.

**7.** Ao encerrar a carteira, por consumo ou vencimento, o sistema concede automaticamente uma nova carteira com o mesmo pacote, sem gerar cobrança.

## 6.4 Compra de novo pacote

**1.** A aluna acessa o próprio painel e escolhe um pacote.

**2.** O sistema exibe a prévia: créditos que serão somados, saldo resultante e nova data de validade.

**3.** A aluna efetua o pagamento.

**4.** Confirmado o pagamento, o sistema aplica a regra correspondente: se a carteira vigente ainda estava ativa, soma os créditos e substitui a validade; se já estava encerrada, cria uma carteira nova.

**5.** A aluna recebe confirmação por e-mail com créditos, validade e valor pago.

## 6.5 Agendamento e realização da aula regular

**1.** A aluna acessa a grade e visualiza as sessões disponíveis dentro da janela de agendamento.

**2.** Seleciona a sessão. O sistema valida saldo disponível, validade, situação de trancamento e disponibilidade de vaga.

**3.** Confirmado o agendamento, os créditos são reservados e a vaga é ocupada. A aluna recebe confirmação por e-mail.

**4.** No dia da aula, a professora acessa suas sessões e abre a lista de presença.

**5.** As alunas são apresentadas como presentes por padrão; a professora marca apenas as ausências.

**6.** A professora finaliza a chamada. Os créditos reservados são convertidos em utilizados e a comissão é gerada.

**7.** A aula passa a compor o histórico de frequência da aluna.

## 6.6 Cancelamento pela aluna e reposição

**1.** A aluna acessa suas aulas agendadas e solicita o cancelamento.

**2.** O sistema verifica a antecedência em relação ao horário da aula.

**3.** Com antecedência suficiente, informa que os créditos retornam ao saldo disponível e confirma o cancelamento.

**4.** Abaixo da antecedência mínima, informa que os créditos serão consumidos e oferece o envio de justificativa.

**5.** Optando pela justificativa, a aluna anexa o comprovante e o registro entra na fila de análise.

**6.** A administração analisa e decide. Aprovada, os créditos são estornados. Recusada, o consumo é mantido.

**7.** A aluna é notificada do resultado e, havendo saldo, reagenda dentro da validade.

## 6.7 Criação de workshop ou aula particular

**1.** A administração acessa o cadastro de aula excepcional.

**2.** Escolhe a categoria de aula e informa nome, data, horário e espaço.

**3.** Havendo comissão a pagar, vincula uma ou mais professoras e informa o valor da comissão de cada uma. Não havendo comissão, segue sem vincular professora.

**4.** Estando o horário fora do funcionamento do studio, o sistema alerta e permite confirmar assim mesmo ou ajustar a data e o horário.

**5.** Havendo sessões regulares no mesmo horário, o sistema informa o conflito e oferece o cancelamento dessas sessões. Existindo alunas agendadas, o cancelamento devolve os créditos, prorroga a validade e dispara notificação.

**6.** Criada a aula, a administração aloca as alunas participantes.

**7.** A alocação consome imediatamente os créditos da categoria, ou é registrada sem consumo quando o pagamento ocorre fora do sistema.

**8.** As alunas alocadas são notificadas e passam a visualizar a aula nas próximas aulas e no histórico.

**9.** No dia, a aula possui chamada e aparece nas sessões de cada professora vinculada. Na finalização, cada professora vinculada gera um lançamento de comissão com o valor que lhe foi atribuído.

## 6.8 Trancamento

**1.** A aluna procura a administração informando o motivo do afastamento.

**2.** A administração acessa a carteira e informa data de início, data de término prevista e motivo.

**3.** O sistema apresenta o pacote, o saldo de créditos, a validade atual e o histórico de trancamentos como apoio à decisão.

**4.** Exibe a prévia: saldo congelado, validade atual, validade projetada no retorno e as aulas que serão canceladas.

**5.** Confirmada a operação, as aulas agendadas no período são canceladas e os créditos reservados devolvidos.

**6.** Ao final do período, a validade é prorrogada automaticamente pelo número de dias trancados e o agendamento é liberado.

## 6.9 Reembolso por arrependimento

**1.** A aluna procura a administração pelos canais de atendimento do studio solicitando o cancelamento do pacote. A solicitação não é feita pelo sistema.

**2.** A administração acessa a compra na ficha da aluna e inicia a operação de reembolso.

**3.** O sistema verifica o prazo de 7 dias corridos desde a compra e o percentual de créditos utilizados.

**4.** Atendidas as condições, exibe a prévia: valor pago, créditos utilizados, valor descontado e valor líquido a reembolsar.

**5.** A administração confirma. O reembolso é processado pelo gateway na mesma forma de pagamento da compra.

**6.** A carteira é encerrada, os créditos remanescentes são anulados e as aulas futuras agendadas são canceladas.

**7.** A aluna é notificada por e-mail do reembolso aplicado, e a operação passa a constar no histórico de compras dela.

## 6.10 Fluxo de aluna de convênio

**1.** As sessões regulares selecionadas para espelhamento são publicadas nos aplicativos dos convênios, com vagas atualizadas.

**2.** A aluna de convênio visualiza a grade no aplicativo e reserva a vaga.

**3.** O sistema recebe a solicitação, valida a disponibilidade e confirma ou recusa dentro do prazo exigido.

**4.** Confirmada, a vaga é ocupada na sessão e a ocupação é atualizada em ambos os sistemas.

**5.** No dia da aula, a aluna realiza o check-in pelo aplicativo do convênio no local.

**6.** O sistema recebe e valida o check-in automaticamente, condição para o repasse financeiro.

**7.** Na lista de presença, a aluna aparece identificada como de convênio, com indicação de check-in realizado ou pendente.

**8.** O relatório de convênios consolida reservas, check-ins validados, ausências e reservas sem check-in para conferência do repasse.

## 6.11 Fechamento de comissão

**1.** Ao longo do mês, cada chamada finalizada gera automaticamente os lançamentos de comissão.

**2.** Ao final do período, a administração acessa o fechamento e visualiza o total acumulado por professora.

**3.** Consulta o detalhamento das aulas que compõem o valor de cada professora, incluindo aulas excepcionais com seus valores próprios.

**4.** Confirmado o fechamento, o período é encerrado e não aceita novos lançamentos.

**5.** Realizado o pagamento até o quinto dia útil, a administração marca o fechamento como pago.

**6.** Correções de chamada posteriores ao fechamento geram lançamento de ajuste no período seguinte.

# 7. Modelo Conceitual de Dados

Entidades principais e atributos essenciais. O modelo físico será derivado no design técnico.

| **Entidade** | **Atributos principais** |
| --- | --- |
| Studio | Nome, contato, endereço, dias e faixa de horário de funcionamento, fuso. |
| Parâmetro | Chave, valor, descrição. Janelas de agendamento, antecedência de cancelamento, prazo de correção de chamada, dias de prorrogação, limite e valor da experimental, prazo de justificativa, limiares do status Finalizando, antecedências de aviso. |
| Modalidade | Nome, capacidade máxima de alunas, situação. |
| CategoriaAula | Nome, custo em créditos, indicador de aula excepcional, situação. |
| Espaço | Nome, situação. |
| Usuário | Nome, e-mail, CPF, senha, situação, perfis vinculados. |
| Aluna | Usuário, telefone, data de nascimento, contato de emergência, origem, indicador de bolsista, pacote concedido, situação. |
| Anamnese | Aluna, respostas, data de preenchimento, versão do questionário. |
| Professora | Usuário, categoria vigente, situação. |
| CategoriaProfessora | Nome, valor por aula regular, situação. |
| HistóricoCategoria | Professora, categoria, data de início de vigência, autor. |
| TermoAceite | Versão, conteúdo, data de publicação, situação. |
| AceiteRegistrado | Usuário, versão do termo, data e hora, endereço IP, conteúdo aceito. |
| Pacote | Nome, quantidade de créditos, validade em dias, valor, situação. |
| Venda | Aluna, pacote, valor, forma de pagamento, data, situação, identificador no gateway, indicador de bolsa. |
| Carteira | Aluna, data de ativação, data de validade, situação (ativa, consumida, expirada), motivo do encerramento, data de encerramento. |
| MovimentoCrédito | Carteira, tipo (concessão, reserva, liberação, consumo, expiração, estorno, ajuste), quantidade, origem, referência, autor, data e hora. |
| Trancamento | Carteira, data de início, data de término prevista, data de retorno efetivo, dias prorrogados, motivo, autor. |
| Reembolso | Venda, tipo (arrependimento, legal), data da operação, créditos utilizados, valor descontado, valor reembolsado, documentação, motivo, autor. |
| Sessão | Modalidade, professora, espaço, dias da semana, horário de início e término, capacidade, data de início, data de término, descrição, espelhamento em convênio, situação. |
| OcorrênciaSessão | Sessão, data específica, professora efetiva, capacidade efetiva, situação, motivo do cancelamento. |
| AulaExcepcional | Categoria de aula, nome, data, horário de início e término, espaço, situação, autor. |
| ProfessoraDaAula | Aula excepcional, professora, valor da comissão. Vínculo opcional, admitindo mais de uma professora por aula. |
| Agendamento | Aluna, ocorrência de sessão, origem (portal, administração ou convênio), créditos reservados, data e hora, situação, origem do cancelamento, indicador de experimental. |
| Alocação | Aluna, aula excepcional, créditos consumidos, indicador de consumo dispensado, motivo, autor, data. |
| ExceçãoCalendário | Data, tipo, descrição, autor, data de criação. |
| Chamada | Ocorrência de sessão ou aula excepcional, professora, data e hora de finalização, situação. |
| RegistroPresença | Chamada, aluna, situação, indicador de check-in de convênio, data e hora, autor. |
| Justificativa | Agendamento, aluna, texto, anexo, situação, parecer, autor da análise, data. |
| SolicitaçãoCancelamento | Sessão, data, professora solicitante, motivo, situação, decisão, professora substituta, autor da decisão, data. |
| Comissão | Chamada, professora, base de cálculo aplicada, valor, data da aula, período de fechamento, situação. |
| FechamentoComissão | Período de início e fim, total geral, situação, data de fechamento, data de pagamento, autor. |
| ConvênioIntegração | Convênio, credenciais, situação da integração, data da última sincronização. |
| ReservaConvênio | Convênio, identificador externo, aluna, ocorrência de sessão, situação, check-in validado, data e hora do check-in. |
| Notificação | Destinatário, evento, canal, conteúdo, data de envio, situação do envio. |
| RegistroAuditoria | Entidade afetada, operação, autor, data e hora, valores anterior e novo. |

# 8. Requisitos Não Funcionais

| **ID** | **Categoria** | **Requisito** |
| --- | --- | --- |
| **RNF-01** | Acesso | Aplicação web responsiva, utilizável em computador e celular por navegador, sem instalação. A tela de chamada e o fluxo de agendamento são otimizados para uso em celular. |
| **RNF-02** | Disponibilidade | Sistema disponível em ambiente de produção com hospedagem gerenciada e reinicialização automática em caso de falha. |
| **RNF-03** | Backup | Rotina automática diária de backup do banco de dados, com retenção mínima de 7 dias e procedimento de restauração verificado. |
| **RNF-04** | Segurança de acesso | Autenticação por e-mail e senha, senhas armazenadas com algoritmo de hash, sessão com expiração e recuperação de senha por e-mail. |
| **RNF-05** | Proteção de dados | Tratamento de dados pessoais em conformidade com a LGPD. As respostas da ficha de anamnese constituem dado pessoal sensível e recebem tratamento restrito: acesso limitado ao perfil de administração, registro de consentimento específico no aceite e armazenamento com controle de acesso reforçado. |
| **RNF-06** | Auditoria | Trilha de auditoria imutável para operações que alterem carteira, créditos, situação financeira, chamada ou comissão. |
| **RNF-07** | Integridade de créditos | Operações de venda e de movimentação de créditos executadas de forma transacional, sem possibilidade de duplicidade de cobrança ou de crédito. O saldo é sempre reconstituível a partir do histórico de movimentos. |
| **RNF-08** | Idempotência | Rotinas automáticas e recebimento de confirmações do gateway são idempotentes, garantindo que reexecuções não gerem créditos ou mensagens duplicadas. |
| **RNF-09** | Concorrência de vagas | A reserva de vaga é executada com controle de concorrência, impedindo que a capacidade da sessão seja excedida por agendamentos simultâneos originados no portal e nos convênios. |
| **RNF-10** | Tempo de resposta de integração | As respostas às solicitações dos convênios respeitam os prazos exigidos por cada plataforma, com registro de falhas e reprocessamento. |
| **RNF-11** | Desempenho | Tempo de resposta inferior a 2 segundos nas operações de consulta e agendamento em condições normais de uso. |
| **RNF-12** | Entrega de e-mail | Serviço de e-mail transacional com autenticação de domínio, monitoramento de entrega e registro de falhas. |
| **RNF-13** | Fuso horário | Todas as datas e horários tratados no fuso horário local do studio, incluindo o cálculo da antecedência de cancelamento e da validade dos pacotes. |
| **RNF-14** | Extensibilidade de canal | Camada de notificação desacoplada do canal de envio, permitindo inclusão do WhatsApp na Fase 2 sem alteração das regras de disparo. |
| **RNF-15** | Ambientes | Ambiente de homologação separado do ambiente de produção, para validação das entregas antes da publicação. |
| **RNF-16** | Acessibilidade | Contraste adequado, foco de teclado visível e navegação por teclado nas telas de uso frequente. |

# 9. Relatórios e Indicadores Contratados

| **ID** | **Relatório / Indicador** | **Descrição** |
| --- | --- | --- |
| **REL-01** | Alunas com pacote ativo | Relação de alunas com carteira ativa, pacote, saldo de créditos e validade. |
| **REL-02** | Pacotes a vencer | Relação de carteiras com validade nos próximos dias ou com poucos créditos, para ação de renovação. |
| **REL-03** | Receita do período | Total vendido no período, com separação por forma de pagamento e por situação. |
| **REL-04** | Créditos em circulação | Total de créditos vendidos, utilizados, reservados e expirados no período. |
| **REL-05** | Ocupação das sessões | Percentual de ocupação por sessão no período, com separação entre alunas com pacote e de convênio. |
| **REL-06** | Frequência por aluna | Histórico de presenças, faltas e cancelamentos por aluna no período. |
| **REL-07** | Comissão por professora | Detalhamento das aulas e valores que compõem a comissão de cada professora no período, separando regulares e excepcionais. |
| **REL-08** | Fechamentos de comissão | Histórico de fechamentos com período, total e situação de pagamento. |
| **REL-09** | Alunas bolsistas | Relação de alunas bolsistas com pacote concedido e valor não faturado. |
| **REL-10** | Aulas experimentais | Relação de aulas experimentais realizadas no período e taxa de conversão em pacote. |
| **REL-11** | Aulas excepcionais | Relação de workshops e aulas particulares realizados, com participantes, créditos consumidos e comissão paga. |
| **REL-12** | Convênios | Reservas, check-ins validados, ausências e reservas sem check-in por período e por convênio, para conferência do repasse. |
| **REL-13** | Reembolsos | Relação de reembolsos aplicados no período, com aluna, motivo, valor reembolsado e autor da operação. |

# 10. Convênios — Viabilidade Técnica e Dependências

A integração com Wellhub e TotalPass é escopo obrigatório da Fase 1. Este capítulo consolida o levantamento técnico e as dependências que condicionam sua execução.

## 10.1 Wellhub

O Wellhub disponibiliza portal público de documentação técnica para sistemas de gestão parceiros, com três interfaces relevantes ao escopo:

- **Booking API:** permite publicar turmas e horários na plataforma, mantendo a sincronização automática. As reservas realizadas no aplicativo são comunicadas por webhook.
- **Access Control API:** recebe e valida os check-ins realizados no local, condição para o repasse financeiro ao parceiro.
- **Integration Setup API:** mecanismo pelo qual o Wellhub notifica o sistema de gestão quando um parceiro o seleciona como seu sistema.
Características técnicas relevantes:

- Autenticação por token único, fornecido pelo Wellhub, válido para as diferentes interfaces.
- Comunicação por webhook, com assinatura de segurança no cabeçalho, que deve ser verificada pelo sistema receptor.
- Solicitações de reserva devem ser confirmadas ou recusadas em até 15 minutos, sob pena de recusa automática pela plataforma.
- Tempo de resposta esperado de 1 segundo, com retentativas em caso de ausência de resposta.
- Ambiente de testes disponível, separado do ambiente de produção.

## 10.2 TotalPass

O TotalPass não disponibiliza portal público de documentação técnica. A integração é conduzida diretamente pela plataforma, mediante habilitação prévia do sistema de gestão em seu catálogo de sistemas homologados.

- A plataforma opera com dois modos de integração: apenas check-in e agendamento com check-in. O modelo aplicável ao studio é o segundo.
- A autenticação ocorre por chave de integração obtida pelo próprio parceiro em seu portal, após selecionar o sistema de gestão em lista de sistemas homologados.
- O check-in é validado por geolocalização, em raio aproximado de 150 metros do estabelecimento, com prazo de expiração.

## 10.3 Dependência crítica de homologação

> **Dependência crítica**
>
> Ambas as plataformas exigem que o sistema de gestão esteja previamente homologado como parceiro tecnológico. O estabelecimento seleciona seu sistema a partir de uma lista de sistemas já integrados; um sistema não homologado não aparece nessa lista, e a integração não pode ser configurada pelo parceiro. A homologação é conduzida pelas próprias plataformas, envolve etapas comercial e técnica, e possui prazo não controlado pela FGC Digital.
>
> Em razão disso, a solicitação de homologação deve ser iniciada imediatamente, em paralelo ao desenvolvimento dos demais módulos, de modo que o prazo de aprovação não se torne o fator determinante da data de entrega.

| **Etapa** | **Responsável** | **Observação** |
| --- | --- | --- |
| Solicitação de homologação — Wellhub | FGC Digital | Formulário público de solicitação. Prazo de retorno informado como poucos dias para orientação inicial. |
| Solicitação de homologação — TotalPass | FGC Digital | Contato via canal de atendimento a parceiros. Não há processo público documentado. |
| Manutenção da condição de parceiro | Cliente | O studio deve permanecer como parceiro ativo em ambas as plataformas. |
| Fornecimento das credenciais do estabelecimento | Cliente | Obtidas nos respectivos portais de parceiro após a homologação do sistema. |
| Desenvolvimento e testes em homologação | FGC Digital | Condicionado à liberação de credenciais de teste pelas plataformas. |
| Validação em produção | FGC Digital e Cliente | Execução de reserva e check-in reais antes da migração definitiva. |

> **Risco de prazo**
>
> Caso a homologação em uma das plataformas não seja concluída até a data prevista de entrega, o sistema entra em produção com o módulo de convênios operando em modo de contingência: a administração registra manualmente as reservas e presenças das alunas de convênio, mantendo o controle interno de ocupação. A integração automática é ativada assim que a homologação for concluída, sem alteração de escopo.

# 11. Evoluções Futuras

Os itens abaixo ficam registrados como evoluções planejáveis. Não fazem parte desta contratação e não condicionam o aceite.

| **ID** | **Evolução** | **Descrição** |
| --- | --- | --- |
| **EV-01** | Notificações por WhatsApp | Envio das comunicações transacionais por WhatsApp. A Fase 1 entrega a camada de notificação desacoplada do canal; a Fase 2 implementa o canal e a configuração de qual evento utiliza qual canal. |
| **EV-02** | Assistente de atendimento integrado | Integração com o assistente já em operação, permitindo consulta de saldo de créditos, agendamento, cancelamento e envio de link de compra pela conversa. |
| **EV-03** | Mensagens de relacionamento | Mensagem de aniversário personalizada e reengajamento de alunas sem pacote ativo, incluindo interessadas que realizaram aula experimental e não adquiriram pacote. |
| **EV-04** | Desconto parcial em pacotes | Concessão de desconto percentual sobre o valor do pacote no ato da venda, em alternativa à isenção total da bolsa. |
| **EV-05** | Aula experimental gratuita | Possibilidade de ofertar a aula experimental sem cobrança, com mecanismo que assegure o comprometimento da interessada e evite ocupação indevida de vagas. |
| **EV-06** | Lista de espera | Ingresso em lista de espera para sessões lotadas, com notificação automática da próxima da fila ao surgir vaga e prazo de confirmação configurável. |
| **EV-07** | Agendamento autônomo de aulas excepcionais | Permitir que a aluna se inscreva por conta própria em workshops publicados pela administração, com controle de vagas. |
| **EV-08** | Emissão de nota fiscal | Emissão automática de NFS-e a partir das vendas confirmadas. Depende da definição do enquadramento fiscal e do município de emissão. |
| **EV-09** | Aplicativo móvel | Aplicativo nativo para aluna e professora, mantendo o acesso por navegador para quem preferir não instalar. |
| **EV-10** | Habilitação de professora por modalidade | Registro das modalidades que cada professora está habilitada a conduzir, com filtro automático na seleção de substituta. |
| **EV-11** | Indicadores avançados | Análise de retenção, previsão de receita, curva de frequência por modalidade e indicadores de desempenho por professora. |
| **EV-12** | Perfis granulares | Permissões por funcionalidade e ocultação de informações financeiras para perfis específicos. |
| **EV-13** | Múltiplos espaços | Operação com mais de um espaço físico simultâneo, com capacidade e conflito por espaço além da capacidade por modalidade. |
| **EV-14** | Cobrança recorrente | Comercialização por assinatura com cobrança recorrente automática, alternativa ao modelo de pacotes pré-pagos. |
| **EV-15** | Solicitação de reembolso pela aluna | Jornada no sistema em que a própria aluna solicita o reembolso, anexa documentação quando for o caso e acompanha o andamento, com fila de análise no painel administrativo. Na Fase 1 o reembolso é operação exclusiva da administração, sem qualquer caminho de solicitação pela aluna. |

# 12. Premissas, Restrições e Dependências

- **Conectividade:** o studio possui conexão de internet estável nos horários de operação. O sistema não terá modo offline na Fase 1.
- **Homologação nos convênios:** a homologação da FGC Digital como sistema de gestão parceiro junto a Wellhub e TotalPass é pré-requisito para a integração automática. O processo é conduzido pelas plataformas, com prazo não controlado pela FGC Digital.
- **Condição de parceiro:** o studio deve permanecer como parceiro ativo de Wellhub e TotalPass e fornecer as credenciais de integração de seu portal de parceiro.
- **Gateway de pagamento:** a contratação de conta no gateway e o cumprimento das exigências cadastrais correspondentes são de responsabilidade da cliente. O processo de verificação de identidade da empresa precisa estar concluído antes de o módulo de vendas entrar em operação.
- **Termo de aceite:** o conteúdo do termo de prestação de serviço será fornecido pela cliente, elaborado com sua assessoria jurídica. As regras de reembolso e de expiração de créditos previstas neste documento devem constar do termo.
- **Anamnese:** o conteúdo da ficha de anamnese será fornecido pela cliente.
- **Configuração inicial:** a cliente fornecerá a relação de modalidades com capacidades, categorias de aula com custo em créditos, pacotes com valores e validades, categorias de professora com valores e a grade vigente.
- **Migração de dados:** a cliente disponibilizará acesso à plataforma atual para levantamento da base de alunas. A migração depende da possibilidade de exportação; não havendo exportação viável, a carga inicial será realizada manualmente.
- **Homologação das entregas:** a cliente disponibilizará tempo para as sessões de validação e homologação de cada entrega.
- **Serviços de terceiros:** hospedagem, e-mail transacional, gateway de pagamento e plataformas de convênio são fornecidos por terceiros. Indisponibilidades desses serviços não caracterizam falha do sistema.

# 13. Pontos em Aberto

Cada item traz uma **sugestão da FGC Digital**, que será adotada caso a cliente não tenha preferência diferente. As sugestões priorizam o equilíbrio entre o valor do recurso e a complexidade de desenvolvimento, e favorecem a parametrização sempre que ela resolve o problema sem multiplicar o esforço.

## PA-01 — Conteúdo da ficha de anamnese

Perguntas que compõem o questionário de saúde preenchido pela aluna no ingresso.

**Requisito:** RF-ALU-11  ·  **Bloqueia a partir de:** Desenvolvimento do M2

> **Sugestão da FGC Digital**
>
> A FGC Digital envia um modelo de partida com os itens usuais para atividade física — histórico de lesões e cirurgias, problemas cardíacos ou de pressão, gestação, medicação contínua, limitações de mobilidade, alergias e contato de emergência — para revisão e ajuste pela cliente.
>
> O questionário é versionado: alterar as perguntas depois não apaga as respostas já registradas, e fica gravado qual versão cada aluna preencheu.

## PA-02 — Recebimento de venda parcelada

Em vendas parceladas no cartão, o studio recebe o valor integral de forma antecipada ou conforme as parcelas?

**Requisito:** RF-VEN-08  ·  **Bloqueia a partir de:** Desenvolvimento do M12

> **Sugestão da FGC Digital**
>
> Recomendamos o recebimento **conforme as parcelas**, que é o comportamento padrão e não tem custo adicional. A antecipação existe nos gateways, mas cobra taxa por parcela antecipada e reduz a margem.
>
> Do ponto de vista do sistema as duas opções são idênticas: o pacote é ativado na confirmação da compra, independentemente de quando o dinheiro entra na conta. A escolha é financeira, não técnica.

## PA-03 — Prazo de processamento do reembolso

Prazo informado à aluna para que o valor reembolsado retorne.

**Requisito:** RF-REE-09  ·  **Bloqueia a partir de:** Desenvolvimento do M12

> **Sugestão da FGC Digital**
>
> Recomendamos **não fixar um número no sistema nem no termo**, e sim informar que o prazo segue o da operadora do cartão, normalmente entre uma e duas faturas. Para Pix, a devolução costuma ser imediata.
>
> Prometer um prazo curto cria expectativa que não depende do studio nem do sistema. O texto exibido à aluna fica parametrizável, permitindo ajuste sem alteração de código.

## PA-04 — Benefício de conversão da aula experimental

Qual benefício é concedido a quem adquire um pacote após realizar a aula experimental, e por quanto tempo ele vale.

**Requisito:** RF-EXP-08  ·  **Bloqueia a partir de:** Desenvolvimento do M13

> **Sugestão da FGC Digital**
>
> Recomendamos **parametrizar as três dimensões**: o prazo de validade do benefício em dias, o tipo (desconto em valor ou crédito adicional) e o montante. Assim a cliente ajusta a promoção sem depender de suporte.
>
> Como ponto de partida, sugerimos 3 dias de validade e **um crédito adicional** no primeiro pacote, em vez de desconto no valor. Crédito adicional preserva a receita da venda, é mais simples de comunicar e incentiva o uso do studio.

## PA-05 — Assinatura do termo a cada compra

A aluna assina o termo de prestação de serviço uma única vez ou a cada aquisição de pacote?

**Requisito:** RF-ALU-05  ·  **Bloqueia a partir de:** Desenvolvimento do M2

> **Sugestão da FGC Digital**
>
> Recomendamos **uma única assinatura por versão do termo**. A aluna assina no primeiro acesso e só volta a assinar quando o texto for atualizado, o que o sistema já controla pelo versionamento.
>
> Exigir assinatura a cada compra acrescenta atrito à renovação, que é justamente o momento que se quer facilitar. As condições específicas da compra — créditos, validade e valor — ficam registradas na própria venda e no e-mail de confirmação.

## PA-06 — Direito de arrependimento e canal de compra

O prazo de 7 dias do Código de Defesa do Consumidor aplica-se às compras realizadas presencialmente no studio?

**Requisito:** RF-REE-01  ·  **Bloqueia a partir de:** Desenvolvimento do M12

> **Sugestão da FGC Digital**
>
> O artigo 49 do CDC assegura o arrependimento em 7 dias para contratações realizadas **fora do estabelecimento comercial** — pela internet, por telefone ou a domicílio. Uma compra feita presencialmente no studio, a rigor, não está coberta por esse artigo.
>
> Recomendamos **aplicar o prazo de 7 dias a todas as compras**, independentemente do canal. A regra fica mais simples de explicar e de operar, elimina discussão no atendimento e representa uma vantagem comercial de baixo custo, já que o reembolso desconta os créditos já utilizados.
>
> Se a cliente preferir restringir ao que a lei exige, o sistema pode registrar o canal da venda e aplicar a regra apenas às compras feitas pelo site — mas isso acrescenta uma exceção que precisará ser explicada a cada solicitação.

## PA-07 — Limite de 50% dos créditos para reembolso

A restrição de reembolso a pacotes com no máximo 50% dos créditos utilizados precisa de validação jurídica.

**Requisito:** RF-REE-01, RF-REE-06  ·  **Bloqueia a partir de:** Entrada em produção

> **Sugestão da FGC Digital**
>
> **Este ponto exige parecer da assessoria jurídica da cliente.** Nas compras cobertas pelo artigo 49 do CDC, a lei prevê a devolução dos valores pagos, e uma limitação por percentual de uso pode ser questionada.
>
> O desconto dos créditos efetivamente utilizados é a parte sólida da regra: a aluna recebe de volta o que não consumiu. A trava adicional dos 50% é o ponto frágil.
>
> Recomendamos **manter o limite parametrizável** no sistema, com valor inicial de 50%, para que possa ser ajustado conforme a orientação jurídica sem alteração de código. A regra adotada precisa constar expressamente do termo de prestação de serviço.

## PA-08 — Expiração de créditos não utilizados

A perda de créditos remanescentes no vencimento do pacote precisa de validação jurídica e de comunicação clara.

**Requisito:** RN-03  ·  **Bloqueia a partir de:** Entrada em produção

> **Sugestão da FGC Digital**
>
> **Este ponto também exige parecer jurídico.** A perda total de créditos pré-pagos é tema sensível em relações de consumo, e há decisões judiciais que a consideram abusiva quando o consumidor não foi adequadamente informado.
>
> Recomendamos três medidas de baixo custo que reduzem bastante a exposição: **informar a validade de forma destacada** na compra e no e-mail de confirmação; **avisar com antecedência** pelo status Finalizando, que o sistema já prevê; e **permitir prorrogação administrativa** da validade, recurso que o RF-CRE-09 já contempla e que permite resolver casos concretos sem abrir precedente formal.
>
> A regra de expiração precisa constar expressamente do termo de prestação de serviço.

## PA-09 — Reembolso de pacote com créditos incorporados

Como calcular o reembolso quando a compra incorporou créditos remanescentes de um pacote anterior.

**Requisito:** RF-CRE-13, RF-REE-02  ·  **Bloqueia a partir de:** Desenvolvimento do M12

> **Sugestão da FGC Digital**
>
> Situação: em 01/10 a aluna tinha 3 créditos restantes, com validade até 10/10, e comprou o Flow de 12 créditos. A carteira passou a ter 15 créditos com validade até 30/12. Em 05/10 ela pede o reembolso da compra.
>
> Recomendamos **reembolsar apenas a compra**, e não a carteira inteira. O valor a devolver considera os 12 créditos comprados, descontados os créditos utilizados desde a compra. Os 3 créditos anteriores voltam à carteira com a validade original de 10/10, que é restaurada.
>
> É a solução mais justa e a mais simples de implementar, porque cada compra permanece registrada de forma independente no histórico. A alternativa — tratar a carteira como bloco único — exigiria decidir arbitrariamente quais créditos foram consumidos primeiro.

## PA-10 — Renovação antecipada que reduz a validade

Como proceder quando o novo pacote tem validade menor que o prazo restante da carteira vigente.

**Requisito:** RF-CRE-13  ·  **Bloqueia a partir de:** Desenvolvimento do M3

> **Sugestão da FGC Digital**
>
> Situação: restam 20 créditos válidos até 30/12. Em 25/09 a aluna compra um Starter, de 45 dias. Pela regra de validade única, a nova data passaria a ser 09/11 — antes de 30/12. A aluna perderia quase dois meses de prazo comprando mais créditos.
>
> Recomendamos que a nova validade seja **a mais distante entre as duas**: mantém-se 30/12 e somam-se os 4 créditos. A aluna nunca perde prazo por comprar, o que evita reclamação e não muda o resultado nos casos normais, em que o pacote novo estende a validade.
>
> A alternativa é o sistema alertar e pedir confirmação antes de encurtar o prazo. Funciona, mas transfere para a aluna uma decisão que ela não tem por que precisar tomar.

## PA-11 — Dias de prorrogação por cancelamento do studio

Quantos dias de validade são acrescentados quando o studio cancela uma aula.

**Requisito:** RF-CPR-07, RF-EXC-04  ·  **Bloqueia a partir de:** Desenvolvimento do M6

> **Sugestão da FGC Digital**
>
> O valor já é parametrizável, com referência de 7 dias. Falta confirmar o valor inicial e o comportamento quando há vários cancelamentos no mesmo pacote.
>
> Recomendamos que a prorrogação seja **cumulativa e aplicada uma vez por ocorrência cancelada**: dois cancelamentos somam duas prorrogações. É o comportamento que a aluna espera e o mais simples de explicar.

## PA-12 — Alocação sem consumo de créditos

Registro de participante em workshop cujo pagamento é tratado fora do sistema.

**Requisito:** RF-AEX-06  ·  **Bloqueia a partir de:** Desenvolvimento do M9

> **Sugestão da FGC Digital**
>
> Recomendamos que a alocação sem consumo de créditos exija **seleção de motivo** em lista curta — por exemplo, pagamento avulso, convidada ou cortesia — e fique visível no relatório de aulas excepcionais.
>
> Sem esse registro, a diferença entre participantes que consumiram crédito e participantes que pagaram por fora desaparece na conferência, e o relatório perde utilidade.

# 14. Critérios de Aceite e Definição de Entregue

O projeto será considerado ENTREGUE quando, cumulativamente:

**1.** Todos os requisitos funcionais com prioridade MVP estiverem implementados e disponíveis em ambiente de produção.

**2.** Os fluxos do capítulo 6 forem executados de ponta a ponta em homologação com dados reais, na presença da cliente, sem impedimentos.

**3.** Os requisitos não funcionais RNF-01 a RNF-16 estiverem atendidos e verificados.

**4.** A configuração inicial estiver concluída e conferida pela cliente: modalidades com capacidade, categorias de aula com custo em créditos, espaços, horário de funcionamento, parâmetros operacionais, pacotes, categorias de professora e grade vigente.

**5.** A integração com Wellhub e TotalPass estiver operacional, ou, não concluída a homologação por fator externo, o módulo estiver entregue em modo de contingência conforme o capítulo 10, com ativação automática posterior sem custo adicional.

**6.** Os pontos em aberto do capítulo 13 estiverem resolvidos e suas definições implementadas.

**7.** O termo de prestação de serviço definitivo estiver publicado no sistema, contemplando as regras de validade, expiração de créditos e reembolso.

**8.** A cliente formalizar o aceite por escrito após período de homologação acordado.

Solicitações que não constem deste documento serão tratadas como novo escopo, sem impacto no aceite do escopo aqui contratado.

# 15. Glossário

| **Termo** | **Definição** |
| --- | --- |
| Pacote | Produto comercializado pelo studio, com quantidade de créditos, validade em dias e valor. |
| Crédito | Unidade de consumo. Cada categoria de aula tem um custo definido em créditos. |
| Carteira | Saldo vivo de créditos de uma aluna, com validade corrente e situação. Nasce na primeira compra e é alimentada pelas compras seguintes. |
| Crédito disponível | Créditos que ainda podem ser usados em novos agendamentos: totais menos utilizados menos reservados. |
| Crédito reservado | Crédito bloqueado por um agendamento futuro, ainda não consumido. |
| Crédito utilizado | Crédito efetivamente consumido por presença, cancelamento fora do prazo, falta sem justificativa aprovada ou alocação em aula excepcional. |
| Validade | Data limite para utilização dos créditos da carteira. Calculada a partir da ativação, conforme a validade em dias do pacote. |
| Renovação antecipada | Compra de novo pacote antes do encerramento da carteira vigente, somando créditos e adotando uma validade única. |
| Finalizando | Status informativo que sinaliza poucos créditos restantes ou proximidade do vencimento. Coexiste com o status Ativo. |
| Consumido | Encerramento da carteira por utilização de todos os créditos. |
| Expirado | Encerramento da carteira por atingimento da validade, com perda dos créditos remanescentes. |
| Sessão | Aula regular recorrente cadastrada na grade, definida por modalidade, professora, espaço, dia da semana e horário. |
| Ocorrência de sessão | Realização específica de uma sessão em uma data determinada. |
| Aula excepcional | Workshop ou aula particular, criada pela administração fora da grade regular, com alocação manual de participantes. |
| Aula particular | Aula excepcional destinada a uma ou poucas alunas, com custo em créditos e comissão próprios. |
| Workshop | Aula excepcional de tema específico, com data única e custo em créditos próprio. |
| Alocação | Inclusão de uma aluna em aula excepcional pela administração, com consumo imediato de créditos. |
| Janela de agendamento | Período à frente da data atual dentro do qual a aluna pode visualizar e agendar sessões. |
| Antecedência mínima | Prazo mínimo antes do início da aula para que o cancelamento libere os créditos reservados. |
| Trancamento | Pausa concedida pela administração, com congelamento da validade e prorrogação equivalente ao período trancado. |
| Bolsista | Aluna com isenção total do valor do pacote, concedida pela administração, mantendo todas as demais condições operacionais. |
| Categoria de aula | Classificação que define o custo em créditos de uma aula: regular, workshop ou particular. |
| Categoria de professora | Nível ao qual está vinculado o valor por aula regular utilizado na apuração da comissão. |
| Fechamento de comissão | Encerramento do período mensal de apuração, consolidando os valores a pagar por professora. |
| Termo de aceite | Instrumento contratual aceito eletronicamente no sistema, com registro de identidade, data, hora e conteúdo. |
| Anamnese | Questionário de saúde autodeclarado pela aluna no ingresso, sem validação pela administração. |
| Exceção de calendário | Data em que o studio não opera, com cancelamento automático das sessões. |
| Aula experimental | Aula avulsa destinada a interessada sem pacote ativo, limitada a uma por modalidade, cobrada à parte e sem consumo de créditos. |
| Convênio | Plataforma de benefício corporativo por meio da qual alunas acessam o studio, com reserva e check-in realizados no aplicativo do próprio convênio. |
| Espelhamento | Publicação da grade de horários do studio nos aplicativos dos convênios, mantida sincronizada automaticamente. |
| Check-in | Confirmação de presença realizada pela aluna de convênio no aplicativo, no local e no horário da aula, condição para o repasse financeiro ao studio. |

FGC Digital  ·  Escopo Funcional Atualizado  ·  Versão 2.0
