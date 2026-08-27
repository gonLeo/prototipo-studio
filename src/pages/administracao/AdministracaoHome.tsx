import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  indicadoresAdministrativos,
  ocupacaoDasSessoes,
  pendenciasDeAcao,
} from '../../hooks/indicadores';
import type { IndicadoresAdministrativos, OcupacaoDaSessao, PendenciasDeAcao } from '../../hooks/indicadores';
import { periodoAtual } from '../../hooks/comissoes';
import { Badge } from '../../components/ui/Badge';
import { formatarDataBR, nomeDoMes } from '../../utils/data';
import { formatarMoeda } from '../../utils/creditos';

const CARTOES_OPERACAO = [
  { to: '/administracao/alunas', titulo: 'Alunas', descricao: 'Cadastro, pacote, saldo, bolsa e ficha completa.' },
  { to: '/administracao/grade', titulo: 'Grade de horários', descricao: 'Sessões recorrentes, conflitos e ocupação.' },
  { to: '/administracao/excecoes', titulo: 'Calendário de exceções', descricao: 'Feriados, recessos e fechamentos.' },
  {
    to: '/administracao/justificativas',
    titulo: 'Justificativas de falta',
    descricao: 'Fila de análise: aprovar devolve o crédito à aluna.',
  },
  {
    to: '/administracao/solicitacoes',
    titulo: 'Solicitações de cancelamento',
    descricao: 'Pedidos das professoras: designar substituta ou cancelar.',
  },
  {
    to: '/administracao/vendas',
    titulo: 'Cobranças',
    descricao: 'Recebido, a receber, falhas e atrasos — com retentativa e baixa manual.',
  },
  {
    to: '/administracao/comissoes',
    titulo: 'Comissões',
    descricao: 'Apuração do período, fechamento e registro de pagamento.',
  },
  {
    to: '/administracao/experimentais',
    titulo: 'Aulas experimentais',
    descricao: 'Aulas do período, valor arrecadado e taxa de conversão em matrícula.',
  },
  {
    to: '/administracao/convenios',
    titulo: 'Convênios',
    descricao: 'Grade espelhada, reservas, check-ins e conferência do repasse.',
  },
];

const CARTOES = [
  { to: '/administracao/pacotes', titulo: 'Pacotes', descricao: 'Aulas por ciclo, valor mensal e duração.' },
  { to: '/administracao/termos', titulo: 'Termo de aceite', descricao: 'Versões publicadas e quem aceitou cada uma.' },
  { to: '/administracao/modalidades', titulo: 'Modalidades', descricao: 'Nome, capacidade máxima e situação.' },
  { to: '/administracao/espacos', titulo: 'Espaços', descricao: 'Cadastro opcional de espaços do studio.' },
  { to: '/administracao/studio', titulo: 'Studio e horário', descricao: 'Dados do studio e dias/faixa de funcionamento.' },
  { to: '/administracao/parametros', titulo: 'Parâmetros operacionais', descricao: 'Janelas de agendamento, antecedências, multa, juros e mais.' },
  { to: '/administracao/professoras', titulo: 'Professoras', descricao: 'Cadastro, categoria vigente e histórico.' },
  { to: '/administracao/categorias', titulo: 'Categorias de professora', descricao: 'Nome e valor por aula.' },
  { to: '/administracao/notificacoes', titulo: 'Notificações', descricao: 'Registro de tudo que foi disparado, por evento e canal.' },
  { to: '/administracao/auditoria', titulo: 'Trilha de auditoria', descricao: 'Quem alterou carteira, créditos, situação financeira, chamada ou comissão.' },
];

function GrupoDeCartoes({ titulo, cartoes }: { titulo: string; cartoes: typeof CARTOES }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cartoes.map((cartao) => (
          <Link
            key={cartao.to}
            to={cartao.to}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/40"
          >
            <p className="text-sm font-semibold text-ink">{cartao.titulo}</p>
            <p className="mt-1 text-xs text-neutral-500">{cartao.descricao}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CartaoDePendencia({ to, rotulo, quantidade }: { to: string; rotulo: string; quantidade: number }) {
  const temPendencia = quantidade > 0;
  return (
    <Link
      to={to}
      className={`rounded-xl border p-4 shadow-sm transition-colors ${
        temPendencia
          ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
          : 'border-neutral-200 bg-white hover:bg-neutral-50'
      }`}
    >
      <p className={`text-2xl font-semibold ${temPendencia ? 'text-amber-900' : 'text-neutral-400'}`}>
        {quantidade}
      </p>
      <p className={`mt-0.5 text-xs ${temPendencia ? 'text-amber-800' : 'text-neutral-500'}`}>{rotulo}</p>
    </Link>
  );
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{valor}</p>
      {detalhe && <p className="text-xs text-neutral-500">{detalhe}</p>}
    </div>
  );
}

/**
 * Painel administrativo (RF-PNL-01/02/03).
 *
 * Abre pelo bloco de pendências, e não pelos indicadores: por decisão de UX
 * do escopo, a primeira informação da tela é o que exige ação agora, para
 * que solicitação e justificativa não fiquem esperando.
 */
export function AdministracaoHome() {
  const [pendencias, setPendencias] = useState<PendenciasDeAcao>();
  const [indicadores, setIndicadores] = useState<IndicadoresAdministrativos>();
  const [ocupacao, setOcupacao] = useState<OcupacaoDaSessao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // `periodoAtual()` cria um objeto novo a cada chamada: sem memoizar, o
  // efeito de carregamento entraria em laço.
  const periodo = useMemo(() => periodoAtual(), []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [listaPendencias, listaIndicadores, listaOcupacao] = await Promise.all([
      pendenciasDeAcao(),
      indicadoresAdministrativos(periodo),
      ocupacaoDasSessoes(),
    ]);
    setPendencias(listaPendencias);
    setIndicadores(listaIndicadores);
    setOcupacao(listaOcupacao);
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const lotadas = ocupacao.filter((o) => o.faixa === 'lotada');
  const baixaProcura = ocupacao.filter((o) => o.faixa === 'baixa' && o.ocorrenciasAnalisadas > 0);

  return (
    <div className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Administração</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Painel</h1>
      <p className="mt-1 text-sm text-neutral-500 first-letter:uppercase">
        {nomeDoMes(periodo.mes)} de {periodo.ano} · o que precisa de ação vem primeiro.
      </p>

      {carregando || !pendencias || !indicadores ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : (
        <>
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Pendências</h2>
              <Badge tom={pendencias.total > 0 ? 'aviso' : 'sucesso'}>
                {pendencias.total > 0 ? `${pendencias.total} item(ns)` : 'Tudo em dia'}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CartaoDePendencia
                to="/administracao/solicitacoes"
                rotulo="Solicitações de cancelamento"
                quantidade={pendencias.solicitacoesDeCancelamento}
              />
              <CartaoDePendencia
                to="/administracao/justificativas"
                rotulo="Justificativas a analisar"
                quantidade={pendencias.justificativas}
              />
              <CartaoDePendencia
                to="/administracao/comissoes"
                rotulo="Chamadas não finalizadas"
                quantidade={pendencias.chamadasNaoFinalizadas}
              />
              <CartaoDePendencia
                to="/administracao/vendas"
                rotulo="Vendas aguardando pagamento"
                quantidade={pendencias.vendasPendentes}
              />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-ink">Indicadores do período</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Indicador
                rotulo="Alunas com pacote ativo"
                valor={String(indicadores.alunasComPacoteAtivo)}
                detalhe={`${indicadores.alunasSemPacoteAtivo} sem pacote · ${indicadores.alunasBolsistas} bolsista(s)`}
              />
              <Indicador
                rotulo="Receita confirmada"
                valor={formatarMoeda(indicadores.receitaConfirmada)}
                detalhe={`${formatarMoeda(indicadores.receitaPendente)} aguardando pagamento`}
              />
              <Indicador rotulo="Aulas realizadas" valor={String(indicadores.aulasRealizadas)} />
              <Indicador rotulo="Comissão gerada" valor={formatarMoeda(indicadores.comissaoGerada)} />
              <Indicador
                rotulo="Créditos em circulação"
                valor={String(indicadores.creditosEmCirculacao.disponiveis)}
                detalhe={`${indicadores.creditosEmCirculacao.reservados} reservados · ${indicadores.creditosEmCirculacao.utilizados} utilizados`}
              />
              <Indicador
                rotulo="Pacotes a vencer"
                valor={String(indicadores.pacotesAVencer.length)}
                detalhe="Poucos créditos ou validade próxima"
              />
              <Indicador
                rotulo="Turmas lotadas"
                valor={String(lotadas.length)}
                detalhe={`${baixaProcura.length} com baixa procura`}
              />
            </div>

            {indicadores.pacotesAVencer.length > 0 && (
              <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                {indicadores.pacotesAVencer.map((item) => (
                  <li
                    key={item.carteiraId}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                  >
                    <Link
                      to={`/administracao/alunas/${item.alunaId}`}
                      className="font-medium text-primary-700 hover:text-primary-800"
                    >
                      {item.nomeAluna}
                    </Link>
                    <span className="text-neutral-500">
                      {item.motivo === 'poucos_creditos'
                        ? `${item.creditosDisponiveis} crédito(s) restante(s)`
                        : `Vence em ${formatarDataBR(item.dataValidade)} · ${item.diasRestantes} dia(s)`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-ink">Ocupação das sessões</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Média de alunas por aula nos próximos 30 dias. Turma lotada é candidata a nova turma; baixa procura é
              horário a promover.
            </p>

            {ocupacao.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">Nenhuma sessão ativa na grade.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {ocupacao.map((item) => (
                  <li
                    key={item.sessaoId}
                    className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {item.modalidade} · {item.horario}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {item.professora} · média de {item.mediaDeAlunas} de {item.capacidade} vagas
                        </p>
                      </div>
                      <Badge
                        tom={item.faixa === 'lotada' ? 'erro' : item.faixa === 'baixa' ? 'aviso' : 'sucesso'}
                      >
                        {item.faixa === 'lotada'
                          ? 'Lotada'
                          : item.faixa === 'baixa'
                            ? 'Baixa procura'
                            : 'Saudável'}
                        {' · '}
                        {item.percentual}%
                      </Badge>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${
                          item.faixa === 'lotada'
                            ? 'bg-rose-500'
                            : item.faixa === 'baixa'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentual)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <GrupoDeCartoes titulo="Operação" cartoes={CARTOES_OPERACAO} />
      <GrupoDeCartoes titulo="Configuração" cartoes={CARTOES} />
    </div>
  );
}
