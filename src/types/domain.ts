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

export interface Usuario {
  id: ID;
  nome: string;
  email: string;
  cpf: string;
  situacao: SituacaoUsuario;
  perfis: PerfilAcesso[];
}

export type OrigemAluna = 'direta' | 'convenio';
export type SituacaoAluna =
  | 'ativa'
  | 'inadimplente'
  | 'trancada'
  | 'suspensa'
  | 'encerrada'
  | 'aguardando_aceite';

export interface Aluna {
  id: ID;
  usuarioId: ID;
  telefone: string;
  dataNascimento: string;
  contatoEmergencia: string;
  origem: OrigemAluna;
  situacao: SituacaoAluna;
  bolsista: boolean;
  percentualBolsa?: number;
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

export type TipoContrato = 'mensal' | 'semestral';
export type SituacaoContrato = 'ativo' | 'trancado' | 'suspenso' | 'encerrado';

export interface Pacote {
  id: ID;
  nome: string;
  valorMensal: number;
  aulasPorCiclo: number;
  aulasPorSemana: number;
  duracaoMeses: number;
  validadeCicloDias: number;
  limiteDiasPausa: number;
  situacao: SituacaoAtivoInativo;
}

export interface Contrato {
  id: ID;
  alunaId: ID;
  pacoteId: ID;
  tipo: TipoContrato;
  dataInicio: string;
  dataVencimentoCiclo: string;
  dataTerminoContrato: string;
  saldoAulas: number;
  diasAdicionaisConcedidos: number;
  situacao: SituacaoContrato;
  percentualBolsa: number;
}

export interface HistoricoPlano {
  id: ID;
  contratoId: ID;
  pacoteAnteriorId: ID;
  pacoteNovoId: ID;
  valorProporcionalApurado: number;
  diferencaCobrada: number;
  saldoAnterior: number;
  saldoResultante: number;
  autorId: ID;
  data: string;
}

export interface HistoricoBolsa {
  id: ID;
  contratoId: ID;
  percentualAnterior: number;
  percentualNovo: number;
  motivo: string;
  autorId: ID;
  data: string;
}

export type TipoPausa = 'trancamento' | 'suspensao';

export interface Pausa {
  id: ID;
  contratoId: ID;
  tipo: TipoPausa;
  dataInicio: string;
  dataTerminoPrevista: string;
  dataRetornoEfetiva?: string;
  diasCongelados: number;
  motivo: string;
  autorId: ID;
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
   * Se o cancelamento devolveu a aula ao saldo. Não está na lista de
   * atributos essenciais da seção 8 do escopo, mas é o que distingue um
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

export type SituacaoCobranca =
  | 'pendente'
  | 'paga'
  | 'falha'
  | 'atrasada'
  | 'cancelada';

export interface Cobranca {
  id: ID;
  contratoId: ID;
  valorBruto: number;
  percentualBolsa: number;
  valorLiquido: number;
  multa: number;
  juros: number;
  dataVencimento: string;
  situacao: SituacaoCobranca;
  dataQuitacao?: string;
  identificadorGateway?: string;
}

export interface TentativaCobranca {
  id: ID;
  cobrancaId: ID;
  dataHora: string;
  retornoGateway: string;
  situacao: 'sucesso' | 'falha';
  origem: 'automatica' | 'manual';
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
