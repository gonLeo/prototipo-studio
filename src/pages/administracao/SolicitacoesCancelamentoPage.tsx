import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  agendamentoRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  solicitacaoCancelamentoRepositorio,
  usuarioRepositorio,
} from '../../services/repositorios';
import type { SituacaoSolicitacaoCancelamento, SolicitacaoCancelamento } from '../../types/domain';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import {
  aprovarComCancelamento,
  aprovarComSubstituta,
  recusarSolicitacao,
} from '../../hooks/solicitacoesDeCancelamento';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SelectField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarDataBR } from '../../utils/data';

interface SolicitacaoNaFila extends SolicitacaoCancelamento {
  nomeProfessora: string;
  descricaoAula: string;
  horario: string;
  alunasAgendadas: number;
}

interface OpcaoProfessora {
  id: string;
  nome: string;
}

const ROTULO_SITUACAO: Record<SituacaoSolicitacaoCancelamento, string> = {
  pendente: 'Pendente',
  aprovada_substituicao: 'Aprovada com substituta',
  aprovada_cancelamento: 'Aprovada — aula cancelada',
  recusada: 'Recusada',
};

const TOM_SITUACAO: Record<SituacaoSolicitacaoCancelamento, 'aviso' | 'sucesso' | 'neutro' | 'erro'> = {
  pendente: 'aviso',
  aprovada_substituicao: 'sucesso',
  aprovada_cancelamento: 'neutro',
  recusada: 'erro',
};

function FormularioDecisao({
  solicitacao,
  professorasDisponiveis,
  onAprovarComSubstituta,
  onAprovarComCancelamento,
  onRecusar,
  onFechar,
}: {
  solicitacao: SolicitacaoNaFila;
  professorasDisponiveis: OpcaoProfessora[];
  onAprovarComSubstituta: (professoraId: string) => Promise<void>;
  onAprovarComCancelamento: () => Promise<void>;
  onRecusar: (motivo: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [decisao, setDecisao] = useState<'substituta' | 'cancelar' | 'recusar'>('substituta');
  const [substitutaId, setSubstitutaId] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      if (decisao === 'substituta') await onAprovarComSubstituta(substitutaId);
      else if (decisao === 'cancelar') await onAprovarComCancelamento();
      else await onRecusar(motivoRecusa);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={confirmar} className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <p className="font-medium text-ink">{solicitacao.nomeProfessora}</p>
        <p className="text-xs text-neutral-500">
          {solicitacao.descricaoAula} · {formatarDataBR(solicitacao.data)} às {solicitacao.horario} ·{' '}
          {solicitacao.alunasAgendadas} aluna(s) agendada(s)
        </p>
        <p className="mt-2 whitespace-pre-line text-neutral-700">{solicitacao.motivo}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-700">Decisão</legend>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
          <input
            type="radio"
            name="decisao"
            checked={decisao === 'substituta'}
            onChange={() => setDecisao('substituta')}
            className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Aprovar com substituta</span>
            <span className="block text-xs text-neutral-500">
              A aula acontece com outra professora. As alunas mantêm o agendamento e são avisadas da troca.
            </span>
          </span>
        </label>

        {decisao === 'substituta' && (
          <div className="pl-7">
            <SelectField
              label="Professora substituta"
              value={substitutaId}
              onChange={(e) => setSubstitutaId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {professorasDisponiveis.map((professora) => (
                <option key={professora.id} value={professora.id}>
                  {professora.nome}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
          <input
            type="radio"
            name="decisao"
            checked={decisao === 'cancelar'}
            onChange={() => setDecisao('cancelar')}
            className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Aprovar e cancelar a aula</span>
            <span className="block text-xs text-neutral-500">
              {solicitacao.alunasAgendadas > 0
                ? `${solicitacao.alunasAgendadas} aluna(s) recebem o crédito de volta com dias adicionais de vigência e são notificadas.`
                : 'Nenhuma aluna agendada nesta data.'}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
          <input
            type="radio"
            name="decisao"
            checked={decisao === 'recusar'}
            onChange={() => setDecisao('recusar')}
            className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Recusar</span>
            <span className="block text-xs text-neutral-500">A aula segue na grade e a professora é avisada.</span>
          </span>
        </label>

        {decisao === 'recusar' && (
          <div className="pl-7">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Motivo da recusa</span>
              <textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
                required
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </label>
          </div>
        )}
      </fieldset>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Confirmar decisão'}
        </Button>
      </div>
    </form>
  );
}

/** Fila de aprovação dos cancelamentos pedidos pelas professoras (RF-CPR-02 a 05). */
export function SolicitacoesCancelamentoPage() {
  const { usuario } = useSessao();
  const mostrarToast = useToast();

  const [fila, setFila] = useState<SolicitacaoNaFila[]>([]);
  const [professoras, setProfessoras] = useState<OpcaoProfessora[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [decidindo, setDecidindo] = useState<SolicitacaoNaFila | null>(null);
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [solicitacoes, sessoes, modalidades, listaProfessoras, usuarios, ocorrencias, agendamentos] =
      await Promise.all([
        solicitacaoCancelamentoRepositorio.listar(),
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        professoraRepositorio.listar(),
        usuarioRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        agendamentoRepositorio.listar(),
      ]);

    const nomeDaProfessora = (professoraId: string) => {
      const professora = listaProfessoras.find((p) => p.id === professoraId);
      return usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida';
    };

    setProfessoras(
      listaProfessoras
        .filter((p) => p.situacao === 'ativa')
        .map((p) => ({ id: p.id, nome: nomeDaProfessora(p.id) }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    );

    const combinadas = solicitacoes
      .map((solicitacao) => {
        const sessao = sessoes.find((s) => s.id === solicitacao.sessaoId);
        const ocorrencia = ocorrencias.find(
          (o) => o.sessaoId === solicitacao.sessaoId && o.data === solicitacao.data,
        );
        return {
          ...solicitacao,
          nomeProfessora: nomeDaProfessora(solicitacao.professoraSolicitanteId),
          descricaoAula: sessao
            ? (modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade removida')
            : 'Sessão removida',
          horario: sessao?.horarioInicio ?? '—',
          alunasAgendadas: ocorrencia
            ? agendamentos.filter((a) => a.ocorrenciaSessaoId === ocorrencia.id && a.situacao === 'ativo').length
            : 0,
        };
      })
      .sort((a, b) => a.data.localeCompare(b.data));

    setFila(combinadas);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const pendentes = fila.filter((s) => s.situacao === 'pendente');
  const resolvidas = fila.filter((s) => s.situacao !== 'pendente');
  const visiveis = mostrarResolvidas ? fila : pendentes;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Solicitações de cancelamento</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {pendentes.length} aguardando decisão. A aula continua na grade até você aprovar ou recusar.
          </p>
        </div>
        <Button variante="secundaria" onClick={() => setMostrarResolvidas((atual) => !atual)}>
          {mostrarResolvidas ? 'Ver só pendentes' : `Ver decididas (${resolvidas.length})`}
        </Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && visiveis.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          {mostrarResolvidas ? 'Nenhuma solicitação registrada.' : 'Nenhuma solicitação aguardando decisão.'}
        </p>
      )}

      {!carregando && visiveis.length > 0 && (
        <Tabela
          rotulo="Solicitações de cancelamento de aula"
          itens={visiveis}
          chave={(item) => item.id}
          busca={{
            placeholder: 'Buscar por professora',
            corresponde: (item, termo) => item.nomeProfessora.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'professora', rotulo: 'Professora' },
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'motivo', rotulo: 'Motivo' },
            { chave: 'alunas', rotulo: 'Alunas' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(item) => (
            <LinhaTabela key={item.id}>
              <CelulaTabela className="font-medium text-ink">{item.nomeProfessora}</CelulaTabela>
              <CelulaTabela>
                <p>{item.descricaoAula}</p>
                <p className="text-xs text-neutral-500">
                  {formatarDataBR(item.data)} às {item.horario}
                </p>
              </CelulaTabela>
              <CelulaTabela className="max-w-xs">
                <p className="truncate" title={item.motivo}>
                  {item.motivo}
                </p>
              </CelulaTabela>
              <CelulaTabela>{item.alunasAgendadas}</CelulaTabela>
              <CelulaTabela>
                <Badge tom={TOM_SITUACAO[item.situacao]}>{ROTULO_SITUACAO[item.situacao]}</Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                {item.situacao === 'pendente' && (
                  <Button variante="fantasma" onClick={() => setDecidindo(item)}>
                    Decidir
                  </Button>
                )}
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {decidindo && (
        <Modal titulo="Decidir solicitação" largura="larga" onFechar={() => setDecidindo(null)}>
          <FormularioDecisao
            solicitacao={decidindo}
            professorasDisponiveis={professoras.filter((p) => p.id !== decidindo.professoraSolicitanteId)}
            onAprovarComSubstituta={async (professoraSubstitutaId) => {
              if (!usuario) return;
              const { alunasNotificadas } = await aprovarComSubstituta({
                solicitacao: decidindo,
                professoraSubstitutaId,
                autorId: usuario.id,
              });
              await recarregar();
              mostrarToast(
                alunasNotificadas > 0
                  ? `Substituta designada. ${alunasNotificadas} aluna(s) notificada(s) da troca.`
                  : 'Substituta designada.',
                'sucesso',
              );
            }}
            onAprovarComCancelamento={async () => {
              if (!usuario) return;
              const { alunasAfetadas } = await aprovarComCancelamento({
                solicitacao: decidindo,
                autorId: usuario.id,
              });
              await recarregar();
              mostrarToast(
                alunasAfetadas > 0
                  ? `Aula cancelada. ${alunasAfetadas} aluna(s) receberam o crédito de volta com dias adicionais.`
                  : 'Aula cancelada.',
                'sucesso',
              );
            }}
            onRecusar={async (motivoDaRecusa) => {
              if (!usuario) return;
              await recusarSolicitacao({ solicitacao: decidindo, motivoDaRecusa, autorId: usuario.id });
              await recarregar();
              mostrarToast('Solicitação recusada. A professora foi avisada.', 'sucesso');
            }}
            onFechar={() => setDecidindo(null)}
          />
        </Modal>
      )}
    </div>
  );
}
