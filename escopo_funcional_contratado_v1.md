> **DOCUMENTO SUBSTITUÍDO — NÃO USAR COMO REFERÊNCIA DE DESENVOLVIMENTO**
>
> Esta é a versão 1.0 do escopo, de 14/08/2026. Foi substituída pela versão 2.0 (25/08/2026),
> que está em [`escopo_funcional_contratado.md`](./escopo_funcional_contratado.md) e é a única
> fonte da verdade do projeto.
>
> A v2.0 trocou o modelo comercial: saiu o contrato com mensalidade recorrente, entrou o pacote
> de créditos pré-pago. Com isso, módulos inteiros descritos abaixo — cobrança recorrente,
> inadimplência, alteração de plano, suspensão e bolsa parcial — saíram de escopo.
>
> Este arquivo permanece no repositório apenas como registro histórico, para consultar o que
> mudou e justificar remoções. O plano da migração está em
> [`PLANO_ATUALIZACAO_ESCOPO.md`](./PLANO_ATUALIZACAO_ESCOPO.md).

**ESCOPO FUNCIONAL CONTRATADO**

Sistema de Gestão do Studio — Fase 1

*Documento de referência para validação, desenvolvimento e aceite do projeto*

| **Campo** | **Valor** |
| --- | --- |
| **Versão** | 1.0 — Para validação |
| **Data de emissão** | 14/08/2026 |
| **Status** | Aguardando validação da cliente |
| **Elaboração** | FGC Digital |
| **Fontes** | Levantamento inicial de regras de negócio; devolutivas da cliente sobre o documento de escopo por fase; reunião de validação de 13/08/2026; protótipo navegável da Fase 1 |

# Controle do Documento

## Histórico de versões

| **Versão** | **Data** | **Autor** | **Descrição da alteração** |
| --- | --- | --- | --- |
| **1.0** | 14/08/2026 | FGC Digital | Emissão inicial para validação, consolidando o levantamento e as definições da reunião de 13/08/2026. |

## Aprovações

A assinatura das partes abaixo formaliza o aceite deste documento como escopo contratado da Fase 1 do Sistema de Gestão do Studio. Alterações posteriores deverão ser tratadas por meio de aditivo formal de escopo (nova versão deste documento).

| **Papel** | **Nome** | **Assinatura** | **Data** |
| --- | --- | --- | --- |
| **Proprietária do Studio** |  |  |  |
| **FGC Digital** |  |  |  |

## Papel deste documento

- **Fonte única da verdade:** durante o desenvolvimento, este documento prevalece sobre conversas informais, mensagens e demais registros. Dúvidas de escopo são resolvidas aqui.

- **Critério de entrega:** o projeto será considerado ENTREGUE quando todos os requisitos funcionais e não funcionais aqui listados com prioridade MVP estiverem implementados, testados e validados conforme o capítulo 'Critérios de Aceite'.
- **Limite de escopo:** tudo que não estiver descrito neste documento é considerado FORA DE ESCOPO desta contratação, incluindo os itens listados no capítulo 'Evoluções Futuras'.
- **Pontos em aberto:** os itens sinalizados com fundo destacado ao longo do documento e consolidados no capítulo 'Pontos em Aberto' devem ser resolvidos antes do início do desenvolvimento do módulo correspondente.

## Convenções de leitura

| **Marcação** | **Significado** |
| --- | --- |
| **MVP** | Obrigatório para o aceite desta contratação (Fase 1). |
| **Importante** | Incluído nesta contratação, podendo ser entregue em incremento posterior ao primeiro pacote. |
| **Evolução** | Fora desta contratação. Registrado no capítulo 12. |
| **Em definição** | Requisito cujo comportamento depende de definição pendente da cliente. Sinalizado com fundo destacado. |

# Sumário

*Clique com o botão direito e escolha 'Atualizar campo' para gerar o sumário.*

# 1. Introdução e Objetivo

Este documento consolida o levantamento funcional realizado com a proprietária do studio, a partir do documento inicial de regras de negócio, das devolutivas sobre o documento de escopo por fase, da reunião de validação realizada em 13 de agosto de 2026 e da apresentação do protótipo navegável da Fase 1. Seu objetivo é definir, de forma completa e verificável, o que será desenvolvido na primeira entrega do sistema.

O sistema substituirá a plataforma de gestão atualmente contratada, centralizando cadastro de alunas, contratação de pacotes, agendamento de aulas, cobrança recorrente, registro de presença, apuração de comissão das professoras e integração com os convênios corporativos em uma única aplicação, acessível por navegador em computador e celular.

## 1.1 Objetivos de negócio

- Reduzir o custo mensal com plataforma de gestão, hoje escalonado por faixa de alunas ativas e impactado pelo volume de alunas provenientes dos convênios corporativos.
- Manter a autonomia da aluna para agendar, cancelar e remarcar suas próprias aulas, respeitando as regras de antecedência e o saldo do pacote contratado.
- Preservar a integração com Wellhub e TotalPass, hoje operacional e responsável por parcela relevante da ocupação das turmas.
- Implementar mecanismos de trancamento e suspensão de contrato, permitindo pausa efetiva de cobrança e de vigência.
- Permitir alteração de plano no meio do ciclo com cálculo proporcional automático de valores e de saldo de aulas.
- Apurar automaticamente a comissão das professoras a partir do registro de presença, com fechamento mensal conferível antes do pagamento.
- Manter visibilidade sobre ocupação das turmas, receita, inadimplência e contratos a vencer.
- Adequar o sistema à realidade operacional do studio, incluindo controle de capacidade por modalidade, ficha de anamnese no ingresso e gestão de alunas bolsistas.

## 1.2 Documentos e artefatos de referência

| **Artefato** | **Descrição** |
| --- | --- |
| **Regras de Negócio (documento inicial)** | Levantamento original das regras operacionais do studio. |
| **Escopo por Fase — devolutiva da cliente** | Documento comentado pela cliente, com definições sobre pacotes de aula, comissão por categoria, regra de cancelamento e priorização de integrações. |
| **Reunião de validação — 13/08/2026** | Sessão de 95 minutos com a proprietária, cobrindo pontos em aberto, apresentação do escopo funcional e demonstração do protótipo. Fonte das definições consolidadas nesta versão. |
| **Protótipo navegável (Fase 1)** | Protótipo de validação percorrendo as jornadas de administração, professora e aluna, utilizado como referência de fluxo e de interface. |
| **Plataforma de gestão atual** | Acesso ao sistema em uso será disponibilizado pela cliente como referência de funcionalidades e para levantamento da migração de dados. |

# 2. Contexto e Situação Atual (As-Is)

O studio opera hoje com uma plataforma de gestão contratada, que já cobre parte relevante das necessidades operacionais. O levantamento identificou o que funciona adequadamente, o que apresenta limitação e o que motiva a substituição:

## 2.1 O que já é atendido pela plataforma atual

- **Cobrança:** cobrança recorrente automatizada, com controle de inadimplência e histórico de pagamentos.
- **Agendamento:** alunas agendam suas próprias aulas com antecedência configurável, hoje 30 dias para alunas matriculadas e 7 dias para alunas de convênio.
- **Convênios:** integração ativa com Wellhub e TotalPass. A agenda do studio é espelhada em tempo real nos aplicativos dos convênios; a aluna agenda pelo aplicativo do convênio e o agendamento aparece automaticamente na agenda do studio. O check-in realizado pela aluna no aplicativo é validado automaticamente.
- **Troca de plano:** alteração de plano com cálculo proporcional do valor já pago.
- **Presença e painel:** registro de presença e visão consolidada de indicadores na tela inicial.

## 2.2 Limitações e dores identificadas

- **Custo escalonado:** o custo é escalonado por faixa de alunas ativas, e as alunas provenientes dos convênios entram nessa contagem. Meses com maior volume de convênio elevam a fatura, ainda que o repasse do convênio seja proporcionalmente baixo.
- **Trancamento sem efeito prático:** a plataforma oferece trancamento, mas ele não pausa a cobrança nem altera a data de vencimento do contrato. Na prática, a aluna apenas deixa de consumir aulas e precisa repor tudo dentro da vigência original. Casos de afastamento prolongado acabam em cancelamento do contrato, com perda da aluna.
- **Check-in de convênio não realizado:** quando a aluna de convênio agenda e não comparece, ou comparece e esquece de realizar o check-in no aplicativo, o studio não recebe o repasse daquela visita. O convênio não valida o check-in retroativamente, e a vaga foi ocupada.
- **Alunas bolsistas:** não há controle sistematizado de alunas com isenção de mensalidade, hoje geridas por fora da plataforma.
- **Anamnese:** não há ficha de anamnese no ingresso da aluna, informação relevante para segurança da prática e para resguardo do studio.
- **Capacidade por espaço:** a capacidade da turma é tratada por espaço físico, enquanto a limitação real do studio é por modalidade: aulas que utilizam barra comportam número menor de alunas que aulas realizadas sem equipamento, no mesmo espaço.

## 2.3 Características da operação

- **Convênios:** aproximadamente 20 alunas ativas provenientes de Wellhub e TotalPass, com volume aproximado de 100 check-ins mensais.
- **Modalidades:** pole dance e modalidades correlatas, com capacidade variável por modalidade em função do equipamento utilizado.
- **Espaço:** um único espaço físico em operação, sem previsão de expansão no curto prazo.
- **Comissão:** comissão paga mensalmente, até o quinto dia útil do mês seguinte.
- **Aula experimental:** aula experimental cobrada, valor único de R$ 30,00, independente da modalidade.
- **Contratos:** planos mensais e semestrais, ambos com pagamento mensal parcelado. Não há modalidade de pagamento integral antecipado.
- **Equipe:** a proprietária acumula a administração do studio e a condução de aulas.

# 3. Visão Geral do Escopo

A Fase 1 do sistema é composta pelos módulos abaixo. Todos os requisitos detalhados no capítulo 5 pertencem a um destes módulos.

| **#** | **Módulo** | **Resumo** |
| --- | --- | --- |
| **M1** | Configuração Base | Modalidades com capacidade, espaços, horário de funcionamento e parâmetros operacionais configuráveis. |
| **M2** | Cadastro de Alunas | Cadastro administrativo, auto-matrícula pelo site, termo de aceite digital, ficha de anamnese e ficha da aluna. |
| **M3** | Pacotes e Contratos | Configuração de pacotes, vínculo ao contrato, renovação com saldo remanescente, alteração de plano com cálculo proporcional, isenção e bolsa, trancamento, suspensão e encerramento. |
| **M4** | Professoras e Categorias | Cadastro de professoras, categorias com valor por aula e termo de aceite. |
| **M5** | Grade de Horários | Cadastro de sessões recorrentes, validação de conflitos, alteração e exclusão com impacto controlado. |
| **M6** | Calendário de Exceções | Feriados, recessos e fechamentos, com cancelamento automático das sessões e devolução de crédito. |
| **M7** | Agendamento de Aulas | Reserva de vaga pela aluna dentro da janela de agendamento, consumo de saldo e regras de disponibilidade. |
| **M8** | Cancelamento e Justificativa | Cancelamento pela aluna com regra de antecedência, justificativa de falta e cancelamento pela professora com aprovação da administração. |
| **M9** | Presença e Chamada | Registro de presença pela professora, correção de chamada dentro do prazo e histórico de frequência. |
| **M10** | Comissão e Fechamento | Geração automática de comissão, fechamento mensal e registro de pagamento. |
| **M11** | Cobranças e Financeiro | Cobrança recorrente, retentativa, multa e juros, bloqueio por inadimplência, avisos de vencimento de contrato e regularização. |
| **M12** | Aula Experimental | Agendamento e pagamento de aula experimental, com limite por modalidade. |
| **M13** | Convênios Corporativos | Integração com Wellhub e TotalPass: espelhamento da grade, recebimento de reservas, validação de check-in e conciliação. |
| **M14** | Painéis e Indicadores | Painel administrativo, painel da professora e painel da aluna. |
| **M15** | Notificações | Comunicações transacionais por e-mail, com arquitetura preparada para WhatsApp na Fase 2. |
| **M16** | Perfis e Permissões | Perfis de acesso de administração, professora e aluna. |

# 4. Atores e Perfis de Acesso

| **Ator** | **Papel no sistema** |
| --- | --- |
| **Administração** | Acesso completo: configuração do studio, cadastros, pacotes, grade, calendário de exceções, aprovações, trancamento e suspensão, financeiro, comissão, convênios e painéis. |
| **Professora** | Consulta às próprias sessões, registro e correção de presença, solicitação de cancelamento de sessão e acompanhamento dos próprios ganhos. |
| **Aluna** | Consulta à grade disponível, agendamento e cancelamento das próprias aulas, envio de justificativa de falta, consulta ao próprio pacote, saldo, histórico de frequência e situação financeira. |
| **Aluna de convênio** | Agenda e cancela pelo aplicativo do convênio. No sistema do studio, aparece na grade e na lista de presença como qualquer outra aluna, sem acesso próprio ao portal. |
| **Interessada (visitante)** | Acesso público ao fluxo de auto-matrícula e ao agendamento de aula experimental, sem autenticação prévia. |

*Observação: a proprietária acumula os perfis de Administração e Professora. O sistema permite que um mesmo usuário possua mais de um perfil, alternando o contexto de navegação sem necessidade de segundo cadastro.*

# 5. Requisitos Funcionais

*Prioridades: MVP = obrigatório para o aceite desta contratação; Importante = incluído nesta contratação, podendo ser entregue em incremento posterior; Evolução = fora desta contratação (ver capítulo 12); Em definição = depende de definição da cliente (linhas destacadas).*

## 5.1 M1 — Configuração Base

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-CFG-01** | Cadastro de modalidades | Cadastro das modalidades oferecidas, com nome único e capacidade máxima de alunas. Nomes são normalizados em maiúsculas e a duplicidade é bloqueada. Modalidade vinculada a sessões ativas não pode ser excluída, apenas inativada. | MVP |
| **RF-CFG-02** | Capacidade por modalidade | A capacidade máxima de alunas é definida na modalidade, refletindo a limitação por equipamento utilizado. Aulas com barra comportam menos alunas que aulas sem equipamento realizadas no mesmo espaço. A sessão herda a capacidade da modalidade, com possibilidade de ajuste pontual. | MVP |
| **RF-CFG-03** | Cadastro de espaços | Cadastro opcional de espaços do studio. Utilizado para validação de conflito quando houver mais de um espaço em operação. Com espaço único cadastrado, a validação de conflito de sala é automática. | MVP |
| **RF-CFG-04** | Horário de funcionamento | Configuração dos dias da semana e da faixa de horário em que o studio opera. Sessões não podem ser criadas fora dessa faixa. Serve também de base para a exibição dos dias de atendimento no site. | MVP |
| **RF-CFG-05** | Parâmetros operacionais | Tela única de parâmetros configuráveis pela administração, sem intervenção técnica: janela de agendamento para alunas matriculadas, janela de agendamento para alunas de convênio, antecedência mínima de cancelamento, prazo de bloqueio por inadimplência, prazo de correção de chamada, dias adicionais por cancelamento do studio, limite de aulas experimentais, valor da aula experimental, prazo para envio de justificativa, percentuais de multa e juros e antecedências dos avisos de vencimento. | MVP |
| **RF-CFG-06** | Dados do studio | Cadastro dos dados de identificação do studio (nome, contato, endereço) utilizados nas comunicações automáticas e no termo de aceite. | MVP |

|  |  |
| --- | --- |
|  | **Decisão de UX**  A tela de parâmetros exibe, ao lado de cada campo, uma frase em linguagem natural com o efeito prático do valor informado. Exemplo: ao definir a janela de agendamento em 15 dias, o sistema exibe 'A aluna enxerga a grade até 15 dias à frente'. O objetivo é permitir que a administração ajuste regras sem depender de suporte. |

## 5.2 M2 — Cadastro de Alunas

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-ALU-01** | Cadastro administrativo | Cadastro de aluna pela administração com nome, e-mail, CPF, telefone, data de nascimento e contato de emergência. E-mail e CPF são únicos e a duplicidade é bloqueada com mensagem que orienta a localizar o cadastro existente. | MVP |
| **RF-ALU-02** | Vínculo de pacote no cadastro | Na mesma tela de cadastro é possível selecionar o pacote e a data da primeira cobrança, sem navegar para outra área. A data padrão é pré-preenchida com a data corrente e pode ser ajustada. | MVP |
| **RF-ALU-03** | Envio de acesso | Ao concluir o cadastro, o sistema envia e-mail com credencial de primeiro acesso, informação do saldo de aulas creditado e orientação para assinatura do termo de aceite. | MVP |
| **RF-ALU-04** | Auto-matrícula pelo site | Link público de matrícula no qual a interessada preenche seus dados, escolhe o pacote, aceita o termo, preenche a ficha de anamnese, efetua o pagamento e agenda a primeira aula em fluxo único. O acesso é liberado automaticamente após a confirmação do pagamento, sem aprovação manual. | MVP |
| **RF-ALU-05** | Termo de aceite digital | Exibição do termo de prestação de serviço com aceite explícito. O sistema registra identidade do usuário, data, hora, endereço IP e o conteúdo integral da versão aceita. | MVP |
| **RF-ALU-06** | Versionamento do termo | O termo é versionado. Alterações geram nova versão e o sistema identifica qual versão cada usuária aceitou, mantendo o histórico. | MVP |
| **RF-ALU-07** | Ficha de anamnese | Questionário de saúde apresentado junto ao termo de aceite, com respostas autodeclaradas pela aluna. Não há validação ou aprovação pela administração. As respostas ficam registradas na ficha da aluna e compõem o resguardo do studio quanto a condições preexistentes não informadas. | MVP |
| **RF-ALU-08** | Bloqueio até o aceite | O acesso ao agendamento permanece bloqueado até que o termo seja aceito e a anamnese preenchida. A aluna nessa condição aparece na lista com situação 'aguardando aceite'. | MVP |
| **RF-ALU-09** | Ficha da aluna | Visão consolidada: dados cadastrais, respostas da anamnese, pacote ativo, saldo de aulas, validade, situação financeira, histórico de frequência, histórico de pagamentos e histórico de contratos. | MVP |
| **RF-ALU-10** | Lista de alunas | Listagem com busca por nome e filtros por situação (ativa, inadimplente, trancada, suspensa, encerrada, aguardando aceite), por pacote a vencer e por condição de bolsista. | MVP |
| **RF-ALU-11** | Conteúdo da anamnese | Definição das perguntas que compõem a ficha de anamnese. | Em definição |
| **RF-ALU-12** | Anexo do contrato assinado | Quando o contrato jurídico estiver disponível, possibilidade de anexar o documento à versão do termo, mantendo o mesmo fluxo de aceite dentro do sistema. | Importante |

|  |  |
| --- | --- |
|  | **Definido na reunião**  A anamnese é preenchida pela própria aluna no momento do aceite do termo, com respostas autodeclaradas. Não há etapa de validação pela administração. |

## 5.3 M3 — Pacotes e Contratos

### 5.3.1 Configuração de pacotes

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PAC-01** | Cadastro de pacotes | Cadastro de pacotes com nome, valor mensal, quantidade de aulas por ciclo, quantidade de aulas por semana, duração do contrato em meses e validade do ciclo em dias. | MVP |
| **RF-PAC-02** | Acesso universal a modalidades | Qualquer pacote dá acesso a todas as modalidades ofertadas, sem restrição por tipo de aula. | MVP |
| **RF-PAC-03** | Pacote único ativo | Cada aluna possui um único pacote ativo por vez. A contratação de novo pacote ocorre por renovação ou por alteração de plano, nunca por acúmulo. | MVP |
| **RF-PAC-04** | Duração do contrato | O contrato pode ser mensal ou semestral. Em ambos os casos a cobrança é mensal e recorrente; não há modalidade de pagamento integral antecipado. | MVP |
| **RF-PAC-05** | Regra de vencimento | A data de vencimento é sempre a data de entrada da aluna. O sistema calcula automaticamente a data de encerramento do ciclo e do contrato. | MVP |
| **RF-PAC-06** | Inativação de pacote | Pacote pode ser inativado para novas contratações sem afetar os contratos vigentes que o utilizam. | MVP |

### 5.3.2 Renovação e saldo remanescente

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PAC-07** | Renovação automática | O ciclo é renovado automaticamente na data de vencimento, com nova cobrança e novo crédito de aulas. A aluna não precisa executar ação de renovação. | MVP |
| **RF-PAC-08** | Transferência de saldo | Na renovação do mesmo pacote, as aulas não realizadas do ciclo anterior são somadas ao novo ciclo. Exemplo: aluna com 1 aula não utilizada em pacote de 4 aulas inicia o novo ciclo com 5 aulas. | MVP |
| **RF-PAC-09** | Encerramento de contrato ao término | Ao final da vigência contratada, o contrato é encerrado e a aluna é notificada previamente para decidir sobre a renovação. | MVP |

### 5.3.3 Alteração de plano

A aluna pode solicitar alteração do plano contratado a qualquer momento, tanto para um plano de maior quanto de menor quantidade de aulas. A alteração é executada pela administração e produz efeito imediato, com apuração proporcional de valores e de saldo.

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PLN-01** | Alteração de plano | A administração pode alterar o plano de uma aluna a qualquer momento do ciclo, para plano de maior ou menor quantidade de aulas. | MVP |
| **RF-PLN-02** | Cálculo proporcional do valor | O sistema calcula o valor proporcional já consumido do plano vigente até a data da alteração, aplica esse valor como crédito e apura a diferença a pagar ou a devolver em relação ao novo plano. | MVP |
| **RF-PLN-03** | Cobrança da diferença | A diferença apurada é cobrada no ato da solicitação da alteração. Havendo saldo a favor da aluna, ele é aplicado como crédito na próxima cobrança. | MVP |
| **RF-PLN-04** | Ajuste do saldo de aulas | O saldo de aulas é recalculado: parte-se da quantidade de aulas do novo plano e subtraem-se as aulas já realizadas no ciclo corrente. Exemplo: aluna migra de 10 para 20 aulas tendo realizado 4; o saldo passa a ser 16 aulas. | MVP |
| **RF-PLN-05** | Preservação da vigência | A alteração de plano não prorroga a data de término do contrato. O novo saldo deve ser consumido dentro do período remanescente da vigência original. | MVP |
| **RF-PLN-06** | Prévia da alteração | Antes de confirmar, o sistema exibe: valor proporcional consumido, diferença a pagar ou a creditar, saldo de aulas resultante e data de término do contrato, que permanece inalterada. | MVP |
| **RF-PLN-07** | Registro da alteração | Toda alteração de plano registra autor, data, plano anterior, plano novo, valores apurados e saldo resultante, compondo o histórico do contrato. | MVP |

|  |  |
| --- | --- |
|  | **Decisão de UX**  A tela de alteração de plano apresenta um comparativo lado a lado — plano atual e plano novo — com o cálculo detalhado da diferença e do saldo resultante antes da confirmação. A administração enxerga exatamente o que será cobrado e quantas aulas a aluna terá, sem precisar calcular manualmente. |

### 5.3.4 Isenção e bolsa

Alunas bolsistas são alunas com desconto total ou parcial sobre o valor do pacote, concedido pela administração. O benefício afeta exclusivamente a dimensão financeira do contrato: a aluna bolsista possui saldo de aulas, agenda, cancela e repõe aulas exatamente como qualquer outra aluna, sujeita às mesmas regras de antecedência e disponibilidade.

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-BOL-01** | Marcação de bolsista | No cadastro administrativo, a administração pode marcar a aluna como bolsista e informar o percentual de desconto sobre o valor do pacote. Recurso exclusivo do perfil de administração, indisponível no fluxo de auto-matrícula e no perfil da professora. | MVP |
| **RF-BOL-02** | Percentual configurável | O desconto é informado em percentual, de 1% a 100%, permitindo isenção total ou parcial. | MVP |
| **RF-BOL-03** | Isenção total | Bolsista com 100% de desconto não gera cobrança. Nenhuma cobrança é criada, nenhuma tentativa é executada, nenhum aviso de vencimento de cobrança é enviado e a aluna nunca é marcada como inadimplente. | MVP |
| **RF-BOL-04** | Isenção parcial | Bolsista com desconto inferior a 100% gera cobrança recorrente sobre o valor líquido, seguindo integralmente as regras de cobrança, retentativa, multa, juros e bloqueio aplicáveis às demais alunas. | MVP |
| **RF-BOL-05** | Paridade operacional | A aluna bolsista possui pacote com quantidade definida de aulas, agenda e cancela aulas, está sujeita à regra de antecedência mínima, perde a aula em cancelamento fora do prazo, pode enviar justificativa e visualiza histórico de frequência, sem qualquer distinção operacional. | MVP |
| **RF-BOL-06** | Renovação de bolsista | A renovação preserva o percentual de desconto vigente, salvo alteração explícita pela administração. | MVP |
| **RF-BOL-07** | Alteração e revogação | A administração pode alterar o percentual ou revogar a bolsa a qualquer momento. A alteração vale a partir do próximo ciclo de cobrança, sem efeito retroativo. | MVP |
| **RF-BOL-08** | Registro de concessão | Toda concessão, alteração ou revogação registra autor, data, percentual anterior, percentual novo e motivo. | MVP |
| **RF-BOL-09** | Identificação na ficha | A condição de bolsista e o percentual vigente são exibidos na ficha da aluna e na lista de alunas, com filtro específico. | MVP |
| **RF-BOL-10** | Indicador de isenção | O painel administrativo apresenta a quantidade de alunas bolsistas ativas e o valor mensal não faturado em razão das isenções. | Importante |

|  |  |
| --- | --- |
|  | **Decisão de UX**  Ao informar o percentual de desconto, o sistema calcula e exibe imediatamente o valor que será cobrado da aluna, com o valor cheio riscado ao lado. Ao atingir 100%, a interface substitui o valor por 'Isenta — nenhuma cobrança será gerada'. |

### 5.3.5 Trancamento, suspensão e encerramento

Foram definidos dois mecanismos distintos de pausa, aplicáveis conforme a duração do contrato. Ambos são executados exclusivamente pelo perfil de administração, a partir de solicitação da aluna, e não estão disponíveis nos perfis de professora ou de aluna.

| **Mecanismo** | **Aplicação** | **Efeito na cobrança** | **Efeito na vigência** | **Efeito no agendamento** |
| --- | --- | --- | --- | --- |
| **Trancamento** | Contratos de duração semestral | Cobrança pausada durante o período | Validade congelada e prorrogada pelo período trancado | Agendamento bloqueado |
| **Suspensão** | Contratos de duração mensal | Cobrança mantida normalmente | Prazo adicional concedido para reposição | Agendamento bloqueado no período |

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-CTR-01** | Trancamento de contrato | A administração pode trancar contratos semestrais informando data de início, data de término prevista e motivo. Durante o trancamento a cobrança é pausada e a validade do pacote congelada. | MVP |
| **RF-CTR-02** | Retorno do trancamento | No retorno, a validade volta a correr pelo saldo de dias remanescente no momento do trancamento e o ciclo de cobrança é retomado. | MVP |
| **RF-CTR-03** | Suspensão de contrato | A administração pode suspender contratos mensais informando período e motivo. A cobrança é mantida, a aluna não consome aulas no período e recebe prazo adicional para reposição. | MVP |
| **RF-CTR-04** | Bloqueio durante pausa | Aluna com contrato trancado ou suspenso não visualiza a grade nem agenda aulas. Aulas já agendadas para o período são canceladas e o crédito devolvido. | MVP |
| **RF-CTR-05** | Limite por pacote | O limite máximo de dias de pausa é definido por pacote, proporcionalmente à quantidade de aulas contratada. Pacotes maiores conferem períodos maiores. | Em definição |
| **RF-CTR-06** | Prévia do efeito | Antes de confirmar, o sistema exibe o saldo de aulas congelado, a validade atual e a validade projetada após o retorno. | MVP |
| **RF-CTR-07** | Encerramento de contrato | A administração pode encerrar o contrato registrando motivo. A aluna perde o acesso ao agendamento, aulas futuras são canceladas e o cadastro permanece no histórico. | MVP |
| **RF-CTR-08** | Motivo de encerramento | O motivo é registrado em campo estruturado, permitindo relatório de motivos de saída. | MVP |
| **RF-CTR-09** | Reativação | Aluna com contrato encerrado pode ser reativada mediante contratação de novo pacote, preservando o histórico anterior. | MVP |

|  |  |
| --- | --- |
|  | **Ponto em aberto**  A cliente elaborará a tabela de limite de dias de pausa por pacote — quantidade de aulas contratada versus dias de trancamento ou suspensão permitidos. O sistema já será construído com esse limite parametrizável por pacote. |

## 5.4 M4 — Professoras e Categorias

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PRO-01** | Cadastro de professoras | Cadastro de professoras como prestadoras de serviço, com dados cadastrais, categoria vigente e acesso ao sistema. | MVP |
| **RF-PRO-02** | Categorias de professora | Cadastro de categorias com nome e valor por aula. A quantidade de categorias e os valores são livremente configuráveis pela administração. | MVP |
| **RF-PRO-03** | Vínculo e histórico de categoria | Cada professora possui uma categoria vigente. A alteração registra data de vigência e preserva o histórico, sem efeito retroativo sobre comissões já apuradas. | MVP |
| **RF-PRO-04** | Termo de aceite da professora | A professora assina termo de aceite no sistema, com o mesmo mecanismo de registro aplicado às alunas. O acesso permanece bloqueado até o aceite. | MVP |
| **RF-PRO-05** | Inativação de professora | Professora pode ser inativada. A inativação é bloqueada enquanto houver sessões futuras atribuídas a ela, com orientação para reatribuição. | MVP |
| **RF-PRO-06** | Valores das categorias | Nomes das categorias e valores por aula, em definição com assessoria jurídica. | Em definição |

## 5.5 M5 — Grade de Horários

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-GRD-01** | Cadastro de sessão | Cadastro de sessão recorrente com modalidade, professora, espaço, dias da semana, horário de início, horário de término, capacidade herdada da modalidade, data de início, data de término opcional e descrição. | MVP |
| **RF-GRD-02** | Múltiplos horários por sessão | O cadastro permite informar vários dias e horários em uma única operação, com validação individual de cada faixa. | MVP |
| **RF-GRD-03** | Validação de conflito de professora | O sistema bloqueia a criação ou alteração quando a professora já possui outra sessão no mesmo dia e horário, informando qual sessão gera o conflito e permitindo remover apenas a faixa conflitante. | MVP |
| **RF-GRD-04** | Validação de conflito de espaço | O sistema bloqueia a criação ou alteração quando o espaço já está ocupado no mesmo dia e horário, informando o conflito. | MVP |
| **RF-GRD-05** | Validação de funcionamento | A sessão não pode ser criada fora dos dias e da faixa de horário de funcionamento do studio. | MVP |
| **RF-GRD-06** | Visão semanal da grade | Visualização em calendário semanal com as sessões posicionadas por dia e horário, exibindo modalidade, horário de início e término, espaço, professora e ocupação atual sobre a capacidade. | MVP |
| **RF-GRD-07** | Alteração com alunas agendadas | Alteração de sessão com alunas agendadas exige confirmação explícita, exibindo previamente quantas alunas serão afetadas e o tratamento do crédito. | MVP |
| **RF-GRD-08** | Exclusão de sessão | A exclusão de sessão com alunas agendadas cancela os agendamentos futuros, devolve o crédito com prazo adicional e dispara notificação às alunas. | MVP |
| **RF-GRD-09** | Encerramento de sessão | Definição de data de término para retirar a sessão da grade a partir de determinada data, sem excluir o histórico de aulas realizadas. | MVP |
| **RF-GRD-10** | Respeito ao calendário de exceções | Sessões não são ofertadas em datas marcadas como exceção no calendário. | MVP |

## 5.6 M6 — Calendário de Exceções

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-EXC-01** | Cadastro de exceção | Cadastro de datas em que o studio não opera, com tipo (feriado, recesso, manutenção, fechamento) e descrição. | MVP |
| **RF-EXC-02** | Seleção de período | O calendário permite navegação por mês e ano, exibindo as exceções já cadastradas no período. | MVP |
| **RF-EXC-03** | Prévia de impacto | Antes de confirmar, o sistema exibe as sessões que serão canceladas e as alunas agendadas afetadas. | MVP |
| **RF-EXC-04** | Cancelamento automático | A confirmação cancela todas as sessões da data, devolve o crédito às alunas agendadas com prazo adicional de vigência e dispara notificação. | MVP |
| **RF-EXC-05** | Exibição do motivo | O motivo da exceção é exibido à aluna na grade, para que ela compreenda a indisponibilidade da data. | MVP |
| **RF-EXC-06** | Bloqueio de agendamento | Datas marcadas como exceção não aparecem como disponíveis para agendamento. | MVP |
| **RF-EXC-07** | Remoção de exceção | Exceção pode ser removida enquanto a data for futura. As sessões voltam a ficar disponíveis, sem restabelecimento automático dos agendamentos cancelados. | MVP |

|  |  |
| --- | --- |
|  | **Definido na reunião**  Quando houver aula em data de feriado, a exceção simplesmente não é cadastrada. Para cancelar apenas a sessão de uma professora específica naquela data, utiliza-se o fluxo de cancelamento de sessão, não o calendário de exceções. |

## 5.7 M7 — Agendamento de Aulas

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-AGD-01** | Grade disponível para a aluna | A aluna visualiza as sessões disponíveis dentro da janela de agendamento, com modalidade, data, horário, professora e vagas restantes. | MVP |
| **RF-AGD-02** | Janela de agendamento diferenciada | A janela de agendamento é configurável e admite valores distintos para alunas matriculadas e para alunas de convênio, permitindo priorizar o acesso das alunas matriculadas às vagas. | MVP |
| **RF-AGD-03** | Reserva de vaga | O agendamento reserva a vaga e desconta uma aula do saldo do pacote no momento da confirmação. | MVP |
| **RF-AGD-04** | Validação de saldo | O agendamento é bloqueado quando a aluna não possui saldo disponível, com mensagem orientando a renovação ou a alteração de plano. | MVP |
| **RF-AGD-05** | Validação de vigência | O agendamento é bloqueado para datas posteriores ao término da vigência do contrato. | MVP |
| **RF-AGD-06** | Validação de capacidade | O agendamento é bloqueado quando a sessão atinge a capacidade da modalidade, com indicação de que a lista de espera estará disponível em fase futura. | MVP |
| **RF-AGD-07** | Bloqueio por inadimplência | Aluna inadimplente não agenda novas aulas. Aulas já agendadas permanecem válidas. A tela exibe o motivo do bloqueio e o valor em aberto. | MVP |
| **RF-AGD-08** | Bloqueio por pausa | Aluna com contrato trancado ou suspenso não visualiza a grade para agendamento. | MVP |
| **RF-AGD-09** | Agendamento pela administração | A administração pode agendar, cancelar e remarcar aulas em nome de qualquer aluna, com registro de autoria. | MVP |
| **RF-AGD-10** | Agendamento na matrícula | No fluxo de auto-matrícula, a aluna agenda a primeira aula imediatamente após a confirmação do pagamento. | MVP |
| **RF-AGD-11** | Confirmação de agendamento | Após o agendamento, o sistema exibe o novo saldo, a regra de cancelamento aplicável e envia confirmação por e-mail. | MVP |

|  |  |
| --- | --- |
|  | **Decisão de UX**  O saldo de aulas e a data de vencimento do pacote permanecem visíveis de forma persistente no painel da aluna e na tela de grade. Quando a aluna está sem saldo, inadimplente ou com contrato pausado, a mensagem correspondente é exibida diretamente na tela da grade, com os botões de agendamento desabilitados. |

## 5.8 M8 — Cancelamento e Justificativa

### 5.8.1 Cancelamento pela aluna

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-CAN-01** | Cancelamento com antecedência | Cancelamento realizado com antecedência igual ou superior ao parâmetro configurado devolve o crédito ao saldo do pacote. | MVP |
| **RF-CAN-02** | Cancelamento sem antecedência | Cancelamento realizado abaixo da antecedência mínima desconta a aula do pacote, com aviso explícito antes da confirmação e oferta de envio de justificativa. | MVP |
| **RF-CAN-03** | Antecedência configurável | O prazo de antecedência mínima é configurável pela administração. Valor de referência: 4 horas. | MVP |
| **RF-CAN-04** | Reagendamento livre | A aluna pode cancelar e reagendar quantas vezes desejar dentro da vigência do contrato, inclusive para outra sessão no mesmo dia, desde que haja vaga. | MVP |
| **RF-CAN-05** | Uso do crédito | O crédito devolvido pode ser utilizado em qualquer sessão disponível dentro da vigência do contrato. | MVP |

### 5.8.2 Justificativa de falta

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-JUS-01** | Envio de justificativa | Aluna que cancelou abaixo da antecedência mínima ou faltou pode enviar justificativa com texto e anexo (atestado, comprovante ou imagem). | MVP |
| **RF-JUS-02** | Prazo de envio | Prazo máximo para envio contado da data da aula, configurável pela administração. Valor de referência: 7 dias. | MVP |
| **RF-JUS-03** | Fila de análise | As justificativas compõem fila no painel administrativo, com identificação da aluna, aula, data e anexo. | MVP |
| **RF-JUS-04** | Aprovação e recusa | A administração aprova ou recusa. A aprovação devolve o crédito ao saldo. A recusa mantém o desconto. | MVP |
| **RF-JUS-05** | Retorno à aluna | A aluna é notificada do resultado e visualiza o parecer no próprio histórico. | MVP |

### 5.8.3 Cancelamento pela professora

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-CPR-01** | Solicitação de cancelamento | A professora solicita o cancelamento de uma sessão específica informando data e motivo. A sessão permanece ativa até a decisão da administração. | MVP |
| **RF-CPR-02** | Fila de aprovação | As solicitações compõem fila no painel administrativo, com professora, sessão, data, motivo e alunas agendadas. | MVP |
| **RF-CPR-03** | Aprovação com substituição | Ao aprovar, a administração pode designar professora substituta. A sessão é mantida, as alunas são notificadas da troca e a comissão daquela aula é atribuída automaticamente à substituta. | MVP |
| **RF-CPR-04** | Aprovação com cancelamento | Ao aprovar sem substituta, a sessão daquela data é cancelada, o crédito é devolvido às alunas com prazo adicional e as alunas são notificadas. | MVP |
| **RF-CPR-05** | Recusa da solicitação | A administração pode recusar a solicitação, mantendo a sessão e notificando a professora. | MVP |
| **RF-CPR-06** | Acompanhamento pela professora | A professora acompanha a situação da solicitação: aguardando aprovação, aprovada com substituta, aprovada com cancelamento ou recusada. | MVP |
| **RF-CPR-07** | Prazo adicional de vigência | Sessão cancelada por iniciativa do studio concede dias adicionais de vigência às alunas afetadas. Valor de referência: 7 dias, configurável. | MVP |
| **RF-CPR-08** | Filtro por habilitação | Filtro de professoras habilitadas na modalidade na seleção de substituta. | Evolução |

## 5.9 M9 — Presença e Chamada

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PRE-01** | Sessões do dia | A professora visualiza suas sessões do dia com horário, modalidade, espaço, quantidade de alunas agendadas e situação da chamada. | MVP |
| **RF-PRE-02** | Lista de presença | A lista exibe as alunas com agendamento ativo, incluindo alunas de convênio. Alunas que cancelaram não aparecem. | MVP |
| **RF-PRE-03** | Marcação padrão | As alunas são apresentadas como presentes por padrão, cabendo à professora marcar apenas as ausências. | MVP |
| **RF-PRE-04** | Finalização da chamada | A finalização consolida os registros, gera a comissão da professora e encerra a edição ordinária. A tela exibe o valor da comissão gerada e a informação do período em que será paga. | MVP |
| **RF-PRE-05** | Correção de chamada | A chamada pode ser corrigida dentro do prazo configurado. A correção ajusta automaticamente a comissão apurada e o saldo da aluna quando aplicável. | MVP |
| **RF-PRE-06** | Bloqueio fora do prazo | Após o prazo, a chamada não pode ser alterada pela professora. A administração pode ajustar mediante registro de justificativa. | MVP |
| **RF-PRE-07** | Histórico da aluna | A aluna visualiza o histórico com data, modalidade, professora e registro de presença, falta ou cancelamento. | MVP |
| **RF-PRE-08** | Chamada não finalizada | Sessões com chamada não finalizada são sinalizadas no painel administrativo e no painel da professora. | MVP |

|  |  |
| --- | --- |
|  | **Decisão de UX**  A tela de chamada é otimizada para uso em celular durante a aula: lista vertical com área de toque ampla e todas as alunas pré-marcadas como presentes, exigindo da professora apenas a marcação das ausências. |

## 5.10 M10 — Comissão e Fechamento

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-COM-01** | Geração automática | A comissão é gerada automaticamente na finalização da chamada, pelo valor por aula da categoria vigente da professora na data da aula. | MVP |
| **RF-COM-02** | Registro por aula | Cada comissão registra data, sessão, modalidade, professora, categoria aplicada, valor e quantidade de presenças. | MVP |
| **RF-COM-03** | Comissão em substituição | Em caso de substituição de professora, a comissão da aula é atribuída à professora que efetivamente conduziu a sessão. | MVP |
| **RF-COM-04** | Período de apuração | O período de apuração é mensal, do primeiro ao último dia do mês. | MVP |
| **RF-COM-05** | Painel da professora | A professora acompanha aulas realizadas, valor por aula vigente, total acumulado no período, data de fechamento e data prevista de pagamento. | MVP |
| **RF-COM-06** | Fechamento de período | A administração fecha o período, visualizando o total a pagar por professora e o total geral. | MVP |
| **RF-COM-07** | Detalhamento conferível | Relatório com o detalhamento das aulas que compõem o valor de cada professora, para conferência antes do pagamento. | MVP |
| **RF-COM-08** | Registro de pagamento | Após o pagamento, a administração marca o fechamento como pago. O período fechado não aceita novos lançamentos. | MVP |
| **RF-COM-09** | Histórico de fechamentos | Consulta aos fechamentos anteriores, com valores e situação, disponível para administração e professora. | MVP |
| **RF-COM-10** | Ajuste em período fechado | Correção de chamada referente a período já fechado gera lançamento de ajuste no período seguinte, preservando o fechamento anterior. | MVP |

|  |  |
| --- | --- |
|  | **Definido na reunião**  O pagamento das professoras ocorre mensalmente, até o quinto dia útil do mês subsequente ao período apurado. Essa informação é exibida no painel da professora junto ao total acumulado. |

## 5.11 M11 — Cobranças e Financeiro

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-FIN-01** | Cobrança na contratação | A primeira cobrança é executada no ato da contratação. A aluna paga para então utilizar as aulas do ciclo. | MVP |
| **RF-FIN-02** | Cobrança recorrente | Cobrança automática executada na data de vencimento de cada contrato ativo, por meio de gateway de pagamento integrado. | MVP |
| **RF-FIN-03** | Retentativa automática | Em caso de falha, o sistema executa nova tentativa no dia seguinte, registrando cada tentativa com data, hora e retorno do gateway. | MVP |
| **RF-FIN-04** | Retentativa manual | A administração pode disparar nova tentativa de cobrança ou reenviar link de pagamento a qualquer momento. | MVP |
| **RF-FIN-05** | Marcação de inadimplência | Decorrido o prazo configurado sem pagamento, a aluna é marcada como inadimplente e o acesso ao agendamento é bloqueado. | MVP |
| **RF-FIN-06** | Multa e juros | Sobre o valor em aberto incidem multa e juros de mora conforme percentuais configuráveis. Valores de referência: multa de 2% e juros de 1% ao mês. | MVP |
| **RF-FIN-07** | Exibição do débito | A aluna inadimplente visualiza no próprio painel o valor original, a multa, os juros e o valor atualizado. | MVP |
| **RF-FIN-08** | Regularização automática | Confirmado o pagamento, a situação retorna a em dia e o acesso ao agendamento é restabelecido automaticamente. | MVP |
| **RF-FIN-09** | Aviso de término de contrato | Envio automático de aviso de proximidade do término da vigência do contrato, com antecedências configuráveis. Valores de referência: 15 e 3 dias. O aviso informa que a renovação é automática e orienta a aluna a procurar a administração caso deseje alterar ou encerrar o plano. | MVP |
| **RF-FIN-10** | Histórico financeiro | Histórico de cobranças por aluna com valor, vencimento, tentativas, situação e data de quitação. | MVP |
| **RF-FIN-11** | Painel de cobranças | Visão consolidada do período com totais por situação: recebido, a receber, com falha e em atraso. | MVP |
| **RF-FIN-12** | Registro manual de pagamento | Registro de pagamento realizado fora do gateway, com forma de pagamento, data e observação. | MVP |
| **RF-FIN-13** | Cancelamento de cobrança | Cancelamento de cobrança pendente pela administração, com registro de motivo. | MVP |
| **RF-FIN-14** | Gateway de pagamento | Definição do gateway a ser integrado. | Em definição |

|  |  |
| --- | --- |
|  | **Decisão de UX**  O texto do aviso de término de contrato evita indução ao cancelamento. Em vez de oferecer o cancelamento como ação principal, informa que a renovação é automática e sugere que a aluna procure a administração caso deseje ajustar o plano. |

|  |  |
| --- | --- |
|  | **Ponto em aberto**  A cliente verificará junto ao provedor de pagamento atualmente utilizado a disponibilidade de API de cobrança recorrente. Não havendo, serão avaliados Pagar.me, Stripe, Mercado Pago ou equivalente, com decisão pela melhor taxa. Do ponto de vista de integração, as opções são equivalentes em esforço. |

## 5.12 M12 — Aula Experimental

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-EXP-01** | Fluxo iniciado pela agenda | A interessada visualiza primeiro a grade de horários disponíveis, seleciona a aula desejada e apenas então efetua o pagamento. O fluxo evita pagamento sem horário compatível e a consequente solicitação de reembolso. | MVP |
| **RF-EXP-02** | Cadastro obrigatório | O agendamento exige cadastro no sistema, ainda que sem contratação de pacote. | MVP |
| **RF-EXP-03** | Limite por modalidade | Cada pessoa pode realizar uma aula experimental por modalidade, controlado por CPF. O limite é configurável pela administração. | MVP |
| **RF-EXP-04** | Valor configurável | A aula experimental possui valor único, independente da modalidade, configurável na tela de parâmetros. Valor de referência: R$ 30,00. | MVP |
| **RF-EXP-05** | Confirmação por pagamento | A vaga é confirmada após a confirmação do pagamento. | MVP |
| **RF-EXP-06** | Presença na chamada | A aluna experimental aparece na lista de presença identificada como experimental. | MVP |
| **RF-EXP-07** | Conversão em matrícula | Após a aula, a interessada pode contratar pacote pelo próprio painel, preservando o cadastro existente. | MVP |
| **RF-EXP-08** | Relatório de conversão | Relação de aulas experimentais realizadas no período e taxa de conversão em matrícula. | Importante |

|  |  |
| --- | --- |
|  | **Definido na reunião**  O fluxo da aula experimental é invertido em relação ao da matrícula: primeiro a escolha do horário na grade, depois o pagamento. Para a contratação de pacote, o fluxo permanece pagamento antes do agendamento. |

## 5.13 M13 — Convênios Corporativos

O studio atende Wellhub e TotalPass, com aproximadamente 20 alunas ativas e cerca de 100 check-ins mensais. A integração é considerada essencial para a Fase 1: sem ela, as alunas de convênio não conseguiriam agendar, uma vez que o fluxo ocorre integralmente dentro dos aplicativos dos convênios.

O modelo de operação previsto reproduz o funcionamento atual: a grade do studio é espelhada nos aplicativos dos convênios; a aluna reserva a vaga pelo aplicativo do convênio; a reserva é refletida na agenda do studio em tempo real; e o check-in realizado pela aluna no local é validado automaticamente, condição para o repasse financeiro.

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-CNV-01** | Espelhamento da grade | As sessões da grade são publicadas nos convênios, com modalidade, data, horário, professora e vagas disponíveis, mantendo-se sincronizadas a cada alteração. | MVP |
| **RF-CNV-02** | Seleção de sessões espelhadas | A administração define quais sessões são disponibilizadas aos convênios, podendo excluir sessões específicas do espelhamento. | MVP |
| **RF-CNV-03** | Recebimento de reserva | O sistema recebe as reservas originadas nos aplicativos dos convênios e as registra na sessão correspondente, ocupando vaga. | MVP |
| **RF-CNV-04** | Confirmação de reserva | O sistema responde à solicitação de reserva confirmando ou recusando conforme a disponibilidade de vaga, dentro do prazo exigido pelo convênio. | MVP |
| **RF-CNV-05** | Recebimento de cancelamento | Cancelamentos realizados pela aluna no aplicativo do convênio liberam a vaga na sessão correspondente. | MVP |
| **RF-CNV-06** | Validação de check-in | O check-in realizado pela aluna no aplicativo do convênio é recebido e validado automaticamente pelo sistema, sem necessidade de confirmação manual. | MVP |
| **RF-CNV-07** | Controle de vagas | As vagas ocupadas por alunas de convênio compõem a capacidade total da sessão, respeitando o limite da modalidade. | MVP |
| **RF-CNV-08** | Janela de agendamento própria | A janela de agendamento aplicável às alunas de convênio é configurável de forma independente da janela das alunas matriculadas. | MVP |
| **RF-CNV-09** | Identificação na chamada | Alunas de convênio aparecem na lista de presença identificadas, com indicação de check-in realizado ou pendente. | MVP |
| **RF-CNV-10** | Presença sem check-in | A professora pode registrar a presença de aluna de convênio que compareceu sem realizar o check-in no aplicativo, para fins de controle interno de ocupação. O registro não substitui o check-in do convênio nem gera repasse. | MVP |
| **RF-CNV-11** | Relatório de convênios | Relatório com reservas, check-ins validados, ausências e reservas sem check-in por período e por convênio, para conferência do repasse. | MVP |
| **RF-CNV-12** | Registro de credenciais | Área de configuração para registro das credenciais de integração de cada convênio, sem intervenção técnica. | MVP |
| **RF-CNV-13** | Contingência | Havendo indisponibilidade da integração, a administração pode registrar manualmente a reserva e a presença da aluna de convênio. | MVP |

|  |  |
| --- | --- |
|  | **Dependência crítica**  A integração exige homologação prévia de FGC Digital como sistema de gestão parceiro junto a Wellhub e TotalPass. Trata-se de processo comercial e técnico conduzido por essas plataformas, com prazo não controlado pela FGC Digital. O detalhamento consta no capítulo 11. |

## 5.14 M14 — Painéis e Indicadores

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PNL-01** | Painel administrativo | Visão consolidada com alunas ativas, alunas inadimplentes, receita do período, aulas realizadas, comissão gerada e contratos a vencer. | MVP |
| **RF-PNL-02** | Ocupação das sessões | Indicador de ocupação por sessão, destacando turmas com lotação máxima e turmas com baixa procura, apoiando a decisão de abrir novas turmas ou promover horários ociosos. | MVP |
| **RF-PNL-03** | Pendências de ação | Bloco de pendências reunindo solicitações de cancelamento, justificativas aguardando análise e chamadas não finalizadas. | MVP |
| **RF-PNL-04** | Painel da professora | Sessões do dia, aulas realizadas no período, valor por aula vigente, total acumulado, data de fechamento e data prevista de pagamento. | MVP |
| **RF-PNL-05** | Painel da aluna | Saldo de aulas, validade do pacote, data da próxima cobrança, próximas aulas agendadas, situação financeira e histórico de frequência. | MVP |
| **RF-PNL-06** | Exportação | Exportação em CSV das listagens de alunas, cobranças, comissões e convênios. | Importante |

|  |  |
| --- | --- |
|  | **Decisão de UX**  O painel administrativo abre pelo bloco de pendências, e não pelos indicadores. A primeira informação apresentada é o que exige ação naquele momento, reduzindo o risco de solicitações e justificativas ficarem sem tratamento. |

## 5.15 M15 — Notificações

Na Fase 1 todas as comunicações transacionais são enviadas por e-mail. A arquitetura é construída com abstração de canal, de modo que a inclusão do WhatsApp na Fase 2 não exija reescrita das regras de disparo.

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-NOT-01** | Primeiro acesso | E-mail com credencial de primeiro acesso e orientação para aceite do termo. | MVP |
| **RF-NOT-02** | Confirmação de agendamento | E-mail com data, horário, modalidade, professora e regra de cancelamento aplicável. | MVP |
| **RF-NOT-03** | Cancelamento pelo studio | E-mail às alunas afetadas informando o crédito devolvido e o prazo adicional concedido. | MVP |
| **RF-NOT-04** | Substituição de professora | E-mail às alunas agendadas informando a troca na data específica. | MVP |
| **RF-NOT-05** | Alteração de sessão | E-mail às alunas agendadas quando a sessão tem horário ou dia alterado. | MVP |
| **RF-NOT-06** | Aviso de término de contrato | E-mail nas antecedências configuradas, informando a renovação automática. | MVP |
| **RF-NOT-07** | Cobrança e inadimplência | E-mail de falha de cobrança, marcação de inadimplência e confirmação de pagamento. | MVP |
| **RF-NOT-08** | Resultado de justificativa | E-mail à aluna com o resultado da análise. | MVP |
| **RF-NOT-09** | Solicitação de cancelamento | E-mail à administração sobre nova solicitação e à professora sobre a decisão. | MVP |
| **RF-NOT-10** | Abstração de canal | Camada de notificação independente de canal, permitindo inclusão do WhatsApp sem alteração das regras de disparo. | MVP |
| **RF-NOT-11** | Registro de envio | Registro de todas as notificações disparadas com destinatário, evento, canal, data e situação. | MVP |

## 5.16 M16 — Perfis e Permissões

| **ID** | **Requisito** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| **RF-PER-01** | Perfis de acesso | Três perfis na Fase 1: Administração, Professora e Aluna, cada um com acesso restrito às funcionalidades correspondentes. | MVP |
| **RF-PER-02** | Acúmulo de perfis | Um mesmo usuário pode possuir mais de um perfil, alternando o contexto de navegação sem novo cadastro. | MVP |
| **RF-PER-03** | Restrição de operações críticas | Trancamento, suspensão, encerramento de contrato, concessão de bolsa e alteração de plano são exclusivos do perfil de administração. | MVP |
| **RF-PER-04** | Autenticação | Autenticação por e-mail e senha, com definição de senha no primeiro acesso e recuperação por e-mail. | MVP |
| **RF-PER-05** | Trilha de auditoria | Registro de autor, data e hora em todas as operações que alterem contrato, saldo, situação financeira, chamada ou comissão. | MVP |

# 6. Regras de Negócio

| **ID** | **Regra** |
| --- | --- |
| **RN-01** | Cada aluna possui um único pacote ativo por vez, e o pacote dá acesso a todas as modalidades ofertadas, sem restrição por tipo de aula. |
| **RN-02** | A capacidade máxima de alunas é definida pela modalidade, não pelo espaço físico, refletindo a limitação por equipamento utilizado. |
| **RN-03** | A data de vencimento do contrato é sempre a data de entrada da aluna. A primeira cobrança é executada no ato da contratação. |
| **RN-04** | Contratos mensais e semestrais são cobrados mensalmente. Não há modalidade de pagamento integral antecipado. |
| **RN-05** | Na renovação do mesmo pacote, o saldo de aulas não utilizadas é transferido para o novo ciclo. |
| **RN-06** | Na alteração de plano, o valor proporcional já consumido é apurado e a diferença cobrada no ato. O saldo de aulas passa a ser a quantidade do novo plano menos as aulas já realizadas no ciclo. A data de término do contrato não é prorrogada. |
| **RN-07** | Cancelamento com antecedência igual ou superior ao parâmetro configurado devolve o crédito ao saldo. Abaixo desse prazo, a aula é descontada, salvo justificativa aprovada pela administração. |
| **RN-08** | A aluna pode cancelar e reagendar quantas vezes desejar dentro da vigência do contrato, inclusive para outra sessão no mesmo dia, desde que haja vaga. |
| **RN-09** | Sessão cancelada por iniciativa do studio devolve o crédito às alunas afetadas e concede dias adicionais de vigência ao contrato. |
| **RN-10** | Aluna inadimplente não agenda novas aulas. Aulas já agendadas antes do bloqueio permanecem válidas. |
| **RN-11** | Sessão não pode ser criada quando houver conflito de horário para a professora ou para o espaço, nem fora do horário de funcionamento do studio. |
| **RN-12** | A comissão da professora é apurada pelo valor da categoria vigente na data da aula, gerada automaticamente na finalização da chamada. |
| **RN-13** | Em substituição de professora, a comissão da aula é atribuída à professora que efetivamente conduziu a sessão. |
| **RN-14** | Alteração de categoria de professora não possui efeito retroativo sobre comissões já apuradas. |
| **RN-15** | Correção de chamada referente a período de comissão já fechado gera lançamento de ajuste no período seguinte, preservando o fechamento anterior. |
| **RN-16** | O período de apuração de comissão é mensal, com pagamento até o quinto dia útil do mês subsequente. |
| **RN-17** | Aluna bolsista com 100% de desconto não gera cobrança, tentativa de cobrança, aviso de vencimento de cobrança ou marcação de inadimplência. |
| **RN-18** | Aluna bolsista com desconto parcial segue integralmente as regras de cobrança, retentativa, multa, juros e bloqueio aplicáveis às demais alunas. |
| **RN-19** | A condição de bolsista afeta exclusivamente a dimensão financeira do contrato. Saldo de aulas, agendamento, cancelamento, justificativa e frequência seguem as mesmas regras. |
| **RN-20** | Trancamento aplica-se a contratos semestrais: pausa a cobrança e congela a validade. Suspensão aplica-se a contratos mensais: mantém a cobrança e concede prazo adicional para reposição. Em ambos, o agendamento é bloqueado no período. |
| **RN-21** | Trancamento, suspensão, encerramento de contrato, concessão de bolsa e alteração de plano são operações exclusivas do perfil de administração. |
| **RN-22** | O acesso ao sistema permanece bloqueado até o aceite do termo e o preenchimento da anamnese, tanto para alunas quanto para professoras, no que couber. |
| **RN-23** | O aceite do termo registra identidade do usuário autenticado, data, hora, endereço IP e a versão integral do conteúdo aceito. |
| **RN-24** | Datas marcadas no calendário de exceções não ficam disponíveis para agendamento e cancelam automaticamente as sessões da data, com devolução de crédito. Para manter aula em feriado, a exceção simplesmente não é cadastrada. |
| **RN-25** | A janela de agendamento é configurável e pode ser distinta para alunas matriculadas e alunas de convênio, priorizando o acesso das matriculadas. |
| **RN-26** | Alunas que cancelaram não aparecem na lista de presença da sessão. |
| **RN-27** | Solicitação de cancelamento feita pela professora não cancela a sessão. A sessão permanece ativa até a decisão da administração. |
| **RN-28** | Cada pessoa pode realizar uma aula experimental por modalidade, controlado por CPF, com valor único configurável. |
| **RN-29** | No fluxo de aula experimental, a escolha do horário precede o pagamento. No fluxo de contratação de pacote, o pagamento precede o agendamento. |
| **RN-30** | Vagas ocupadas por alunas de convênio compõem a capacidade total da sessão, respeitando o limite da modalidade. |
| **RN-31** | O registro manual de presença de aluna de convênio sem check-in serve a controle interno e não substitui o check-in do convênio nem gera repasse financeiro. |
| **RN-32** | Toda operação que altere contrato, saldo, situação financeira, chamada ou comissão registra autor, data e hora. |
| **RN-33** | Na Fase 1 todas as comunicações transacionais são enviadas por e-mail. A inclusão de canal é tratada como configuração, não como alteração de regra. |

# 7. Fluxos de Processo (To-Be)

## 7.1 Auto-matrícula pelo site

1. A interessada acessa o link público de matrícula.

1. Preenche os dados cadastrais e escolhe o pacote entre os disponíveis.
2. Visualiza o termo de prestação de serviço e registra o aceite. O sistema grava identidade, data, hora, IP e versão do termo.
3. Preenche a ficha de anamnese, com respostas autodeclaradas.
4. Efetua o pagamento pelo gateway integrado.
5. Com o pagamento confirmado, o contrato é ativado, o saldo de aulas é creditado e o acesso é liberado automaticamente.
6. A aluna agenda a primeira aula na grade disponível, ainda dentro do fluxo de inscrição.
7. O sistema envia e-mail de boas-vindas com a credencial de acesso e a confirmação da aula agendada.

## 7.2 Aula experimental

8. A interessada acessa a página pública de aula experimental.
9. Visualiza a grade de horários disponíveis e seleciona a aula desejada.
10. Preenche os dados cadastrais, incluindo CPF, utilizado para o controle de limite por modalidade.
11. O sistema verifica se já houve aula experimental naquela modalidade para o CPF informado.
12. Aceita o termo e preenche a ficha de anamnese.
13. Efetua o pagamento do valor configurado para a aula experimental.
14. Confirmado o pagamento, a vaga é reservada e a interessada recebe confirmação por e-mail.
15. Na chamada, a aluna aparece identificada como experimental.
16. Após a aula, pode contratar pacote pelo próprio painel, preservando o cadastro.

## 7.3 Cadastro administrativo com bolsa

17. A administração inicia novo cadastro de aluna.
18. Preenche os dados e seleciona o pacote.
19. Marca a aluna como bolsista e informa o percentual de desconto.
20. O sistema calcula e exibe imediatamente o valor a ser cobrado, com o valor cheio riscado. Em 100%, exibe a indicação de isenção total.
21. A administração confirma. O sistema registra a concessão com autor, data, percentual e motivo.
22. A aluna recebe e-mail de primeiro acesso e o contrato é ativado após o aceite do termo e o preenchimento da anamnese.
23. Para isenção total, nenhuma cobrança é gerada. Para isenção parcial, a cobrança recorrente incide sobre o valor líquido.

## 7.4 Alteração de plano

24. A aluna solicita a alteração à administração.
25. A administração acessa o contrato e seleciona o novo plano.
26. O sistema apura o valor proporcional já consumido do plano vigente até a data corrente.
27. Calcula a diferença entre o valor proporcional consumido e o valor do novo plano.
28. Recalcula o saldo de aulas: quantidade do novo plano menos as aulas já realizadas no ciclo.
29. Exibe a prévia com valor a pagar ou a creditar, saldo resultante e data de término do contrato, que permanece inalterada.
30. Confirmada a alteração, a diferença é cobrada no ato ou aplicada como crédito na próxima cobrança.
31. O sistema registra a alteração no histórico do contrato e notifica a aluna.

## 7.5 Agendamento e realização da aula

32. A aluna acessa a grade e visualiza as sessões disponíveis dentro da janela de agendamento aplicável ao seu perfil.
33. Seleciona a sessão. O sistema valida saldo, vigência, situação financeira, situação de pausa e disponibilidade de vaga.
34. Confirmado o agendamento, uma aula é descontada do saldo e a vaga é reservada. A aluna recebe confirmação por e-mail.
35. No dia da aula, a professora acessa suas sessões e abre a lista de presença, que exibe as alunas com agendamento ativo, incluindo alunas de convênio.
36. As alunas são apresentadas como presentes por padrão; a professora marca apenas as ausências.
37. A professora finaliza a chamada e visualiza o valor da comissão gerada e o período em que será paga.
38. A aula passa a compor o histórico de frequência da aluna.

## 7.6 Cancelamento pela aluna e reposição

39. A aluna acessa suas aulas agendadas e solicita o cancelamento.
40. O sistema verifica a antecedência em relação ao horário da aula.
41. Com antecedência suficiente, informa que o crédito retorna ao saldo e confirma o cancelamento.
42. Abaixo da antecedência mínima, informa que a aula será descontada e oferece o envio de justificativa.
43. Optando pela justificativa, a aluna anexa o comprovante e o registro entra na fila de análise da administração.
44. A administração analisa e decide. Aprovada, o crédito retorna ao saldo. Recusada, o desconto é mantido.
45. A aluna é notificada do resultado e, havendo crédito, reagenda em qualquer sessão dentro da vigência.

## 7.7 Cancelamento solicitado pela professora

46. A professora acessa suas sessões e solicita o cancelamento de uma data específica, informando o motivo.
47. A sessão permanece ativa e a solicitação entra na fila de aprovação do painel administrativo.
48. A administração analisa, visualizando as alunas agendadas naquela data.
49. Optando pela substituição, seleciona professora disponível. A sessão é mantida, as alunas são notificadas da troca e a comissão é atribuída à substituta.
50. Optando pelo cancelamento, a sessão é cancelada, o crédito é devolvido às alunas e o prazo adicional de vigência é concedido.
51. As alunas afetadas e a professora solicitante são notificadas da decisão.

## 7.8 Trancamento e suspensão

52. A aluna procura a administração informando o motivo do afastamento.
53. A administração acessa o contrato e identifica se o caso comporta trancamento ou suspensão, conforme a duração do contrato.
54. Informa data de início, data de término prevista e motivo.
55. O sistema valida o limite de dias permitido para o pacote contratado.
56. Exibe a prévia: saldo congelado, validade atual e validade projetada no retorno.
57. Confirmada a operação, as aulas agendadas no período são canceladas e o crédito devolvido.
58. Em trancamento, a cobrança é pausada. Em suspensão, a cobrança segue normalmente.
59. No retorno, o agendamento é liberado e, em trancamento, a cobrança é retomada.

## 7.9 Ciclo de cobrança e inadimplência

60. Na data de vencimento, o sistema executa a cobrança pelo gateway integrado.
61. Confirmado o pagamento, a situação permanece em dia, o novo ciclo é iniciado e o saldo de aulas creditado.
62. Em caso de falha, o sistema registra a tentativa e executa nova tentativa no dia seguinte.
63. Persistindo a falha pelo prazo configurado, a aluna é marcada como inadimplente e o acesso ao agendamento é bloqueado.
64. Sobre o valor em aberto passam a incidir multa e juros.
65. A aluna é notificada a cada etapa e visualiza o valor atualizado no próprio painel.
66. A administração pode disparar nova tentativa ou reenviar link de pagamento.
67. Regularizado o pagamento, a situação retorna a em dia e o acesso é restabelecido automaticamente.
68. Contratos de alunas bolsistas com isenção total não entram neste fluxo.

## 7.10 Fluxo de aluna de convênio

69. As sessões selecionadas para espelhamento são publicadas nos aplicativos dos convênios, com vagas atualizadas.
70. A aluna de convênio visualiza a grade no aplicativo do convênio e reserva a vaga.
71. O sistema recebe a solicitação de reserva, valida a disponibilidade e confirma ou recusa dentro do prazo exigido.
72. Confirmada, a vaga é ocupada na sessão e a ocupação é atualizada em ambos os sistemas.
73. No dia da aula, a aluna realiza o check-in pelo aplicativo do convênio no local.
74. O sistema recebe e valida o check-in automaticamente, condição para o repasse financeiro.
75. Na lista de presença, a aluna aparece identificada como de convênio, com indicação de check-in realizado ou pendente.
76. Comparecendo sem realizar o check-in, a professora pode registrar a presença para controle interno, sem efeito no repasse.
77. O relatório de convênios consolida reservas, check-ins validados, ausências e reservas sem check-in para conferência do repasse.

## 7.11 Fechamento de comissão

78. Ao longo do mês, cada chamada finalizada gera automaticamente os lançamentos de comissão.
79. Ao final do período, a administração acessa o fechamento e visualiza o total acumulado por professora.
80. Consulta o detalhamento das aulas que compõem o valor de cada professora.
81. Confirmado o fechamento, o período é encerrado e não aceita novos lançamentos.
82. Realizado o pagamento até o quinto dia útil, a administração marca o fechamento como pago.
83. O fechamento passa a compor o histórico, consultável pela administração e pela professora.
84. Correções de chamada posteriores ao fechamento geram lançamento de ajuste no período seguinte.

# 8. Modelo Conceitual de Dados

Entidades principais e atributos essenciais. O modelo físico será derivado no design técnico.

| **Entidade** | **Atributos principais** |
| --- | --- |
| **Studio** | Nome, contato, endereço, dias e faixa de horário de funcionamento. |
| **Parâmetro** | Chave, valor, descrição. Janela de agendamento matriculadas, janela de agendamento convênio, antecedência de cancelamento, prazo de inadimplência, prazo de correção de chamada, dias adicionais por cancelamento do studio, limite de experimentais, valor da experimental, prazo de justificativa, multa, juros, antecedências de aviso. |
| **Modalidade** | Nome, capacidade máxima de alunas, situação. |
| **Espaço** | Nome, situação. |
| **Usuário** | Nome, e-mail, CPF, senha, situação, perfis vinculados. |
| **Aluna** | Usuário, telefone, data de nascimento, contato de emergência, origem (direta ou convênio), situação. |
| **Anamnese** | Aluna, respostas, data de preenchimento, versão do questionário. |
| **Professora** | Usuário, categoria vigente, situação. |
| **CategoriaProfessora** | Nome, valor por aula, situação. |
| **HistóricoCategoria** | Professora, categoria, data de início de vigência, autor. |
| **TermoAceite** | Versão, conteúdo, data de publicação, situação. |
| **AceiteRegistrado** | Usuário, versão do termo, data e hora, endereço IP, conteúdo aceito. |
| **Pacote** | Nome, valor mensal, quantidade de aulas por ciclo, aulas por semana, duração em meses, validade do ciclo em dias, limite de dias de pausa, situação. |
| **Contrato** | Aluna, pacote, data de início, data de vencimento do ciclo, data de término do contrato, saldo de aulas, dias adicionais concedidos, situação (ativo, trancado, suspenso, encerrado), percentual de bolsa. |
| **HistóricoPlano** | Contrato, plano anterior, plano novo, valor proporcional apurado, diferença cobrada, saldo anterior, saldo resultante, autor, data. |
| **HistóricoBolsa** | Contrato, percentual anterior, percentual novo, motivo, autor, data. |
| **Pausa** | Contrato, tipo (trancamento ou suspensão), data de início, data de término prevista, data de retorno efetivo, dias congelados, motivo, autor. |
| **Sessão** | Modalidade, professora, espaço, dias da semana, horário de início, horário de término, capacidade, data de início, data de término, descrição, espelhamento em convênio, situação. |
| **OcorrênciaSessão** | Sessão, data específica, professora efetiva, situação (ativa, cancelada), motivo do cancelamento. |
| **Agendamento** | Aluna, ocorrência de sessão, origem (portal, administração ou convênio), data e hora, situação (ativo, cancelado, realizado), origem do cancelamento, indicador de aula experimental. |
| **ExceçãoCalendário** | Data, tipo, descrição, autor, data de criação. |
| **Chamada** | Ocorrência de sessão, professora, data e hora de finalização, situação. |
| **RegistroPresença** | Chamada, aluna, situação (presente, ausente), indicador de check-in de convênio, data e hora, autor. |
| **Justificativa** | Agendamento, aluna, texto, anexo, situação (pendente, aprovada, recusada), parecer, autor da análise, data. |
| **SolicitaçãoCancelamento** | Sessão, data, professora solicitante, motivo, situação, decisão, professora substituta, autor da decisão, data. |
| **Comissão** | Chamada, professora, categoria aplicada, valor, data da aula, período de fechamento, situação. |
| **FechamentoComissão** | Período de início e fim, total geral, situação (aberto, fechado, pago), data de fechamento, data de pagamento, autor. |
| **Cobrança** | Contrato, valor bruto, percentual de bolsa, valor líquido, multa, juros, data de vencimento, situação, data de quitação, identificador no gateway. |
| **TentativaCobrança** | Cobrança, data e hora, retorno do gateway, situação, origem (automática ou manual). |
| **ConvênioIntegração** | Convênio, credenciais, situação da integração, data da última sincronização. |
| **ReservaConvênio** | Convênio, identificador externo, aluna, ocorrência de sessão, situação, check-in validado, data e hora do check-in. |
| **Notificação** | Destinatário, evento, canal, conteúdo, data de envio, situação do envio. |
| **RegistroAuditoria** | Entidade afetada, operação, autor, data e hora, valores anterior e novo. |

# 9. Requisitos Não Funcionais

| **ID** | **Categoria** | **Requisito** |
| --- | --- | --- |
| **RNF-01** | Acesso | Aplicação web responsiva, utilizável em computador e celular por navegador, sem instalação. A tela de chamada e o fluxo de agendamento são otimizados para uso em celular. |
| **RNF-02** | Disponibilidade | Sistema disponível em ambiente de produção com hospedagem gerenciada e reinicialização automática em caso de falha. |
| **RNF-03** | Backup | Rotina automática diária de backup do banco de dados, com retenção mínima de 7 dias e procedimento de restauração verificado. |
| **RNF-04** | Segurança de acesso | Autenticação por e-mail e senha, senhas armazenadas com algoritmo de hash, sessão com expiração e recuperação de senha por e-mail. |
| **RNF-05** | Proteção de dados | Tratamento de dados pessoais em conformidade com a LGPD. As respostas da ficha de anamnese constituem dado pessoal sensível e recebem tratamento restrito: acesso limitado ao perfil de administração, registro de consentimento específico no aceite e armazenamento com controle de acesso reforçado. |
| **RNF-06** | Auditoria | Trilha de auditoria imutável para operações que alterem contrato, saldo, situação financeira, chamada ou comissão. |
| **RNF-07** | Integridade financeira | Operações de cobrança e de alteração de saldo executadas de forma transacional, sem possibilidade de duplicidade de cobrança ou de crédito. |
| **RNF-08** | Idempotência | Rotinas automáticas de cobrança e de notificação são idempotentes, garantindo que reexecuções não gerem cobranças ou mensagens duplicadas. |
| **RNF-09** | Concorrência de vagas | A reserva de vaga é executada com controle de concorrência, impedindo que a capacidade da sessão seja excedida por agendamentos simultâneos originados no portal e nos convênios. |
| **RNF-10** | Tempo de resposta de integração | As respostas às solicitações dos convênios respeitam os prazos exigidos por cada plataforma, com registro de falhas e reprocessamento. |
| **RNF-11** | Desempenho | Tempo de resposta inferior a 2 segundos nas operações de consulta e agendamento em condições normais de uso. |
| **RNF-12** | Entrega de e-mail | Serviço de e-mail transacional com autenticação de domínio, monitoramento de entrega e registro de falhas. |
| **RNF-13** | Fuso horário | Todas as datas e horários tratados no fuso horário local do studio, incluindo o cálculo da antecedência de cancelamento. |
| **RNF-14** | Extensibilidade de canal | Camada de notificação desacoplada do canal de envio, permitindo inclusão do WhatsApp na Fase 2 sem alteração das regras de disparo. |
| **RNF-15** | Ambientes | Ambiente de homologação separado do ambiente de produção, para validação das entregas antes da publicação. |
| **RNF-16** | Acessibilidade | Contraste adequado, foco de teclado visível e navegação por teclado nas telas de uso frequente. |

# 10. Relatórios e Indicadores Contratados

| **ID** | **Relatório / Indicador** | **Descrição** |
| --- | --- | --- |
| **REL-01** | Alunas ativas | Relação de alunas com contrato ativo, pacote, saldo de aulas e situação financeira. |
| **REL-02** | Inadimplência | Relação de alunas inadimplentes com valor original, multa, juros, valor atualizado e dias em atraso. |
| **REL-03** | Receita do período | Total faturado no período, com separação entre valor recebido e valor em aberto. |
| **REL-04** | Contratos a vencer | Relação de contratos com término nos próximos dias, para ação de renovação. |
| **REL-05** | Ocupação das sessões | Percentual de ocupação por sessão no período, com separação entre alunas matriculadas e de convênio. |
| **REL-06** | Frequência por aluna | Histórico de presenças, faltas e cancelamentos por aluna no período. |
| **REL-07** | Comissão por professora | Detalhamento das aulas e valores que compõem a comissão de cada professora no período. |
| **REL-08** | Fechamentos de comissão | Histórico de fechamentos com período, total e situação de pagamento. |
| **REL-09** | Alunas bolsistas | Relação de alunas bolsistas com percentual de desconto e valor mensal não faturado. |
| **REL-10** | Aulas experimentais | Relação de aulas experimentais realizadas no período e taxa de conversão em matrícula. |
| **REL-11** | Convênios | Reservas, check-ins validados, ausências e reservas sem check-in por período e por convênio, para conferência do repasse. |
| **REL-12** | Motivos de encerramento | Relação de contratos encerrados no período com o motivo registrado. |

# 11. Convênios — Viabilidade Técnica e Dependências

A integração com Wellhub e TotalPass foi definida como escopo obrigatório da Fase 1. Este capítulo consolida o levantamento técnico realizado e as dependências que condicionam sua execução.

## 11.1 Wellhub

O Wellhub disponibiliza portal público de documentação técnica para sistemas de gestão parceiros, com três interfaces relevantes ao escopo:

- **Booking API:** permite ao sistema de gestão publicar suas turmas e horários na plataforma do Wellhub, mantendo a sincronização automática. As reservas realizadas pelos usuários no aplicativo do Wellhub são comunicadas ao sistema de gestão por webhook.
- **Access Control API:** recebe e valida os check-ins realizados pelos usuários no local, condição para o repasse financeiro ao parceiro.
- **Integration Setup API:** mecanismo pelo qual o Wellhub notifica o sistema de gestão quando um parceiro o seleciona como seu sistema, habilitando a configuração da integração daquele parceiro.

Características técnicas relevantes:

- autenticação por token único, fornecido pelo Wellhub, válido para as diferentes interfaces.
- comunicação por webhook, com assinatura de segurança no cabeçalho da requisição, que deve ser verificada pelo sistema receptor.
- solicitações de reserva devem ser confirmadas ou recusadas em até 15 minutos, sob pena de recusa automática pela plataforma.
- tempo de resposta esperado de 1 segundo, com retentativas em caso de ausência de resposta.
- ambiente de testes disponível, separado do ambiente de produção.

## 11.2 TotalPass

O TotalPass não disponibiliza portal público de documentação técnica. A integração é conduzida diretamente pela plataforma, mediante habilitação prévia do sistema de gestão em seu catálogo de sistemas homologados.

- a plataforma opera com dois modos de integração: apenas check-in, em que a aluna comparece sem reserva prévia; e agendamento com check-in, em que a aluna reserva o horário e realiza o check-in no local. O modelo aplicável ao studio é o segundo.
- a autenticação ocorre por chave de integração obtida pelo próprio parceiro em seu portal, após selecionar o sistema de gestão em lista de sistemas homologados.
- o check-in é validado por geolocalização, em raio aproximado de 150 metros do estabelecimento, com prazo de expiração.

## 11.3 Dependência crítica de homologação

|  |  |
| --- | --- |
|  | **Dependência crítica**  Ambas as plataformas exigem que o sistema de gestão esteja previamente homologado como parceiro tecnológico. O estabelecimento seleciona seu sistema a partir de uma lista de sistemas já integrados; um sistema não homologado não aparece nessa lista, e a integração não pode ser configurada pelo parceiro. A homologação é conduzida pelas próprias plataformas, envolve etapas comercial e técnica, e possui prazo não controlado pela FGC Digital. |

Em razão disso, a solicitação de homologação junto a Wellhub e TotalPass deve ser iniciada imediatamente, em paralelo ao desenvolvimento dos demais módulos, de modo que o prazo de aprovação não se torne o fator determinante da data de entrega.

| **Etapa** | **Responsável** | **Observação** |
| --- | --- | --- |
| **Solicitação de homologação como sistema parceiro — Wellhub** | FGC Digital | Formulário público de solicitação. Prazo de retorno informado como poucos dias para orientação inicial. |
| **Solicitação de homologação como sistema parceiro — TotalPass** | FGC Digital | Contato via canal de atendimento a parceiros. Não há processo público documentado. |
| **Manutenção da condição de parceiro nas plataformas** | Cliente | O studio deve permanecer como parceiro ativo em ambas as plataformas. |
| **Fornecimento das credenciais do estabelecimento** | Cliente | Obtidas nos respectivos portais de parceiro após a homologação do sistema. |
| **Desenvolvimento e testes em ambiente de homologação** | FGC Digital | Condicionado à liberação de credenciais de teste pelas plataformas. |
| **Validação em produção** | FGC Digital e Cliente | Execução de reserva e check-in reais antes da migração definitiva. |

|  |  |
| --- | --- |
|  | **Risco de prazo**  Caso a homologação em uma das plataformas não seja concluída até a data prevista de entrega, o sistema entra em produção com o módulo de convênios operando em modo de contingência: a administração registra manualmente as reservas e presenças das alunas de convênio, mantendo o controle interno de ocupação. A integração automática é ativada assim que a homologação for concluída, sem alteração de escopo. |

# 12. Evoluções Futuras (Fora de Escopo desta Contratação)

Os itens abaixo foram discutidos durante o levantamento e ficam registrados como evoluções planejáveis. Não fazem parte desta contratação e não condicionam o aceite. Os itens marcados como dependentes de refinamento exigem levantamento complementar antes da especificação.

| **ID** | **Evolução** | **Descrição** | **Refinamento** |
| --- | --- | --- | --- |
| **EV-01** | Notificações por WhatsApp | Envio das comunicações transacionais por WhatsApp, substituindo ou complementando o e-mail. A Fase 1 entrega a camada de notificação desacoplada do canal; a Fase 2 implementa o canal e a configuração de qual evento utiliza qual canal. | Necessário |
| **EV-02** | Assistente de atendimento integrado | Integração entre o sistema e o assistente de atendimento já em operação, permitindo consulta de saldo, agendamento, cancelamento e envio de link de matrícula pela conversa. Depende de definição dos gatilhos e do escopo de ações permitidas. | Necessário |
| **EV-03** | Mensagens de relacionamento | Mensagem de aniversário personalizada e reengajamento de alunas inativas, incluindo interessadas que realizaram aula experimental e não contrataram pacote. | Necessário |
| **EV-04** | Serviços avulsos e workshops | Comercialização de eventos pontuais com data única, cobrança própria e inscrição independente do pacote vigente. Modelagem provável como serviço distinto de pacote, preservando a regra de pacote único ativo. | Necessário |
| **EV-05** | Lista de espera | Ingresso em lista de espera para sessões lotadas, com notificação automática da próxima da fila ao surgir vaga e prazo de confirmação configurável. | Parcial |
| **EV-06** | Pagamento integral antecipado | Contratação de plano com pagamento único antecipado e desconto, alternativo ao parcelamento mensal. | Parcial |
| **EV-07** | Emissão de nota fiscal | Emissão automática de NFS-e a partir das cobranças quitadas. Depende da definição do enquadramento fiscal e do município de emissão. | Necessário |
| **EV-08** | Aplicativo móvel | Aplicativo nativo para aluna e professora, mantendo o acesso por navegador para quem preferir não instalar. | Parcial |
| **EV-09** | Habilitação de professora por modalidade | Registro das modalidades que cada professora está habilitada a conduzir, com filtro automático na seleção de substituta e na criação de sessões. | Parcial |
| **EV-10** | Indicadores avançados | Análise de retenção, previsão de receita, curva de frequência por modalidade e indicadores de desempenho por professora. | Parcial |
| **EV-11** | Perfis granulares | Permissões por funcionalidade e ocultação de informações financeiras para perfis específicos. | Parcial |
| **EV-12** | Múltiplos espaços | Operação com mais de um espaço físico, com capacidade e conflito por espaço além da capacidade por modalidade. | Parcial |

# 13. Premissas, Restrições e Dependências

- **Conectividade:** o studio possui conexão de internet estável nos horários de operação. O sistema não terá modo offline na Fase 1.
- **Homologação nos convênios:** a homologação da FGC Digital como sistema de gestão parceiro junto a Wellhub e TotalPass é pré-requisito para a integração automática. O processo é conduzido pelas plataformas, com prazo não controlado pela FGC Digital. Ver capítulo 11.
- **Condição de parceiro:** o studio deve permanecer como parceiro ativo de Wellhub e TotalPass e fornecer as credenciais de integração de seu portal de parceiro.
- **Gateway de pagamento:** a contratação de conta em gateway de pagamento e o cumprimento das exigências cadastrais correspondentes são de responsabilidade da cliente. A definição do gateway precede o desenvolvimento do módulo financeiro.
- **Termo de aceite:** o conteúdo do termo de prestação de serviço será fornecido pela cliente, elaborado com sua assessoria jurídica. Até a disponibilização, o sistema utilizará versão provisória fornecida pela cliente.
- **Anamnese:** o conteúdo da ficha de anamnese será fornecido pela cliente.
- **Configuração inicial:** a cliente fornecerá a relação de modalidades com respectivas capacidades, pacotes com valores e validade, categorias de professora com valores, a tabela de limite de dias de pausa por pacote e a grade vigente, para configuração inicial.
- **Migração de dados:** a cliente disponibilizará acesso à plataforma atual para levantamento da base de alunas e contratos. A migração depende da possibilidade de exportação; não havendo exportação viável, a carga inicial será realizada manualmente.
- **Homologação das entregas:** a cliente disponibilizará tempo para as sessões de validação e homologação de cada entrega.
- **Serviços de terceiros:** hospedagem, e-mail transacional, gateway de pagamento e plataformas de convênio são fornecidos por terceiros. Indisponibilidades desses serviços não caracterizam falha do sistema.

# 14. Pontos em Aberto

Os itens abaixo estão sinalizados ao longo do documento com fundo destacado e permanecem pendentes de definição. Cada item indica o responsável e o momento em que a definição se torna bloqueante.

| **#** | **Ponto** | **Detalhe** | **Requisito** | **Bloqueia a partir de** |
| --- | --- | --- | --- | --- |
| **PA-01** | Tabela de limite de pausa por pacote | Quantidade de dias de trancamento ou suspensão permitidos conforme a quantidade de aulas do pacote contratado. | RF-CTR-05 | Desenvolvimento do M3 |
| **PA-02** | Categorias e valores de comissão | Nomes das categorias de professora e valor por aula de cada uma, em definição com assessoria jurídica. | RF-PRO-06 | Configuração inicial |
| **PA-03** | Conteúdo da ficha de anamnese | Perguntas que compõem o questionário de saúde preenchido pela aluna no ingresso. | RF-ALU-11 | Desenvolvimento do M2 |
| **PA-04** | Gateway de pagamento | Definição do provedor a ser integrado, após verificação de disponibilidade de API no provedor atual e comparação de taxas. | RF-FIN-14 | Desenvolvimento do M11 |
| **PA-05** | Valores dos parâmetros operacionais | Confirmação dos valores: janela de agendamento para matriculadas e para convênio, antecedência de cancelamento, prazo de bloqueio por inadimplência, prazo de correção de chamada e dias adicionais por cancelamento do studio. | RF-CFG-05 | Configuração inicial |
| **PA-06** | Conteúdo do termo de prestação de serviço | Texto contratual em elaboração com assessoria jurídica. | RF-ALU-05 | Entrada em produção |

# 15. Critérios de Aceite e Definição de Entregue

O projeto será considerado ENTREGUE quando, cumulativamente:

85. Todos os requisitos funcionais com prioridade MVP estiverem implementados e disponíveis em ambiente de produção.
86. Os fluxos do capítulo 7 forem executados de ponta a ponta em homologação com dados reais, na presença da cliente, sem impedimentos.
87. Os requisitos não funcionais RNF-01 a RNF-16 estiverem atendidos e verificados.
88. A configuração inicial estiver concluída e conferida pela cliente: modalidades com capacidade, espaços, horário de funcionamento, parâmetros operacionais, pacotes, categorias de professora, tabela de limite de pausa e grade vigente.
89. A integração com Wellhub e TotalPass estiver operacional, ou, não concluída a homologação por fator externo, o módulo estiver entregue em modo de contingência conforme o capítulo 11, com ativação automática posterior sem custo adicional.
90. Os pontos em aberto do capítulo 14 estiverem resolvidos e suas definições implementadas.
91. A cliente formalizar o aceite por escrito após período de homologação acordado.

**Solicitações que não constem deste documento serão tratadas como novo escopo (aditivo), sem impacto no aceite do escopo aqui contratado.**

# 16. Glossário

| **Termo** | **Definição** |
| --- | --- |
| **Pacote** | Conjunto de aulas contratado pela aluna, com valor mensal, quantidade de aulas por ciclo e validade. |
| **Contrato** | Vínculo entre a aluna e um pacote, com data de início, vencimento do ciclo, término da vigência, saldo de aulas e situação. |
| **Ciclo** | Período mensal de vigência do saldo de aulas, renovado automaticamente na data de vencimento. |
| **Saldo de aulas** | Quantidade de aulas ainda disponíveis para agendamento dentro da vigência do contrato. |
| **Sessão** | Aula recorrente cadastrada na grade, definida por modalidade, professora, espaço, dia da semana e horário. |
| **Ocorrência de sessão** | Realização específica de uma sessão em uma data determinada. |
| **Janela de agendamento** | Período à frente da data atual dentro do qual a aluna pode visualizar e agendar sessões. |
| **Antecedência mínima** | Prazo mínimo antes do início da aula para que o cancelamento devolva o crédito ao saldo. |
| **Crédito** | Aula devolvida ao saldo em razão de cancelamento dentro do prazo, justificativa aprovada ou cancelamento por iniciativa do studio. |
| **Bolsista** | Aluna com desconto total ou parcial sobre o valor do pacote, concedido pela administração, mantendo todas as demais condições operacionais. |
| **Isenção total** | Bolsa de 100%, na qual nenhuma cobrança é gerada para o contrato. |
| **Trancamento** | Pausa aplicável a contratos semestrais, com suspensão da cobrança e congelamento da validade. |
| **Suspensão** | Pausa aplicável a contratos mensais, com manutenção da cobrança e concessão de prazo adicional para reposição. |
| **Alteração de plano** | Troca do pacote contratado no meio do ciclo, com apuração proporcional de valores e recálculo do saldo de aulas. |
| **Categoria de professora** | Nível ao qual está vinculado o valor por aula utilizado na apuração da comissão. |
| **Fechamento de comissão** | Encerramento do período mensal de apuração, consolidando os valores a pagar por professora. |
| **Termo de aceite** | Instrumento contratual aceito eletronicamente no sistema, com registro de identidade, data, hora e conteúdo. |
| **Anamnese** | Questionário de saúde autodeclarado pela aluna no ingresso, sem validação pela administração. |
| **Exceção de calendário** | Data em que o studio não opera, com cancelamento automático das sessões. |
| **Aula experimental** | Aula avulsa destinada a interessada sem pacote ativo, limitada a uma por modalidade e cobrada em valor único. |
| **Convênio** | Plataforma de benefício corporativo por meio da qual alunas acessam o studio, com reserva e check-in realizados no aplicativo do próprio convênio. |
| **Espelhamento** | Publicação da grade de horários do studio nos aplicativos dos convênios, mantida sincronizada automaticamente. |
| **Check-in** | Confirmação de presença realizada pela aluna de convênio no aplicativo, no local e no horário da aula, condição para o repasse financeiro ao studio. |

*FGC Digital  ·  Escopo Funcional Contratado  ·  Versão 1.0*
