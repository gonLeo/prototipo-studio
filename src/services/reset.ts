import seed from '../data/seed.json';
import { http } from './http';

type Registro = { id: string } & Record<string, unknown>;
type BaseDeDados = Record<string, Registro[]>;

/**
 * Chaves estrangeiras do backfill: `recurso → { campo: recursoApontado }`.
 *
 * Existe porque o json-server **ignora o `id` enviado no POST** e gera um
 * novo. Como o reset recria tudo pela API REST (nunca escrevendo o arquivo
 * direto), os ids do `seed.json` são descartados e qualquer campo que
 * aponte para outro registro ficaria órfão — a tela mostraria "Modalidade
 * removida", "Professora removida" e afins. Com este mapa, o reset traduz
 * cada FK do id original para o id realmente gravado.
 *
 * Toda entidade nova que referencie outra precisa ser registrada aqui,
 * junto com a regra de existir em `seed.json` (ver README).
 */
const CHAVES_ESTRANGEIRAS: Record<string, Record<string, string>> = {
  anamneses: { alunaId: 'alunas' },
  professoras: { usuarioId: 'usuarios', categoriaId: 'categoriasProfessora' },
  historicoCategorias: {
    professoraId: 'professoras',
    categoriaId: 'categoriasProfessora',
    autorId: 'usuarios',
  },
  aceitesRegistrados: { usuarioId: 'usuarios', termoVersaoId: 'termosAceite' },
  alunas: { usuarioId: 'usuarios', pacoteConcedidoId: 'pacotes' },
  carteiras: { alunaId: 'alunas', pacoteId: 'pacotes' },
  movimentosCredito: { carteiraId: 'carteiras', autorId: 'usuarios' },
  vendas: { alunaId: 'alunas', pacoteId: 'pacotes', carteiraId: 'carteiras' },
  trancamentos: { carteiraId: 'carteiras', alunaId: 'alunas', autorId: 'usuarios' },
  reembolsos: { vendaId: 'vendas', alunaId: 'alunas', autorId: 'usuarios' },
  sessoes: { modalidadeId: 'modalidades', professoraId: 'professoras', espacoId: 'espacos' },
  ocorrenciasSessao: { sessaoId: 'sessoes', professoraEfetivaId: 'professoras' },
  agendamentos: { alunaId: 'alunas', ocorrenciaSessaoId: 'ocorrenciasSessao' },
  excecoesCalendario: { autorId: 'usuarios' },
  chamadas: { ocorrenciaSessaoId: 'ocorrenciasSessao', professoraId: 'professoras' },
  registrosPresenca: { chamadaId: 'chamadas', alunaId: 'alunas', autorId: 'usuarios' },
  justificativas: { agendamentoId: 'agendamentos', alunaId: 'alunas', autorAnaliseId: 'usuarios' },
  solicitacoesCancelamento: {
    sessaoId: 'sessoes',
    professoraSolicitanteId: 'professoras',
    professoraSubstitutaId: 'professoras',
    autorDecisaoId: 'usuarios',
  },
  comissoes: {
    chamadaId: 'chamadas',
    professoraId: 'professoras',
    categoriaAplicadaId: 'categoriasProfessora',
    periodoFechamentoId: 'fechamentosComissao',
  },
  fechamentosComissao: { autorId: 'usuarios' },
  reservasConvenio: { alunaId: 'alunas', ocorrenciaSessaoId: 'ocorrenciasSessao' },
  notificacoes: { destinatarioId: 'usuarios' },
  registrosAuditoria: { autorId: 'usuarios' },
};

/**
 * Ordena os recursos para que um registro só seja criado depois daquele a
 * que ele aponta — assim o id novo do alvo já existe no mapa quando a FK
 * precisa ser traduzida.
 */
function ordenarPorDependencia(recursos: string[]): string[] {
  const resolvidos: string[] = [];
  const pendentes = new Set(recursos);

  while (pendentes.size > 0) {
    const antes = pendentes.size;

    for (const recurso of [...pendentes]) {
      const dependencias = Object.values(CHAVES_ESTRANGEIRAS[recurso] ?? {}).filter(
        (alvo) => alvo !== recurso && recursos.includes(alvo),
      );
      if (dependencias.every((alvo) => resolvidos.includes(alvo))) {
        resolvidos.push(recurso);
        pendentes.delete(recurso);
      }
    }

    // Ciclo entre recursos (ou auto-referência): mantém a ordem original
    // do seed para o restante em vez de travar.
    if (pendentes.size === antes) {
      resolvidos.push(...pendentes);
      break;
    }
  }

  return resolvidos;
}

function traduzirChavesEstrangeiras(
  recurso: string,
  registro: Record<string, unknown>,
  idsPorRecurso: Record<string, Record<string, string>>,
): Record<string, unknown> {
  const mapaDoRecurso = CHAVES_ESTRANGEIRAS[recurso];
  if (!mapaDoRecurso) return registro;

  const traduzido = { ...registro };
  for (const [campo, recursoAlvo] of Object.entries(mapaDoRecurso)) {
    const valor = traduzido[campo];
    if (typeof valor !== 'string') continue;
    const idNovo = idsPorRecurso[recursoAlvo]?.[valor];
    if (idNovo) traduzido[campo] = idNovo;
  }
  return traduzido;
}

/**
 * Restaura o protótipo ao estado original do backfill (src/data/seed.json).
 * Remove tudo que existe hoje no json-server e recria os registros
 * originais, traduzindo as chaves estrangeiras para os ids gerados na
 * recriação. Usa somente a API REST já exposta pelos repositórios (http),
 * o mesmo caminho que o app real usará no futuro.
 */
export async function resetarPrototipo(): Promise<void> {
  const dados = seed as BaseDeDados;
  const recursos = Object.keys(dados);

  for (const recurso of recursos) {
    const atuais = await http.get<Registro[]>(`/${recurso}`);
    for (const item of atuais) {
      await http.delete(`/${recurso}/${item.id}`);
    }
  }

  const idsPorRecurso: Record<string, Record<string, string>> = {};

  for (const recurso of ordenarPorDependencia(recursos)) {
    idsPorRecurso[recurso] = {};

    for (const original of dados[recurso]) {
      const { id: idOriginal, ...campos } = original;
      const criado = await http.post<Registro>(
        `/${recurso}`,
        traduzirChavesEstrangeiras(recurso, campos, idsPorRecurso),
      );
      idsPorRecurso[recurso][idOriginal] = criado.id;
    }
  }
}
