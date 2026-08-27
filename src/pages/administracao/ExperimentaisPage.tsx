import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { relatorioDeConversao } from '../../hooks/aulasExperimentais';
import type { RelatorioDeConversao } from '../../hooks/aulasExperimentais';
import { periodoAtual } from '../../hooks/comissoes';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarDataBR, nomeDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/creditos';

/**
 * Aulas experimentais do período e taxa de conversão em matrícula
 * (RF-EXP-08). A conversão é contada quando a interessada passou a ter
 * comprou um pacote a partir da data da aula que fez.
 */
export function ExperimentaisPage() {
  const [relatorio, setRelatorio] = useState<RelatorioDeConversao>();
  const [carregando, setCarregando] = useState(true);

  // Memoizado porque `periodoAtual()` devolve objeto novo a cada chamada e
  // entraria como dependência instável do efeito de carregamento.
  const periodo = useMemo(() => periodoAtual(), []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setRelatorio(await relatorioDeConversao({ dataInicio: periodo.dataInicio, dataFim: periodo.dataFim }));
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink first-letter:uppercase">
        Aulas experimentais de {nomeDoMes(periodo.mes)} de {periodo.ano}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Período de {formatarDataBR(periodo.dataInicio)} a {formatarDataBR(periodo.dataFim)}. A interessada agenda pela
        grade pública e paga antes de a vaga ser confirmada.
      </p>

      {carregando || !relatorio ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Aulas no período</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{relatorio.total}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Convertidas</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{relatorio.convertidas}</p>
            </div>
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-primary-700">Taxa de conversão</p>
              <p className="mt-1 text-2xl font-semibold text-primary-900">{relatorio.taxaDeConversao}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Arrecadado</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{formatarMoeda(relatorio.valorArrecadado)}</p>
            </div>
          </div>

          {relatorio.aulas.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              Nenhuma aula experimental neste período. O link público fica em <code>/experimental</code> e também
              aparece na tela de login do protótipo.
            </p>
          ) : (
            <Tabela
              rotulo="Aulas experimentais do período"
              itens={relatorio.aulas}
              chave={(item) => item.agendamentoId}
              busca={{
                placeholder: 'Buscar por interessada',
                corresponde: (item, termo) => item.nomeAluna.toLowerCase().includes(termo),
              }}
              colunas={[
                { chave: 'aluna', rotulo: 'Interessada' },
                { chave: 'aula', rotulo: 'Aula' },
                { chave: 'situacao', rotulo: 'Situação' },
                { chave: 'conversao', rotulo: 'Conversão' },
              ]}
              renderLinha={(item) => (
                <LinhaTabela key={item.agendamentoId}>
                  <CelulaTabela>
                    <Link
                      to={`/administracao/alunas/${item.alunaId}`}
                      className="font-medium text-primary-700 hover:text-primary-800"
                    >
                      {item.nomeAluna}
                    </Link>
                  </CelulaTabela>
                  <CelulaTabela>
                    <p>{item.modalidade}</p>
                    <p className="text-xs text-neutral-500">{formatarDataBR(item.data)}</p>
                  </CelulaTabela>
                  <CelulaTabela>
                    <Badge tom={item.situacao === 'realizado' ? 'sucesso' : 'info'}>
                      {item.situacao === 'realizado' ? 'Realizada' : 'Agendada'}
                    </Badge>
                  </CelulaTabela>
                  <CelulaTabela>
                    {item.converteu ? (
                      <span className="text-sm text-emerald-700">
                        Matriculada em {item.dataContratacao ? formatarDataBR(item.dataContratacao) : '—'}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-500">Ainda não comprou pacote</span>
                    )}
                  </CelulaTabela>
                </LinhaTabela>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}
