# Plano de Atualização — Escopo v2.0 → v2.1

Documento de trabalho para atualizar o protótipo ao **Escopo Funcional Atualizado v2.1** (`docs/Escopo Funcional Atualizado v2.1.docx`, texto extraído em `docs/Escopo Funcional Atualizado v2.1.txt`), que substitui a v2.0 de 25/08/2026 como fonte única da verdade. O diff entre as duas versões, já sem a troca studio → estúdio, está em `docs/diff-v2.0-v2.1 (sem studio-estúdio).txt`.

Plano escrito em 21/09/2026, depois da revisão do plano apresentado no chat e das seis respostas registradas na seção 2.

Status: **concluído em 22/09/2026 — Lotes 0 a 6 entregues e validados.** O que cada lote entregou, as decisões tomadas e como testar ficam em [PROGRESSO_ATUALIZACAO_V21.md](./PROGRESSO_ATUALIZACAO_V21.md). `escopo_funcional_contratado.md` já é a v2.1.

Regras que continuam valendo, sem exceção (CLAUDE.md e README): um lote por ciclo, com validação explícita antes do próximo; nunca `git commit`; regra de negócio em `src/hooks/`; acesso a dado só por `src/services/repositorios.ts`; entidade ou campo novo entra em `src/types/domain.ts`, em `src/data/seed.json` e, se apontar para outro registro, em `CHAVES_ESTRANGEIRAS` de `src/services/reset.ts`; carregar uma tela nunca escreve no banco; `useConfirm()` e `useToast()`; kit de UI de `src/components/ui/`.

---

## 1. O que mudou da v2.0 para a v2.1

### 1.1 Método

Os dois `.docx` foram convertidos para texto com `python-docx` (710 linhas na v2.0, 741 na v2.1) e comparados linha a linha, com e sem a normalização "studio"/"estúdio". Descontada a grafia (46 ocorrências), a v2.1 tem 83 linhas novas e 52 removidas. Nenhum requisito foi renumerado: RN-01 a RN-38 mantêm os mesmos ids (só RN-16 e RN-19 mudaram de texto), e os únicos RFs novos são RF-CPR-09, RF-PRE-09 e RF-PNL-07, mais REL-14 e EV-16 a EV-21.

### 1.2 As doze mudanças

| # | Mudança | Referências na v2.1 |
| --- | --- | --- |
| 1 | **Pagamento antes do termo e da anamnese.** Matrícula pelo site e experimental passam a cobrar primeiro; termo, anamnese e primeira aula vêm depois, cada um com "pular e concluir depois". RF-ALU-08 vira "Pendência de aceite": alerta persistente para a aluna e para a administração, **sem bloqueio** de agendamento. RF-CRE-01: carteira ativa **na confirmação do pagamento**. | RF-ALU-08, RF-CRE-01, RF-AGD-10, RF-PNL-03, RF-PNL-05, RN-19, fluxos 6.1, 6.2, 6.3, EV-16 |
| 2 | **Relação preservada de alunas em cancelamento pelo estúdio**, com telefone e botão "Enviar mensagem" que abre o WhatsApp. O sistema não controla o envio. | RF-CPR-09 (novo), RN-16, fluxo 6.6.1 (novo) |
| 3 | **Professora consulta a ficha de qualquer aluna**, inclusive anamnese; cada consulta é auditada. | RF-PRE-09 (novo), RNF-05 |
| 4 | Aula excepcional: **participante sem cadastro** (nome e telefone) na alocação sem consumo; **aluna de convênio pode participar pagando à parte**; chamada exibe participante sem cadastro. | RF-AEX-06, RF-AEX-11, RF-PRE-02, fluxo 6.7 |
| 5 | Fechamento de comissão marcado como pago **pode anexar comprovante** (opcional). | RF-COM-09, fluxo 6.11 |
| 6 | Prévia do reembolso mostra **data da compra, dias decorridos e percentual consumido**; reembolso legal também cobre o caso de **mais de 50% consumidos**. | RF-REE-03, RF-REE-07 |
| 7 | RF-EXP-08 (benefício de conversão) passa a MVP: 3 dias, 1 crédito, parametrizável. | RF-EXP-08, RF-CFG-06, PA-04 |
| 8 | **TotalPass em contingência manual** na Fase 1; integração automática vira EV-21. RF-CNV-01 a 13 valem para o Wellhub. | M14, RF-CNV-14, EV-21, cap. 10.2 |
| 9 | **Indicadores de professora**: retenção por turma e por professora, frequência da professora. | RF-PNL-07 (novo), REL-14 (novo) |
| 10 | Miúdos: busca de alunas por nome, CPF **ou telefone** num campo só; RF-AGD-04 máximo um agendamento por ocorrência; RF-GRD-08 cita o parâmetro; RF-PNL-05 inclui o alerta de pendência; "estúdio" com acento. | RF-ALU-10, RF-AGD-04, RF-GRD-08, RF-PNL-05 |
| 11 | Pontos em aberto ganham coluna "Situação": **Definidos** PA-04, 05, 06, 09, 10, 11, 12; **Abertos** PA-01, 02, 03, 07, 08. | cap. 8 |
| 12 | EV-16 a EV-21 registradas como evoluções, fora da Fase 1. | cap. 9 |

### 1.3 Diferenças não listadas no apanhado

- **RF-CRE-13 continua escrevendo "a validade anterior é descartada"**, enquanto o PA-10, agora Definido, diz que prevalece a validade mais distante. É contradição interna da v2.1. O protótipo segue o PA-10 desde a Etapa 2 da migração anterior e continua seguindo.
- **PA-08 (expiração de créditos) segue Aberto**, mas a coluna de situação registra que "as medidas de comunicação e a prorrogação administrativa foram aceitas". Não muda requisito; confirma o peso do RF-CRE-09, já entregue.
- **RF-CFG-06** ganhou só o benefício de conversão (prazo, tipo e montante). As antecedências de aviso já estavam na v2.0.
- **RNF-05** passa a incluir a professora entre os perfis com auditoria de consulta.
- Cosméticos: a capa cita a devolutiva de 28/08/2026; a homologação junto ao TotalPass fica "iniciada na Fase 1"; PA-02 registra que a cliente prefere receber conforme as parcelas.

### 1.4 O que a v2.1 pede e o protótipo já faz

Não entram no plano porque já estão entregues e verificados:

- RF-EXP-08 e PA-04 (benefício de conversão parametrizado) — Etapa 7 da migração anterior.
- RF-AGD-04 (um agendamento por ocorrência), RF-GRD-08 com parâmetro, PA-03/05/06/09/10/11/12.
- **Os três cenários prometidos à cliente**, entregues em 21/09/2026 e registrados em `PROGRESSO_ATUALIZACAO.md`, seção "Preparação para a v2.1": termo único com o nome da aluna mesclado (RF-ALU-05/06, PA-05); renovação antecipada com validade mais distante (RF-CRE-13/16, 6.4, PA-10); prorrogação manual de validade pela administração, inclusive em carteira vencida (RF-CRE-09).

---

## 2. Decisões fixadas

Respostas dadas em 21/09/2026 às dúvidas do plano apresentado no chat, mais as decisões herdadas da migração anterior. Valem para todos os lotes.

- **D1 — A professora continua bloqueada até o aceite.** A v2.1 mudou só o RF-ALU-08 (aluna). O RF-PRO-04 segue "acesso permanece bloqueado até o aceite". `AceiteDaProfessoraPage` e o menu reduzido da professora em `AppShell` não mudam.
- **D2 — Aluna cadastrada pela administração sem bolsa: alerta de pagamento pendente e agendamento bloqueado.** A carteira é ativada na confirmação do pagamento (RF-CRE-01). Enquanto a venda do cadastro administrativo está pendente, o painel mostra o alerta de pagamento com o botão de pagar, e o agendamento fica bloqueado porque não há carteira ativa (RF-AGD-05), não por causa do termo. Termo e anamnese são pendências separadas, sem bloqueio, também para essa aluna. Bolsista tem a carteira ativa de imediato (RF-BOL-02, fluxo 6.3).
- **D3 — Indicadores de professora só na administração.** RF-PNL-07 e REL-14 entram numa tela administrativa. O painel da professora (RF-PNL-04) não muda.
- **D4 — "Studio" permanece.** A grafia correta é "Estúdio MUV", mas a troca é cosmética, toca 138 pontos em `src/` mais o seed, e não entra. Nenhum lote de terminologia. Textos novos escritos nos lotes seguem a grafia atual do protótipo ("studio"), por coerência com o resto das telas.
- **D5 — Comprovante e WhatsApp simulados do jeito que o protótipo já simula anexos.** O comprovante do fechamento é o nome do arquivo, sem upload, como o anexo da justificativa. O botão "Enviar mensagem" abre de verdade o `wa.me`, sempre com o número **+55 65 9680-6348** — todas as alunas do seed passam a ter esse telefone, para que o botão abra o WhatsApp da própria cliente durante a demonstração — e com uma mensagem pré-preenchida que ilustra o aviso (modelos na seção 6.3).
- **D6 — As datas do seed passam a ser geradas em relação ao dia da carga.** Lote próprio (seção 9), executado antes dos demais porque todos mexem no seed.
- **D7 — Renovação antecipada segue o PA-10**, não a letra do RF-CRE-13 (decisão herdada).
- **D8 — O que a v2.1 marca como Aberto, Em definição ou Evolução é pendente ou fora de escopo.** O protótipo não inventa comportamento: PA-01, 02, 03, 07 e 08 continuam com os valores de referência já parametrizados; EV-16 a EV-21 não entram.

---

## 3. Mapeamento do protótipo contra a v2.1

Verificado no código em 21/09/2026.

| Item | Estado atual no protótipo | Classificação |
| --- | --- | --- |
| 1 · Ordem da matrícula | `MatriculaPage`: dados → pacote → **termo e anamnese → pagamento** → primeira aula. Nada é pulável, exceto a primeira aula. | **altera** |
| 1 · Experimental | `ExperimentalPage`: horário → cadastro → pagamento. **Não pede termo nem anamnese** em momento nenhum. | **altera** |
| 1 · RF-ALU-08 | `Usuario.situacao = 'aguardando_aceite'` e `Aluna.situacao = 'aguardando_aceite'` **bloqueiam**: menu reduzido a "Painel" (`AppShell`), painel substituído pelo fluxo de primeiro acesso (`PainelAlunaPage`), `bloqueioParaAgendar` recusa (`agendamentoDeAulas.ts:105`). | **altera** — a maior mudança |
| 1 · RF-CRE-01 | `aplicarCompra` cria a carteira como `aguardando_ativacao` quando a aluna aguarda aceite; `liberarAcessoDaAluna` → `ativarCarteirasPendentes` ativa depois do aceite (validade passa a correr da ativação). | **altera** |
| 1 · RF-PNL-03 | `AdministracaoHome` tem quatro cartões de pendência; nenhum de aceite. `pendenciasDeAcao` em `indicadores.ts`. | **altera** |
| 1 · RF-PNL-05 | Painel da aluna sem alerta; a pendência substitui o painel. | **altera** |
| 2 · RF-CPR-09 | `cancelarOcorrencia` (`cancelamentoDeAulas.ts`) já é o caminho único dos quatro cancelamentos e já marca `origemCancelamento: 'studio'` nos agendamentos — a relação existe nos dados, mas não é gravada na ocorrência nem há tela de consulta ou WhatsApp. `Aluna.telefone` existe. | **novo** (dado e tela) |
| 3 · RF-PRE-09 | Não há rota de alunas para a professora; ficha e anamnese só na administração (`AlunaFichaPage`). | **novo** |
| 4 · RF-AEX-06 | `Alocacao.alunaId` obrigatório; motivo em lista curta já existe (`MotivoSemConsumo`: pagamento avulso, convidada, cortesia). | **altera** |
| 4 · RF-AEX-11 | `alocarAluna` recusa aluna de convênio em qualquer modo. | **altera** |
| 4 · RF-PRE-02 | Chamada excepcional lista só alocações com aluna cadastrada. | **altera** |
| 5 · RF-COM-09 | `marcarFechamentoComoPago` não recebe anexo; `FechamentoComissao` não tem o campo. | **altera** |
| 6 · RF-REE-03 | `PreviaDeReembolso` já calcula `diasDesdeACompra` e `percentualUtilizado`; o modal mostra data e percentual, **não os dias decorridos**. | **altera** (pequeno) |
| 6 · RF-REE-07 | Tipo `legal` já não bloqueia por prazo nem por percentual; a recusa do arrependimento por prazo já sugere o motivo legal, a recusa por >50% **não**. | **altera** (texto) |
| 7 · RF-EXP-08 | Implementado e parametrizado. | mantém |
| 8 · TotalPass | `ConveniosPage` oferece credenciais e integração para os dois convênios igualmente; `NOMES_CONVENIO` em `convenios.ts`. | **altera** |
| 9 · RF-PNL-07 / REL-14 | Não existe. `indicadores.ts` não calcula retenção nem frequência da professora. | **novo** |
| 10 · RF-ALU-10 | `AlunasPage` busca nome, e-mail e CPF; **falta telefone**. | **altera** (pequeno) |
| 10 · RF-AGD-04, RF-GRD-08 | Já cumpridos. | mantém |
| 10 · "estúdio" | 138 ocorrências de "studio" em `src/`. | mantém (D4) |
| 11 · PAs | Definidos já implementados; abertos com valor de referência parametrizado. | mantém |
| 12 · EV-16..21 | — | fora de escopo |
| Seed | Datas fixas de agosto de 2026; "hoje" é a data real. Patrícia vence em 24/09/2026 e deixa de servir ao cenário de renovação antecipada; chamadas pendentes e justificativa são de agosto. | **altera** (D6) |

---

## 4. Plano por jornada

Prioridade: **MVP** é o que a v2.1 marca como MVP e a cliente vai procurar na demonstração; **Importante** é o que completa o cenário sem ser o requisito em si.

### 4.1 Público (matrícula e experimental)

| Tela | Ação | O que muda | Referência v2.1 | Prioridade |
| --- | --- | --- | --- | --- |
| `MatriculaPage` | alterar | Passos passam a ser: Seus dados → Pacote → **Pagamento** → **Termo** → **Anamnese** → Primeira aula → Concluído. A carteira é ativada e o acesso liberado ao confirmar o pagamento (usuária e aluna nascem `ativa`). Termo, anamnese e primeira aula ganham o botão "Pular e concluir depois"; ao pular, a tela de conclusão diz o que ficou pendente e que o painel vai lembrar. Termo e anamnese viram passos separados (hoje `TermoEAnamnese` é um bloco só) para que cada um possa ser pulado sozinho. E-mail de boas-vindas (`matricula_concluida_pelo_site`) cita as pendências. | RF-ALU-04, RF-ALU-08, RF-AGD-10, RF-CRE-01, RN-19, fluxo 6.1 | MVP |
| `ExperimentalPage` | alterar | Depois de "vaga confirmada" entram os passos Termo e Anamnese, ambos com "Pular e concluir depois". A conclusão mostra as pendências. | RF-EXP-05, fluxo 6.2 | MVP |
| `components/TermoEAnamnese` | alterar | Separar em `AceiteDoTermo` (termo mesclado + caixa de aceite) e `FichaDeAnamnese` (perguntas), reaproveitados pela matrícula, pela experimental e pelo painel da aluna. `registrarAceiteEAnamnese` se divide em `registrarAceite` e `registrarAnamnese`, chamáveis separadamente. | RF-ALU-05, RF-ALU-07 | MVP |

### 4.2 Aluna

| Tela | Ação | O que muda | Referência v2.1 | Prioridade |
| --- | --- | --- | --- | --- |
| `PainelAlunaPage` | alterar | Sai o fluxo bloqueante de primeiro acesso. Entra um **alerta persistente** no topo do painel normal — "Falta aceitar o termo", "Falta preencher a anamnese" ou os dois — com o botão "Concluir agora" que abre a pendência num modal. Aluna cadastrada pela administração sem bolsa vê também o alerta "Pagamento pendente" com o botão "Pagar agora" (venda pendente do cadastro), e o resumo do pacote diz que a carteira será ativada com o pagamento (D2). | RF-ALU-08, RF-PNL-05, RN-19 | MVP |
| Modal de pendência (novo, `pages/aluna/ModalPendenciaDeAceite`) | nova | Destino do atalho: aba ou passo "Termo" (termo mesclado com nome e CPF, aceite) e "Anamnese" (perguntas). Conclui uma de cada vez; ao fechar a última, o alerta some e a aluna deixa de ser "aguardando aceite". | RF-ALU-08 | MVP |
| `AppShell` | alterar | A aluna com pendência de aceite passa a ter o menu completo. O caso `aguardando_aceite` do menu reduzido fica só para a professora (D1). | RF-ALU-08 | MVP |
| `GradeDaAlunaPage` e `bloqueioParaAgendar` | alterar | Remove o bloqueio por `aguardando_aceite`. O bloqueio por "sem carteira ativa" continua e passa a explicar, quando for o caso, que a carteira ativa com o pagamento (D2). | RF-ALU-08, RF-AGD-05 | MVP |
| `LoginPage` | alterar | O aviso "Aguardando aceite" ao lado da aluna vira "Termo ou anamnese pendente" (a professora mantém "Aguardando aceite"). | RF-ALU-08 | Importante |
| `MeuPacotePage`, `MinhasAulasPage` | mantém | — | — | — |

### 4.3 Professora

| Tela | Ação | O que muda | Referência v2.1 | Prioridade |
| --- | --- | --- | --- | --- |
| `AlunasDaProfessoraPage` (nova, `/professora/alunas`) | nova | Lista de todas as alunas do studio, com a mesma busca única por nome, CPF ou telefone da administração. Item "Alunas" no menu da professora. Sem filtros financeiros. | RF-PRE-09, RF-ALU-10 | MVP |
| `FichaDaAlunaProfessoraPage` (nova, `/professora/alunas/:id`) | nova | Ficha somente leitura: dados cadastrais (nome, telefone, contato de emergência, data de nascimento), pacote vigente resumido (situação e validade, sem valores), próximas aulas, e as **respostas da anamnese** em destaque. Sem histórico de compras, reembolsos ou ajustes. **Cada abertura grava um registro de auditoria** `consulta_ficha_pela_professora` com a professora, a aluna e a data e hora — é a única escrita que uma tela faz ao carregar, e é o próprio requisito que a exige (RNF-05). | RF-PRE-09, RNF-05 | MVP |
| `ChamadaPage`, `ChamadaExcepcionalPage` | alterar | O nome de cada aluna vira link para a ficha da professora. A chamada excepcional exibe o participante sem cadastro com nome e telefone, badge "Sem cadastro", sem link e com presença registrável (não gera consumo nem crédito). | RF-PRE-09, RF-PRE-02, RF-AEX-06 | MVP |
| `PainelProfessoraPage` | mantém | Sem indicadores (D3). | — | — |

### 4.4 Administração

| Tela | Ação | O que muda | Referência v2.1 | Prioridade |
| --- | --- | --- | --- | --- |
| `AdministracaoHome` | alterar | Quinto cartão de pendência: "Alunas com termo ou anamnese pendente", com link para a lista filtrada por "Aguardando aceite". `pendenciasDeAcao` passa a contar essas alunas. | RF-PNL-03 | MVP |
| `AlunasPage` | alterar | Busca inclui telefone. O filtro "Aguardando aceite" passa a significar pendência de termo ou anamnese, não bloqueio. Coluna de situação mostra "Termo pendente", "Anamnese pendente" ou "Aguardando aceite" (os dois). | RF-ALU-10, RF-ALU-08 | MVP |
| `AlunaFichaPage` | alterar | O bloco "Acesso" mostra as duas pendências separadas, com a data em que cada uma foi concluída. As consultas da professora à ficha aparecem na trilha de auditoria da aluna. A chamada para "Ajustar créditos" não muda. | RF-ALU-08, RNF-05 | MVP |
| `AulasCanceladasPage` (nova, `/administracao/aulas-canceladas`, menu Operação) | nova | Lista das ocorrências canceladas pelo studio, mais recente primeiro, com data, sessão, motivo, origem (exceção, exclusão de sessão, solicitação da professora, conflito com aula excepcional) e quantas alunas foram afetadas. Ao expandir: a relação preservada — nome, telefone, créditos devolvidos, dias prorrogados — e, por aluna, o botão **"Enviar mensagem"** (abre `wa.me` com a mensagem pré-preenchida da seção 6.3, em nova aba). Filtro por período. Exportação CSV. | RF-CPR-09, RN-16, fluxo 6.6.1 | MVP |
| `ExcecoesPage`, `GradePage`, `SolicitacoesCancelamentoPage`, `AulasExcepcionaisPage` | alterar | Depois de um cancelamento que afetou alunas, o toast ganha o link "Ver alunas afetadas" para a tela nova. O texto da prévia de impacto (RF-GRD-07/08, RF-EXC-05) cita que a relação fica registrada. | RF-CPR-09 | Importante |
| `AulasExcepcionaisPage` (alocação) | alterar | O modal de alocação ganha a opção **"Participante sem cadastro"**: campos nome e telefone, disponível só no modo "sem consumo de créditos", com o motivo em lista curta obrigatório. Aluna de convênio passa a ser aceita no modo sem consumo (motivo obrigatório) e continua recusada no modo com créditos, com a mensagem explicando que convênio não tem créditos e que a participação é paga à parte. A lista de participantes mostra o sem-cadastro com badge. | RF-AEX-06, RF-AEX-11, PA-12, fluxo 6.7 | MVP |
| `ComissoesPage` | alterar | O modal "Registrar pagamento" ganha o campo opcional "Comprovante" (nome do arquivo, simulado como o anexo da justificativa). O fechamento pago mostra "Comprovante: `<arquivo>`" ou "Sem comprovante". | RF-COM-09, fluxo 6.11 | MVP |
| `ModaisCarteira` → `ModalReembolso` | alterar | A prévia ganha a linha "Dias decorridos desde a compra: N (prazo de arrependimento: P dias)". A recusa do arrependimento por mais de 50% consumidos passa a sugerir o motivo legal, como a recusa por prazo já faz. O rótulo do tipo "legal" explica: "após o prazo de 7 dias ou com mais de 50% consumidos, mediante documentação". | RF-REE-03, RF-REE-07 | MVP |
| `ConveniosPage` | alterar | Aba Credenciais: TotalPass deixa de oferecer integração; no lugar, o aviso "Contingência manual na Fase 1 — a integração automática é a evolução EV-21" e o atalho para a reserva manual (RF-CNV-14). Espelhamento (RF-CNV-01/02) e simulação de mensagens do parceiro ficam só para o Wellhub. Relatório e reservas em contingência continuam para os dois. Renata Souza (seed) continua Wellhub. | M14, RF-CNV-14, EV-21, cap. 10.2 | MVP |
| `IndicadoresDeProfessorasPage` (nova, `/administracao/indicadores-professoras`, menu Operação) | nova | REL-14 para a administração (D3): seletor de período (mês, como em Comissões); tabela por professora com **frequência** (aulas conduzidas / aulas atribuídas no período, em %) e **retenção** (alunas que frequentaram no período anterior e voltaram no atual, em %); e, por turma (sessão), a retenção da turma. Exportação CSV. Cartão-resumo no `AdministracaoHome` com a média do mês e link para a tela. | RF-PNL-07, REL-14 | MVP |

### 4.5 Configuração

| Tela | Ação | O que muda | Referência v2.1 | Prioridade |
| --- | --- | --- | --- | --- |
| `ParametrosPage`, `TermosPage`, `PacotesPage`, demais | mantém | Benefício já parametrizado; termo já mesclado; nenhum parâmetro novo. | RF-CFG-06 | — |
| `NotificacoesPage` | alterar | Novos eventos no catálogo: `pendencia_de_aceite_lembrada` (não é disparo automático; aparece só se a administração usar "Lembrar aceite" na ficha — ver 6.2). Textos dos eventos de matrícula e experimental passam a citar as pendências. | RF-NOT-01 | Importante |
| `AuditoriaPage` | alterar | Operação nova `consulta_ficha_pela_professora` com rótulo legível. | RNF-05 | MVP |
| Seed (`src/data/seed.json`) | alterar | Datas relativas (seção 9); telefones das alunas (D5); Fernanda no estado novo (seção 7.1). | — | MVP |

---

## 5. Modelo de dados — alterações

Toda alteração aqui entra em `src/types/domain.ts`, em `src/data/seed.json` (mesmo como campo ausente ou array vazio) e, quando há FK nova, em `CHAVES_ESTRANGEIRAS`.

| Entidade | Alteração | Motivo |
| --- | --- | --- |
| `Usuario` | Aluna nasce `situacao: 'ativo'` em todos os fluxos; `'aguardando_aceite'` fica só para professora (D1). | RF-ALU-08, RF-CRE-01 |
| `Aluna` | `situacao: 'aguardando_aceite'` passa a significar **termo ou anamnese pendente**, sem bloqueio. Continua gravada (é o filtro do RF-ALU-10 e a contagem do RF-PNL-03), mas é **derivada**: recalculada por `recalcularPendenciaDeAceite(alunaId)` a cada aceite ou anamnese registrada. Pendência de termo = nenhum `AceiteRegistrado` da versão vigente do termo de aluna; pendência de anamnese = nenhuma `Anamnese` da aluna. | RF-ALU-08 |
| `Carteira` | `situacao: 'aguardando_ativacao'` passa a ocorrer **só** com venda pendente de pagamento (cadastro administrativo sem bolsa). Rótulo na tela: "Aguardando pagamento". A ativação acontece em `quitarVendaDoPrimeiroAcesso` e em `confirmarPagamento` (Vendas), não mais no aceite. `ativarCarteirasPendentes` é chamada por eles. | RF-CRE-01, D2 |
| `OcorrenciaSessao` | Novos: `origemCancelamento?: 'excecao' \| 'exclusao_sessao' \| 'solicitacao_professora' \| 'conflito_excepcional'`; `alunasAfetadas?: AlunaAfetada[]` com `{ alunaId, nome, telefone, creditosDevolvidos, diasProrrogados, experimental, convenio }`. Gravado por `cancelarOcorrencia` no momento do cancelamento (nome e telefone copiados, porque a relação precisa sobreviver a mudanças de cadastro). | RF-CPR-09, RN-16 |
| `Alocacao` | `alunaId` vira opcional; novo `participanteSemCadastro?: { nome: string; telefone: string }`, excludente com `alunaId`. Só válido com `consumoDispensado: true`. Reset: FK `alunaId` continua no mapa, tolerando ausência. | RF-AEX-06 |
| `RegistroPresenca` | `alunaId` opcional; novo `alocacaoId?` para o participante sem cadastro (presença registrável, sem efeito em créditos ou comissão além da contagem de presenças). | RF-PRE-02 |
| `FechamentoComissao` | Novo `comprovante?: string` (nome do arquivo). | RF-COM-09 |
| `ConvenioIntegracao` | Novo `modo: 'integracao' \| 'contingencia'`; TotalPass do seed em `contingencia`, sem credenciais. | RF-CNV-14, EV-21 |
| `RegistroAuditoria` | Operação nova `consulta_ficha_pela_professora`, entidade `Aluna`, `valorNovo: { alunaId, professoraId }`. | RNF-05 |
| Seed | Campos de data com tokens relativos (seção 9). | D6 |

Hooks novos: `pendenciasDeAceite.ts` (leitura e recálculo das pendências; `registrarAceite`, `registrarAnamnese` saem de `useTermos.ts` para cá), `alunasAfetadas.ts` (leitura das ocorrências canceladas, montagem do link do WhatsApp), `indicadoresDeProfessoras.ts` (RF-PNL-07), `fichaParaProfessora.ts` (leitura reduzida da ficha + auditoria). Alterados: `cancelamentoDeAulas.ts`, `aulasExcepcionais.ts`, `chamadaDeAulas.ts`, `comissoes.ts`, `reembolsos.ts` (só texto), `convenios.ts`, `cadastroDeAlunas.ts`, `carteiraDeCreditos.ts`, `agendamentoDeAulas.ts`, `indicadores.ts`, `useAlunas.ts`, `useTermos.ts`, `aulasExperimentais.ts`.

---

## 6. Estados, mensagens e textos novos

### 6.1 Pendência de aceite (aluna)

| Situação | Onde | Texto |
| --- | --- | --- |
| Termo pendente | Painel da aluna, alerta amarelo persistente | **Falta aceitar o termo de prestação de serviços.** Você já pode agendar aulas; conclua quando puder. [Concluir agora] |
| Anamnese pendente | idem | **Falta preencher a ficha de anamnese.** Suas respostas ajudam a professora a conduzir a aula com segurança. [Concluir agora] |
| Os dois | idem, um alerta só | **Termo e anamnese pendentes.** Você já pode agendar aulas; conclua quando puder. [Concluir agora] |
| Pagamento pendente (D2) | Painel da aluna, alerta laranja | **Pagamento pendente.** Seu pacote *Starter* aguarda o pagamento para liberar os créditos. [Pagar agora] |
| Pulou na matrícula | Tela de conclusão da matrícula/experimental | "Ficou pendente: termo de aceite, ficha de anamnese. O seu painel vai lembrar; conclua quando puder." |
| Lista de alunas | Coluna Situação | "Termo pendente" / "Anamnese pendente" / "Aguardando aceite" (os dois) |
| Bloco de pendências | `AdministracaoHome` | "Alunas com termo ou anamnese pendente — N" |
| Ficha (Acesso) | `AlunaFichaPage` | "Termo: aceito em 21/09/2026 (v1)" ou "Termo: pendente"; "Anamnese: preenchida em …" ou "pendente". Botão "Lembrar aceite" (dispara o e-mail `pendencia_de_aceite_lembrada`, registrado em Notificações — é a forma de a administração "solicitar o aceite" que o RF-ALU-08 menciona). |
| Bloqueio de agendamento (D2) | Grade da aluna | "Seu pacote aguarda o pagamento. Pague em *Painel* para liberar os créditos." |

O texto do aviso de bloqueio por aceite, hoje em `agendamentoDeAulas.ts`, é removido.

### 6.2 Notificações

| Evento | Quando | Texto (resumo) |
| --- | --- | --- |
| `matricula_concluida_pelo_site` (existente) | fim da matrícula | Passa a listar as pendências: "…Ficou pendente: termo de aceite e ficha de anamnese. Conclua pelo seu painel." |
| `aula_experimental_confirmada` (existente) | vaga confirmada | idem quando houver pendência |
| `pendencia_de_aceite_lembrada` (novo, RF-NOT-01) | botão "Lembrar aceite" na ficha | "Olá, {nome}. Ainda falta {termo / anamnese} no seu cadastro no {studio}. Entre no painel e conclua em dois minutos." |
| `aula_cancelada_pelo_studio` (existente) | cancelamento | Sem mudança; o WhatsApp é o canal manual complementar. |

### 6.3 WhatsApp (RF-CPR-09)

Link: `https://wa.me/556596806348?text=<mensagem codificada com encodeURIComponent>`. O número é fixo (D5). Abre em nova aba (`target="_blank"`, `rel="noopener"`). O sistema não registra que o botão foi clicado — o requisito diz explicitamente que não controla o envio.

A mensagem pré-preenchida identifica a aluna pelo nome, para que a cliente, recebendo no próprio celular, veja para quem aquela mensagem seria. Um modelo por origem do cancelamento:

| Origem | Mensagem |
| --- | --- |
| Exceção de calendário | Oi, {nome}! Aqui é do {studio}. A aula de {modalidade} de {dia da semana}, {data} às {hora}, não vai acontecer: {motivo}. Seus {N créditos} já voltaram para o saldo e a validade do seu pacote ganhou {D} dias a mais. Quer remarcar? Me diga um horário que combina com você. |
| Exclusão de sessão | Oi, {nome}! Aqui é do {studio}. A turma de {modalidade} de {dia da semana} às {hora} foi encerrada, e a sua aula de {data} foi cancelada. Seus {N créditos} voltaram para o saldo e a validade ganhou {D} dias. Posso te ajudar a escolher outra turma? |
| Solicitação da professora aprovada | Oi, {nome}! Aqui é do {studio}. A professora {professora} precisou cancelar a aula de {modalidade} de {data} às {hora}. Seus {N créditos} voltaram para o saldo e a validade ganhou {D} dias. Quer remarcar para outro dia? |
| Conflito com aula excepcional | Oi, {nome}! Aqui é do {studio}. No dia {data} às {hora} vai acontecer {nome da aula excepcional}, e por isso a aula regular de {modalidade} foi cancelada. Seus {N créditos} voltaram para o saldo e a validade ganhou {D} dias. Se quiser participar do evento, me avisa que eu te aloco. |

Aluna de convênio (sem créditos): a frase de créditos vira "Sua reserva foi cancelada; se quiser, reserve outro horário pelo aplicativo do {convênio}." Aluna experimental: "Sua aula experimental foi remarcada sem custo — me diga um novo horário."

### 6.4 Aula excepcional

- Opção "Participante sem cadastro" no modal de alocação: "Para quem não é aluna do studio. Registre nome e telefone; a participação é sempre sem consumo de créditos, com o pagamento tratado fora do sistema."
- Convênio no modo com créditos: "Alunas de convênio não têm créditos no studio. Para participar, aloque sem consumo, com o pagamento tratado à parte (RF-AEX-11)."
- Chamada: badge "Sem cadastro" com o telefone abaixo do nome.

### 6.5 Comissão, reembolso, convênio

- Fechamento pago: "Pago em {data} · Comprovante: {arquivo}" ou "Pago em {data} · Sem comprovante".
- Prévia do reembolso: linha "Dias decorridos desde a compra: {N} (prazo de arrependimento: {P} dias)". Recusa por percentual: "Mais de {X}% dos créditos foram consumidos. O reembolso por arrependimento não se aplica; se houver motivo legal, registre como reembolso por motivo legal."
- Convênios, cartão TotalPass: "Contingência manual (Fase 1). Reservas e presenças das alunas do TotalPass são registradas pela administração em *Reserva manual*. A integração automática está prevista para a Fase 2 (EV-21)."

### 6.6 Indicadores de professora (definições que a tela explica)

- **Frequência da professora** = aulas efetivamente conduzidas ÷ aulas atribuídas no período. Atribuída: ocorrência (materializada ou projetada da grade) de sessão em que ela é a professora titular, mais aulas excepcionais em que está vinculada. Conduzida: chamada finalizada por ela como professora efetiva (substituição conta para quem conduziu, não para a titular). Ocorrências canceladas pelo studio saem do denominador.
- **Retenção por turma** = alunas com presença na turma no período anterior que têm presença na mesma turma no período atual ÷ alunas com presença no período anterior. Sem alunas no período anterior: "—".
- **Retenção por professora** = mesma conta somando todas as turmas da professora.
- Período = mês civil, como em Comissões; "período anterior" = mês anterior.

---

## 7. Cenários navegáveis

### 7.1 Estado inicial depois do reset (mudanças no elenco)

| Persona | Hoje | Depois dos lotes |
| --- | --- | --- |
| Fernanda Alves | Bolsista, `aguardando_aceite` bloqueada, carteira `aguardando_ativacao`. | Bolsista com **carteira ativa** e **termo e anamnese pendentes**. É a persona do alerta persistente e do cartão de pendência. |
| Nova: Helena Castro | — | Cadastrada pela administração **sem bolsa**, venda pendente, carteira aguardando pagamento, termo e anamnese pendentes. É a persona do D2 (pagamento pendente + agendamento bloqueado). Evita depender de cadastrar uma aluna na hora. |
| Larissa Prado | Aluna padrão. | Igual, mais uma **aula futura cancelada pelo studio** no seed (ocorrência cancelada por exceção, com relação preservada) para o cenário do WhatsApp existir sem preparo. |
| Renata Souza | Convênio (sem distinção). | Convênio **Wellhub**, explicitado. |
| Nova: Mariana Teixeira | — | Convênio **TotalPass**, com reserva registrada em contingência manual. |
| Todas | Telefones fictícios de São Paulo. | Telefone **(65) 9680-6348** em todas (D5). |

### 7.2 Criar

| Cenário | Grupo do guia | Estado inicial | O que demonstra |
| --- | --- | --- | --- |
| Matrícula com termo pulado | Como a aluna entra | — (fluxo público) | Paga, pula termo e anamnese, agenda a primeira aula; entra no painel com o alerta; aparece no bloco de pendências; conclui pelo atalho. |
| Experimental com anamnese depois | Como a aluna entra | — | Vaga confirmada, pula a anamnese; alerta no painel; professora vê a ficha sem anamnese. |
| Aluna com pagamento pendente | Como a aluna entra | Helena Castro | Alerta de pagamento, grade bloqueada por falta de carteira ativa, paga, carteira ativa, termo ainda pendente e agendamento liberado (D2). |
| Cancelamento pelo studio: avisar as alunas | Quando o studio cancela | Larissa com aula cancelada no seed; ou cadastrar uma exceção numa data com agendamento | Abrir *Aulas canceladas*, ver a relação com telefone, clicar "Enviar mensagem" e ver o WhatsApp abrir com a mensagem pronta (fluxo 6.6.1). |
| Professora consulta a ficha | Agendar, cancelar e frequentar | Beatriz; Larissa com anamnese | Menu *Alunas* da professora, busca, ficha com anamnese; a consulta aparece em Auditoria. |
| Convidada sem cadastro no workshop | Workshop e aula particular | Criar um workshop | Alocar "Participante sem cadastro" com nome, telefone e motivo; a chamada mostra o badge; presença registrável; comissão conta a presença. |
| Convênio paga à parte | Workshop e aula particular | Renata | Alocação com créditos recusada com a explicação; alocação sem consumo aceita com motivo "pagamento avulso". |
| Comprovante do fechamento | Comissão | Fechar um período | Registrar pagamento com e sem comprovante; ver o nome do arquivo no fechamento. |
| Retenção e frequência das professoras | Comissão (ou grupo novo "Indicadores") | Chamadas finalizadas em dois meses (seed relativo garante) | Tela de indicadores, seleção do mês, exportação. |
| TotalPass em contingência | Convênios | Mariana Teixeira | Credenciais só do Wellhub; reserva manual da aluna TotalPass; relatório separa os convênios. |

### 7.3 Alterar

- **Matrícula pelo site** e **Aula experimental**: nova ordem dos passos; "pular" documentado.
- **Cadastro pela administração, com ou sem bolsa**: bolsista nasce com carteira ativa e pendência; sem bolsa cai no cenário de pagamento pendente.
- **Quando a grade bloqueia**: sai o bloqueio por aceite; entra o bloqueio por pagamento pendente.
- **Criar um workshop**: Renata deixa de ser recusada no modo sem consumo.
- **Reserva, check-in e repasse**: separar Wellhub (integração simulada) de TotalPass (contingência).
- **Reembolso por arrependimento**: dias decorridos na prévia; recusa por percentual sugere o motivo legal.
- **Exceção de calendário**, **Excluir sessão com alunas**, **Solicitação da professora**, **Conflito com aula excepcional**: passo final "Abra *Aulas canceladas* para ver a relação das alunas".

### 7.4 Remover

Nenhum. "Termo de aceite da professora" mantém o bloqueio (D1).

---

## 8. Página de guia (`/guia`)

- **Acrescentar** os dez cenários da seção 7.2, com as etiquetas novas: RF-CPR-09, RF-PRE-09, RF-PNL-07, REL-14, fluxo 6.6.1, RN-16 e RN-19 nos textos novos.
- **Alterar** os cenários da seção 7.3 e as personas de "Antes de começar" (Fernanda, Helena, Renata, Mariana).
- **Alterar** "O que é simulado":
  - Convênio: "Wellhub tem a integração simulada em Convênios. TotalPass opera em contingência manual — a administração registra reserva e presença; não há integração (Fase 2)."
  - Novo item **WhatsApp**: "O botão 'Enviar mensagem' abre o WhatsApp de verdade, sempre para o número +55 65 9680-6348, com uma mensagem pronta. O sistema não registra o envio."
  - Novo item **Anexos**: "Comprovante do fechamento e anexo da justificativa guardam só o nome do arquivo."
  - **Datas**: reescrever — "Os dados de exemplo são gerados em relação ao dia do reset: a aula 'de ontem' é sempre de ontem. Os cenários podem citar 'a próxima aula de segunda' sem caducar."
- O rodapé e os textos seguem "studio" (D4).

---

## 9. Seed com datas relativas (D6)

### 9.1 Problema

`src/data/seed.json` tem 75 campos de data fixos em agosto de 2026 e o protótipo usa a data real como "hoje". Em 21/09/2026: a carteira da Patrícia vence em três dias e o cenário prometido de renovação antecipada perde a persona; a justificativa da Larissa está fora do prazo de 7 dias; as chamadas pendentes da Beatriz são de agosto; a aula "futura" de 17/08 já passou. Cada semana que passa desmonta mais um cenário do guia.

### 9.2 Desenho

**Tokens no seed, resolvidos na carga.** O `seed.json` continua sendo o backfill legível e diffável; onde havia uma data fixa entra um token de texto, e um resolvedor único troca o token pela data calculada a partir de "hoje" nos dois pontos em que o seed vira banco: `scripts/seed.mjs` (primeira carga e coleções novas) e `src/services/reset.ts` (botão "Resetar protótipo"). Como o resolvedor precisa rodar em Node puro e no bundle do Vite, ele fica em **`src/data/datasDoSeed.mjs`** com um `datasDoSeed.d.ts` ao lado — uma implementação, dois consumidores.

Gramática dos tokens (string que começa com `@`):

| Token | Resolve para | Exemplo com hoje = segunda 21/09/2026 |
| --- | --- | --- |
| `@hoje` | hoje | 2026-09-21 |
| `@hoje-5`, `@hoje+30` | hoje mais ou menos N dias | 2026-09-16, 2026-10-21 |
| `@ultima(quarta)` | a data mais recente **anterior a hoje** que cai no dia da semana | 2026-09-16 |
| `@ultima(segunda,quarta)` | idem, aceitando qualquer dia da lista (para sessão com dois dias) | 2026-09-16 |
| `@proxima(segunda,quarta)` | a primeira data **posterior a hoje** na lista | 2026-09-23 |
| `@ultima(segunda,quarta)-1s` | uma semana antes do resultado | 2026-09-09 |
| `…T10:15` | sufixo de horário; vira ISO completo `YYYY-MM-DDT10:15:00.000Z` | 2026-09-16T10:15:00.000Z |
| `@fixa(2026-02-02)` | não resolve — deixa explícito que a data é fixa de propósito (datas de nascimento, publicação do termo) | 2026-02-02 |

Toda string de campo que não começa com `@` fica como está, e o resolvedor lança erro na carga se encontrar um token que não sabe ler — melhor quebrar o `npm run seed` do que gravar `"@hoje-5"` como data.

Regras que o resolvedor garante:

- Uma **ocorrência de sessão** sempre cai num dia da semana da sessão: as ocorrências do seed usam `@ultima(...)`/`@proxima(...)` com os dias da própria sessão (ses-1 e ses-2 segunda e quarta, ses-3 terça e quinta, ses-4 sexta, ses-5 sábado).
- Um **agendamento** tem `dataHora` anterior à ocorrência (`@ultima(segunda,quarta)-2T10:15` etc.).
- A **justificativa** da Larissa é da última ocorrência passada de ses-1, que fica no máximo 5 dias atrás — sempre dentro do prazo de 7 dias.
- A **solicitação de cancelamento** da Beatriz aponta para `@proxima(terca,quinta)` de ses-3 — sempre futura.
- **Carteiras**: Larissa ativação `@hoje-42`, validade `@hoje+48`; Patrícia ativação `@hoje-42`, validade `@hoje+5` com 1 crédito (sempre "Finalizando", pelos dois critérios); Aline ativação `@hoje-93`, validade `@hoje-48`, encerramento `@hoje-47` (sempre vencida); Fernanda ativação `@hoje-3`, validade `@hoje+42`; movimentos de crédito com `dataHora` coerente com a carteira.
- **Exceção de calendário** do seed: `@proxima(segunda,quarta)+1s` com uma ocorrência cancelada de ses-1 e a relação da Larissa preservada (cenário do WhatsApp).
- **Indicadores de professora** precisam de dois meses de presenças: chamadas finalizadas em `@hoje-35` e `@hoje-7` para Beatriz (Larissa e Patrícia num mês, só Larissa no outro), de modo que retenção e frequência mostrem número, não "—".
- **Notificações** e **auditoria** do seed seguem as datas dos fatos que registram.
- `Sessao.dataInicio` vira `@hoje-200` (a grade sempre "já existia"); `dataNascimento` e `dataPublicacao` dos termos ficam `@fixa(...)`.

### 9.3 O que muda além do seed

- `scripts/seed.mjs`: importa o resolvedor e resolve o backfill antes de gravar `db.json` ou de acrescentar coleções.
- `src/services/reset.ts`: resolve o seed importado antes de recriar via API. O reset continua sendo o único caminho de "voltar ao começo".
- `src/data/guiaDoPrototipo.ts`: cabeçalho e item "Datas" de `SIMULACOES` reescritos; os preparos que diziam "o dado de exemplo já está fora de prazo" saem.
- README: seção nova "Seed com datas relativas" com a gramática.
- Um teste de mesa documentado no `PROGRESSO_ATUALIZACAO_V21.md`: rodar o resolvedor com três "hojes" diferentes (segunda, sábado, dia 31) e conferir que todo agendamento antecede a ocorrência, toda ocorrência cai no dia certo, e que Patrícia está "Finalizando" e Aline vencida nos três.

---

## 10. Lotes de execução

Um lote por ciclo. Cada lote termina com: `tsc -b` sem erro, `vite build` ok, `oxlint` sem aviso novo, verificação no navegador dos cenários do lote, seção do lote preenchida em `PROGRESSO_ATUALIZACAO_V21.md` (o que foi entregue, decisões, como testar, verificação executada) e parada para validação. Nada de commit.

### Lote 0 — Seed com datas relativas (D6)

Entra antes do item 1 do apanhado, contra a ordem originalmente pedida, por dois motivos: todos os lotes seguintes editam o seed (Fernanda, Helena, Mariana, ocorrência cancelada, chamadas para os indicadores), e fazê-lo já com tokens evita reescrever cada data duas vezes; e a Patrícia vence em 24/09/2026 — o cenário prometido de renovação antecipada fica sem persona antes de o Lote 1 terminar.

- **Escopo:** seção 9 inteira, mais o telefone único das alunas (D5), que é uma troca de texto no mesmo arquivo.
- **Arquivos:** `src/data/seed.json`, `src/data/datasDoSeed.mjs` (novo) + `.d.ts`, `scripts/seed.mjs`, `src/services/reset.ts`, `src/data/guiaDoPrototipo.ts` (texto de datas), `README.md`.
- **Não faz:** nenhuma regra de negócio, nenhuma tela.
- **Como validar:** `npm run seed` numa cópia sem `db.json`; "Resetar protótipo"; conferir Patrícia "Finalizando", Aline vencida, Larissa com aula futura na próxima segunda ou quarta, justificativa da Larissa dentro do prazo, solicitação da Beatriz futura, chamada pendente da última aula passada.

### Lote 1 — Pendência de aceite e pagamento antes do termo (item 1)

O lote maior. Toca domínio, seed, três fluxos públicos e o painel da aluna.

- **Domínio:** `pendenciasDeAceite.ts` (novo); `registrarAceite`/`registrarAnamnese` separados; `cadastroDeAlunas.ts` cria usuária e aluna `ativa` com a pendência derivada; `aplicarCompra` ativa a carteira na confirmação (venda confirmada) e só deixa `aguardando_ativacao` com venda pendente; `quitarVendaDoPrimeiroAcesso` e `confirmarPagamento` chamam `ativarCarteirasPendentes`; `bloqueioParaAgendar` perde o caso de aceite; `pendenciasDeAcao` conta as alunas pendentes; `aulasExperimentais.ts` passa a saber se a interessada concluiu ou pulou.
- **Telas:** `MatriculaPage` (nova ordem, pular), `ExperimentalPage` (termo e anamnese com pular), `PainelAlunaPage` (alertas + modal de pendência + alerta de pagamento), `AppShell` (menu completo para aluna), `GradeDaAlunaPage` (bloqueio de pagamento), `LoginPage` (rótulo), `AdministracaoHome` (quinto cartão), `AlunasPage` (situação e filtro), `AlunaFichaPage` (acesso com as duas pendências, "Lembrar aceite"), `NotificacoesPage` (evento novo).
- **Seed:** Fernanda no estado novo; Helena Castro (nova); aceites e anamneses coerentes.
- **Guia:** cenários "Matrícula com termo pulado", "Experimental com anamnese depois", "Aluna com pagamento pendente"; alterar "Matrícula pelo site", "Aula experimental", "Cadastro pela administração", "Quando a grade bloqueia"; personas.
- **Como validar:** matrícula pública pulando os dois → painel com alerta e menu completo → agendar funciona → cartão de pendência conta 3 (Fernanda, Helena, nova) → concluir pelo atalho zera o alerta e a aluna some da contagem. Helena: alerta de pagamento, grade bloqueada, pagar, carteira ativa. Professora Beatriz recém-cadastrada continua bloqueada até o aceite (D1, regressão).

### Lote 2 — Cancelamento pelo studio com relação preservada (item 2)

- **Domínio:** `OcorrenciaSessao.origemCancelamento` e `alunasAfetadas`; `cancelarOcorrencia` recebe a origem e grava a relação com créditos devolvidos e dias prorrogados; `alunasAfetadas.ts` (leitura + `linkDoWhatsApp(aluna, ocorrencia)` com os modelos da seção 6.3).
- **Telas:** `AulasCanceladasPage` (nova) + rota + item de menu; link "Ver alunas afetadas" nos toasts de `ExcecoesPage`, `GradePage`, `SolicitacoesCancelamentoPage`, `AulasExcepcionaisPage`; texto das prévias de impacto.
- **Seed:** ocorrência cancelada por exceção com a Larissa na relação.
- **Guia:** cenário "Cancelamento pelo studio: avisar as alunas"; passo final nos quatro cenários de cancelamento; item "WhatsApp" em simulações.
- **Como validar:** abrir *Aulas canceladas* após o reset e ver a Larissa; clicar "Enviar mensagem" e conferir que o WhatsApp abre para +55 65 9680-6348 com a mensagem de exceção preenchida; cadastrar uma exceção nova numa data com agendamento e ver a ocorrência entrar na lista com a origem certa; aluna de convênio afetada aparece com a frase de reserva.

### Lote 3 — Professora consulta a ficha; indicadores de professora (itens 3 e 9)

- **Domínio:** `fichaParaProfessora.ts` (leitura reduzida + auditoria por consulta); `indicadoresDeProfessoras.ts` (frequência, retenção por turma e por professora, período mensal, CSV).
- **Telas:** `AlunasDaProfessoraPage` e `FichaDaAlunaProfessoraPage` (novas) + rotas + item "Alunas" no menu da professora; link nas chamadas; `IndicadoresDeProfessorasPage` (nova) + rota + item no menu Operação; cartão-resumo no `AdministracaoHome`; `AuditoriaPage` com a operação nova.
- **Seed:** chamadas finalizadas em dois meses para os indicadores terem número.
- **Guia:** cenários "Professora consulta a ficha" e "Retenção e frequência das professoras".
- **Como validar:** Beatriz → Alunas → Larissa → anamnese visível; Administração → Auditoria mostra "Consulta à ficha pela professora" com data e hora; indicadores do mês atual e do anterior batem com as chamadas do seed (conta feita à mão e registrada no progresso).

### Lote 4 — Aula excepcional: participante sem cadastro e convênio à parte (item 4)

- **Domínio:** `Alocacao.participanteSemCadastro`, `alunaId` opcional; `alocarAluna` aceita convênio no modo sem consumo e recusa no modo com créditos com a mensagem nova; `RegistroPresenca` por alocação; `chamadaDeAulas.ts` e `comissoes.ts` contam a presença do sem-cadastro; `notificar` ignora participante sem usuária.
- **Telas:** modal de alocação em `AulasExcepcionaisPage`; lista de participantes; `ChamadaExcepcionalPage` com badge; ficha da aluna não lista o sem-cadastro (não é aluna).
- **Guia:** cenários "Convidada sem cadastro no workshop" e "Convênio paga à parte"; alterar "Criar um workshop".
- **Como validar:** criar workshop, alocar Renata com créditos (recusa explicada) e sem consumo (aceita); alocar "Participante sem cadastro"; chamada mostra os dois; finalizar chamada com presença do sem-cadastro gera comissão contando a presença.

### Lote 5 — Miúdos: comprovante, prévia do reembolso, TotalPass, busca por telefone (itens 5, 6, 8, 10)

- **Domínio:** `FechamentoComissao.comprovante`; `marcarFechamentoComoPago({ comprovante? })`; `reembolsos.ts` texto da recusa por percentual; `ConvenioIntegracao.modo`; `convenios.ts` recusa configurar integração para TotalPass e espelha só Wellhub; `useAlunas.ts` busca por telefone (normalizando dígitos).
- **Telas:** `ComissoesPage` (campo comprovante e exibição), `ModalReembolso` (dias decorridos, textos), `ConveniosPage` (cartão TotalPass em contingência), `AlunasPage` (busca).
- **Seed:** Mariana Teixeira (TotalPass) com reserva em contingência; TotalPass em `modo: 'contingencia'`.
- **Guia:** cenários "Comprovante do fechamento" e "TotalPass em contingência"; alterar "Reserva, check-in e repasse" e "Reembolso por arrependimento"; item "Anexos" em simulações.
- **Como validar:** fechar e pagar um período com e sem comprovante; prévia de reembolso da Larissa mostra "Dias decorridos: 42"; tentar reembolso por arrependimento da Patrícia (75% consumidos) → recusa sugere o motivo legal; Convênios → Credenciais mostra TotalPass sem integração; buscar "9680" em Alunas retorna todas.

### Depois dos lotes

Consolidação da documentação (README, CLAUDE.md apontando para a v2.1 como fonte da verdade, `PROGRESSO_ATUALIZACAO.md` com nota de que a v2.1 foi absorvida). Pode ser um lote 6 curto ou entrar no Lote 5, a seu critério.

---

## 11. Verificação padrão de cada lote

1. `npx tsc -b` sem erro.
2. `npm run build` compilando.
3. `npm run lint` sem aviso além dos três preexistentes de fast-refresh.
4. "Resetar protótipo" e percorrer no navegador os cenários do lote, na ordem do guia.
5. Conferir que **carregar tela não escreve** — exceção única e documentada: a ficha da aluna aberta pela professora grava a auditoria, porque o RF-PRE-09 exige registrar a consulta.
6. Registrar no `PROGRESSO_ATUALIZACAO_V21.md`: o que foi entregue, decisões tomadas no lote, como testar, verificação executada, e qualquer ajuste pós-entrega.

---

## 12. Fora de escopo, confirmado

- EV-16 a EV-21 (bloqueio até o aceite, integração TotalPass, pagamento em dinheiro pelo sistema para aula excepcional, e as demais).
- PA-01, 02, 03, 07 e 08: seguem com os valores de referência já parametrizados; nenhuma tela nova.
- Troca "studio" → "estúdio" (D4).
- Envio real de WhatsApp, upload real de comprovante, e-mail real, gateway real, API dos convênios.
- Testes automatizados, autenticação real, banco real (CLAUDE.md).

---

## 13. Pressupostos assumidos neste plano

Decisões que tomei para fechar o plano e que podem ser revertidas na revisão, sem custo, antes do lote correspondente:

1. **Número do WhatsApp gravado como `556596806348`** (o que foi informado, sem o nono dígito). Se o celular real for 65 9 9680-6348, o link precisa de `5565996806348`; confere-se no primeiro clique do Lote 2.
2. **Tela própria "Aulas canceladas"** para a relação preservada, em vez de espalhar a consulta pelas quatro telas de origem. Uma tela, um lugar para a cliente procurar.
3. **Tela própria "Indicadores de professoras"** em Operação, com cartão-resumo na visão geral, em vez de aba em Comissões ou em Professoras.
4. **Duas personas novas no seed** (Helena Castro para o D2, Mariana Teixeira para o TotalPass) e uma ocorrência já cancelada no seed, para que os cenários novos existam sem preparo.
5. **`Aluna.situacao = 'aguardando_aceite'` continua gravada**, recalculada a cada aceite ou anamnese, em vez de virar campo puramente derivado — mantém o filtro e o contador baratos e o modelo de dados da seção 7 do escopo intacto.
6. **Botão "Lembrar aceite"** na ficha como a forma de a administração "solicitar o aceite" (RF-ALU-08): dispara um e-mail registrado em Notificações. É a menor interpretação possível do texto; não inventa canal.
7. **Lote 0 (seed) antes do item 1**, pelos motivos da seção 10.
