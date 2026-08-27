import {
  agendamentoRepositorio,
  alunaRepositorio,
  vendaRepositorio,
  espacoRepositorio,
  excecaoCalendarioRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  parametroRepositorio,
  professoraRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import { notificar } from '../services/notificador';
import type { Agendamento, Aluna, Modalidade, Sessao, Usuario } from '../types/domain';
import { formatarDataBR, hojeISO, horasAteAula, somarDias } from '../utils/data';
import { formatarMoeda } from '../utils/creditos';
import { sessaoOcorreEm } from '../utils/grade';
import { RegraNegocioError } from './useModalidades';
import { garantirOcorrencia } from './cancelamentoDeAulas';
import { venderAulaExperimental } from './vendas';
import { validarIdentificacaoUnica } from './cadastroDeAlunas';

/**
 * Aula experimental (M12).
 *
 * O fluxo é **invertido** em relação ao da matrícula (definido na reunião,
 * seção 5.12 do escopo): primeiro a interessada escolhe o horário na
 * grade, só depois paga — o que evita pagamento sem horário compatível e o
 * pedido de reembolso que vem junto.
 */

export interface ParametrosExperimentais {
  valor: number;
  limitePorModalidade: number;
  /** Janela de dias em que a grade é ofertada, a mesma da aluna matriculada. */
  janelaDias: number;
}

export async function parametrosExperimentais(): Promise<ParametrosExperimentais> {
  const parametros = await parametroRepositorio.listar();
  const numero = (chave: string, padrao: number) => {
    const valor = Number(parametros.find((p) => p.chave === chave)?.valor);
    return Number.isFinite(valor) ? valor : padrao;
  };

  return {
    valor: numero('valor_aula_experimental', 30),
    limitePorModalidade: numero('limite_aulas_experimentais_por_modalidade', 1),
    janelaDias: numero('janela_agendamento_matriculadas_dias', 30),
  };
}

export interface AulaParaExperimental {
  sessao: Sessao;
  modalidade: Modalidade | undefined;
  nomeProfessora: string;
  nomeEspaco: string | undefined;
  data: string;
  vagas: number;
  /** Motivo pelo qual esta aula não pode ser escolhida agora. */
  impedimento: string | undefined;
}

/**
 * Grade ofertada à interessada (RF-EXP-01), com vagas reais e o motivo de
 * cada aula indisponível — inclusive o limite por modalidade já consumido
 * pelo CPF informado (RF-EXP-03).
 */
export async function listarAulasParaExperimental(cpf?: string): Promise<AulaParaExperimental[]> {
  const [sessoes, ocorrencias, agendamentos, excecoes, modalidades, professoras, usuarios, espacos, parametros] =
    await Promise.all([
      sessaoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      agendamentoRepositorio.listar(),
      excecaoCalendarioRepositorio.listar(),
      modalidadeRepositorio.listar(),
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      espacoRepositorio.listar(),
      parametrosExperimentais(),
    ]);

  const usadasPorModalidade = cpf ? await experimentaisPorModalidadeDoCpf(cpf) : {};
  const hoje = hojeISO();
  const limite = somarDias(hoje, parametros.janelaDias);
  const agora = new Date();

  const aulas: AulaParaExperimental[] = [];

  for (let data = hoje; data <= limite; data = somarDias(data, 1)) {
    if (excecoes.some((e) => e.data === data)) continue;

    for (const sessao of sessoes) {
      if (sessao.situacao !== 'ativo') continue;
      if (!sessaoOcorreEm(sessao, data)) continue;

      const ocorrencia = ocorrencias.find((o) => o.sessaoId === sessao.id && o.data === data);
      if (ocorrencia?.situacao === 'cancelada') continue;

      const ocupacao = ocorrencia
        ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
        : 0;

      const professora = professoras.find((p) => p.id === sessao.professoraId);
      const usadas = usadasPorModalidade[sessao.modalidadeId] ?? 0;

      let impedimento: string | undefined;
      if (horasAteAula(data, sessao.horarioInicio, agora) <= 0) {
        impedimento = 'Esta aula já começou.';
      } else if (ocupacao >= sessao.capacidade) {
        impedimento = 'Turma lotada.';
      } else if (usadas >= parametros.limitePorModalidade) {
        impedimento = `Você já fez ${usadas} aula(s) experimental(is) desta modalidade — o limite é ${parametros.limitePorModalidade}.`;
      }

      aulas.push({
        sessao,
        modalidade: modalidades.find((m) => m.id === sessao.modalidadeId),
        nomeProfessora: usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida',
        nomeEspaco: espacos.find((e) => e.id === sessao.espacoId)?.nome,
        data,
        vagas: Math.max(0, sessao.capacidade - ocupacao),
        impedimento,
      });
    }
  }

  return aulas.sort(
    (a, b) => a.data.localeCompare(b.data) || a.sessao.horarioInicio.localeCompare(b.sessao.horarioInicio),
  );
}

/**
 * Quantas experimentais o CPF já usou, por modalidade (RF-EXP-03).
 *
 * O controle é por **CPF**, não por cadastro: alguém que se cadastre de
 * novo com outro e-mail continua limitado, que é justamente o ponto da
 * regra.
 */
export async function experimentaisPorModalidadeDoCpf(cpf: string): Promise<Record<string, number>> {
  const alvo = cpf.trim();
  if (!alvo) return {};

  const [usuarios, alunas, agendamentos, ocorrencias, sessoes] = await Promise.all([
    usuarioRepositorio.listar(),
    alunaRepositorio.listar(),
    agendamentoRepositorio.listar(),
    ocorrenciaSessaoRepositorio.listar(),
    sessaoRepositorio.listar(),
  ]);

  const usuario = usuarios.find((u) => u.cpf === alvo);
  const aluna = alunas.find((a) => a.usuarioId === usuario?.id);
  if (!aluna) return {};

  const contagem: Record<string, number> = {};
  for (const agendamento of agendamentos) {
    if (agendamento.alunaId !== aluna.id || !agendamento.experimental) continue;
    if (agendamento.situacao === 'cancelado') continue;

    const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
    const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
    if (!sessao) continue;

    contagem[sessao.modalidadeId] = (contagem[sessao.modalidadeId] ?? 0) + 1;
  }

  return contagem;
}

export interface DadosInteressada {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  contatoEmergencia: string;
}

export interface ResultadoExperimental {
  aluna: Aluna;
  usuario: Usuario;
  agendamento: Agendamento;
  valorPago: number;
}

/**
 * Agenda e cobra a aula experimental (RF-EXP-02/03/04/05).
 *
 * A ordem importa: cadastro, cobrança e **só então** a vaga — a reserva é
 * confirmada depois da confirmação do pagamento, nunca antes.
 */
export async function agendarAulaExperimental(params: {
  dados: DadosInteressada;
  sessao: Sessao;
  data: string;
  /** Quando a interessada já é cadastrada (converteu ou já fez outra experimental). */
  alunaExistenteId?: string;
  autorId?: string;
}): Promise<ResultadoExperimental> {
  const { dados, sessao, data, alunaExistenteId } = params;

  const parametros = await parametrosExperimentais();

  if (horasAteAula(data, sessao.horarioInicio) <= 0) {
    throw new RegraNegocioError('Esta aula já começou. Escolha outro horário.');
  }
  if (!sessaoOcorreEm(sessao, data)) {
    throw new RegraNegocioError('Esta aula não acontece na data escolhida.');
  }

  const excecoes = await excecaoCalendarioRepositorio.listar();
  const excecao = excecoes.find((e) => e.data === data);
  if (excecao) throw new RegraNegocioError(`O studio não abre nesta data: ${excecao.descricao}.`);

  // RF-EXP-03: o limite é por CPF e por modalidade.
  const usadas = (await experimentaisPorModalidadeDoCpf(dados.cpf))[sessao.modalidadeId] ?? 0;
  if (usadas >= parametros.limitePorModalidade) {
    throw new RegraNegocioError(
      `Este CPF já fez ${usadas} aula(s) experimental(is) desta modalidade — o limite configurado é ${parametros.limitePorModalidade}.`,
    );
  }

  // RF-EXP-02: o agendamento exige cadastro, ainda que sem pacote.
  const { aluna, usuario } = alunaExistenteId
    ? await carregarAlunaExistente(alunaExistenteId)
    : await cadastrarInteressada(dados);

  // RF-EXP-05: a vaga só é confirmada depois do pagamento aprovado. A aula
  // experimental é cobrada à parte e não consome créditos (RF-EXP-06).
  const pagamento = await venderAulaExperimental({ alunaId: aluna.id, autorId: usuario.id });
  if (!pagamento.confirmada) {
    throw new RegraNegocioError(`O pagamento não foi aprovado: ${pagamento.mensagem}`);
  }

  const ocorrencia = await garantirOcorrencia(sessao, data);
  if (ocorrencia.situacao === 'cancelada') {
    throw new RegraNegocioError('Esta aula foi cancelada.');
  }

  const agendamentos = await agendamentoRepositorio.listar();
  const ativos = agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo');
  if (ativos.length >= sessao.capacidade) {
    throw new RegraNegocioError('A turma atingiu a capacidade máxima enquanto o pagamento era processado.');
  }

  const agendamento = await agendamentoRepositorio.criar({
    alunaId: aluna.id,
    ocorrenciaSessaoId: ocorrencia.id,
    origem: 'portal',
    dataHora: new Date().toISOString(),
    situacao: 'ativo',
    // Aula experimental não consome créditos — ela é paga à parte (RF-EXP-06).
    experimental: true,
    creditosReservados: 0,
  });

  await notificar({
    destinatario: { tipo: 'usuario', id: usuario.id },
    evento: 'aula_experimental_confirmada',
    conteudo: `Sua aula experimental está confirmada para ${formatarDataBR(data)} às ${sessao.horarioInicio}. Pagamento de ${formatarMoeda(parametros.valor)} recebido. Chegue com 10 minutos de antecedência.`,
  });

  return { aluna, usuario, agendamento, valorPago: parametros.valor };
}

async function carregarAlunaExistente(alunaId: string): Promise<{ aluna: Aluna; usuario: Usuario }> {
  const [alunas, usuarios] = await Promise.all([alunaRepositorio.listar(), usuarioRepositorio.listar()]);
  const aluna = alunas.find((a) => a.id === alunaId);
  const usuario = usuarios.find((u) => u.id === aluna?.usuarioId);
  if (!aluna || !usuario) throw new RegraNegocioError('Cadastro não encontrado.');
  return { aluna, usuario };
}

/**
 * Cadastro da interessada (RF-EXP-02): usuária e aluna **sem pacote**.
 * Ela entra no sistema já com acesso liberado — não há termo de pacote a
 * assinar, porque não há pacote contratado; o termo entra na conversão.
 */
async function cadastrarInteressada(dados: DadosInteressada): Promise<{ aluna: Aluna; usuario: Usuario }> {
  await validarIdentificacaoUnica(dados.email, dados.cpf);

  const usuario = await usuarioRepositorio.criar({
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    cpf: dados.cpf.trim(),
    situacao: 'ativo',
    perfis: ['aluna'],
  });

  const aluna = await alunaRepositorio.criar({
    usuarioId: usuario.id,
    telefone: dados.telefone.trim(),
    dataNascimento: dados.dataNascimento,
    contatoEmergencia: dados.contatoEmergencia.trim(),
    origem: 'direta',
    // Sem pacote contratado, a aluna existe só para a experimental.
    situacao: 'ativa',
    bolsista: false,
  });

  return { aluna, usuario };
}

export interface AulaExperimentalRealizada {
  agendamentoId: string;
  alunaId: string;
  nomeAluna: string;
  data: string;
  modalidade: string;
  situacao: Agendamento['situacao'];
  /** A interessada comprou um pacote depois da aula (RF-EXP-07/09). */
  converteu: boolean;
  dataContratacao?: string;
}

export interface RelatorioDeConversao {
  aulas: AulaExperimentalRealizada[];
  total: number;
  convertidas: number;
  /** Percentual de 0 a 100. */
  taxaDeConversao: number;
  valorArrecadado: number;
}

/**
 * Relatório de aulas experimentais e taxa de conversão em pacote
 * (RF-EXP-09). A conversão é contada quando a aluna que fez a experimental
 * comprou um pacote a partir da data da aula.
 */
export async function relatorioDeConversao(params: {
  dataInicio: string;
  dataFim: string;
}): Promise<RelatorioDeConversao> {
  const { dataInicio, dataFim } = params;

  const [agendamentos, ocorrencias, sessoes, modalidades, alunas, usuarios, vendas, parametros] =
    await Promise.all([
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
      vendaRepositorio.listar(),
      parametrosExperimentais(),
    ]);

  const aulas: AulaExperimentalRealizada[] = [];

  for (const agendamento of agendamentos) {
    if (!agendamento.experimental || agendamento.situacao === 'cancelado') continue;

    const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
    if (!ocorrencia || ocorrencia.data < dataInicio || ocorrencia.data > dataFim) continue;

    const sessao = sessoes.find((s) => s.id === ocorrencia.sessaoId);
    const aluna = alunas.find((a) => a.id === agendamento.alunaId);
    const usuario = usuarios.find((u) => u.id === aluna?.usuarioId);

    const compra = vendas
      .filter(
        (v) =>
          v.alunaId === agendamento.alunaId &&
          v.tipo === 'pacote' &&
          v.situacao === 'confirmada' &&
          v.data >= ocorrencia.data,
      )
      .sort((a, b) => a.data.localeCompare(b.data))[0];

    aulas.push({
      agendamentoId: agendamento.id,
      alunaId: agendamento.alunaId,
      nomeAluna: usuario?.nome ?? 'Aluna removida',
      data: ocorrencia.data,
      modalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade removida',
      situacao: agendamento.situacao,
      converteu: compra !== undefined,
      dataContratacao: compra?.data,
    });
  }

  aulas.sort((a, b) => b.data.localeCompare(a.data));
  const convertidas = aulas.filter((a) => a.converteu).length;

  return {
    aulas,
    total: aulas.length,
    convertidas,
    taxaDeConversao: aulas.length === 0 ? 0 : Math.round((convertidas / aulas.length) * 1000) / 10,
    valorArrecadado: aulas.length * parametros.valor,
  };
}

/** Registro de auditoria da conversão, para separar da matrícula comum. */
export async function registrarConversao(params: {
  alunaId: string;
  vendaId: string;
  autorId: string;
}): Promise<void> {
  await registroAuditoriaRepositorio.criar({
    entidadeAfetada: 'Aluna',
    operacao: 'conversao_de_experimental',
    autorId: params.autorId,
    dataHora: new Date().toISOString(),
    valorNovo: { alunaId: params.alunaId, vendaId: params.vendaId },
  });
}
