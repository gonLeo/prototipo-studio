# Protótipo — Sistema de Gestão do Estúdio

Protótipo funcional navegável do sistema de gestão descrito em `escopo_funcional_contratado.md` (escopo versão 2.1 — modelo de **pacotes de créditos pré-pagos**). Sem backend real: persistência via `json-server` sobre um backfill versionado.

Migração v1.0 → v2.0: plano em [PLANO_ATUALIZACAO_ESCOPO.md](./PLANO_ATUALIZACAO_ESCOPO.md), progresso em [PROGRESSO_ATUALIZACAO.md](./PROGRESSO_ATUALIZACAO.md). Migração v2.0 → v2.1: plano em [PLANO_ATUALIZACAO_V21.md](./PLANO_ATUALIZACAO_V21.md), progresso em [PROGRESSO_ATUALIZACAO_V21.md](./PROGRESSO_ATUALIZACAO_V21.md). Histórico das Fases 0 a 8, construídas sobre o escopo v1.0: [PROGRESSO.md](./PROGRESSO.md).

**Grafia:** o escopo v2.1 passou a escrever "estúdio", com acento; o código e as telas continuam com "studio" (decisão D4 da migração v2.1 — troca cosmética, sem valor funcional, não replicada).

## Rodando localmente

```bash
npm install
npm run dev
```

Sobe dois processos: Vite (`http://localhost:5173`) e json-server (`http://localhost:4000`, acessado pelo front via proxy `/api`). Na primeira execução, `db.json` é criado a partir do backfill em `src/data/seed.json`, com as datas resolvidas em relação ao dia da carga (ver "Seed com datas relativas").

## Publicando

```bash
npm run build
npm start
```

Um host como o Railway dá uma porta só e nenhum proxy do Vite, então em produção os dois processos viram um: `server.mjs` serve os arquivos de `dist/`, monta o json-server em `/api` (com o prefixo removido, a mesma reescrita do proxy do Vite) e devolve `index.html` nas rotas do BrowserRouter. O prefixo é o que impede o json-server de engolir rotas do próprio app — ele expõe os recursos na raiz. Passo a passo, variáveis (`TZ`, `DB_PATH`) e o que acontece com os dados a cada publicação: [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md).

## Arquitetura

- `src/types/domain.ts` — entidades do modelo conceitual de dados (seção 7 do escopo).
- `src/services/` — camada de acesso a dados. `criarRepositorio<T>` expõe `listar/buscarPorId/criar/atualizar/remover` sobre REST; componentes nunca chamam `fetch`/`localStorage` diretamente. Trocar por uma API real no futuro não deve exigir mudança nas telas.
- `src/hooks/` — regras de domínio e sessão (perfis simulados).
  - **Carregar uma tela nunca escreve no banco.** Criar registro (`Chamada`, `OcorrenciaSessao`…) é efeito de uma ação explícita da usuária, nunca do efeito de carregamento: o React executa efeitos duas vezes em desenvolvimento (StrictMode) e duplicaria o registro. Pelo mesmo motivo, uma ação de escrita deve resolver o registro pela chave de negócio (sessão + data, por exemplo) em vez de confiar num id guardado no estado da tela — que pode estar obsoleto depois de um "Resetar protótipo". **Única exceção documentada:** a ficha da aluna vista pela professora audita a própria consulta ao carregar (`fichaParaProfessora.ts`, RF-PRE-09) — é o requisito que pede exatamente esse registro.
  - **Cuidado com dependência instável em efeito que carrega dados.** Valor derivado de função que cria objeto novo a cada chamada (ex.: `periodoAtual()`) precisa de `useMemo` antes de entrar nas dependências de um `useCallback`/`useEffect` que faz `setState` — sem isso o carregamento vira laço infinito e o navegador derruba as conexões com `ERR_INSUFFICIENT_RESOURCES`. Prefira dependências primitivas (id, string de data).
- `src/components/`, `src/pages/` — apresentação.
- `src/services/notificador.ts` — camada de notificação (M15). **Nenhuma regra grava `Notificacao` direto**: as regras dizem o que comunicar e para quem (`{ tipo: 'aluna' | 'professora' | 'usuario' | 'administracao', id }`), e a camada resolve o destinatário e decide o canal em `canalDoEvento`. Na Fase 1 tudo sai por e-mail; incluir WhatsApp é mudar essa função, sem tocar em regra de disparo (RF-NOT-10). Evento novo entra no catálogo `EVENTOS_NOTIFICACAO` junto com a regra que o dispara — é dele que sai o rótulo do registro de envios.
  - **O botão "Enviar mensagem" de `src/hooks/alunasAfetadas.ts` (RF-CPR-09) não passa por essa camada.** É um link `wa.me` de clique manual, sempre para o mesmo número de demonstração, com a mensagem pronta no texto — não um canal automático de disparo, e o sistema não registra se foi enviado. Vive em `/administracao/aulas-canceladas`, junto da relação de alunas preservada em cada ocorrência cancelada pelo studio.
- `src/hooks/fichaParaProfessora.ts` — a ficha reduzida que a professora consulta de qualquer aluna (RF-PRE-09). É a **única tela do protótipo cujo carregamento grava no banco**: a consulta é registrada na auditoria (`consulta_ficha_pela_professora`), porque é o próprio requisito que exige o registro — exceção documentada à regra de que carregar tela nunca escreve.
- `src/hooks/indicadoresDeProfessoras.ts` — retenção por turma e por professora, e frequência da professora (RF-PNL-07, REL-14), em `/administracao/indicadores-professoras`. Só a administração vê; o painel da professora não muda.
- `src/services/gatewayPagamento.ts` — integração de pagamento **simulada** (M11). Todo o financeiro (retentativa, multa e juros, inadimplência, regularização) opera sobre o retorno dessas funções, então trocar pelo provedor real (RF-FIN-14, ainda em definição) não deve exigir mudança em regra nem em tela. A simulação é determinística: aprova sempre, exceto nas cobranças marcadas com `simularFalhaGateway`.
- Integração com os convênios (M13) não tem API no protótipo: as mensagens que viriam dos parceiros (reserva, cancelamento, check-in) são disparadas pela administração em `src/pages/administracao/ConveniosPage.tsx`, sobre as regras de `src/hooks/convenios.ts`. O efeito no studio é idêntico ao da integração real — ocupa vaga, aparece na chamada, entra no relatório de repasse —, e é o mesmo caminho que atende à contingência prevista no escopo (RF-CNV-13).
- `src/data/seed.json` — backfill versionado. Todo recurso já usado por algum repositório (mesmo que ainda sem tela) precisa existir aqui, nem que seja como array vazio — json-server responde 404 (não lista vazia) para uma chave que não existe no `db.json`, e um `listar()` que estoura 404 quebra qualquer regra de negócio que dependa dele. Botão "Resetar protótipo" na interface restaura este estado a qualquer momento. **Nenhuma data do seed é literal** — são tokens relativos (`@hoje-5`, `@proxima(segunda,quarta)`), resolvidos por `src/data/datasDoSeed.mjs` na carga e no reset; ver a seção "Seed com datas relativas".
- `src/services/reset.ts` — restaura o backfill pela API REST. **O json-server ignora o `id` enviado no POST e gera um novo**, então toda entidade que aponte para outra precisa ter suas chaves estrangeiras declaradas no mapa `CHAVES_ESTRANGEIRAS` desse arquivo; sem isso, os vínculos do seed ficam órfãos depois de um reset (a tela passa a mostrar "Modalidade removida", "Professora removida" e afins). O reset recria os recursos em ordem de dependência e traduz cada FK para o id realmente gravado.

## Seed com datas relativas

O protótipo usa a data real como "hoje", e um backfill com datas fixas envelhece: a aula "futura" vira passada, o pacote "Finalizando" vence, a justificativa sai do prazo. Por isso **todo campo de data em `src/data/seed.json` é um token**, resolvido por `src/data/datasDoSeed.mjs` nos dois pontos em que o seed vira banco — `scripts/seed.mjs` (primeira carga e coleções novas) e `src/services/reset.ts` (botão "Resetar protótipo"). O módulo é JavaScript puro porque roda no Node do script e no bundle do Vite; a tipagem está em `datasDoSeed.d.mts`.

| Token | Resolve para |
| --- | --- |
| `@hoje` | hoje |
| `@hoje-5`, `@hoje+30`, `@hoje-1s` | hoje mais ou menos N dias (`s` = semanas) |
| `@ultima(quarta)`, `@ultima(segunda,quarta)` | a data mais recente **anterior a hoje** num dos dias listados |
| `@proxima(terca,quinta)`, `@proxima(sexta)+1s` | a primeira data **posterior a hoje** num dos dias listados; deslocamentos valem para qualquer base |
| `@hoje-2T10:15` | com horário, vira ISO completo (`…T10:15:00.000Z`) |
| `@fixa(1995-03-22)` | não resolve — deixa explícito que a data é fixa de propósito (nascimento) |
| `"Aula de {{@proxima(segunda,quarta)}} às 08:00"` | token embutido em texto, formatado `dd/mm/aaaa`; `{{…\|mes}}` dá o nome do mês, `{{…\|iso}}` a data ISO |

Uma data literal (`2026-08-17`) fora de `@fixa(...)` **faz a carga falhar** de propósito — melhor o `npm run seed` quebrar do que voltar a envelhecer.

### Coerência entre os registros

Resolver as datas certo não basta: os registros precisam continuar coerentes **entre si** em qualquer dia do ano. O token de uma ocorrência nomeia dias da semana (`@ultima(segunda,quarta)`) e precisa combinar com os `diasSemana` da sessão a que ela pertence — trocar os dias de uma sessão e esquecer os tokens quebraria a grade em silêncio, que é justamente o tipo de erro que o resolvedor já recusa para data literal.

Por isso essas regras não são só prosa: **`src/data/validacaoDoSeed.mjs` as executa** nos dois pontos em que o seed vira banco, e um erro interrompe a carga nomeando o registro e o que fazer. Rodar `npm run seed` ou clicar em "Resetar protótipo" é o que dispara a checagem; o reset mostra a causa na própria tela.

O que é verificado:

- **Ocorrência de sessão cai num dia da própria sessão** (ses-1 e ses-2: segunda e quarta; ses-3: terça e quinta; ses-4: sexta; ses-5: sábado).
- **Agendamento antecede a aula e não é do futuro** (`@hoje-1T10:15` para a aula futura; `@ultima(...)-2T09:00` para a passada).
- **Reserva de convênio é da data da aula**, e **chamada finalizada é de aula que já aconteceu**.
- **Comissão registra a data da aula** que a gerou.
- **Carteira não é ativada depois de vencer** nem encerrada antes de existir.
- **Aula cancelada por exceção tem a exceção daquela data.**

A validação também emite **avisos**, que não impedem a carga: são cenários do guia indisponíveis naquele dia específico, com a saída. O único hoje é o benefício de conversão da Juliana — a experimental dela é sempre a última aula de dança (terça ou quinta) e o benefício vale 3 dias corridos (PA-04), então em dois dias da semana ele já venceu. Não dá para resolver sem torcer a grade ou o parâmetro do escopo; o cenário do guia contorna mandando ampliar o prazo em Parâmetros, e o aviso lembra disso antes de alguém procurar o selo verde em vão.

Duas convenções que a validação não alcança, mas que dado novo deve seguir:

- Movimentos, vendas, notificações e auditoria seguem as datas dos fatos que registram; o texto usa o token embutido quando cita a data.
- Todas as alunas têm o telefone `(65) 9680-6348`, para que o botão de WhatsApp (v2.1, RF-CPR-09) abra o aparelho da cliente na demonstração.

## Padrões de UI (valem para todas as fases, não só a atual)

- **Identidade visual: sistema administrativo sóbrio, não marca de studio.** Paleta slate + azul como única cor de destaque (tokens `primary-*`, `neutral-*`, `ink` definidos em `src/index.css` via `@theme`), tipografia Inter em tudo — sem fonte serifada/decorativa em nenhum título. Antes de estilizar algo novo, use os tokens existentes (`text-ink`, `bg-primary-600`, `border-neutral-200` etc.), nunca cores cruas do Tailwind (`slate-*`, `indigo-*`...) nem uma fonte nova.
- **Toda listagem de cadastro usa o componente `Tabela` (`src/components/ui/Table.tsx`), não lista de cards.** `Tabela` (genérica sobre `itens`/`renderLinha`/`chave`) já embute busca por texto (prop `busca`) e paginação — funcionais de verdade, filtrando/paginando os dados reais, não decorativas. Linhas com `LinhaTabela`/`CelulaTabela`. Ver `ModalidadesPage`, `ProfessorasPage` etc. como referência.
- **Toda lista paginada — tabela ou cartão — deixa a usuária escolher quantos itens ver por página.** A paginação vive em `usePaginacao` (`src/components/ui/usePaginacao.ts`) + `ControlesDePaginacao` (`Paginacao.tsx`), já embutidos na `Tabela` e reaproveitáveis em listas que não são tabela (ver "Minhas aulas" da aluna). Não reimplemente paginação na tela.
- **Exportação de listagem usa `baixarCSV` (`src/utils/csv.ts`)**, com o botão "Exportar CSV" ao lado da ação principal do cabeçalho da tela. O arquivo sai com separador `;` e BOM UTF-8 — é o que faz o Excel em português abrir com as colunas e os acentos certos sem importação manual. Exporte o que está **filtrado na tela**, não a base inteira: o recorte que a usuária montou é o que ela quer levar.
- **Lista secundária e longa (histórico, registros antigos) fica em collapse fechado por padrão**, para não empurrar o conteúdo principal para fora da tela. Ver "Histórico" em `MinhasAulasPage`.
- **Tela de agenda por dia usa `NavegadorDeDatas` + `CartaoDeAula`** (`src/components/ui/`): faixa de 7 dias navegável com mês, setas e atalho "Hoje", e cartões da data selecionada. A faixa é limitada por `dataMinima`/`dataMaxima` — a mínima é sempre hoje, porque não existe agendamento retroativo, e a máxima vem da janela configurada para o perfil. Ver `GradeDaAlunaPage` e `MinhasAulasProfessoraPage`. O `CartaoDeAula` tem um espaço opcional para `valor`, usado só onde a aula é cobrada à parte (aula experimental, M13) — nas aulas do pacote não há preço por aula.
- **Formulários (inclusive dentro de modal) usam grid de 2 colunas (`grid grid-cols-1 sm:grid-cols-2 gap-4`), não pilha vertical de campos.** Campo que precisa ocupar a linha toda usa `wrapperClassName="sm:col-span-2"` em `TextField`/`SelectField` (o `className` comum só chega no `<input>`/`<select>`, não no `<label>` que é o item do grid — é o `wrapperClassName` que controla o layout do campo inteiro).
- **Confirmação de ação nunca usa `window.confirm`/`alert`.** Use `useConfirm()` (`src/hooks/useConfirm.tsx`) — abre um modal (`titulo`, `mensagem`, `perigo?`) e retorna uma Promise<boolean>. Toda exclusão e toda ação destrutiva/irreversível passa por aqui.
- **Erros e confirmações de sucesso de uma ação (não de um campo de formulário) usam toast, nunca texto solto na página.** Use `useToast()` (`src/hooks/useToast.tsx`) — `mostrarToast(mensagem, 'sucesso' | 'erro' | 'aviso' | 'info')`. Aparece no canto superior, empilha, some sozinho.
  - Exceção deliberada: erro de validação de um campo dentro de um formulário/modal (ex.: "nome já cadastrado") continua inline, junto ao campo — é contexto imediato da ação que a usuária está fazendo, não um alerta global. Não vira toast.
- **Nenhum `input[type=time]` nativo.** Use `TimePicker` (`src/components/ui/TimePicker.tsx`) — botão que abre um mostrador analógico em modal (relógio com anel duplo para hora 1-12/13-23,00 e anel único de 5 em 5 para minuto, arrastável ou por toque), inspirado no seletor nativo de horário do Android. Valor vazio (`''`) é o padrão inicial; nunca pré-preencher um horário. Seleção fica em rascunho local até confirmar em "OK" — "Cancelar" descarta, "Limpar" zera.
- **Campos de intervalo (início/fim) que se repetem numa lista (ex.: horário de funcionamento) devem se reordenar automaticamente por horário de início assim que o intervalo fica completo**, e validar sobreposição em tempo real — não só no submit. Ver `src/utils/horarioFuncionamento.ts` (`reordenarBlocos`, `validarSobreposicao`) como referência do padrão para qualquer outra lista de intervalos que surgir (ex.: bloqueios de agenda).
- **Bloco de configuração longo repetido por item (ex.: um card por dia da semana) usa collapse, fechado por padrão, mostrando um resumo de uma linha quando fechado** (ex.: "08:00–11:00, 15:00–18:00" ou badge "Fechado"). Ver `LinhaDia` em `StudioPage.tsx` como referência do padrão.
- **Campo com histórico/auditoria (ex.: categoria vigente de uma professora, que gera registro em `HistoricoCategoria`) não é editável inline na tabela.** A tabela mostra o valor como texto; a troca só acontece pelo modal de edição do item, onde a ação tem contexto (confirmação, dica sobre o efeito). Evita trocas acidentais de um campo sensível direto na listagem.
- Kit de UI compartilhado em `src/components/ui/`: `Button`, `Field` (TextField/SelectField/CheckboxField), `Badge`, `Modal`, `TimePicker`, `Table` (Tabela/LinhaTabela/CelulaTabela), `Paginacao`/`usePaginacao`, `NavegadorDeDatas`, `CartaoDeAula`. Novas telas devem reusar esses componentes em vez de estilizar elementos HTML crus.
- **Aviso que a usuária precisa entender fica na tela, não só no impedimento.** Quando o sistema recusa ou esconde algo, ele diz por quê e, quando existe, oferece a saída: a data de exceção mostra o motivo em vez de sumir da grade (RF-EXC-05), o bloqueio por saldo leva a "Meu pacote", a aula sem presença fica destacada no fechamento em vez de desaparecer. Antes de esconder um caso da tela, verifique se ele não precisa ser explicado.
- **Frase gerada por código concorda com o número.** "1 crédito reservado" e "3 créditos reservados", não "reservado(s)"; "Resta apenas 1 crédito", não "Restam". Ver `destinoDosCreditos` (`useAgendaDaAluna.ts`) e `explicarFinalizando` (`utils/creditos.ts`).
- Utilize skill de frontend instalada para criar boas telas

## Guia do protótipo (`/guia`)

Página pública, fora do `AppShell`, que ensina a reproduzir cada cenário do escopo: com quem entrar, o que fazer e o que conferir. Acessível pelo link no login e pelo botão "Guia do protótipo" no topo de qualquer tela (abre em outra aba, para acompanhar os passos sem sair da tela testada).

- **O conteúdo é dado, não JSX**: `src/data/guiaDoPrototipo.ts` tem os grupos, cenários e passos tipados. Um cenário novo é uma entrada ali — a página (`src/pages/GuiaDoPrototipoPage.tsx`) só renderiza.
- **Cada passo declara o perfil** (`administracao` | `professora` | `aluna` | `publico`). A tela só rotula o perfil quando ele muda entre um passo e o seguinte: a troca de perfil é a informação que precisa saltar aos olhos.
- **Um cenário escreve para o estado pós-reset** e cita a persona pelo nome. Pode citar os dados do seed em termos relativos ("a última aula de segunda ou quarta", "vence em 5 dias"), porque o seed é gerado em relação ao dia do reset; nunca por data absoluta.
- Ao mudar uma regra, uma tela ou o seed, **confira o cenário correspondente**: ele é a única parte do protótipo que descreve o próprio protótipo, e desatualiza sem aviso.

## Glossário do modelo de créditos

O vocabulário abaixo é o do escopo v2.1 e deve ser usado tal e qual no código e nas telas (com a única exceção deliberada de "studio" sem acento, ver acima). O modelo é **pacote de créditos pré-pago com pagamento único** — não existe mensalidade, contrato, ciclo de cobrança nem inadimplência.

| Termo | O que é |
| --- | --- |
| **Pacote** | Item do catálogo: quantidade de créditos, validade em dias e valor único. Alterá-lo não muda compras já feitas. |
| **Carteira** | O saldo vivo da aluna. Nasce na primeira compra e é alimentada pelas seguintes, sempre com **uma única validade corrente**. A aluna tem no máximo uma carteira ativa. |
| **Crédito disponível / reservado / utilizado** | As três dimensões do saldo. Agendar **reserva**; a chamada finalizada, a falta e o cancelamento fora do prazo **consomem**; cancelar dentro do prazo **libera** de volta. |
| **Movimento de crédito** | Todo lançamento que altera o saldo, gravado por `aplicarMovimento` — único caminho de escrita. O saldo é sempre reconstituível pelo extrato. |
| **Finalizando** | Status **derivado**, não gravado: poucos créditos ou vencimento próximo, pelos limiares configuráveis. Coexiste com a carteira ativa. |
| **Venda** | O registro comercial da compra, com créditos, validade e valor **congelados** no momento em que foi feita. É dela que a carteira tira os créditos, não do catálogo. |
| **Categoria de aula** | Define quanto cada tipo de aula custa em créditos (regular 1, workshop 2, particular 4 — configurável). |
| **Aula excepcional** | Workshop ou aula particular (M9): fora da grade recorrente, criada e alocada pela administração, com consumo **imediato** de créditos, sem passar por reserva. |
| **Trancamento** | Pausa que congela a validade e a devolve prorrogada no retorno. |
| **Reembolso** | Devolução do valor pago, aplicada pela administração. Invisível para quem não teve um aplicado ao próprio cadastro. |

## Fora de escopo deste protótipo

Testes automatizados, autenticação real, banco de dados real, e tudo listado no capítulo "Evoluções Futuras" (EV-01 a EV-21) do documento de escopo.
