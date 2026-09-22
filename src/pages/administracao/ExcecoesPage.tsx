import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useExcecoesCalendario, TIPOS_EXCECAO, rotuloTipoExcecao } from '../../hooks/useExcecoesCalendario';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { ExcecaoCalendario, Sessao, TipoExcecao } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import {
  ehDoMes,
  formatarDataBR,
  gradeDoMes,
  hojeISO,
  nomeDoMes,
} from '../../utils/data';

const CABECALHO_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function FormularioExcecao({
  dataInicial,
  onPrevia,
  onSalvar,
  onFechar,
}: {
  dataInicial: string;
  onPrevia: (data: string) => Promise<{ sessoes: Sessao[]; alunasAfetadas: number }>;
  onSalvar: (dados: { data: string; tipo: TipoExcecao; descricao: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const [data, setData] = useState(dataInicial);
  const [tipo, setTipo] = useState<TipoExcecao>('feriado');
  const [descricao, setDescricao] = useState('');
  const [previa, setPrevia] = useState<{ sessoes: Sessao[]; alunasAfetadas: number }>();
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  // RF-EXC-03: a prévia de impacto acompanha a data escolhida, antes de confirmar.
  useEffect(() => {
    let valido = true;
    if (!data) {
      setPrevia(undefined);
      return;
    }
    onPrevia(data).then((resultado) => {
      if (valido) setPrevia(resultado);
    });
    return () => {
      valido = false;
    };
  }, [data, onPrevia]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ data, tipo, descricao });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required autoFocus />
        <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoExcecao)} required>
          {TIPOS_EXCECAO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          dica="Aparece para a aluna na grade, explicando a indisponibilidade da data."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-sm font-semibold text-ink">Impacto desta data</p>
        {!previa && <p className="mt-1 text-xs text-neutral-500">Escolha uma data para ver o impacto.</p>}
        {previa && previa.sessoes.length === 0 && (
          <p className="mt-1 text-xs text-neutral-500">Nenhuma sessão acontece nesta data — nada será cancelado.</p>
        )}
        {previa && previa.sessoes.length > 0 && (
          <>
            <p className="mt-1 text-xs text-neutral-600">
              {previa.sessoes.length} sessão(ões) será(ão) cancelada(s) e {previa.alunasAfetadas} aluna(s) agendada(s)
              {previa.alunasAfetadas > 0
                ? ' recebem o crédito de volta com prazo adicional de vigência, além da notificação.'
                : ' seriam afetadas.'}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {previa.sessoes.map((sessao) => (
                <li key={sessao.id} className="text-xs text-neutral-600">
                  {sessao.horarioInicio}–{sessao.horarioFim}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Cadastrar exceção'}
        </Button>
      </div>
    </form>
  );
}

export function ExcecoesPage() {
  const { excecoes, carregando, criar, remover, previaDeImpacto, excecaoNaData } = useExcecoesCalendario();
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const hoje = hojeISO();
  const [ano, setAno] = useState(() => Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoje.slice(5, 7)) - 1);
  const [modalAberto, setModalAberto] = useState<string | null>(null);

  const dias = gradeDoMes(ano, mes);

  function mudarMes(delta: number) {
    const total = mes + delta;
    setAno((atual) => atual + Math.floor(total / 12));
    setMes(((total % 12) + 12) % 12);
  }

  async function excluir(excecao: ExcecaoCalendario) {
    const ok = await confirmar({
      titulo: 'Remover exceção',
      mensagem: `Remover a exceção de ${formatarDataBR(excecao.data)}? As sessões daquela data voltam a ficar disponíveis, mas os agendamentos já cancelados não são restabelecidos — as alunas precisam agendar de novo.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(excecao);
      mostrarToast('Exceção removida. As sessões da data voltaram para a grade.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Calendário de exceções</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Datas em que o studio não opera. Ao confirmar, as sessões da data são canceladas e as alunas agendadas
            recebem o crédito de volta.
          </p>
        </div>
        <Button onClick={() => setModalAberto(hoje)}>Nova exceção</Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variante="secundaria" onClick={() => mudarMes(-1)}>
            ← Anterior
          </Button>
          <Button
            variante="secundaria"
            onClick={() => {
              setAno(Number(hoje.slice(0, 4)));
              setMes(Number(hoje.slice(5, 7)) - 1);
            }}
          >
            Mês atual
          </Button>
          <Button variante="secundaria" onClick={() => mudarMes(1)}>
            Próximo →
          </Button>
        </div>
        <p className="text-sm font-medium text-neutral-600 first-letter:uppercase">
          {nomeDoMes(mes)} de {ano}
        </p>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
              {CABECALHO_SEMANA.map((rotulo) => (
                <div key={rotulo} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {rotulo}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((data) => {
                const excecao = excecaoNaData(data);
                const doMes = ehDoMes(data, ano, mes);
                const ehHoje = data === hoje;

                return (
                  <button
                    key={data}
                    type="button"
                    onClick={() => setModalAberto(data)}
                    className={`min-h-20 border-b border-r border-neutral-100 p-2 text-left transition-colors last:border-r-0 hover:bg-primary-50 ${
                      doMes ? 'bg-white' : 'bg-neutral-50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        ehHoje
                          ? 'bg-primary-600 text-white'
                          : doMes
                            ? 'text-ink'
                            : 'text-neutral-400'
                      }`}
                    >
                      {Number(data.slice(8, 10))}
                    </span>
                    {excecao && (
                      <span className="mt-1 block rounded bg-amber-50 px-1.5 py-1 text-[11px] font-medium leading-tight text-amber-800 ring-1 ring-inset ring-amber-200">
                        {excecao.descricao}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Clique em um dia para cadastrar uma exceção nele.</p>

          <h2 className="mt-8 text-sm font-semibold text-ink">Exceções cadastradas</h2>
          {excecoes.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">Nenhuma exceção cadastrada ainda.</p>
          ) : (
            <Tabela
              rotulo="Exceções de calendário cadastradas"
              itens={excecoes}
              chave={(excecao) => excecao.id}
              busca={{
                placeholder: 'Buscar por descrição',
                corresponde: (excecao, termo) => excecao.descricao.toLowerCase().includes(termo),
              }}
              colunas={[
                { chave: 'data', rotulo: 'Data' },
                { chave: 'tipo', rotulo: 'Tipo' },
                { chave: 'descricao', rotulo: 'Descrição' },
                { chave: 'situacao', rotulo: 'Situação' },
                { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
              ]}
              renderLinha={(excecao) => {
                const passada = excecao.data < hoje;
                return (
                  <LinhaTabela key={excecao.id}>
                    <CelulaTabela className="font-medium text-ink">{formatarDataBR(excecao.data)}</CelulaTabela>
                    <CelulaTabela>{rotuloTipoExcecao(excecao.tipo)}</CelulaTabela>
                    <CelulaTabela>{excecao.descricao}</CelulaTabela>
                    <CelulaTabela>
                      <Badge tom={passada ? 'neutro' : 'aviso'}>{passada ? 'Já ocorrida' : 'Futura'}</Badge>
                    </CelulaTabela>
                    <CelulaTabela alinhamento="direita">
                      {passada ? (
                        <span className="text-xs text-neutral-400">Não removível</span>
                      ) : (
                        <Button variante="perigo" onClick={() => excluir(excecao)}>
                          Remover
                        </Button>
                      )}
                    </CelulaTabela>
                  </LinhaTabela>
                );
              }}
            />
          )}
        </>
      )}

      {modalAberto && (
        <Modal titulo="Nova exceção de calendário" onFechar={() => setModalAberto(null)}>
          <FormularioExcecao
            dataInicial={modalAberto}
            onPrevia={previaDeImpacto}
            onSalvar={async (dados) => {
              if (!usuario) return;
              const resultado = await criar(dados, usuario.id);
              mostrarToast(
                resultado.sessoesCanceladas > 0
                  ? `Exceção cadastrada. ${resultado.sessoesCanceladas} sessão(ões) cancelada(s) e ${resultado.alunasAfetadas} aluna(s) notificada(s). Veja quem avisar pelo WhatsApp em "Aulas canceladas".`
                  : 'Exceção cadastrada. Nenhuma sessão acontecia nesta data.',
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
