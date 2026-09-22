export type ID = string;

export type PerfilAcesso = 'administracao' | 'professora' | 'aluna';

/**
 * `aguardando_aceite` vale só para a professora, cujo acesso permanece
 * bloqueado até assinar o termo (RF-PRO-04). A aluna entra sempre ativa: a
 * pendência dela é registrada em `Aluna.situacao` e não bloqueia (RF-ALU-08).
 */
export type SituacaoUsuario = 'ativo' | 'inativo' | 'aguardando_aceite';

export type DiaSemana =
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'
  | 'domingo';

export type SituacaoAtivoInativo = 'ativo' | 'inativo';

export interface BlocoHorario {
  inicio: string;
  fim: string;
}

export type HorarioFuncionamento = Record<DiaSemana, BlocoHorario[]>;

export interface Studio {
  id: ID;
  nome: string;
  contato: string;
  endereco: string;
  horarioFuncionamento: HorarioFuncionamento;
}

export interface Parametro {
  id: ID;
  chave: string;
  valor: string | number;
  descricao: string;
}

export interface Modalidade {
  id: ID;
  nome: string;
  capacidadeMaxima: number;
  situacao: SituacaoAtivoInativo;
}

export interface Espaco {
  id: ID;
  nome: string;
  situacao: SituacaoAtivoInativo;
}

/**
 * RF-CFG-05: a categoria da aula é o que define quanto ela custa em
 * créditos — aula regular 1, workshop 2, aula particular 4, tudo
 * configurável. `excepcional` marca as categorias que só existem fora da
 * grade recorrente (M9): elas são criadas pela administração e não podem
 * ser agendadas pela aluna.
 */
export interface CategoriaAula {
  id: ID;
  nome: string;
  custoEmCreditos: number;
  excepcional: boolean;
  situacao: SituacaoAtivoInativo;
}

export interface Usuario {
  id: ID;
  nome: string;
  email: string;
  cpf: string;
  situacao: SituacaoUsuario;
  perfis: PerfilAcesso[];
}

export type OrigemAluna = 'direta' | 'convenio';

/**
 * A situação da aluna diz respeito ao **cadastro**, não ao pacote. Ter ou
 * não pacote ativo é uma leitura da carteira (RF-CRE-11), não um estado do
 * cadastro — por isso não existe "sem pacote" aqui.
 *
 * `aguardando_aceite` significa **termo ou anamnese pendente** (RF-ALU-08)
 * e não bloqueia nada: é o rótulo que a lista filtra e que o painel conta.
 * O valor é derivado das pendências e regravado por
 * `sincronizarSituacaoDeAceite` a cada aceite ou anamnese registrada.
 */
export type SituacaoAluna = 'ativa' | 'trancada' | 'aguardando_aceite';

export interface Aluna {
  id: ID;
  usuarioId: ID;
  telefone: string;
  dataNascimento: string;
  contatoEmergencia: string;
  origem: OrigemAluna;
  situacao: SituacaoAluna;
  /** RF-BOL-01/02: na Fase 1 a bolsa é sempre integral — não há percentual. */
  bolsista: boolean;
  /** Pacote concedido à bolsista, renovado automaticamente (RF-BOL-03). */
  pacoteConcedidoId?: ID;
}

export interface Anamnese {
  id: ID;
  alunaId: ID;
  respostas: Record<string, string>;
  dataPreenchimento: string;
  versaoQuestionario: number;
}

export type SituacaoProfessora = 'ativa' | 'inativa';

export interface Professora {
  id: ID;
  usuarioId: ID;
  categoriaId: ID;
  situacao: SituacaoProfessora;
}

export interface CategoriaProfessora {
  id: ID;
  nome: string;
  valorPorAula: number;
  situacao: SituacaoAtivoInativo;
}

export interface HistoricoCategoria {
  id: ID;
  professoraId: ID;
  categoriaId: ID;
  dataInicioVigencia: string;
  autorId: ID;
}

/**
 * Quem assina o termo. Aluna e professora têm textos próprios e versões
 * independentes (RF-ALU-06, RF-PRO-04): publicar um novo termo de aluna
 * não pode invalidar o aceite que as professoras já deram.
 */
export type PublicoDoTermo = 'aluna' | 'professora';

export interface TermoAceite {
  id: ID;
  publicoAlvo: PublicoDoTermo;
  versao: number;
  conteudo: string;
  dataPublicacao: string;
  situacao: SituacaoAtivoInativo;
}

export interface AceiteRegistrado {
  id: ID;
  usuarioId: ID;
  termoVersaoId: ID;
  dataHora: string;
  enderecoIp: string;
  conteudoAceito: string;
}

/** RF-PAC-01: pacote de créditos pré-pago, com pagamento único na compra. */
export interface Pacote {
  id: ID;
  nome: string;
  /** Quantidade de créditos que a compra concede à carteira. */
  creditos: number;
  /** Prazo de uso dos créditos, em dias, contado da ativação da carteira. */
  validadeDias: number;
  /** Valor único cobrado no ato da compra. Não há mensalidade. */
  valor: number;
  situacao: SituacaoAtivoInativo;
}

/**
 * Situação da carteira (RF-CRE-10) — a mesma lista da seção 7 do escopo.
 *
 * Não existe estado "aguardando ativação": a carteira é ativada na
 * confirmação do pagamento (RF-CRE-01) e, antes disso, simplesmente não
 * existe — o que existe é a venda pendente. Termo e anamnese não atrasam a
 * ativação; geram a pendência do RF-ALU-08.
 *
 * "Finalizando" **não** entra aqui: é informativo, coexiste com o estado
 * ativo (RF-CRE, seção 4.3.3) e por isso é derivado em `statusDaCarteira`.
 */
export type SituacaoCarteira = 'ativa' | 'consumida' | 'expirada';

export type MotivoEncerramentoCarteira = 'consumo_total' | 'vencimento' | 'reembolso';

/**
 * A carteira é o saldo vivo da aluna (seção 4.3.2 do escopo). Nasce na
 * primeira compra, é alimentada pelas seguintes e mantém sempre uma única
 * validade corrente. A aluna tem no máximo uma carteira ativa (RF-CRE-15).
 */
export interface Carteira {
  id: ID;
  alunaId: ID;
  /** Último pacote que alimentou a carteira — o que aparece como "pacote vigente". */
  pacoteId: ID;
  creditosTotais: number;
  creditosUtilizados: number;
  creditosReservados: number;
  /** Vazia enquanto a carteira aguarda ativação (RF-CRE-01). */
  dataAtivacao?: string;
  dataValidade: string;
  situacao: SituacaoCarteira;
  motivoEncerramento?: MotivoEncerramentoCarteira;
  dataEncerramento?: string;
  /** Carteira concedida por bolsa: sem cobrança e renovada ao encerrar (RF-BOL-02/03). */
  bolsa: boolean;
}

/** RF-CRE-08: todo movimento de crédito é registrado, e o saldo é reconstituível a partir daqui. */
export type TipoMovimentoCredito =
  | 'concessao'
  | 'reserva'
  | 'liberacao'
  | 'consumo'
  | 'expiracao'
  | 'estorno'
  | 'ajuste';

export interface MovimentoCredito {
  id: ID;
  carteiraId: ID;
  tipo: TipoMovimentoCredito;
  /**
   * Em créditos por padrão. Negativa quando o movimento retira o que um
   * ajuste anterior havia concedido — é o caso do acerto no retorno de um
   * trancamento que durou menos que o previsto.
   */
  quantidade: number;
  /**
   * Prorrogação de validade movimenta **dias**, não créditos. Sem essa
   * distinção o extrato exibiria "+30" numa carteira cujo saldo não mudou.
   */
  unidade?: 'creditos' | 'dias';
  /** Descrição legível do que originou o movimento, exibida no extrato. */
  origem: string;
  /** Registro que originou o movimento: venda, agendamento, alocação, reembolso. */
  referenciaId?: ID;
  autorId: ID;
  dataHora: string;
}

/** RF-VEN-02: todo pagamento é único, no ato da compra. */
export type FormaPagamento = 'cartao_avista' | 'cartao_parcelado' | 'pix' | 'manual';

export type SituacaoVenda = 'pendente' | 'confirmada' | 'cancelada' | 'reembolsada';

/** Compra de pacote (RF-VEN-01) ou da aula experimental, que é cobrada à parte (RF-EXP-04). */
export type TipoVenda = 'pacote' | 'aula_experimental';

export type TipoBeneficioConversao = 'credito_adicional' | 'desconto_valor';

/**
 * O que a aluna ganhou por comprar depois da aula experimental. A
 * quantidade é em créditos ou em reais, conforme o tipo (PA-04).
 */
export interface BeneficioAplicado {
  tipo: TipoBeneficioConversao;
  quantidade: number;
}

export interface Venda {
  id: ID;
  alunaId: ID;
  tipo: TipoVenda;
  /** Ausente na venda da aula experimental, que não vende pacote. */
  pacoteId?: ID;
  /** Créditos e validade copiados do pacote na compra: alterar o catálogo depois não muda a venda. */
  creditos: number;
  validadeDias: number;
  valor: number;
  formaPagamento: FormaPagamento;
  /** Só no cartão parcelado. O valor total é debitado do limite na compra (RF-VEN-02). */
  parcelas?: number;
  data: string;
  situacao: SituacaoVenda;
  identificadorGateway?: string;
  /** Venda de bolsa: valor zero, sem passar pelo gateway (RF-BOL-02). */
  bolsa: boolean;
  /** Carteira que a venda ativou ou alimentou. */
  carteiraId?: ID;
  /**
   * Validade que a carteira tinha antes desta compra, gravada só quando a
   * compra foi absorvida por uma carteira vigente (RF-CRE-13).
   *
   * Existe por causa do PA-09: reembolsar uma renovação antecipada devolve
   * apenas a compra, e os créditos que já estavam na carteira voltam com a
   * validade original. Sem guardar essa data no momento da compra, não há
   * como restaurá-la depois.
   */
  validadeAnteriorDaCarteira?: string;
  /**
   * Benefício concedido por esta compra ter vindo depois de uma aula
   * experimental (RF-EXP-08, PA-04). Fica gravado na venda porque é o que
   * explica, na conferência, por que os créditos ou o valor divergem do
   * catálogo — e o parâmetro pode mudar depois.
   */
  beneficioConversao?: BeneficioAplicado;
  motivoCancelamento?: string;
  observacao?: string;
  /**
   * Só existe no protótipo: liga a recusa do gateway simulado para esta
   * venda, para que a venda pendente e o cancelamento possam ser
   * demonstrados de forma determinística.
   */
  simularFalhaGateway?: boolean;
}

/**
 * Trancamento da carteira (seção 4.3.6 do escopo).
 *
 * Controle administrativo de mediação: a administração arbitra caso a
 * caso se concede a pausa e por quantos dias, sem teto imposto pelo
 * sistema (RF-TRA-03).
 */
export interface Trancamento {
  id: ID;
  carteiraId: ID;
  alunaId: ID;
  dataInicio: string;
  dataTerminoPrevista: string;
  /** Preenchida quando a administração registra o retorno da aluna. */
  dataRetornoEfetiva?: string;
  /** Dias efetivamente acrescentados à validade da carteira (RF-TRA-02). */
  diasProrrogados: number;
  motivo: string;
  autorId: ID;
  dataConcessao: string;
  situacao: 'em_curso' | 'encerrado';
}

/**
 * Reembolso (seção 4.12.2 do escopo).
 *
 * Recurso de mediação operado exclusivamente pela administração
 * (RF-REE-09): a solicitação chega pelos canais de atendimento do studio,
 * e o sistema serve para calcular, executar e registrar — nunca para
 * receber o pedido.
 */
export type TipoReembolso = 'arrependimento' | 'legal';

export interface Reembolso {
  id: ID;
  vendaId: ID;
  alunaId: ID;
  tipo: TipoReembolso;
  data: string;
  creditosComprados: number;
  /** Créditos consumidos desde a compra, base do desconto (RF-REE-02). */
  creditosUtilizados: number;
  valorPago: number;
  valorDescontado: number;
  valorReembolsado: number;
  /** Documentação datada exigida no reembolso por motivo legal (RF-REE-07). */
  documentacao?: string;
  motivo: string;
  autorId: ID;
  /** Identificador da transação de estorno no gateway (RF-REE-04). */
  identificadorEstorno?: string;
  /** Aulas futuras canceladas na execução (RF-REE-05). */
  agendamentosCancelados: number;
  /** A carteira foi encerrada, ou só perdeu os créditos desta compra (PA-09). */
  carteiraEncerrada: boolean;
}

/**
 * Aula excepcional (M9): workshop ou aula particular, criada pela
 * administração fora da grade recorrente. Cada ocorrência é cadastrada
 * individualmente — não há recorrência (RF-AEX-01).
 */
export interface AulaExcepcional {
  id: ID;
  /** Define o custo em créditos da participação (RF-AEX-05). */
  categoriaAulaId: ID;
  nome: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  espacoId?: ID;
  descricao?: string;
  situacao: 'ativa' | 'cancelada';
  /**
   * A administração confirmou o cadastro mesmo com o horário fora do
   * funcionamento do studio (RF-AEX-13). Guardado para a tela poder
   * explicar por que aquela aula está fora da faixa configurada.
   */
  foraDoFuncionamento?: boolean;
  autorId: ID;
  dataCriacao: string;
}

/**
 * Vínculo opcional de professora a uma aula excepcional (RF-AEX-12).
 *
 * O valor da comissão é informado **por professora, no cadastro da aula**,
 * e não pela categoria dela: uma aula particular remunera mais que a
 * regular, e num workshop a quatro mãos cada professora pode receber um
 * valor distinto.
 */
export interface ProfessoraDaAula {
  id: ID;
  aulaExcepcionalId: ID;
  professoraId: ID;
  valorComissao: number;
}

/** Motivos aceitos quando a participação não consome créditos (PA-12). */
export type MotivoSemConsumo = 'pagamento_avulso' | 'convidada' | 'cortesia';

/**
 * Alocação de uma aluna em aula excepcional (RF-AEX-04).
 *
 * Consome os créditos **imediatamente**, sem passar pelo estado de
 * reserva: a administração é quem aloca, e não há janela de cancelamento
 * pela aluna que justifique segurar o crédito.
 */
export interface Alocacao {
  id: ID;
  aulaExcepcionalId: ID;
  alunaId: ID;
  creditosConsumidos: number;
  /** RF-AEX-06: participação registrada sem consumo, com motivo obrigatório. */
  consumoDispensado: boolean;
  motivoSemConsumo?: MotivoSemConsumo;
  situacao: 'ativa' | 'cancelada';
  /** RF-AEX-07: o cancelamento estorna os créditos e exige motivo. */
  motivoCancelamento?: string;
  autorId: ID;
  data: string;
}

export interface Sessao {
  id: ID;
  modalidadeId: ID;
  professoraId: ID;
  espacoId?: ID;
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
  capacidade: number;
  dataInicio: string;
  dataTermino?: string;
  descricao?: string;
  espelhadaConvenio: boolean;
  situacao: SituacaoAtivoInativo;
}

export type SituacaoOcorrencia = 'ativa' | 'cancelada';

export interface OcorrenciaSessao {
  id: ID;
  sessaoId: ID;
  data: string;
  professoraEfetivaId: ID;
  situacao: SituacaoOcorrencia;
  motivoCancelamento?: string;
}

export type OrigemAgendamento = 'portal' | 'administracao' | 'convenio';
export type SituacaoAgendamento = 'ativo' | 'cancelado' | 'realizado';
export type OrigemCancelamento = 'aluna' | 'studio' | 'administracao';

export interface Agendamento {
  id: ID;
  alunaId: ID;
  ocorrenciaSessaoId: ID;
  origem: OrigemAgendamento;
  dataHora: string;
  situacao: SituacaoAgendamento;
  origemCancelamento?: OrigemCancelamento;
  experimental: boolean;
  /**
   * Créditos reservados por este agendamento (RF-CRE-03), copiados do custo
   * da categoria da aula no momento da reserva. Guardado no agendamento
   * porque alterar o custo da categoria depois não pode mudar o que já foi
   * reservado. Zero em aula experimental e em reserva de convênio, que não
   * consomem crédito.
   */
  creditosReservados: number;
  /**
   * Se o cancelamento liberou os créditos reservados. Não está na lista de
   * atributos essenciais da seção 7 do escopo, mas é o que distingue um
   * cancelamento dentro do prazo de um fora dele depois que a aula já
   * passou — e é essa distinção que define quem pode enviar justificativa
   * (RF-JUS-01). Sem gravar, a informação se perderia.
   */
  creditoDevolvido?: boolean;
}

export type TipoExcecao = 'feriado' | 'recesso' | 'manutencao' | 'fechamento';

export interface ExcecaoCalendario {
  id: ID;
  data: string;
  tipo: TipoExcecao;
  descricao: string;
  autorId: ID;
  dataCriacao: string;
}

export type SituacaoChamada = 'aberta' | 'finalizada';

/**
 * A chamada cobre uma ocorrência da grade **ou** uma aula excepcional
 * (RF-AEX-10): workshop e aula particular têm chamada como qualquer outra
 * aula. Exatamente um dos dois vínculos é preenchido.
 */
export interface Chamada {
  id: ID;
  ocorrenciaSessaoId?: ID;
  aulaExcepcionalId?: ID;
  /**
   * Quem conduziu. Na aula excepcional sem professora vinculada, a chamada
   * é feita pela administração e este campo fica vazio (RF-AEX-10).
   */
  professoraId?: ID;
  dataHoraFinalizacao?: string;
  situacao: SituacaoChamada;
}

export interface RegistroPresenca {
  id: ID;
  chamadaId: ID;
  alunaId: ID;
  situacao: 'presente' | 'ausente';
  checkinConvenio: boolean;
  dataHora: string;
  autorId: ID;
}

/**
 * `sem_efeito` não é uma decisão da administração: é o que acontece com
 * uma justificativa aprovada quando a correção da chamada (RF-PRE-05)
 * mostra que a aluna esteve presente. A falta que ela justificava não
 * existiu, o crédito volta a ser consumido e o registro fica visível —
 * marcar como "recusada" mentiria sobre o que a administração decidiu.
 */
export type SituacaoJustificativa = 'pendente' | 'aprovada' | 'recusada' | 'sem_efeito';

export interface Justificativa {
  id: ID;
  agendamentoId: ID;
  alunaId: ID;
  texto: string;
  anexoUrl?: string;
  situacao: SituacaoJustificativa;
  parecer?: string;
  autorAnaliseId?: ID;
  data: string;
}

export type SituacaoSolicitacaoCancelamento =
  | 'pendente'
  | 'aprovada_substituicao'
  | 'aprovada_cancelamento'
  | 'recusada';

export interface SolicitacaoCancelamento {
  id: ID;
  sessaoId: ID;
  data: string;
  professoraSolicitanteId: ID;
  motivo: string;
  situacao: SituacaoSolicitacaoCancelamento;
  professoraSubstitutaId?: ID;
  autorDecisaoId?: ID;
  dataDecisao?: string;
}

export type SituacaoComissao = 'gerada' | 'ajuste';

export interface Comissao {
  id: ID;
  chamadaId: ID;
  professoraId: ID;
  /**
   * Categoria vigente da professora na data, quando a comissão vem de uma
   * aula regular. A aula excepcional não usa categoria: o valor é
   * informado no cadastro da aula, por professora (RF-COM-01, RF-AEX-12).
   */
  categoriaAplicadaId?: ID;
  /** Descrição legível da base aplicada, para conferência (RF-COM-02). */
  baseDeCalculo: string;
  /** Preenchido quando a comissão vem de uma aula excepcional. */
  aulaExcepcionalId?: ID;
  valor: number;
  dataAula: string;
  /**
   * Quantidade de presenças da aula (RF-COM-02). Gravada no lançamento, e
   * não recontada na tela: a chamada pode ser corrigida depois, e o
   * detalhamento precisa dizer o que valeu quando a comissão foi apurada.
   */
  presencas: number;
  periodoFechamentoId?: ID;
  situacao: SituacaoComissao;
}

export type SituacaoFechamento = 'aberto' | 'fechado' | 'pago';

export interface FechamentoComissao {
  id: ID;
  dataInicio: string;
  dataFim: string;
  totalGeral: number;
  situacao: SituacaoFechamento;
  dataFechamento?: string;
  dataPagamento?: string;
  autorId: ID;
}

export type NomeConvenio = 'wellhub' | 'totalpass';

export interface ConvenioIntegracao {
  id: ID;
  convenio: NomeConvenio;
  credenciais: string;
  situacaoIntegracao: 'ativa' | 'inativa' | 'contingencia';
  dataUltimaSincronizacao?: string;
}

export interface ReservaConvenio {
  id: ID;
  convenio: NomeConvenio;
  identificadorExterno: string;
  alunaId: ID;
  ocorrenciaSessaoId: ID;
  situacao: 'confirmada' | 'cancelada';
  checkinValidado: boolean;
  dataHoraCheckin?: string;
  /** Data da aula reservada, copiada da ocorrência para relatório por período. */
  data?: string;
  /**
   * Reserva vinda da integração ou registrada à mão pela administração
   * durante indisponibilidade do parceiro (RF-CNV-13).
   */
  origemRegistro?: 'integracao' | 'contingencia';
}

export interface Notificacao {
  id: ID;
  destinatarioId: ID;
  evento: string;
  canal: 'email' | 'whatsapp';
  conteudo: string;
  /**
   * Registro que originou o aviso — carteira, venda, agendamento. Serve
   * para não repetir um aviso já enviado sobre o mesmo fato, como o de
   * "Finalizando", que a rotina reavalia a cada passagem (RF-NOT-08).
   */
  referenciaId?: ID;
  dataEnvio: string;
  situacaoEnvio: 'enviada' | 'falha';
}

export interface RegistroAuditoria {
  id: ID;
  entidadeAfetada: string;
  operacao: string;
  autorId: ID;
  dataHora: string;
  valorAnterior?: unknown;
  valorNovo?: unknown;
}
