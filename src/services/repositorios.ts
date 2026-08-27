import { criarRepositorio } from './createRepository';
import type {
  Studio,
  Parametro,
  Modalidade,
  Espaco,
  CategoriaAula,
  Usuario,
  Aluna,
  Anamnese,
  Professora,
  CategoriaProfessora,
  HistoricoCategoria,
  TermoAceite,
  AceiteRegistrado,
  Pacote,
  Carteira,
  MovimentoCredito,
  Venda,
  Trancamento,
  Reembolso,
  AulaExcepcional,
  ProfessoraDaAula,
  Alocacao,
  Sessao,
  OcorrenciaSessao,
  Agendamento,
  ExcecaoCalendario,
  Chamada,
  RegistroPresenca,
  Justificativa,
  SolicitacaoCancelamento,
  Comissao,
  FechamentoComissao,
  ConvenioIntegracao,
  ReservaConvenio,
  Notificacao,
  RegistroAuditoria,
} from '../types/domain';

// Um repositório por recurso REST. O nome do recurso é o mesmo usado
// em src/data/seed.json e espelhado pelo json-server em /api/<recurso>.
export const studioRepositorio = criarRepositorio<Studio>('studio');
export const parametroRepositorio = criarRepositorio<Parametro>('parametros');
export const modalidadeRepositorio = criarRepositorio<Modalidade>('modalidades');
export const espacoRepositorio = criarRepositorio<Espaco>('espacos');
export const categoriaAulaRepositorio = criarRepositorio<CategoriaAula>('categoriasAula');
export const usuarioRepositorio = criarRepositorio<Usuario>('usuarios');
export const alunaRepositorio = criarRepositorio<Aluna>('alunas');
export const anamneseRepositorio = criarRepositorio<Anamnese>('anamneses');
export const professoraRepositorio = criarRepositorio<Professora>('professoras');
export const categoriaProfessoraRepositorio = criarRepositorio<CategoriaProfessora>('categoriasProfessora');
export const historicoCategoriaRepositorio = criarRepositorio<HistoricoCategoria>('historicoCategorias');
export const termoAceiteRepositorio = criarRepositorio<TermoAceite>('termosAceite');
export const aceiteRegistradoRepositorio = criarRepositorio<AceiteRegistrado>('aceitesRegistrados');
export const pacoteRepositorio = criarRepositorio<Pacote>('pacotes');
export const carteiraRepositorio = criarRepositorio<Carteira>('carteiras');
export const movimentoCreditoRepositorio = criarRepositorio<MovimentoCredito>('movimentosCredito');
export const vendaRepositorio = criarRepositorio<Venda>('vendas');
export const trancamentoRepositorio = criarRepositorio<Trancamento>('trancamentos');
export const reembolsoRepositorio = criarRepositorio<Reembolso>('reembolsos');
export const aulaExcepcionalRepositorio = criarRepositorio<AulaExcepcional>('aulasExcepcionais');
export const professoraDaAulaRepositorio = criarRepositorio<ProfessoraDaAula>('professorasDaAula');
export const alocacaoRepositorio = criarRepositorio<Alocacao>('alocacoes');
export const sessaoRepositorio = criarRepositorio<Sessao>('sessoes');
export const ocorrenciaSessaoRepositorio = criarRepositorio<OcorrenciaSessao>('ocorrenciasSessao');
export const agendamentoRepositorio = criarRepositorio<Agendamento>('agendamentos');
export const excecaoCalendarioRepositorio = criarRepositorio<ExcecaoCalendario>('excecoesCalendario');
export const chamadaRepositorio = criarRepositorio<Chamada>('chamadas');
export const registroPresencaRepositorio = criarRepositorio<RegistroPresenca>('registrosPresenca');
export const justificativaRepositorio = criarRepositorio<Justificativa>('justificativas');
export const solicitacaoCancelamentoRepositorio = criarRepositorio<SolicitacaoCancelamento>('solicitacoesCancelamento');
export const comissaoRepositorio = criarRepositorio<Comissao>('comissoes');
export const fechamentoComissaoRepositorio = criarRepositorio<FechamentoComissao>('fechamentosComissao');
export const convenioIntegracaoRepositorio = criarRepositorio<ConvenioIntegracao>('conveniosIntegracao');
export const reservaConvenioRepositorio = criarRepositorio<ReservaConvenio>('reservasConvenio');
export const notificacaoRepositorio = criarRepositorio<Notificacao>('notificacoes');
export const registroAuditoriaRepositorio = criarRepositorio<RegistroAuditoria>('registrosAuditoria');
