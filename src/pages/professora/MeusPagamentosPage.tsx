import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSessao } from '../../hooks/useSessao';
import {
  categoriaVigenteNaData,
  comissoesEmAberto,
  dataPrevistaDePagamento,
  periodoAtual,
} from '../../hooks/comissoes';
import {
  chamadaRepositorio,
  comissaoRepositorio,
  fechamentoComissaoRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
} from '../../services/repositorios';
import type { Comissao, FechamentoComissao } from '../../types/domain';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarDataBR, hojeISO, nomeDoMes, ultimoDiaDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/creditos';

interface ComissaoDetalhada extends Comissao {
  descricaoAula: string;
  ehAjuste: boolean;
}

/**
 * Painel de ganhos da professora (RF-COM-05/09): aulas realizadas no
 * período, valor por aula vigente, total acumulado, quando o período
 * fecha e quando o pagamento cai.
 */
export function MeusPagamentosPage() {
  const { usuario } = useSessao();
  const [carregando, setCarregando] = useState(true);
  const [valorPorAula, setValorPorAula] = useState(0);
  const [doPeriodo, setDoPeriodo] = useState<ComissaoDetalhada[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoComissao[]>([]);
  const [pagas, setPagas] = useState<Comissao[]>([]);

  // `periodoAtual()` devolve um objeto novo a cada chamada. Sem memoizar,
  // ele entraria como dependência sempre diferente de `carregar`, que por
  // sua vez dispararia o efeito a cada render — um laço infinito de
  // requisições. O período do mês corrente não muda com a tela aberta.
  const periodo = useMemo(() => periodoAtual(), []);

  const carregar = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);

    const [professoras, comissoes, chamadas, ocorrencias, sessoes, modalidades, listaFechamentos] =
      await Promise.all([
        professoraRepositorio.listar(),
        comissaoRepositorio.listar(),
        chamadaRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        fechamentoComissaoRepositorio.listar(),
      ]);

    const minha = professoras.find((p) => p.usuarioId === usuario.id);
    if (!minha) {
      setCarregando(false);
      return;
    }

    const categoria = await categoriaVigenteNaData(minha.id, hojeISO());
    setValorPorAula(categoria?.valorPorAula ?? 0);

    const emAberto = await comissoesEmAberto(periodo);
    const descreverAula = (comissao: Comissao) => {
      const chamada = chamadas.find((c) => c.id === comissao.chamadaId);
      const ocorrencia = ocorrencias.find((o) => o.id === chamada?.ocorrenciaSessaoId);
      const sessao = sessoes.find((s) => s.id === ocorrencia?.sessaoId);
      const modalidade = modalidades.find((m) => m.id === sessao?.modalidadeId);
      return `${modalidade?.nome ?? 'Aula'} · ${sessao?.horarioInicio ?? ''}`;
    };

    setDoPeriodo(
      emAberto
        .filter((c) => c.professoraId === minha.id)
        .map((comissao) => ({
          ...comissao,
          descricaoAula: descreverAula(comissao),
          ehAjuste: comissao.situacao === 'ajuste',
        }))
        .sort((a, b) => b.dataAula.localeCompare(a.dataAula)),
    );

    setPagas(comissoes.filter((c) => c.professoraId === minha.id && c.periodoFechamentoId));
    setFechamentos(listaFechamentos.sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)));
    setCarregando(false);
  }, [usuario, periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;

  const total = doPeriodo.reduce((soma, comissao) => soma + comissao.valor, 0);
  const fechamentoDoPeriodo = ultimoDiaDoMes(periodo.ano, periodo.mes);

  function totalDoFechamento(fechamento: FechamentoComissao): number {
    return pagas.filter((c) => c.periodoFechamentoId === fechamento.id).reduce((soma, c) => soma + c.valor, 0);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Meus pagamentos</h1>
      <p className="mt-1 text-sm text-neutral-500 first-letter:uppercase">
        Período de {nomeDoMes(periodo.mes)} de {periodo.ano}.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Aulas no período</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">{doPeriodo.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Valor por aula</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">{formatarMoeda(valorPorAula)}</p>
          <p className="text-[10px] text-neutral-500 sm:text-xs">Categoria vigente</p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-primary-700 sm:text-xs">Total acumulado</p>
          <p className="mt-0.5 text-lg font-semibold text-primary-900 sm:mt-1 sm:text-2xl">{formatarMoeda(total)}</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600 shadow-sm">
        O período fecha em <span className="font-medium text-ink">{formatarDataBR(fechamentoDoPeriodo)}</span> e o
        pagamento é feito até <span className="font-medium text-ink">{formatarDataBR(dataPrevistaDePagamento(periodo))}</span>{' '}
        — quinto dia útil do mês seguinte.
      </p>

      <h2 className="mt-6 text-sm font-semibold text-ink">Aulas do período</h2>
      {doPeriodo.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          Nenhuma aula com chamada finalizada neste período ainda.
        </p>
      ) : (
        <Tabela
          rotulo="Comissões do período"
          itens={doPeriodo}
          chave={(item) => item.id}
          itensPorPagina={10}
          colunas={[
            { chave: 'data', rotulo: 'Data' },
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'valor', rotulo: 'Valor', alinhamento: 'direita' },
          ]}
          renderLinha={(item) => (
            <LinhaTabela key={item.id}>
              <CelulaTabela className="whitespace-nowrap font-medium text-ink">
                {formatarDataBR(item.dataAula)}
                {item.ehAjuste && (
                  <span className="ml-2">
                    <Badge tom="aviso">Ajuste</Badge>
                  </span>
                )}
              </CelulaTabela>
              <CelulaTabela>{item.descricaoAula}</CelulaTabela>
              <CelulaTabela alinhamento="direita">{formatarMoeda(item.valor)}</CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      <h2 className="mt-6 text-sm font-semibold text-ink">Fechamentos anteriores</h2>
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
                  {fechamento.dataPagamento
                    ? `Pago em ${formatarDataBR(fechamento.dataPagamento)}`
                    : 'Aguardando pagamento'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink">{formatarMoeda(totalDoFechamento(fechamento))}</span>
                <Badge tom={fechamento.situacao === 'pago' ? 'sucesso' : 'aviso'}>
                  {fechamento.situacao === 'pago' ? 'Pago' : 'Fechado'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
