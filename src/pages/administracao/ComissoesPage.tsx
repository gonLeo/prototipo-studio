import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  comissoesEmAberto,
  dataPrevistaDePagamento,
  fecharPeriodo,
  marcarFechamentoComoPago,
  periodoAtual,
} from '../../hooks/comissoes';
import { chamadasPendentes } from '../../hooks/chamadaDeAulas';
import {
  chamadaRepositorio,
  fechamentoComissaoRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  registroPresencaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../../services/repositorios';
import type { Comissao, FechamentoComissao } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatarDataBR, nomeDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/contrato';

interface AulaDaComissao extends Comissao {
  descricaoAula: string;
  presencas: number;
}

interface ResumoDeProfessora {
  professoraId: string;
  nome: string;
  aulas: AulaDaComissao[];
  total: number;
}

interface PendenciaDeChamada {
  sessaoId: string;
  data: string;
  professora: string;
  alunas: number;
  descricaoAula: string;
}

/**
 * Comissões e fechamento (M10) + sinalização das chamadas pendentes
 * (RF-PRE-08), que precisam ser finalizadas antes de fechar o período —
 * cada uma delas é uma comissão que ainda não existe.
 */
export function ComissoesPage() {
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [resumos, setResumos] = useState<ResumoDeProfessora[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoComissao[]>([]);
  const [pendencias, setPendencias] = useState<PendenciaDeChamada[]>([]);
  const [detalhando, setDetalhando] = useState<ResumoDeProfessora | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Memoizado pelo mesmo motivo da tela da professora: `periodoAtual()`
  // cria um objeto novo a cada chamada e, como dependência de `carregar`,
  // faria o efeito rodar sem parar.
  const periodo = useMemo(() => periodoAtual(), []);

  const carregar = useCallback(async () => {
    setCarregando(true);

    const [professoras, usuarios, chamadas, ocorrencias, sessoes, modalidades, registros, listaFechamentos] =
      await Promise.all([
        professoraRepositorio.listar(),
        usuarioRepositorio.listar(),
        chamadaRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        registroPresencaRepositorio.listar(),
        fechamentoComissaoRepositorio.listar(),
      ]);

    const nomeDaProfessora = (professoraId: string) => {
      const professora = professoras.find((p) => p.id === professoraId);
      return usuarios.find((u) => u.id === professora?.usuarioId)?.nome ?? 'Professora removida';
    };

    const descreverAula = (comissao: Comissao) => {
      const chamada = chamadas.find((c) => c.id === comissao.chamadaId);
      const ocorrencia = ocorrencias.find((o) => o.id === chamada?.ocorrenciaSessaoId);
      const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
      const modalidade = modalidades.find((m) => m.id === sessao?.modalidadeId);
      return `${modalidade?.nome ?? 'Aula'} · ${sessao?.horarioInicio ?? ''}`;
    };

    const emAberto = await comissoesEmAberto(periodo);
    const porProfessora = new Map<string, ResumoDeProfessora>();

    for (const comissao of emAberto) {
      const atual = porProfessora.get(comissao.professoraId) ?? {
        professoraId: comissao.professoraId,
        nome: nomeDaProfessora(comissao.professoraId),
        aulas: [],
        total: 0,
      };
      atual.aulas.push({
        ...comissao,
        descricaoAula: descreverAula(comissao),
        presencas: registros.filter((r) => r.chamadaId === comissao.chamadaId && r.situacao === 'presente').length,
      });
      atual.total += comissao.valor;
      porProfessora.set(comissao.professoraId, atual);
    }

    setResumos([...porProfessora.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
    setFechamentos(listaFechamentos.sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)));

    const pendentes = await chamadasPendentes();
    setPendencias(
      pendentes.map((pendencia) => {
        const sessao = sessoes.find((s) => s.id === pendencia.sessaoId);
        const modalidade = modalidades.find((m) => m.id === sessao?.modalidadeId);
        return {
          ...pendencia,
          professora: nomeDaProfessora(pendencia.professoraId),
          descricaoAula: `${modalidade?.nome ?? 'Aula'} · ${sessao?.horarioInicio ?? ''}`,
        };
      }),
    );

    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;

  const totalGeral = resumos.reduce((soma, resumo) => soma + resumo.total, 0);
  const totalDeAulas = resumos.reduce((soma, resumo) => soma + resumo.aulas.length, 0);

  async function fechar() {
    if (!usuario) return;
    const ok = await confirmar({
      titulo: 'Fechar período',
      mensagem:
        pendencias.length > 0
          ? `Há ${pendencias.length} chamada(s) não finalizada(s) — as comissões delas não entram neste fechamento. Fechar mesmo assim ${formatarMoeda(totalGeral)} para ${resumos.length} professora(s)?`
          : `Fechar o período com ${formatarMoeda(totalGeral)} para ${resumos.length} professora(s)? Depois de fechado, correções de chamada desse período entram como ajuste no período seguinte.`,
      textoConfirmar: 'Fechar período',
      perigo: pendencias.length > 0,
    });
    if (!ok) return;

    try {
      await fecharPeriodo({ periodo, autorId: usuario.id });
      await carregar();
      mostrarToast('Período fechado.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  async function registrarPagamento(fechamento: FechamentoComissao) {
    if (!usuario) return;
    const ok = await confirmar({
      titulo: 'Registrar pagamento',
      mensagem: `Confirmar o pagamento de ${formatarMoeda(fechamento.totalGeral)} referente ao período de ${formatarDataBR(fechamento.dataInicio)} a ${formatarDataBR(fechamento.dataFim)}?`,
      textoConfirmar: 'Marcar como pago',
    });
    if (!ok) return;

    try {
      await marcarFechamentoComoPago({ fechamento, autorId: usuario.id });
      await carregar();
      mostrarToast('Pagamento registrado.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink first-letter:uppercase">
            Comissões de {nomeDoMes(periodo.mes)} de {periodo.ano}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Apuração de {formatarDataBR(periodo.dataInicio)} a {formatarDataBR(periodo.dataFim)} · pagamento até{' '}
            {formatarDataBR(dataPrevistaDePagamento(periodo))}.
          </p>
        </div>
        <Button onClick={fechar} disabled={resumos.length === 0}>
          Fechar período
        </Button>
      </div>

      {pendencias.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {pendencias.length} chamada(s) de aulas passadas ainda não finalizada(s)
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Enquanto a chamada não é finalizada, a comissão daquela aula não é gerada e fica de fora do fechamento.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {pendencias.map((pendencia) => (
              <li key={`${pendencia.sessaoId}-${pendencia.data}`} className="text-sm">
                <Link
                  to={`/administracao/chamada/${pendencia.sessaoId}/${pendencia.data}`}
                  className="font-medium text-primary-700 hover:text-primary-800"
                >
                  {formatarDataBR(pendencia.data)} · {pendencia.descricaoAula}
                </Link>
                <span className="text-amber-800">
                  {' '}
                  — {pendencia.professora}, {pendencia.alunas} aluna(s)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Professoras</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{resumos.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Aulas apuradas</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalDeAulas}</p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary-700">Total geral</p>
          <p className="mt-1 text-2xl font-semibold text-primary-900">{formatarMoeda(totalGeral)}</p>
        </div>
      </div>

      {resumos.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhuma comissão apurada neste período. Elas são geradas quando as chamadas são finalizadas.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {resumos.map((resumo) => (
            <li key={resumo.professoraId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{resumo.nome}</p>
                <p className="text-xs text-neutral-500">{resumo.aulas.length} aula(s) no período</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink">{formatarMoeda(resumo.total)}</span>
                <Button variante="fantasma" onClick={() => setDetalhando(resumo)}>
                  Detalhar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold text-ink">Fechamentos</h2>
      {fechamentos.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Nenhum período fechado ainda.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {fechamentos.map((fechamento) => (
            <li key={fechamento.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {formatarDataBR(fechamento.dataInicio)} a {formatarDataBR(fechamento.dataFim)}
                </p>
                <p className="text-xs text-neutral-500">
                  Fechado em {fechamento.dataFechamento ? formatarDataBR(fechamento.dataFechamento) : '—'}
                  {fechamento.dataPagamento ? ` · pago em ${formatarDataBR(fechamento.dataPagamento)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink">{formatarMoeda(fechamento.totalGeral)}</span>
                <Badge tom={fechamento.situacao === 'pago' ? 'sucesso' : 'aviso'}>
                  {fechamento.situacao === 'pago' ? 'Pago' : 'Fechado'}
                </Badge>
                {fechamento.situacao === 'fechado' && (
                  <Button variante="secundaria" onClick={() => registrarPagamento(fechamento)}>
                    Registrar pagamento
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {detalhando && (
        <Modal titulo={`Detalhamento — ${detalhando.nome}`} largura="larga" onFechar={() => setDetalhando(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              Aulas que compõem o valor do período, para conferência antes do pagamento.
            </p>
            <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
              {detalhando.aulas.map((aula) => (
                <li key={aula.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div>
                    <p className="text-sm text-ink">
                      {formatarDataBR(aula.dataAula)} · {aula.descricaoAula}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {aula.presencas} presença(s)
                      {aula.situacao === 'ajuste' ? ' · ajuste de período anterior' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-ink">{formatarMoeda(aula.valor)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
              <span className="text-sm font-medium text-ink">Total</span>
              <span className="text-base font-semibold text-ink">{formatarMoeda(detalhando.total)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
