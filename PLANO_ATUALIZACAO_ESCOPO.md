# Plano de Atualização — Escopo v1.0 → v2.0

Documento de trabalho para atualizar o protótipo ao **Escopo Funcional Atualizado (v2.0, 25/08/2026)**, que substitui o `escopo_funcional_contratado.md` (v1.0, 14/08/2026) como fonte única da verdade.

Status: **plano proposto, aguardando validação.** Nenhuma etapa foi executada.

---

## 1. Discovery — o que mudou entre os documentos

### 1.1 A mudança estrutural

O v1.0 comercializava **contrato com mensalidade recorrente**: a aluna contratava um pacote com valor mensal e quantidade de aulas por ciclo, o ciclo renovava automaticamente na data de vencimento gerando nova cobrança, e havia toda a máquina de inadimplência (retentativa, multa, juros, bloqueio, regularização).

O v2.0 comercializa **pacote de créditos pré-pago**: a aluna compra um pacote com quantidade de créditos e validade em dias, paga uma única vez no ato da compra, e gasta os créditos como quiser dentro da validade. Cada categoria de aula tem um custo próprio em créditos.

Essa troca não é um ajuste — é a substituição do núcleo do domínio. Tudo que orbita contrato, ciclo, mensalidade e inadimplência deixa de existir; tudo que orbita carteira, crédito, validade e venda avulsa nasce.

### 1.2 Módulos: de 16 para 17

| v1.0 | v2.0 | Situação |
| --- | --- | --- |
| M1 Configuração Base | M1 Configuração Base | Alterado — entra cadastro de **categorias de aula com custo em créditos** (RF-CFG-05) e mudam os parâmetros operacionais |
| M2 Cadastro de Alunas | M2 Cadastro de Alunas | Alterado — bolsa deixa de ter percentual, filtros de situação mudam, ficha passa a mostrar créditos |
| M3 Pacotes e **Contratos** | M3 Pacotes e **Créditos** | **Reescrito** |
| M4 Professoras e Categorias | M4 Professoras e Categorias | Praticamente igual (sai RF-PRO-06 "valores em definição") |
| M5 Grade de Horários | M5 Grade de Horários | Pequenos ajustes (só aulas regulares; conflito de espaço considera aula excepcional; devolução prorroga validade) |
| M6 Calendário de Exceções | M6 Calendário de Exceções | Pequenos ajustes (devolve créditos e prorroga validade) |
| M7 Agendamento de Aulas | M7 Agendamento de Aulas **Regulares** | Alterado — reserva de créditos em vez de desconto de saldo; some bloqueio por inadimplência |
| M8 Cancelamento e Justificativa | M8 Cancelamento e Justificativa | Alterado no vocabulário (libera reserva / consome crédito) |
| — | **M9 Aulas Excepcionais** | **Módulo novo** — workshop e aula particular (13 requisitos) |
| M9 Presença e Chamada | M10 Presença e Chamada | Alterado — chamada converte reservado em utilizado; aulas excepcionais entram na lista do dia |
| M10 Comissão e Fechamento | M11 Comissão e Fechamento | Alterado — comissão de aula excepcional por professora vinculada com valor próprio; sessão sem presenças não gera comissão |
| M11 **Cobranças e Financeiro** | M12 **Vendas, Pagamentos e Reembolso** | **Reescrito** |
| M12 Aula Experimental | M13 Aula Experimental | Alterado — sem consumo de créditos; benefício de conversão parametrizado |
| M13 Convênios Corporativos | M14 Convênios Corporativos | Alterado — aulas excepcionais não espelhadas; convivência pacote + convênio; sem controle de limite |
| M14 Painéis e Indicadores | M15 Painéis e Indicadores | Alterado — indicadores trocam inadimplência por créditos em circulação e pacotes a vencer |
| M15 Notificações | M16 Notificações | Alterado — 5 eventos novos, 2 removidos |
| M16 Perfis e Permissões | M17 Perfis e Permissões | Alterado — muda a lista de operações críticas |

### 1.3 O que sai do protótipo (já implementado, agora fora de escopo)

Estes recursos estão construídos e funcionando hoje, e o v2.0 os elimina:

- **Cobrança recorrente** e todo o ciclo mensal (`gerarCobrancaDoCiclo`, `renovarCiclo`, `processarRotinaFinanceira`).
- **Retentativa de cobrança**, automática e manual, e o registro de tentativas (`TentativaCobranca`).
- **Multa e juros de mora** (`utils/financeiro.ts`, parâmetros `percentual_multa` e `percentual_juros_mes`).
- **Inadimplência**: marcação, bloqueio de agendamento, exibição de débito, regularização automática.
- **Aviso de término de contrato** (RF-FIN-09 e RF-NOT-06) e os parâmetros de antecedência.
- **Alteração de plano** com cálculo proporcional (`RF-PLN-01..07`, `HistoricoPlano`, `calcularPreviaAlteracaoPlano`).
- **Suspensão de contrato** (o v2.0 mantém só o trancamento, sem distinção mensal/semestral).
- **Encerramento e reativação de contrato** com motivo estruturado (`MOTIVOS_ENCERRAMENTO`, REL-12).
- **Bolsa com percentual parcial** — no v2.0 a bolsa é sempre 100% (o desconto parcial virou a evolução EV-04).
- **Duração de contrato mensal/semestral** e o campo `tipo` do pacote.
- **Limite de dias de pausa por pacote** (o v2.0 decidiu explicitamente não impor teto).

Recomendo remover de fato, não apenas ocultar: manter código morto de um modelo comercial que foi substituído confunde a validação e a manutenção. O histórico continua no git.

### 1.4 O que entra (novo, sem correspondente hoje)

**M3 — Pacotes e Créditos**
- `Pacote` passa a ser *nome, quantidade de créditos, validade em dias, valor, situação*. Some valor mensal, aulas por ciclo, aulas por semana, duração em meses, validade do ciclo, limite de pausa.
- **Carteira de créditos** (RF-CRE-01..12): saldo composto por totais, reservados e utilizados; disponível = totais − utilizados − reservados. Ativação só após pagamento confirmado + termo aceito + anamnese preenchida.
- **Histórico de movimentos** (RF-CRE-08): concessão, reserva, liberação, consumo, expiração, estorno, ajuste — cada um com quantidade, origem, autor e data.
- **Ajuste administrativo** (RF-CRE-09): conceder crédito, estornar utilizado, prorrogar validade — inclusive de carteira encerrada.
- **Status da carteira**: Ativo, Finalizando (informativo, coexiste com Ativo, limiares configuráveis), Consumido, Expirado.
- **Renovação antecipada** (RF-CRE-13): créditos restantes somam ao novo pacote com validade única. **Compra após encerramento** (RF-CRE-14): carteira nova, sem somar. **Carteira única** (RF-CRE-15). **Prévia da compra** (RF-CRE-16).
- **Bolsa** (RF-BOL-01..07): sempre 100%, com renovação automática da carteira ao encerrar, sem cobrança e sem ação da aluna.
- **Trancamento** (RF-TRA-01..07): congela a validade e prorroga automaticamente pelos dias trancados; sem teto de dias; prévia com saldo congelado, validade projetada e aulas a cancelar; histórico de trancamentos anteriores como apoio à decisão.

**M9 — Aulas Excepcionais** (módulo inteiro, novo)
- Workshop e aula particular criados pela administração, fora da grade, sem recorrência, sem agendamento pela aluna.
- Alocação manual **consome crédito imediatamente**, sem passar por reserva (RF-AEX-04). Custo integral por participante.
- Alocação **sem consumo de créditos** com registro de motivo (RF-AEX-06).
- **Sem controle de capacidade** pelo sistema (RF-AEX-08).
- **Horário fora do funcionamento é apenas alertado**, não bloqueado (RF-AEX-13) — diferente da grade regular. Conflito de espaço e de professora continua bloqueante.
- **Conflito com a grade** (RF-AEX-03): oferece cancelar as sessões regulares afetadas, com devolução de créditos e prorrogação.
- **Professoras opcionais, com valor de comissão individual por professora** informado no cadastro da aula (RF-AEX-12) — não usa a categoria da professora. Aula sem professora vinculada não gera comissão.
- Chamada própria; sem professora vinculada, quem faz a chamada é a administração.
- Alunas de convênio não participam (RF-AEX-11).

**M12 — Vendas, Pagamentos e Reembolso**
- **Venda** com pacote, créditos, validade, valor, forma de pagamento, data e identificador do gateway.
- **Formas de pagamento**: cartão à vista, cartão parcelado (valor total debitado do limite na compra), Pix à vista.
- Venda pendente até a confirmação do gateway; carteira só ativa depois.
- Registro manual de venda fora do gateway; cancelamento de venda pendente com motivo.
- **Reembolso** (RF-REE-01..11), inteiramente novo: arrependimento em até 7 dias corridos com no máximo 50% dos créditos utilizados; desconto dos créditos usados pelo valor unitário; prévia; execução pelo gateway; encerramento da carteira e cancelamento das aulas futuras; motivo legal após o prazo.
- **Invisibilidade no perfil da aluna** (RF-REE-09/10): nenhum botão, aba, rótulo, coluna ou filtro de reembolso aparece para a aluna. A informação só surge no histórico de compras dela se houver reembolso efetivamente aplicado.

**Outros**
- **Categorias de aula com custo em créditos** (RF-CFG-05): regular 1, workshop 2, particular 4 — configuráveis, com cadastro de novas categorias.
- **Saldo persistente na jornada** (RF-AGD-02) e **custo em créditos exibido em cada aula** da grade (RF-AGD-01).
- **Sessão finalizada sem nenhuma presença não gera comissão** (RF-COM-03), destacada no fechamento.
- **Convivência pacote + convênio** (RF-CNV-09): a mesma pessoa pode ter carteira e usar convênio; cada agendamento registra sua origem.
- **Benefício de conversão da aula experimental** (RF-EXP-08), parametrizável.

### 1.5 Modelo de dados — delta

**Removidas:** `Contrato`, `HistoricoPlano`, `HistoricoBolsa`, `Pausa`, `Cobranca`, `TentativaCobranca`.

**Novas:** `CategoriaAula`, `Carteira`, `MovimentoCredito`, `Trancamento`, `Venda`, `Reembolso`, `AulaExcepcional`, `ProfessoraDaAula`, `Alocacao`.

**Alteradas:**
- `Pacote` — reescrito (créditos, validade em dias, valor).
- `Aluna` — perde `percentualBolsa`, ganha `pacoteConcedidoId` (o pacote da bolsa); `SituacaoAluna` perde `inadimplente`, `suspensa` e `encerrada`.
- `Agendamento` — ganha `creditosReservados`.
- `OcorrenciaSessao` — ganha `capacidadeEfetiva`.
- `Chamada` — passa a referenciar ocorrência de sessão **ou** aula excepcional.
- `Comissao` — `categoriaAplicadaId` vira `baseDeCalculo` (categoria da professora na aula regular, valor informado na aula excepcional).
- `Studio` — ganha `fuso`.

### 1.6 Parâmetros operacionais — delta

**Saem:** `prazo_bloqueio_inadimplencia_dias`, `percentual_multa`, `percentual_juros_mes`, `antecedencia_aviso_vencimento_dias_1`, `antecedencia_aviso_vencimento_dias_2`.

**Entram:** limiar de créditos e limiar de dias do status Finalizando; percentual máximo de créditos utilizados para reembolso (PA-07); prazo de arrependimento em dias (PA-06); tipo, quantidade e validade do benefício de conversão da experimental (PA-04); texto do prazo de processamento do reembolso (PA-03).

**Renomeado:** `janela_agendamento_matriculadas_dias` → `janela_agendamento_com_pacote_dias`.

### 1.7 Pontos em aberto — conjunto novo

Os PA-01 a PA-06 do v1.0 foram substituídos por PA-01 a PA-12. Sigo o precedente da Fase 0 (adotar a sugestão da FGC como valor de referência, sinalizado como exemplo). Os que têm efeito direto em código:

| Ponto | Decisão adotada |
| --- | --- |
| PA-04 — benefício de conversão | Parametrizado: 3 dias de validade, 1 crédito adicional no primeiro pacote |
| PA-06 — arrependimento por canal | 7 dias para todas as compras, independentemente do canal |
| PA-07 — limite de 50% | Parametrizável, valor inicial 50% |
| PA-09 — reembolso com créditos incorporados | Reembolsa **apenas a compra**; os créditos anteriores voltam com a validade original restaurada |
| PA-10 — renovação que reduz validade | **A validade passa a ser a mais distante entre as duas** |
| PA-11 — prorrogação por cancelamento do studio | Cumulativa, uma por ocorrência cancelada; referência 7 dias |
| PA-12 — alocação sem consumo | Exige motivo de lista curta (pagamento avulso, convidada, cortesia) e aparece no relatório |

**Atenção — conflito interno do documento:** o RF-CRE-13 diz que na renovação antecipada "a validade anterior é descartada e passa a valer uma validade única contada a partir da ativação do novo pacote", enquanto o PA-10 recomenda adotar a **validade mais distante entre as duas**. São regras diferentes quando o pacote novo é mais curto que o prazo restante. **Decidido: vale o PA-10** (ver capítulo 4). Nos casos normais o resultado é idêntico ao do RF-CRE-13.

---

## 2. Estado atual do protótipo

- 8 fases entregues, cobrindo os 16 módulos do v1.0. Aproximadamente 17.600 linhas em `src/`.
- Arquitetura: regra de domínio em `src/hooks/`, acesso a dado via `criarRepositorio<T>` em `src/services/repositorios.ts`, tipos em `src/types/domain.ts`, backfill versionado em `src/data/seed.json` sobre json-server.
- 33 coleções no seed, 22 telas de administração, 3 de professora, 3 de aluna, 2 públicas (matrícula, experimental).

**Superfície de impacto por arquivo** (os maiores):

| Arquivo | Linhas | Destino |
| --- | --- | --- |
| `src/hooks/cobrancas.ts` | 795 | Removido; substituído por `vendas.ts` |
| `src/hooks/contratosDeAluna.ts` | 682 | Reescrito como `carteiraDeCreditos.ts` + `cadastroDeAlunas.ts` |
| `src/pages/administracao/CobrancasPage.tsx` | 673 | Reescrito como `VendasPage.tsx` |
| `src/pages/administracao/AlunaFichaPage.tsx` | 590 | Reescrito (carteira, movimentos, trancamento, compras, reembolso) |
| `src/pages/aluna/PainelAlunaPage.tsx` | 589 | Reescrito (saldo de créditos, compra com prévia) |
| `src/pages/MatriculaPage.tsx` | 483 | Alterado (pagamento único) |
| `src/hooks/agendamentoDeAulas.ts` | 394 | Alterado (reserva de créditos) |
| `src/hooks/aulasExperimentais.ts` | 409 | Alterado (sem consumo, benefício de conversão) |
| `src/utils/contrato.ts` | 167 | Reescrito como `src/utils/creditos.ts` |
| `src/utils/financeiro.ts` | ~60 | Removido |
| `src/pages/administracao/aluna/ModaisContrato.tsx` | — | Reescrito (trancamento, ajuste de créditos, reembolso) |

---

## 3. Plano de execução

Oito etapas. **Cada etapa deixa o protótipo compilando e navegável** — nenhum ponto de parada tem tela quebrada. Cada uma termina com o registro em `PROGRESSO.md` (o que foi feito, telas disponíveis, como testar) e para para validação.

A ordem foi montada para que a virada do modelo comercial (Etapa 2) chegue com a configuração já pronta e validada, e para que os módulos periféricos só sejam mexidos depois que o núcleo esteja estável.

---

### Etapa 1 — Documento de escopo e configuração base do modelo de créditos

**Objetivo:** trocar a fonte da verdade e preparar o catálogo, sem tocar no modelo comercial ainda em vigor.

- Converter o `.docx` atualizado para `escopo_funcional_contratado.md` (v2.0), preservando o formato de tabelas do arquivo atual. O v1.0 sai do lugar de fonte da verdade — proposta: arquivar como `escopo_funcional_contratado_v1.md` para consulta.
- Atualizar `CLAUDE.md` e `README.md`: referências ao documento, vocabulário (crédito, carteira, venda) e a lista de "fora de escopo" (evoluções agora vão até EV-15).
- **Nova entidade `CategoriaAula`** + chave no seed + repositório: regular (1 crédito), workshop (2), particular (4), com indicador de aula excepcional.
- **Nova tela "Categorias de aula"** em Configuração: listagem em `Tabela`, cadastro e edição do custo em créditos, inativação. Segue o padrão de `ModalidadesPage`.
- **`Pacote` ganha os campos novos** (`creditos`, `validadeDias`, `valor`) **convivendo com os antigos**, como ponte. A tela de Pacotes passa a editar os dois conjuntos, com os campos do modelo antigo marcados como legado. Isso é deliberadamente temporário e cai na Etapa 2.
- **Parâmetros:** entram os novos (limiares do Finalizando, percentual de reembolso, prazo de arrependimento, benefício de conversão, texto de prazo de reembolso), com a frase em linguagem natural ao lado de cada um, como já é o padrão da tela. Os parâmetros financeiros antigos permanecem até a Etapa 2.
- Seed: os três pacotes de referência do escopo (Starter 4/45 dias, Flow 12/90 dias, Premium 24/180 dias) passam a existir com os campos novos preenchidos.

**Risco:** baixo. Nada é removido; o protótipo continua operando no modelo de contrato.

---

### Etapa 2 — Carteira de créditos e venda avulsa (a virada)

**Objetivo:** substituir contrato e cobrança recorrente por carteira e venda única. É a etapa central e a maior.

- **`src/types/domain.ts`:** remover `Contrato`, `HistoricoPlano`, `HistoricoBolsa`, `Pausa`, `Cobranca`, `TentativaCobranca`. Criar `Carteira`, `MovimentoCredito`, `Venda`. `Pacote` perde os campos legado. `Aluna` perde `percentualBolsa` e ganha `pacoteConcedidoId`. `Agendamento` ganha `creditosReservados`.
- **`src/data/seed.json` reescrito**: alunas de exemplo com carteiras em estados diferentes (ativa, finalizando por poucos créditos, finalizando por vencimento próximo, consumida, expirada, bolsista), movimentos de crédito coerentes e vendas correspondentes. `src/services/reset.ts` — atualizar `CHAVES_ESTRANGEIRAS`.
- **`src/utils/creditos.ts`** (substitui `utils/contrato.ts`): saldo disponível, status da carteira, cálculo de validade, prévia de renovação antecipada (com a regra do PA-10), valor unitário do crédito.
- **`src/hooks/carteiraDeCreditos.ts`**: ativação, reserva, liberação, consumo, expiração, estorno, ajuste administrativo, encerramento automático, renovação antecipada, compra após encerramento, renovação automática da bolsista. Todo movimento gera `MovimentoCredito` e registro de auditoria.
- **`src/hooks/vendas.ts`** (substitui `cobrancas.ts`): venda com forma de pagamento, confirmação pelo gateway simulado, venda pendente, cancelamento de venda pendente, registro manual, resumo por situação. `src/services/gatewayPagamento.ts` passa a expor pagamento único e estorno.
- **`src/hooks/cadastroDeAlunas.ts`** (o que sobra de `contratosDeAluna.ts`): cadastro administrativo com pacote e bolsa, matrícula pelo site, bloqueio até o aceite.
- **Telas:**
  - **Cobranças → Vendas**: totais por situação (confirmado, pendente, cancelado, reembolsado), registro manual, cancelamento de pendente, exportação.
  - **Ficha da aluna**: carteira vigente com totais/reservados/utilizados/disponíveis e validade, histórico de movimentos, histórico de pacotes, histórico de compras, ajuste administrativo de créditos.
  - **Painel da aluna**: saldo persistente, validade, custo em créditos por categoria, compra de novo pacote com prévia do saldo resultante e da nova validade.
  - **Matrícula pelo site** e **cadastro administrativo**: pagamento único, bolsa sem percentual.
  - **Alunas**: filtros novos (com pacote ativo, sem pacote ativo, trancada, aguardando aceite, bolsista, pacote a vencer).
  - **Pacotes**: campos legado removidos.
  - **Parâmetros**: parâmetros financeiros antigos removidos.
- **Adaptação mínima** de agendamento, cancelamento e chamada para o ciclo reserva → consumo, o suficiente para as telas funcionarem. O refino completo é a Etapa 5.

**Risco:** alto. É a etapa que exige mais atenção na validação, e é onde vale testar cada estado de carteira do seed.

---

### Etapa 3 — Trancamento e reembolso

**Objetivo:** os dois recursos de mediação da administração.

- **`Trancamento`** + `src/hooks/trancamento.ts`: concessão com data de início, término previsto e motivo; congelamento da validade; prorrogação automática no retorno; cancelamento das aulas do período com devolução dos créditos; bloqueio da grade durante o período.
- **Prévia do trancamento** (RF-TRA-05): saldo congelado, validade atual, validade projetada, aulas que serão canceladas. Tela apresenta pacote, saldo, validade e histórico de trancamentos anteriores como apoio à decisão (RF-TRA-07).
- **`Reembolso`** + `src/hooks/reembolsos.ts`: verificação do prazo de arrependimento e do percentual de créditos utilizados; cálculo pelo valor unitário do crédito; prévia (valor pago, créditos utilizados, valor descontado, líquido); execução pelo gateway simulado; encerramento da carteira; cancelamento das aulas futuras; reembolso por motivo legal com documentação.
- **Regra do PA-09**: o reembolso incide sobre a compra, não sobre a carteira inteira; créditos incorporados de pacote anterior retornam com a validade original restaurada.
- **RF-REE-09/10 — invisibilidade**: varredura do perfil da aluna para garantir que nenhum rótulo, coluna, filtro ou botão de reembolso apareça; a linha só existe no histórico de compras de quem teve reembolso aplicado.
- Modais na ficha da aluna (reescrita de `ModaisContrato.tsx`), relatório de reembolsos (REL-13).

**Risco:** médio. O ponto delicado é a invisibilidade — precisa de checagem tela a tela, não só do hook.

---

### Etapa 4 — Aulas excepcionais (M9, módulo novo)

**Objetivo:** workshop e aula particular ponta a ponta.

- **`AulaExcepcional`, `ProfessoraDaAula`, `Alocacao`** + `src/hooks/aulasExcepcionais.ts`.
- **Nova tela "Aulas excepcionais"** (Administração): cadastro com categoria, nome, data, horário, espaço; vínculo opcional de uma ou mais professoras, cada uma com seu valor de comissão; alerta não bloqueante para horário fora do funcionamento, com as duas saídas (confirmar assim mesmo / ajustar); validação bloqueante de conflito de espaço e de professora.
- **Conflito com a grade regular** (RF-AEX-03): prévia das sessões afetadas, cancelamento com devolução de créditos, prorrogação de validade e notificação; quando não há aluna agendada, apenas informa.
- **Alocação de alunas**: consumo imediato de créditos (sem reserva), custo integral por participante, alocação sem consumo com motivo de lista curta, cancelamento da alocação com estorno, sem controle de capacidade.
- **Visibilidade para a aluna**: aula excepcional nas próximas aulas e no histórico de frequência, com o consumo correspondente — sem caminho de agendamento próprio.
- **Chamada da aula excepcional**: aparece nas sessões do dia de cada professora vinculada; sem professora vinculada, a chamada é da administração.
- Alunas de convênio bloqueadas na alocação (RF-AEX-11).

**Risco:** médio. Módulo novo e isolado, mas encosta em grade, chamada e comissão.

---

### Etapa 5 — Agendamento, cancelamento e presença sobre créditos

**Objetivo:** fechar o ciclo reserva → consumo com o refino que a Etapa 2 deixou no mínimo.

- **Grade da aluna**: custo em créditos visível em cada aula, saldo e validade persistentes na tela, bloqueio por saldo insuficiente / data posterior à validade / trancamento / capacidade, com a mensagem correta em cada caso.
- **Janela de agendamento** diferenciada com o parâmetro renomeado; janela do convênio independente.
- **Agendamento**: reserva a quantidade de créditos da categoria; confirmação exibe novo saldo disponível e regra de cancelamento; agendamento pela administração com autoria.
- **Cancelamento**: dentro da antecedência libera a reserva; fora consome, com aviso explícito antes de confirmar e oferta de justificativa.
- **Justificativa aprovada** estorna os créditos consumidos ao saldo disponível.
- **Chamada**: finalização converte reservado em utilizado; ausência sem justificativa aprovada consome; correção dentro do prazo ajusta crédito e comissão.
- **Histórico da aluna** (RF-PRE-07) passa a exibir os créditos consumidos em cada ocorrência.
- **Prorrogação de validade cumulativa** (PA-11) aplicada nos três caminhos de cancelamento pelo studio: solicitação da professora aprovada sem substituta, exceção de calendário e exclusão de sessão.

**Risco:** médio.

---

### Etapa 6 — Comissão e convênios

**Objetivo:** ajustar os dois módulos ao que mudou.

- **Comissão de aula excepcional**: um lançamento por professora vinculada, com o valor informado no cadastro da aula; aula sem professora vinculada não gera comissão; `baseDeCalculo` registrada em cada lançamento.
- **RF-COM-03**: sessão finalizada sem nenhuma presença não gera comissão e é destacada no fechamento do mês para decisão da administração.
- **Detalhamento do fechamento** separando aulas regulares e excepcionais (REL-07).
- **Convênios**: aulas excepcionais não são espelhadas; convivência de pacote e convênio na mesma pessoa, com origem registrada em cada agendamento; ausência de controle de limite explicitada na tela; ajuste do relatório de repasse.

**Risco:** baixo.

---

### Etapa 7 — Experimental, painéis, notificações, perfis e relatórios

**Objetivo:** os módulos de superfície.

- **Aula experimental**: presença sem consumo de créditos; benefício de conversão parametrizado (tipo, quantidade, validade) aplicado na compra do primeiro pacote após a aula; relatório de conversão ajustado.
- **Painel administrativo** (RF-PNL-01): alunas com pacote ativo, pacotes a vencer, receita do período, aulas realizadas, comissão gerada, créditos em circulação. Sai inadimplência. Bloco de pendências continua abrindo a tela.
- **Painel da aluna** (RF-PNL-05): disponíveis, reservados, utilizados, validade, próximas aulas, frequência, histórico de compras.
- **Notificações**: entram confirmação de compra (RF-NOT-02), alocação em aula excepcional (RF-NOT-04), pacote finalizando (RF-NOT-08), pacote encerrado (RF-NOT-09) e reembolso aplicado (RF-NOT-12). Saem aviso de término de contrato e todos os de cobrança e inadimplência. Catálogo `EVENTOS_NOTIFICACAO` atualizado.
- **RF-PER-03**: operações críticas passam a ser trancamento, ajuste de créditos, concessão de bolsa, criação e alocação em aulas excepcionais e reembolso.
- **Relatórios REL-01 a REL-13**: conferir cada um contra as telas e exportações existentes; entram alunas bolsistas com valor não faturado, aulas excepcionais e reembolsos; sai motivos de encerramento.

**Risco:** baixo.

---

### Etapa 8 — Varredura final e consolidação

**Objetivo:** não deixar resíduo do modelo antigo.

- Varredura de vocabulário no código e nas telas: "mensalidade", "inadimplente", "contrato", "saldo de aulas", "ciclo", "cobrança recorrente", "suspensão", "alteração de plano".
- Conferência requisito a requisito do capítulo 4 do v2.0 (RF-CFG-01 a RF-PER-05) contra o protótipo, com a lista do que ficou fora e por quê.
- Conferência dos fluxos do capítulo 6 (11 fluxos) executáveis ponta a ponta no protótipo.
- `PROGRESSO.md` consolidado: seção nova de atualização de escopo, com as 8 etapas e o registro do que saiu.
- `README.md` e `CLAUDE.md` revisados: arquitetura, padrões de UI que surgiram, glossário do modelo de créditos.
- `db.json` regenerado a partir do seed novo; "Resetar protótipo" verificado.

**Risco:** baixo.

---

## 4. Decisões confirmadas

Todas resolvidas em 27/08/2026, antes do início da execução.

1. **PA-10 x RF-CRE-13** — na renovação antecipada vale a regra do **PA-10**: a nova validade é a **mais distante entre as duas**, e não a do pacote recém-comprado. A aluna nunca perde prazo por comprar mais créditos. Nos casos normais, em que o pacote novo estende a validade, o resultado é idêntico ao da regra literal do RF-CRE-13.
2. **Destino do escopo v1.0** — **arquivar** como `escopo_funcional_contratado_v1.md`, com aviso no topo indicando que foi substituído pelo v2.0 e que não deve ser usado como referência de desenvolvimento.
3. **Módulos que saíram do escopo** — **remover de fato**: arquivos, tipos, chaves do seed, rotas e itens de menu. Contrato e carteira não coexistem em nenhum momento após a Etapa 2. O histórico fica no git.
4. **Pontos em aberto PA-01 a PA-12** — **adotar as sugestões da FGC** como valores de referência, sinalizados como exemplo na tela de parâmetros e alteráveis sem mudança de código, seguindo o precedente registrado na Fase 0 para o conjunto anterior.

Valores que entram como parâmetro a partir do item 4:

| Ponto | Valor inicial |
| --- | --- |
| PA-04 — benefício de conversão da experimental | 3 dias de validade, 1 crédito adicional no primeiro pacote |
| PA-06 — prazo de arrependimento | 7 dias corridos, para compras de qualquer canal |
| PA-07 — limite de créditos utilizados para reembolso | 50% |
| PA-11 — prorrogação por cancelamento do studio | 7 dias, cumulativos por ocorrência cancelada |
| PA-12 — alocação sem consumo de créditos | Motivo obrigatório: pagamento avulso, convidada ou cortesia |

PA-09 e PA-10 são regra de cálculo, não parâmetro. PA-01, PA-02, PA-03, PA-05 e PA-08 são conteúdo ou definição jurídica, sem impacto estrutural — o PA-05 recomenda uma assinatura por versão do termo, que já é o comportamento atual do protótipo.
