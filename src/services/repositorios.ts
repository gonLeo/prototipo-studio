import { criarRepositorio } from './createRepository';
import type {
  Studio,
  Parametro,
  Modalidade,
  Espaco,
  Usuario,
  Aluna,
  Anamnese,
  Professora,
  CategoriaProfessora,
  HistoricoCategoria,
  TermoAceite,
  AceiteRegistrado,
  Pacote,
  Contrato,
  HistoricoPlano,
  HistoricoBolsa,
  Pausa,
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
  Cobranca,
  TentativaCobranca,
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
export const usuarioRepositorio = criarRepositorio<Usuario>('usuarios');
export const alunaRepositorio = criarRepositorio<Aluna>('alunas');
export const anamneseRepositorio = criarRepositorio<Anamnese>('anamneses');
export const professoraRepositorio = criarRepositorio<Professora>('professoras');
export const categoriaProfessoraRepositorio = criarRepositorio<CategoriaProfessora>('categoriasProfessora');
export const historicoCategoriaRepositorio = criarRepositorio<HistoricoCategoria>('historicoCategorias');
export const termoAceiteRepositorio = criarRepositorio<TermoAceite>('termosAceite');
export const aceiteRegistradoRepositorio = criarRepositorio<AceiteRegistrado>('aceitesRegistrados');
export const pacoteRepositorio = criarRepositorio<Pacote>('pacotes');
export const contratoRepositorio = criarRepositorio<Contrato>('contratos');
export const historicoPlanoRepositorio = criarRepositorio<HistoricoPlano>('historicoPlanos');
export const historicoBolsaRepositorio = criarRepositorio<HistoricoBolsa>('historicoBolsas');
export const pausaRepositorio = criarRepositorio<Pausa>('pausas');
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
export const cobrancaRepositorio = criarRepositorio<Cobranca>('cobrancas');
export const tentativaCobrancaRepositorio = criarRepositorio<TentativaCobranca>('tentativasCobranca');
export const convenioIntegracaoRepositorio = criarRepositorio<ConvenioIntegracao>('conveniosIntegracao');
export const reservaConvenioRepositorio = criarRepositorio<ReservaConvenio>('reservasConvenio');
export const notificacaoRepositorio = criarRepositorio<Notificacao>('notificacoes');
export const registroAuditoriaRepositorio = criarRepositorio<RegistroAuditoria>('registrosAuditoria');
