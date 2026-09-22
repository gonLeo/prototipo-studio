import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaProfessora } from '../../hooks/useAgendaDaProfessora';
import {
  categoriaVigenteNaData,
  comissoesEmAberto,
  dataPrevistaDePagamento,
  periodoAtual,
} from '../../hooks/comissoes';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { CartaoDeAula } from '../../components/ui/CartaoDeAula';
import { formatarDataBR, hojeISO, nomeDoMes, ultimoDiaDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/creditos';

/**
 * Painel da professora (RF-PNL-04): as aulas de hoje e o resumo do período
 * — quantas aulas já entraram, quanto vale cada uma pela categoria
 * vigente, o total acumulado, quando o período fecha e quando o pagamento
 * cai.
 */
export function PainelProfessoraPage() {
  const { usuario } = useSessao();
  const { professora, aulas, pendentes, carregando } = useAgendaDaProfessora(usuario?.id);

  const [valorPorAula, setValorPorAula] = useState(0);
  const [aulasNoPeriodo, setAulasNoPeriodo] = useState(0);
  const [totalAcumulado, setTotalAcumulado] = useState(0);
  const [carregandoGanhos, setCarregandoGanhos] = useState(true);

  const periodo = useMemo(() => periodoAtual(), []);
  const hoje = useMemo(() => hojeISO(), []);

  const carregarGanhos = useCallback(async () => {
    if (!professora) return;
    setCarregandoGanhos(true);

    const [categoria, emAberto] = await Promise.all([
      categoriaVigenteNaData(professora.id, hoje),
      comissoesEmAberto(periodo),
    ]);
    const minhas = emAberto.filter((c) => c.professoraId === professora.id);

    setValorPorAula(categoria?.valorPorAula ?? 0);
    setAulasNoPeriodo(minhas.length);
    setTotalAcumulado(minhas.reduce((soma, comissao) => soma + comissao.valor, 0));
    setCarregandoGanhos(false);
  }, [professora, periodo, hoje]);

  useEffect(() => {
    carregarGanhos();
  }, [carregarGanhos]);

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;

  if (!professora) {
    return (
      <p className="text-sm text-neutral-500">
        Seu usuário não tem cadastro de professora vinculado. Fale com a administração.
      </p>
    );
  }

  const aulasDeHoje = aulas.filter((aula) => aula.data === hoje);
  // As de hoje já aparecem em cartão acima; a tabela olha para frente.
  const proximasAulas = aulas.filter((aula) => aula.data > hoje && !aula.cancelada);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario?.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Suas aulas de hoje e o resumo do período ficam sempre por aqui.
      </p>

      {pendentes.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {pendentes.length} chamada(s) de aulas passadas ainda sem finalizar
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {pendentes.map((aula) => (
              <li key={`${aula.sessao.id}-${aula.data}`} className="text-sm">
                <Link
                  to={`/professora/chamada/${aula.sessao.id}/${aula.data}`}
                  className="font-medium text-primary-700 hover:text-primary-800"
                >
                  {formatarDataBR(aula.data)} · {aula.nomeModalidade} · {aula.sessao.horarioInicio}
                </Link>
                <span className="text-amber-800"> — {aula.ocupacao} aluna(s)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Aulas no período</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">
            {carregandoGanhos ? '—' : aulasNoPeriodo}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">Valor por aula</p>
          <p className="mt-0.5 text-lg font-semibold text-ink sm:mt-1 sm:text-2xl">
            {carregandoGanhos ? '—' : formatarMoeda(valorPorAula)}
          </p>
          <p className="text-[10px] text-neutral-500 sm:text-xs">Categoria vigente</p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 shadow-sm sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-primary-700 sm:text-xs">Total acumulado</p>
          <p className="mt-0.5 text-lg font-semibold text-primary-900 sm:mt-1 sm:text-2xl">
            {carregandoGanhos ? '—' : formatarMoeda(totalAcumulado)}
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600 shadow-sm first-letter:uppercase">
        {nomeDoMes(periodo.mes)} de {periodo.ano} fecha em{' '}
        <span className="font-medium text-ink">{formatarDataBR(ultimoDiaDoMes(periodo.ano, periodo.mes))}</span> e o
        pagamento é feito até{' '}
        <span className="font-medium text-ink">{formatarDataBR(dataPrevistaDePagamento(periodo))}</span>.{' '}
        <Link to="/professora/pagamentos" className="font-medium text-primary-700 hover:text-primary-800">
          Ver detalhamento
        </Link>
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Aulas de hoje</h2>
        <Link to="/professora/aulas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
          Ver agenda completa →
        </Link>
      </div>

      {aulasDeHoje.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Nenhuma aula sua hoje.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {aulasDeHoje.map((aula) => (
            <CartaoDeAula
              key={`${aula.sessao.id}-${aula.data}`}
              titulo={aula.nomeModalidade}
              subtitulo={aula.nomeEspaco}
              etiqueta={aula.substituindo ? 'Substituindo' : undefined}
              horario={`${aula.sessao.horarioInicio}–${aula.sessao.horarioFim}`}
              detalhe={`${aula.ocupacao}/${aula.sessao.capacidade} alunas`}
              esmaecido={aula.cancelada}
              aviso={aula.cancelada ? aula.motivoCancelamento : undefined}
              acao={
                aula.cancelada ? undefined : (
                  <Link
                    to={`/professora/chamada/${aula.sessao.id}/${aula.data}`}
                    className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    {aula.chamadaFinalizada ? 'Ver chamada' : 'Fazer chamada'}
                  </Link>
                )
              }
            />
          ))}
        </ul>
      )}

      {aulasDeHoje.some((aula) => aula.solicitacao) && (
        <p className="mt-3 text-xs text-neutral-500">
          <Badge tom="aviso">Atenção</Badge> Há aula de hoje com solicitação de cancelamento — acompanhe a situação
          na agenda.
        </p>
      )}

      {/* RF-PNL-04 + RF-PRE-09: saber quem vem antes da aula é o que
          permite chegar preparada — e abrir a ficha de quem ela não
          conhece sem caçar o nome na lista de alunas. */}
      <h2 className="mt-8 text-sm font-semibold text-ink">Próximas aulas</h2>
      {proximasAulas.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Nenhuma aula sua nos próximos dias.
        </p>
      ) : (
        <Tabela
          rotulo="Próximas aulas com alunas agendadas"
          itens={proximasAulas}
          chave={(aula) => `${aula.sessao.id}-${aula.data}`}
          itensPorPagina={5}
          colunas={[
            { chave: 'quando', rotulo: 'Quando' },
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'alunas', rotulo: 'Alunas agendadas' },
          ]}
          renderLinha={(aula) => (
            <LinhaTabela key={`${aula.sessao.id}-${aula.data}`}>
              <CelulaTabela className="whitespace-nowrap">
                <p className="font-medium text-ink">{formatarDataBR(aula.data)}</p>
                <p className="text-xs text-neutral-500">
                  {aula.sessao.horarioInicio}–{aula.sessao.horarioFim}
                </p>
              </CelulaTabela>
              <CelulaTabela>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{aula.nomeModalidade}</span>
                  {aula.substituindo && <Badge tom="info">Substituindo</Badge>}
                </span>
                <span className="block text-xs text-neutral-500">
                  {aula.ocupacao}/{aula.sessao.capacidade} vagas ocupadas
                  {aula.nomeEspaco ? ` · ${aula.nomeEspaco}` : ''}
                </span>
              </CelulaTabela>
              <CelulaTabela>
                {aula.alunas.length === 0 ? (
                  <span className="text-sm text-neutral-500">Ninguém agendada ainda</span>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {aula.alunas.map((aluna) => (
                      <li key={aluna.alunaId} className="text-sm">
                        <Link
                          to={`/professora/alunas/${aluna.alunaId}`}
                          className="text-primary-700 hover:text-primary-800 hover:underline"
                        >
                          {aluna.nome}
                        </Link>
                        {aluna.experimental && <span className="ml-1 text-xs text-primary-700">· experimental</span>}
                        {aluna.convenio && <span className="ml-1 text-xs text-neutral-500">· convênio</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}
    </div>
  );
}
