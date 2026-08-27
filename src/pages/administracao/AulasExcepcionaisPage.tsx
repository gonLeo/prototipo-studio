import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  alocarAluna,
  cancelarAlocacao,
  cancelarAulaExcepcional,
  categoriasExcepcionais,
  criarAulaExcepcional,
  listarAlocacoesDetalhadas,
  listarAulasExcepcionais,
  verificarConflitos,
  ROTULO_MOTIVO_SEM_CONSUMO,
} from '../../hooks/aulasExcepcionais';
import type {
  AlocacaoDetalhada,
  AulaExcepcionalDetalhada,
  ConflitoDeAula,
  DadosAulaExcepcional,
} from '../../hooks/aulasExcepcionais';
import { useAlunas } from '../../hooks/useAlunas';
import { useProfessoras } from '../../hooks/useProfessoras';
import { useEspacos } from '../../hooks/useEspacos';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { CategoriaAula, MotivoSemConsumo } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField, CheckboxField } from '../../components/ui/Field';
import { TimePicker } from '../../components/ui/TimePicker';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR, hojeISO } from '../../utils/data';
import { formatarCreditos, formatarMoeda } from '../../utils/creditos';

/**
 * Cadastro da aula excepcional (RF-AEX-01/12/13).
 *
 * O vínculo de professoras é opcional e cada uma recebe o **seu** valor de
 * comissão, informado aqui: a categoria da professora não vale para a aula
 * excepcional, porque uma aula particular remunera diferente da regular e
 * num workshop a quatro mãos cada uma pode receber um valor distinto.
 */
function FormularioAula({
  categorias,
  onSalvar,
  onFechar,
}: {
  categorias: CategoriaAula[];
  onSalvar: (dados: DadosAulaExcepcional, confirmarFora: boolean, cancelarSessoes: boolean) => Promise<void>;
  onFechar: () => void;
}) {
  const { professoras } = useProfessoras();
  const { espacos } = useEspacos();

  const [categoriaAulaId, setCategoriaAulaId] = useState(categorias[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const [data, setData] = useState(hojeISO());
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [espacoId, setEspacoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vinculos, setVinculos] = useState<Array<{ professoraId: string; valorComissao: string }>>([]);

  const [conflitos, setConflitos] = useState<ConflitoDeAula>();
  const [cancelarSessoes, setCancelarSessoes] = useState(false);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const categoria = categorias.find((c) => c.id === categoriaAulaId);
  const ativas = professoras.filter((p) => p.situacao === 'ativa');
  const completo = Boolean(nome.trim() && data && horarioInicio && horarioFim && horarioFim > horarioInicio);

  // A checagem roda enquanto a administração preenche: o alerta de horário
  // fora do funcionamento e o conflito com a grade precisam aparecer antes
  // de confirmar, não depois (RF-AEX-03/13).
  useEffect(() => {
    if (!completo) {
      setConflitos(undefined);
      return;
    }
    let valido = true;
    verificarConflitos({
      data,
      horarioInicio,
      horarioFim,
      espacoId: espacoId || undefined,
      professoraIds: vinculos.map((v) => v.professoraId).filter(Boolean),
    }).then((resultado) => {
      if (valido) setConflitos(resultado);
    });
    return () => {
      valido = false;
    };
  }, [completo, data, horarioInicio, horarioFim, espacoId, vinculos]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar(
        {
          categoriaAulaId,
          nome,
          data,
          horarioInicio,
          horarioFim,
          espacoId: espacoId || undefined,
          descricao,
          professoras: vinculos
            .filter((v) => v.professoraId)
            .map((v) => ({ professoraId: v.professoraId, valorComissao: Number(v.valorComissao) || 0 })),
        },
        conflitos?.foraDoFuncionamento ?? false,
        cancelarSessoes,
      );
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <section>
        <h3 className="text-sm font-semibold text-ink">A aula</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            value={categoriaAulaId}
            onChange={(e) => setCategoriaAulaId(e.target.value)}
            required
            dica={categoria ? `Cada participante consome ${formatarCreditos(categoria.custoEmCreditos)}.` : undefined}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {formatarCreditos(c.custoEmCreditos)}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Nome da aula"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            dica="Ex.: Workshop de Exotic, Particular da Marina."
          />

          <TextField label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

          <SelectField label="Espaço" value={espacoId} onChange={(e) => setEspacoId(e.target.value)}>
            <option value="">Sem espaço definido</option>
            {espacos
              .filter((e) => e.situacao === 'ativo')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
          </SelectField>

          {/* O TimePicker só carrega rótulo acessível; num grid com outros
              campos rotulados, o rótulo visível é o que diz qual é qual. */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Início</span>
            <TimePicker rotulo="Horário de início" value={horarioInicio} onChange={setHorarioInicio} />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Término</span>
            <TimePicker rotulo="Horário de término" value={horarioFim} onChange={setHorarioFim} />
            {horarioInicio && horarioFim && horarioFim <= horarioInicio && (
              <span className="text-xs font-medium text-rose-600">
                O término precisa ser depois do início.
              </span>
            )}
          </div>

          <TextField
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Professoras e comissão</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Vincule uma professora e informe o valor da comissão sempre que a aula gerar pagamento. Quando não houver
          comissão a pagar — aula conduzida pela proprietária, ou convidado remunerado por fora — não cadastre
          professora: a aula acontece normalmente, tem chamada e consome créditos, só não gera lançamento.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {vinculos.map((vinculo, indice) => (
            <div key={indice} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
              <SelectField
                label="Professora"
                value={vinculo.professoraId}
                onChange={(e) =>
                  setVinculos((atual) =>
                    atual.map((v, i) => (i === indice ? { ...v, professoraId: e.target.value } : v)),
                  )
                }
              >
                <option value="">Selecione…</option>
                {ativas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.usuario.nome}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Comissão (R$)"
                type="number"
                min={0}
                step="0.01"
                value={vinculo.valorComissao}
                onChange={(e) =>
                  setVinculos((atual) =>
                    atual.map((v, i) => (i === indice ? { ...v, valorComissao: e.target.value } : v)),
                  )
                }
              />
              <Button
                type="button"
                variante="fantasma"
                onClick={() => setVinculos((atual) => atual.filter((_, i) => i !== indice))}
              >
                Remover
              </Button>
            </div>
          ))}

          <div>
            <Button
              type="button"
              variante="secundaria"
              onClick={() => setVinculos((atual) => [...atual, { professoraId: '', valorComissao: '' }])}
            >
              Vincular professora
            </Button>
          </div>
        </div>
      </section>

      {/* RF-AEX-13: fora do funcionamento alerta, não bloqueia. */}
      {conflitos?.foraDoFuncionamento && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          <strong className="font-semibold">Fora do horário de funcionamento do studio.</strong> Confirme assim mesmo
          ou ajuste a data e o horário — workshop de sábado e aula particular em horário atípico são justamente os
          casos em que isso acontece.
        </p>
      )}

      {conflitos && conflitos.bloqueantes.length > 0 && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-100">
          <p className="font-semibold">Conflito que impede o cadastro:</p>
          <ul className="mt-1 list-inside list-disc">
            {conflitos.bloqueantes.map((mensagem) => (
              <li key={mensagem}>{mensagem}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RF-AEX-03: conflito com a grade informa e oferece o cancelamento. */}
      {conflitos && conflitos.sessoesEmConflito.length > 0 && (
        <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm ring-1 ring-inset ring-neutral-200">
          <p className="font-medium text-ink">
            {conflitos.sessoesEmConflito.length} sessão(ões) da grade acontecem neste horário:
          </p>
          <ul className="mt-1 list-inside list-disc text-neutral-600">
            {conflitos.sessoesEmConflito.map(({ sessao, alunasAgendadas }) => (
              <li key={sessao.id}>
                {sessao.horarioInicio}–{sessao.horarioFim} ·{' '}
                {alunasAgendadas > 0
                  ? `${alunasAgendadas} aluna(s) agendada(s)`
                  : 'nenhuma aluna agendada'}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <CheckboxField
              label="Cancelar essas sessões nesta data"
              checked={cancelarSessoes}
              onChange={setCancelarSessoes}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Havendo alunas agendadas, o cancelamento devolve os créditos, prorroga a validade e avisa cada uma. Sem
              alunas, a grade daquele horário apenas deixa de ser ofertada.
            </p>
          </div>
        </div>
      )}

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando || !completo || (conflitos?.bloqueantes.length ?? 0) > 0}>
          {salvando ? 'Criando…' : conflitos?.foraDoFuncionamento ? 'Confirmar assim mesmo' : 'Criar aula'}
        </Button>
      </div>
    </form>
  );
}

/** Alocação de participantes (RF-AEX-04/05/06/08). */
function PainelDeAlocacao({
  aula,
  onAlocar,
  onCancelarAlocacao,
}: {
  aula: AulaExcepcionalDetalhada;
  onAlocar: (params: {
    alunaId: string;
    consumoDispensado: boolean;
    motivoSemConsumo?: MotivoSemConsumo;
  }) => Promise<void>;
  onCancelarAlocacao: (alocacao: AlocacaoDetalhada, motivo: string) => Promise<void>;
}) {
  const { alunas } = useAlunas();
  const [alocacoes, setAlocacoes] = useState<AlocacaoDetalhada[]>([]);
  const [alunaId, setAlunaId] = useState('');
  const [consumoDispensado, setConsumoDispensado] = useState(false);
  const [motivoSemConsumo, setMotivoSemConsumo] = useState<MotivoSemConsumo>('pagamento_avulso');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    setAlocacoes(await listarAlocacoesDetalhadas(aula.id));
  }, [aula.id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // RF-AEX-11: aluna de convênio não participa de aula excepcional.
  const elegiveis = alunas.filter((a) => a.origem !== 'convenio');
  const ativas = alocacoes.filter((a) => a.situacao === 'ativa');

  async function alocar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onAlocar({
        alunaId,
        consumoDispensado,
        motivoSemConsumo: consumoDispensado ? motivoSemConsumo : undefined,
      });
      setAlunaId('');
      setConsumoDispensado(false);
      await recarregar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <p className="text-ink">
          <strong className="font-semibold">{aula.nome}</strong> · {formatarDataBR(aula.data)} ·{' '}
          {aula.horarioInicio}–{aula.horarioFim}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {aula.nomeCategoria} · cada participante consome {formatarCreditos(aula.custoEmCreditos)} ·{' '}
          {ativas.length} alocada(s). Não há limite de participantes controlado pelo sistema.
        </p>
      </div>

      <form onSubmit={alocar} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="Aluna" value={alunaId} onChange={(e) => setAlunaId(e.target.value)} required>
            <option value="">Selecione…</option>
            {elegiveis.map((a) => (
              <option key={a.id} value={a.id}>
                {a.usuario.nome}
                {a.leitura ? ` — ${a.leitura.disponiveis} crédito(s)` : ' — sem pacote ativo'}
              </option>
            ))}
          </SelectField>

          {consumoDispensado && (
            <SelectField
              label="Motivo"
              value={motivoSemConsumo}
              onChange={(e) => setMotivoSemConsumo(e.target.value as MotivoSemConsumo)}
              dica="Fica no relatório, para separar quem consumiu crédito de quem pagou por fora."
            >
              {(Object.keys(ROTULO_MOTIVO_SEM_CONSUMO) as MotivoSemConsumo[]).map((valor) => (
                <option key={valor} value={valor}>
                  {ROTULO_MOTIVO_SEM_CONSUMO[valor]}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        <CheckboxField
          label="Sem consumo de créditos — pagamento tratado fora do sistema"
          checked={consumoDispensado}
          onChange={setConsumoDispensado}
        />

        {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={salvando || !alunaId}>
            {salvando ? 'Alocando…' : 'Alocar aluna'}
          </Button>
        </div>
      </form>

      {alocacoes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma aluna alocada ainda.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200">
          {alocacoes.map((alocacao) => (
            <li key={alocacao.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className={alocacao.situacao === 'cancelada' ? 'text-neutral-400 line-through' : 'text-ink'}>
                  {alocacao.nomeAluna}
                </p>
                <p className="text-xs text-neutral-500">
                  {alocacao.consumoDispensado
                    ? `Sem consumo · ${ROTULO_MOTIVO_SEM_CONSUMO[alocacao.motivoSemConsumo!]}`
                    : `${formatarCreditos(alocacao.creditosConsumidos)} consumidos`}
                  {alocacao.motivoCancelamento && ` · cancelada: ${alocacao.motivoCancelamento}`}
                </p>
              </div>
              {alocacao.situacao === 'ativa' && (
                <Button
                  variante="fantasma"
                  onClick={async () => {
                    const motivo = 'Cancelamento pela administração';
                    await onCancelarAlocacao(alocacao, motivo);
                    await recarregar();
                  }}
                >
                  Cancelar alocação
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Aulas excepcionais (M9): workshops e aulas particulares.
 *
 * Acontecem fora da grade recorrente e não podem ser agendadas pelas
 * alunas — quem cria e quem aloca é a administração (RN-12).
 */
export function AulasExcepcionaisPage() {
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [aulas, setAulas] = useState<AulaExcepcionalDetalhada[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [alocando, setAlocando] = useState<AulaExcepcionalDetalhada | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [lista, disponiveis] = await Promise.all([listarAulasExcepcionais(), categoriasExcepcionais()]);
    setAulas(lista);
    setCategorias(disponiveis);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function excluir(aula: AulaExcepcionalDetalhada) {
    const ok = await confirmar({
      titulo: 'Cancelar aula excepcional',
      mensagem: `Cancelar "${aula.nome}"? As ${aula.alocadas} aluna(s) alocada(s) têm os créditos estornados.`,
      textoConfirmar: 'Cancelar aula',
      perigo: true,
    });
    if (!ok || !usuario) return;
    try {
      const estornadas = await cancelarAulaExcepcional({
        aula,
        motivo: 'Cancelada pela administração',
        autorId: usuario.id,
      });
      await recarregar();
      mostrarToast(`Aula cancelada. ${estornadas} alocação(ões) estornada(s).`, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Aulas excepcionais</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Workshops e aulas particulares, fora da grade recorrente. A aluna não agenda por conta própria — quem aloca
            é a administração, e os créditos são consumidos na hora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={aulas.length === 0}
            onClick={() =>
              baixarCSV({
                nomeArquivo: 'aulas-excepcionais',
                itens: aulas,
                colunas: [
                  { cabecalho: 'Data', valor: (item) => item.data },
                  { cabecalho: 'Aula', valor: (item) => item.nome },
                  { cabecalho: 'Categoria', valor: (item) => item.nomeCategoria },
                  { cabecalho: 'Custo em créditos', valor: (item) => item.custoEmCreditos },
                  { cabecalho: 'Horário', valor: (item) => `${item.horarioInicio}-${item.horarioFim}` },
                  { cabecalho: 'Espaço', valor: (item) => item.nomeEspaco ?? '' },
                  { cabecalho: 'Participantes', valor: (item) => item.alocadas },
                  { cabecalho: 'Professoras', valor: (item) => item.professoras.map((p) => p.nome).join(' / ') },
                  { cabecalho: 'Comissão total', valor: (item) => item.totalComissao.toFixed(2) },
                  { cabecalho: 'Situação', valor: (item) => (item.situacao === 'ativa' ? 'Ativa' : 'Cancelada') },
                ],
              })
            }
          >
            Exportar CSV
          </Button>
          <Button onClick={() => setCriando(true)} disabled={categorias.length === 0}>
            Nova aula excepcional
          </Button>
        </div>
      </div>

      {categorias.length === 0 && !carregando && (
        <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          Nenhuma categoria de aula excepcional cadastrada. Crie uma em{' '}
          <Link to="/administracao/categorias-aula" className="font-medium underline">
            Categorias de aula
          </Link>{' '}
          marcando a opção de aula fora da grade.
        </p>
      )}

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && aulas.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma aula excepcional cadastrada ainda.</p>
      )}

      {!carregando && aulas.length > 0 && (
        <Tabela
          rotulo="Aulas excepcionais"
          itens={aulas}
          chave={(aula) => aula.id}
          busca={{
            placeholder: 'Buscar por nome ou categoria',
            corresponde: (aula, termo) =>
              aula.nome.toLowerCase().includes(termo) || aula.nomeCategoria.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'quando', rotulo: 'Quando' },
            { chave: 'professoras', rotulo: 'Professoras e comissão' },
            { chave: 'participantes', rotulo: 'Participantes' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(aula) => (
            <LinhaTabela key={aula.id}>
              <CelulaTabela>
                <p className={aula.situacao === 'cancelada' ? 'text-neutral-400 line-through' : 'font-medium text-ink'}>
                  {aula.nome}
                </p>
                <p className="text-xs text-neutral-500">
                  {aula.nomeCategoria} · {formatarCreditos(aula.custoEmCreditos)} por participante
                </p>
              </CelulaTabela>
              <CelulaTabela className="whitespace-nowrap">
                <p>{formatarDataBR(aula.data)}</p>
                <p className="text-xs text-neutral-500">
                  {aula.horarioInicio}–{aula.horarioFim}
                  {aula.nomeEspaco && ` · ${aula.nomeEspaco}`}
                </p>
                {aula.foraDoFuncionamento && (
                  <Badge tom="aviso">Fora do funcionamento</Badge>
                )}
              </CelulaTabela>
              <CelulaTabela>
                {aula.professoras.length === 0 ? (
                  <span className="text-xs text-neutral-500">Sem professora · não gera comissão</span>
                ) : (
                  <ul className="text-xs">
                    {aula.professoras.map((p) => (
                      <li key={p.id}>
                        {p.nome} — {formatarMoeda(p.valorComissao)}
                      </li>
                    ))}
                  </ul>
                )}
              </CelulaTabela>
              <CelulaTabela>{aula.alocadas}</CelulaTabela>
              <CelulaTabela alinhamento="direita">
                {aula.situacao === 'ativa' ? (
                  <div className="inline-flex items-center gap-1">
                    <Button variante="fantasma" onClick={() => setAlocando(aula)}>
                      Alocar alunas
                    </Button>
                    <Link
                      to={`/administracao/chamada-excepcional/${aula.id}`}
                      className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                    >
                      Chamada
                    </Link>
                    <Button variante="perigo" onClick={() => excluir(aula)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Badge tom="neutro">Cancelada</Badge>
                )}
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {criando && (
        <Modal titulo="Nova aula excepcional" largura="larga" onFechar={() => setCriando(false)}>
          <FormularioAula
            categorias={categorias}
            onSalvar={async (dados, confirmarFora, cancelarSessoes) => {
              if (!usuario) return;
              const { sessoesCanceladas, alunasAfetadas } = await criarAulaExcepcional({
                dados,
                autorId: usuario.id,
                confirmarForaDoFuncionamento: confirmarFora,
                cancelarSessoesEmConflito: cancelarSessoes,
              });
              await recarregar();
              mostrarToast(
                sessoesCanceladas > 0
                  ? `Aula criada. ${sessoesCanceladas} sessão(ões) da grade cancelada(s) e ${alunasAfetadas} aluna(s) avisada(s).`
                  : 'Aula excepcional criada.',
                'sucesso',
              );
            }}
            onFechar={() => setCriando(false)}
          />
        </Modal>
      )}

      {alocando && (
        <Modal titulo="Alocar alunas" largura="larga" onFechar={() => setAlocando(null)}>
          <PainelDeAlocacao
            aula={alocando}
            onAlocar={async ({ alunaId, consumoDispensado, motivoSemConsumo }) => {
              if (!usuario) return;
              await alocarAluna({
                aula: alocando,
                alunaId,
                consumoDispensado,
                motivoSemConsumo,
                autorId: usuario.id,
              });
              await recarregar();
              mostrarToast('Aluna alocada.', 'sucesso');
            }}
            onCancelarAlocacao={async (alocacao, motivo) => {
              if (!usuario) return;
              try {
                await cancelarAlocacao({ alocacao, aula: alocando, motivo, autorId: usuario.id });
                await recarregar();
                mostrarToast('Alocação cancelada e créditos estornados.', 'sucesso');
              } catch (erroCapturado) {
                mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
