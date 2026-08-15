import { Link } from 'react-router-dom';

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

export function AdministracaoHome() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Administração</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Visão geral</h1>
      <p className="mt-1 text-sm text-neutral-500">
        A grade e o calendário de exceções operam o dia a dia; a configuração sustenta tudo que vem nas próximas
        fases — alunas, agendamento e financeiro dependem destes cadastros.
      </p>

      <GrupoDeCartoes titulo="Operação" cartoes={CARTOES_OPERACAO} />
      <GrupoDeCartoes titulo="Configuração" cartoes={CARTOES} />
    </div>
  );
}
