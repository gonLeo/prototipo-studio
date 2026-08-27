export type ID = string;

export type PerfilAcesso = 'administracao' | 'professora' | 'aluna';

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
 * A situação da aluna diz respeito ao **acesso**, não ao pacote. Ter ou não
 * pacote ativo é uma leitura da carteira (RF-CRE-11), não um estado do
 * cadastro — por isso não existe "sem pacote" aqui.
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

export interface TermoAceite {
  id: ID;
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
 * Situação da carteira (RF-CRE-10).
 *
 * `aguardando_ativacao` não está na lista da seção 7 do escopo, mas o
 * RF-CRE-01 descreve exatamente esse estado: comprados os créditos, eles
 * "existem mas não permitem agendamento" enquanto o pagamento não é
 * confirmado, o termo não é aceito e a anamnese não é preenchida. Sem um
 * estado próprio, essa carteira seria indistinguível de uma ativa.
 *
 * "Finalizando" **não** entra aqui: é informativo, coexiste com o estado
 * ativo (RF-CRE, seção 4.3.3) e por isso é derivado em `statusDaCarteira`.
 */
export type SituacaoCarteira = 'aguardando_ativacao' | 'ativa' | 'consumida' | 'expirada';

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
  quantidade: number;
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
  motivoCancelamento?: string;
  observacao?: string;
  /**
   * Só existe no protótipo: liga a recusa do gateway simulado para esta
   * venda, para que a venda pendente e o cancelamento possam ser
   * demonstrados de forma determinística.
   */
  simularFalhaGateway?: boolean;
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

export interface Chamada {
  id: ID;
  ocorrenciaSessaoId: ID;
  professoraId: ID;
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

export type SituacaoJustificativa = 'pendente' | 'aprovada' | 'recusada';

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
  categoriaAplicadaId: ID;
  valor: number;
  dataAula: string;
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
