/**
 * Perguntas da ficha de anamnese (RF-ALU-07).
 *
 * RF-ALU-11 está "Em definição" no escopo: o conteúdo definitivo será
 * fornecido pela cliente. Estas perguntas são uma referência de exemplo,
 * sinalizada como tal na interface, para que o fluxo de aceite possa ser
 * validado sem bloquear o desenvolvimento — mesmo tratamento dado aos
 * pontos em aberto PA-01 a PA-06.
 *
 * As respostas são autodeclaradas e não passam por validação ou aprovação
 * da administração (definido na reunião, seção 5.2 do escopo).
 */

export interface PerguntaAnamnese {
  chave: string;
  pergunta: string;
  tipo: 'sim_nao' | 'texto';
  /** Quando `sim_nao` e a resposta for "sim", pede o detalhamento. */
  detalharQuandoSim?: boolean;
}

export const PERGUNTAS_ANAMNESE: PerguntaAnamnese[] = [
  {
    chave: 'lesao_ou_cirurgia',
    pergunta: 'Você tem ou já teve alguma lesão ou passou por cirurgia?',
    tipo: 'sim_nao',
    detalharQuandoSim: true,
  },
  {
    chave: 'dor_articular',
    pergunta: 'Sente dor em alguma articulação (ombro, punho, joelho, coluna)?',
    tipo: 'sim_nao',
    detalharQuandoSim: true,
  },
  {
    chave: 'condicao_cardiaca',
    pergunta: 'Possui alguma condição cardíaca ou pressão alterada?',
    tipo: 'sim_nao',
    detalharQuandoSim: true,
  },
  {
    chave: 'medicacao_continua',
    pergunta: 'Faz uso de medicação contínua?',
    tipo: 'sim_nao',
    detalharQuandoSim: true,
  },
  {
    chave: 'gestante',
    pergunta: 'Está gestante ou em período pós-parto?',
    tipo: 'sim_nao',
    detalharQuandoSim: true,
  },
  {
    chave: 'pratica_anterior',
    pergunta: 'Já praticou pole dance ou atividade física semelhante? Conte um pouco.',
    tipo: 'texto',
  },
  {
    chave: 'observacoes',
    pergunta: 'Há algo mais que a equipe do studio precise saber sobre sua saúde?',
    tipo: 'texto',
  },
];

/**
 * Perguntas que precisam de resposta para a anamnese valer.
 *
 * São as de saúde (sim/não): é o que compõe o resguardo do studio quanto a
 * condições preexistentes não informadas. As perguntas abertas seguem
 * opcionais — obrigar a escrever em "há algo mais que precisamos saber?"
 * só produziria resposta vazia de conteúdo.
 */
export const PERGUNTAS_OBRIGATORIAS = PERGUNTAS_ANAMNESE.filter((p) => p.tipo === 'sim_nao');

export function perguntasNaoRespondidas(respostas: Record<string, string>): PerguntaAnamnese[] {
  return PERGUNTAS_OBRIGATORIAS.filter((pergunta) => !(respostas[pergunta.chave] ?? '').trim());
}

export function anamneseEstaCompleta(respostas: Record<string, string>): boolean {
  return perguntasNaoRespondidas(respostas).length === 0;
}

/** Texto de referência do termo, usado para publicar a primeira versão. */
export const TERMO_PADRAO = `TERMO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO
O studio presta serviços de aulas nas modalidades ofertadas, conforme o pacote de créditos adquirido pela aluna.

2. CRÉDITOS E VALIDADE
O pacote adquirido concede a quantidade de créditos indicada, utilizáveis dentro do prazo de validade informado na compra. Cada categoria de aula tem um custo próprio em créditos. Os créditos não utilizados até a data de validade são perdidos.

3. AGENDAMENTO E CANCELAMENTO
O agendamento é feito pela aluna dentro do sistema e reserva os créditos correspondentes, respeitando a antecedência mínima de cancelamento configurada. Cancelamentos dentro do prazo liberam os créditos reservados; cancelamentos fora do prazo consomem esses créditos.

4. SAÚDE E CONDIÇÕES PREEXISTENTES
A aluna declara que as informações prestadas na ficha de anamnese são verdadeiras e assume a responsabilidade por condições de saúde preexistentes não informadas ao studio.

5. PAGAMENTO
O pagamento é único, realizado no ato da compra do pacote. Não há cobrança recorrente nem mensalidade automática.

6. REEMBOLSO
O cancelamento da compra com reembolso pode ser solicitado à administração do studio em até 7 dias corridos da data da compra, desde que utilizados no máximo 50% dos créditos adquiridos. Do valor a reembolsar são descontados os créditos já utilizados, calculados pelo valor unitário do pacote.

7. IMAGEM
Eventual uso de imagem em materiais do studio depende de autorização específica da aluna.

Ao aceitar este termo, a aluna declara ter lido e concordado integralmente com as condições acima.`;

/**
 * Texto de partida do termo da professora (RF-PRO-04). Como o da aluna, é
 * provisório: o texto definitivo é responsabilidade da cliente (capítulo
 * 12 do escopo).
 */
export const TERMO_PADRAO_PROFESSORA = `TERMO DE PRESTAÇÃO DE SERVIÇOS — PROFESSORA

1. OBJETO
A professora presta serviços de condução de aulas nas modalidades para as quais está habilitada, na condição de prestadora de serviço, sem vínculo empregatício.

2. REMUNERAÇÃO
A remuneração é por aula efetivamente realizada, conforme o valor da categoria vigente na data da aula. Aulas excepcionais têm o valor informado no cadastro da própria aula.

3. APURAÇÃO E PAGAMENTO
O período de apuração é mensal, do primeiro ao último dia do mês. O pagamento é feito até o quinto dia útil do mês seguinte ao período apurado.

4. CHAMADA
A professora é responsável por finalizar a chamada de suas aulas dentro do prazo configurado. A comissão de cada aula é gerada na finalização da chamada.

5. CANCELAMENTO DE AULA
O cancelamento de uma aula é solicitado à administração, que decide entre designar substituta ou cancelar a sessão. A aula permanece ativa até a decisão.

6. IMAGEM
Eventual uso de imagem em materiais do studio depende de autorização específica da professora.

Ao aceitar este termo, a professora declara ter lido e concordado integralmente com as condições acima.`;
