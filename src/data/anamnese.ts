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

/** Texto de referência do termo, usado para publicar a primeira versão. */
export const TERMO_PADRAO = `TERMO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO
O studio presta serviços de aulas nas modalidades ofertadas, conforme o pacote contratado pela aluna.

2. PACOTE E VIGÊNCIA
O pacote contratado dá direito à quantidade de aulas indicada no ciclo, válidas dentro do prazo de vigência informado no ato da contratação. Aulas não realizadas dentro do ciclo seguem as regras de transferência previstas no contrato.

3. AGENDAMENTO E CANCELAMENTO
O agendamento é feito pela aluna dentro do sistema, respeitando a antecedência mínima de cancelamento configurada. Cancelamentos fora do prazo consomem a aula do saldo.

4. SAÚDE E CONDIÇÕES PREEXISTENTES
A aluna declara que as informações prestadas na ficha de anamnese são verdadeiras e assume a responsabilidade por condições de saúde preexistentes não informadas ao studio.

5. PAGAMENTO
A cobrança é mensal e recorrente, na data de entrada da aluna, pelo valor do pacote contratado, considerando eventual desconto concedido.

6. IMAGEM
Eventual uso de imagem em materiais do studio depende de autorização específica da aluna.

Ao aceitar este termo, a aluna declara ter lido e concordado integralmente com as condições acima.`;
