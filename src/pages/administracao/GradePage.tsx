import { useState } from 'react';
import type { FormEvent } from 'react';
import { useGradeHorarios } from '../../hooks/useGradeHorarios';
import type { DadosSessao, SessaoComDetalhes } from '../../hooks/useGradeHorarios';
import { useModalidades } from '../../hooks/useModalidades';
import { useEspacos } from '../../hooks/useEspacos';
import { useProfessoras } from '../../hooks/useProfessoras';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { DiaSemana } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';
import { TimePicker } from '../../components/ui/TimePicker';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { DIAS_SEMANA } from '../../utils/horarioFuncionamento';
import type { FaixaHorario } from '../../utils/grade';
import { rotularDias } from '../../utils/grade';
import {
  datasDaSemana,
  diaSemanaDe,
  formatarDataBR,
  formatarDiaMes,
  hojeISO,
  inicioDaSemana,
  somarDias,
} from '../../utils/data';

function SeletorDeDias({ valor, onMudar }: { valor: DiaSemana[]; onMudar: (dias: DiaSemana[]) => void }) {
  function alternar(dia: DiaSemana) {
    onMudar(valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia]);
  }

  return (
    <div className="flex flex-wrap gap-1">
      {DIAS_SEMANA.map((dia) => {
        const marcado = valor.includes(dia.valor);
        return (
          <button
            key={dia.valor}
            type="button"
            onClick={() => alternar(dia.valor)}
            aria-pressed={marcado}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              marcado
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {dia.rotulo.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

function FormularioSessao({
  sessao,
  onSalvar,
  onFechar,
}: {
  sessao?: SessaoComDetalhes;
  onSalvar: (dados: DadosSessao, faixas: FaixaHorario[]) => Promise<void>;
  onFechar: () => void;
}) {
  const { modalidades } = useModalidades();
  const { espacos } = useEspacos();
  const { professoras } = useProfessoras();

  const modalidadesAtivas = modalidades.filter((m) => m.situacao === 'ativo');
  const espacosAtivos = espacos.filter((e) => e.situacao === 'ativo');
  const professorasAtivas = professoras.filter((p) => p.situacao === 'ativa');

  const [modalidadeId, setModalidadeId] = useState(sessao?.modalidadeId ?? '');
  const [professoraId, setProfessoraId] = useState(sessao?.professoraId ?? '');
  const [espacoId, setEspacoId] = useState(sessao?.espacoId ?? '');
  const [dataInicio, setDataInicio] = useState(sessao?.dataInicio ?? hojeISO());
  const [dataTermino, setDataTermino] = useState(sessao?.dataTermino ?? '');
  const [descricao, setDescricao] = useState(sessao?.descricao ?? '');
  const [faixas, setFaixas] = useState<FaixaHorario[]>(
    sessao
      ? [{ diasSemana: sessao.diasSemana, horarioInicio: sessao.horarioInicio, horarioFim: sessao.horarioFim }]
      : [{ diasSemana: [], horarioInicio: '', horarioFim: '' }],
  );
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const modalidadeSelecionada = modalidadesAtivas.find((m) => m.id === modalidadeId);

  function mudarFaixa(indice: number, mudanca: Partial<FaixaHorario>) {
    setFaixas((atual) => atual.map((faixa, i) => (i === indice ? { ...faixa, ...mudanca } : faixa)));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar(
        {
          modalidadeId,
          professoraId,
          espacoId: espacoId || undefined,
          dataInicio,
          dataTermino: dataTermino || undefined,
          descricao: descricao.trim() || undefined,
        },
        faixas,
      );
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
        <SelectField
          label="Modalidade"
          value={modalidadeId}
          onChange={(e) => setModalidadeId(e.target.value)}
          required
          dica={modalidadeSelecionada ? `Capacidade herdada: ${modalidadeSelecionada.capacidadeMaxima} alunas` : undefined}
        >
          <option value="">Selecione…</option>
          {modalidadesAtivas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </SelectField>

        <SelectField label="Professora" value={professoraId} onChange={(e) => setProfessoraId(e.target.value)} required>
          <option value="">Selecione…</option>
          {professorasAtivas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.usuario.nome}
            </option>
          ))}
        </SelectField>

        <SelectField label="Espaço" value={espacoId} onChange={(e) => setEspacoId(e.target.value)} dica="Opcional.">
          <option value="">Sem espaço definido</option>
          {espacosAtivos.map((espaco) => (
            <option key={espaco.id} value={espaco.id}>
              {espaco.nome}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          dica="Opcional. Aparece junto à sessão na grade."
        />

        <TextField
          label="Início da vigência"
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          required
        />
        <TextField
          label="Término da vigência"
          type="date"
          value={dataTermino}
          onChange={(e) => setDataTermino(e.target.value)}
          dica="Opcional. Em branco, a sessão segue por tempo indeterminado."
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Dias e horários</p>
          {!sessao && (
            <button
              type="button"
              onClick={() => setFaixas((atual) => [...atual, { diasSemana: [], horarioInicio: '', horarioFim: '' }])}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              + Adicionar faixa
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {sessao
            ? 'Cada faixa é uma sessão da grade — aqui você edita os dias e o horário desta.'
            : 'Cada faixa vira uma sessão na grade. Use mais de uma para dias com horários diferentes.'}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {faixas.map((faixa, indice) => (
            <div key={indice} className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <SeletorDeDias valor={faixa.diasSemana} onMudar={(dias) => mudarFaixa(indice, { diasSemana: dias })} />
                {faixas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFaixas((atual) => atual.filter((_, i) => i !== indice))}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TimePicker
                  rotulo={`Horário de início da faixa ${indice + 1}`}
                  value={faixa.horarioInicio}
                  onChange={(v) => mudarFaixa(indice, { horarioInicio: v })}
                />
                <span className="text-xs text-neutral-400">até</span>
                <TimePicker
                  rotulo={`Horário de término da faixa ${indice + 1}`}
                  value={faixa.horarioFim}
                  onChange={(v) => mudarFaixa(indice, { horarioFim: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function FormularioEncerramento({
  sessao,
  onEncerrar,
  onFechar,
}: {
  sessao: SessaoComDetalhes;
  onEncerrar: (dataTermino: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [dataTermino, setDataTermino] = useState(sessao.dataTermino ?? hojeISO());
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onEncerrar(dataTermino);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        A sessão sai da grade a partir do dia seguinte à data informada. O histórico de aulas já realizadas é
        preservado, e agendamentos futuros posteriores ao término são cancelados com devolução de crédito.
      </p>
      <TextField
        label="Última data em que a sessão acontece"
        type="date"
        value={dataTermino}
        onChange={(e) => setDataTermino(e.target.value)}
        required
        autoFocus
      />
      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Encerrando…' : 'Encerrar sessão'}
        </Button>
      </div>
    </form>
  );
}

export function GradePage() {
  const grade = useGradeHorarios();
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [inicioSemana, setInicioSemana] = useState(() => inicioDaSemana(hojeISO()));
  const [modalAberto, setModalAberto] = useState<'novo' | SessaoComDetalhes | null>(null);
  const [encerrando, setEncerrando] = useState<SessaoComDetalhes | null>(null);

  const datas = datasDaSemana(inicioSemana);
  const hoje = hojeISO();

  async function excluir(sessao: SessaoComDetalhes) {
    const afetadas = await grade.contarAlunasAfetadas(sessao.id);
    const ok = await confirmar({
      titulo: 'Excluir sessão',
      mensagem:
        afetadas > 0
          ? `${afetadas} aluna(s) têm agendamento futuro nesta sessão. Excluir cancela esses agendamentos, devolve o crédito com prazo adicional de vigência e notifica cada uma. Esta ação não pode ser desfeita.`
          : `Excluir "${sessao.modalidade?.nome}" de ${rotularDias(sessao.diasSemana)}, ${sessao.horarioInicio}–${sessao.horarioFim}? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok || !usuario) return;

    try {
      const canceladas = await grade.remover(sessao, usuario.id);
      mostrarToast(
        canceladas > 0
          ? `Sessão excluída. ${canceladas} agendamento(s) cancelado(s) com crédito devolvido.`
          : 'Sessão excluída.',
        'sucesso',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Grade de horários</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sessões recorrentes do studio. A capacidade vem da modalidade, e datas de exceção aparecem bloqueadas.
          </p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova sessão</Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variante="secundaria" onClick={() => setInicioSemana(somarDias(inicioSemana, -7))}>
            ← Anterior
          </Button>
          <Button variante="secundaria" onClick={() => setInicioSemana(inicioDaSemana(hoje))}>
            Hoje
          </Button>
          <Button variante="secundaria" onClick={() => setInicioSemana(somarDias(inicioSemana, 7))}>
            Próxima →
          </Button>
        </div>
        <p className="text-sm font-medium text-neutral-600">
          {formatarDataBR(datas[0])} a {formatarDataBR(datas[6])}
        </p>
      </div>

      {grade.carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!grade.carregando && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {datas.map((data) => {
              const doDia = grade.sessoesDaData(data);
              const excecao = grade.excecaoNaData(data);
              const ehHoje = data === hoje;
              const rotuloDia = DIAS_SEMANA.find((d) => d.valor === diaSemanaDe(data))?.rotulo ?? '';

              return (
                <div
                  key={data}
                  className={`flex flex-col rounded-xl border bg-white shadow-sm ${
                    ehHoje ? 'border-primary-400 ring-1 ring-primary-200' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 px-3 py-2">
                    <p className={`text-sm font-semibold ${ehHoje ? 'text-primary-700' : 'text-ink'}`}>{rotuloDia}</p>
                    <p className="text-xs text-neutral-500">{formatarDiaMes(data)}</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    {excecao && (
                      <div className="rounded-md bg-amber-50 px-2 py-1.5 ring-1 ring-inset ring-amber-200">
                        <p className="text-xs font-semibold text-amber-800">Studio fechado</p>
                        <p className="text-xs text-amber-700">{excecao.descricao}</p>
                      </div>
                    )}

                    {doDia.length === 0 && !excecao && <p className="text-xs text-neutral-400">Sem sessões.</p>}

                    {doDia.map(({ sessao, cancelada, motivoCancelamento, ocupacao }) => (
                      <div
                        key={sessao.id}
                        className={`rounded-lg border p-2 ${
                          cancelada ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200'
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold ${
                            cancelada ? 'text-neutral-400 line-through' : 'text-primary-700'
                          }`}
                        >
                          {sessao.horarioInicio}–{sessao.horarioFim}
                        </p>
                        <p className={`text-sm font-medium ${cancelada ? 'text-neutral-400' : 'text-ink'}`}>
                          {sessao.modalidade?.nome ?? 'Modalidade removida'}
                        </p>
                        <p className="text-xs text-neutral-500">{sessao.nomeProfessora}</p>
                        {sessao.espaco && <p className="text-xs text-neutral-500">{sessao.espaco.nome}</p>}
                        {cancelada ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">{motivoCancelamento}</p>
                        ) : (
                          <p className="mt-1 text-xs text-neutral-500">
                            {ocupacao}/{sessao.capacidade} alunas
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-8 text-sm font-semibold text-ink">Sessões cadastradas</h2>
          {grade.sessoes.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              Nenhuma sessão na grade ainda. Crie a primeira em "Nova sessão".
            </p>
          ) : (
            <Tabela
              rotulo="Sessões cadastradas na grade"
              itens={grade.sessoes}
              chave={(sessao) => sessao.id}
              busca={{
                placeholder: 'Buscar por modalidade ou professora',
                corresponde: (sessao, termo) =>
                  (sessao.modalidade?.nome ?? '').toLowerCase().includes(termo) ||
                  sessao.nomeProfessora.toLowerCase().includes(termo),
              }}
              colunas={[
                { chave: 'modalidade', rotulo: 'Modalidade' },
                { chave: 'quando', rotulo: 'Dias e horário' },
                { chave: 'professora', rotulo: 'Professora' },
                { chave: 'vigencia', rotulo: 'Vigência' },
                { chave: 'situacao', rotulo: 'Situação' },
                { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
              ]}
              renderLinha={(sessao) => (
                <LinhaTabela key={sessao.id}>
                  <CelulaTabela>
                    <p className="font-medium text-ink">{sessao.modalidade?.nome ?? 'Modalidade removida'}</p>
                    <p className="text-xs text-neutral-500">
                      {sessao.espaco?.nome ?? 'Sem espaço'} · até {sessao.capacidade} alunas
                    </p>
                  </CelulaTabela>
                  <CelulaTabela>
                    <p>{rotularDias(sessao.diasSemana)}</p>
                    <p className="text-xs text-neutral-500">
                      {sessao.horarioInicio}–{sessao.horarioFim}
                    </p>
                  </CelulaTabela>
                  <CelulaTabela>{sessao.nomeProfessora}</CelulaTabela>
                  <CelulaTabela>
                    <p className="text-xs">Desde {formatarDataBR(sessao.dataInicio)}</p>
                    <p className="text-xs text-neutral-500">
                      {sessao.dataTermino ? `Até ${formatarDataBR(sessao.dataTermino)}` : 'Sem término'}
                    </p>
                  </CelulaTabela>
                  <CelulaTabela>
                    <Badge tom={sessao.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                      {sessao.situacao === 'ativo' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </CelulaTabela>
                  <CelulaTabela alinhamento="direita">
                    <div className="inline-flex items-center gap-1">
                      <Button variante="fantasma" onClick={() => setModalAberto(sessao)}>
                        Editar
                      </Button>
                      <Button variante="fantasma" onClick={() => setEncerrando(sessao)}>
                        Encerrar
                      </Button>
                      <Button variante="perigo" onClick={() => excluir(sessao)}>
                        Excluir
                      </Button>
                    </div>
                  </CelulaTabela>
                </LinhaTabela>
              )}
            />
          )}
        </>
      )}

      {modalAberto && (
        <Modal
          titulo={modalAberto === 'novo' ? 'Nova sessão' : 'Editar sessão'}
          largura="larga"
          onFechar={() => setModalAberto(null)}
        >
          <FormularioSessao
            sessao={modalAberto === 'novo' ? undefined : modalAberto}
            onSalvar={async (dados, faixas) => {
              if (modalAberto === 'novo') {
                await grade.criar(dados, faixas);
                mostrarToast(
                  faixas.length > 1 ? `${faixas.length} sessões criadas na grade.` : 'Sessão criada na grade.',
                  'sucesso',
                );
                return;
              }

              // RF-GRD-07: alterar sessão com alunas agendadas exige
              // confirmação explícita, com o impacto exibido antes.
              const afetadas = await grade.contarAlunasAfetadas(modalAberto.id);
              if (afetadas > 0) {
                const ok = await confirmar({
                  titulo: 'Alterar sessão com alunas agendadas',
                  mensagem: `${afetadas} aluna(s) têm agendamento futuro nesta sessão. Ao alterar dia, horário ou professora, elas seguem agendadas na sessão alterada e são notificadas da mudança. Confirmar?`,
                  textoConfirmar: 'Alterar',
                });
                if (!ok) return;
              }
              await grade.atualizar(modalAberto.id, dados, faixas[0]);
              mostrarToast('Sessão atualizada.', 'sucesso');
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {encerrando && (
        <Modal titulo={`Encerrar "${encerrando.modalidade?.nome}"`} onFechar={() => setEncerrando(null)}>
          <FormularioEncerramento
            sessao={encerrando}
            onEncerrar={async (dataTermino) => {
              if (!usuario) return;
              await grade.encerrar(encerrando, dataTermino, usuario.id);
              mostrarToast(`Sessão encerrada a partir de ${formatarDataBR(dataTermino)}.`, 'sucesso');
            }}
            onFechar={() => setEncerrando(null)}
          />
        </Modal>
      )}
    </div>
  );
}
