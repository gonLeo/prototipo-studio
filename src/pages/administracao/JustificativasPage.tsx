import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  justificativaRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../../services/repositorios';
import type { Justificativa, SituacaoJustificativa } from '../../types/domain';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import { analisarJustificativa } from '../../hooks/justificativasDeFalta';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarDataBR } from '../../utils/data';

interface JustificativaNaFila extends Justificativa {
  nomeAluna: string;
  alunaIdReferencia: string;
  dataAula: string;
  descricaoAula: string;
}

const ROTULO_SITUACAO: Record<SituacaoJustificativa, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  // A correção da chamada mostrou presença: não houve falta a justificar
  // (RF-PRE-05). Não é decisão da administração, e o rótulo diz isso.
  sem_efeito: 'Sem efeito',
};

const TOM_SITUACAO: Record<SituacaoJustificativa, 'aviso' | 'sucesso' | 'erro' | 'neutro'> = {
  pendente: 'aviso',
  aprovada: 'sucesso',
  recusada: 'erro',
  sem_efeito: 'neutro',
};

function FormularioAnalise({
  justificativa,
  onAnalisar,
  onFechar,
}: {
  justificativa: JustificativaNaFila;
  onAnalisar: (aprovada: boolean, parecer: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [parecer, setParecer] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function decidir(aprovada: boolean, e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onAnalisar(aprovada, parecer);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <p className="font-medium text-ink">{justificativa.nomeAluna}</p>
        <p className="text-xs text-neutral-500">
          {justificativa.descricaoAula} · aula de {justificativa.dataAula}
        </p>
        <p className="mt-2 whitespace-pre-line text-neutral-700">{justificativa.texto}</p>
        {justificativa.anexoUrl && (
          <p className="mt-2 text-xs text-neutral-500">
            Comprovante anexado: {justificativa.anexoUrl.replace('anexo-simulado://', '')}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Parecer</span>
        <textarea
          value={parecer}
          onChange={(e) => setParecer(e.target.value)}
          rows={3}
          required
          autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <span className="text-xs text-neutral-500">A aluna recebe este texto junto do resultado.</span>
      </label>

      <p className="text-xs text-neutral-500">
        Aprovar devolve a aula ao saldo da aluna. Recusar mantém o desconto.
      </p>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Fechar
        </Button>
        <Button type="button" variante="perigo" disabled={salvando} onClick={(e) => decidir(false, e)}>
          Recusar
        </Button>
        <Button type="button" disabled={salvando} onClick={(e) => decidir(true, e)}>
          {salvando ? 'Salvando…' : 'Aprovar e devolver crédito'}
        </Button>
      </div>
    </form>
  );
}

/** Fila de análise das justificativas de falta (RF-JUS-03/04). */
export function JustificativasPage() {
  const { usuario } = useSessao();
  const mostrarToast = useToast();

  const [fila, setFila] = useState<JustificativaNaFila[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [analisando, setAnalisando] = useState<JustificativaNaFila | null>(null);
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [justificativas, agendamentos, ocorrencias, sessoes, modalidades, alunas, usuarios] = await Promise.all([
      justificativaRepositorio.listar(),
      agendamentoRepositorio.listar(),
      ocorrenciaSessaoRepositorio.listar(),
      sessaoRepositorio.listar(),
      modalidadeRepositorio.listar(),
      alunaRepositorio.listar(),
      usuarioRepositorio.listar(),
    ]);

    const combinadas = justificativas
      .map((justificativa) => {
        const agendamento = agendamentos.find((a) => a.id === justificativa.agendamentoId);
        const ocorrencia = ocorrencias.find((o) => o.id === agendamento?.ocorrenciaSessaoId);
        const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
        const aluna = alunas.find((a) => a.id === justificativa.alunaId);
        const usuarioAluna = usuarios.find((u) => u.id === aluna?.usuarioId);

        return {
          ...justificativa,
          nomeAluna: usuarioAluna?.nome ?? 'Aluna removida',
          alunaIdReferencia: justificativa.alunaId,
          dataAula: ocorrencia ? formatarDataBR(ocorrencia.data) : '—',
          descricaoAula: sessao
            ? `${modalidades.find((m) => m.id === sessao.modalidadeId)?.nome ?? 'Modalidade'} · ${sessao.horarioInicio}`
            : 'Aula removida',
        };
      })
      .sort((a, b) => b.data.localeCompare(a.data));

    setFila(combinadas);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const pendentes = fila.filter((j) => j.situacao === 'pendente');
  const resolvidas = fila.filter((j) => j.situacao !== 'pendente');
  const visiveis = mostrarResolvidas ? fila : pendentes;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Justificativas de falta</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {pendentes.length} aguardando análise. Aprovar devolve a aula ao saldo da aluna; recusar mantém o desconto.
          </p>
        </div>
        <Button variante="secundaria" onClick={() => setMostrarResolvidas((atual) => !atual)}>
          {mostrarResolvidas ? 'Ver só pendentes' : `Ver analisadas (${resolvidas.length})`}
        </Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && visiveis.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          {mostrarResolvidas ? 'Nenhuma justificativa registrada.' : 'Nenhuma justificativa aguardando análise.'}
        </p>
      )}

      {!carregando && visiveis.length > 0 && (
        <Tabela
          rotulo="Justificativas de falta"
          itens={visiveis}
          chave={(item) => item.id}
          busca={{
            placeholder: 'Buscar por aluna',
            corresponde: (item, termo) => item.nomeAluna.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'aluna', rotulo: 'Aluna' },
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'texto', rotulo: 'Justificativa' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(item) => (
            <LinhaTabela key={item.id}>
              <CelulaTabela>
                <Link
                  to={`/administracao/alunas/${item.alunaIdReferencia}`}
                  className="font-medium text-primary-700 hover:text-primary-800"
                >
                  {item.nomeAluna}
                </Link>
                <p className="text-xs text-neutral-500">Enviada em {formatarDataBR(item.data)}</p>
              </CelulaTabela>
              <CelulaTabela>
                <p>{item.descricaoAula}</p>
                <p className="text-xs text-neutral-500">{item.dataAula}</p>
              </CelulaTabela>
              <CelulaTabela className="max-w-xs">
                <p className="truncate" title={item.texto}>
                  {item.texto}
                </p>
                {item.anexoUrl && <p className="text-xs text-neutral-500">Com comprovante</p>}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={TOM_SITUACAO[item.situacao]}>{ROTULO_SITUACAO[item.situacao]}</Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                {item.situacao === 'pendente' ? (
                  <Button variante="fantasma" onClick={() => setAnalisando(item)}>
                    Analisar
                  </Button>
                ) : (
                  <span className="text-xs text-neutral-500">{item.parecer}</span>
                )}
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {analisando && (
        <Modal titulo="Analisar justificativa" onFechar={() => setAnalisando(null)}>
          <FormularioAnalise
            justificativa={analisando}
            onAnalisar={async (aprovada, parecer) => {
              if (!usuario) return;
              await analisarJustificativa({
                justificativa: analisando,
                aprovada,
                parecer,
                autorId: usuario.id,
              });
              await recarregar();
              mostrarToast(
                aprovada ? 'Justificativa aprovada e crédito devolvido.' : 'Justificativa recusada.',
                'sucesso',
              );
            }}
            onFechar={() => setAnalisando(null)}
          />
        </Modal>
      )}
    </div>
  );
}
