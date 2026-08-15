import { Link } from 'react-router-dom';

const CARTOES = [
  { to: '/administracao/modalidades', titulo: 'Modalidades', descricao: 'Nome, capacidade máxima e situação.' },
  { to: '/administracao/espacos', titulo: 'Espaços', descricao: 'Cadastro opcional de espaços do studio.' },
  { to: '/administracao/studio', titulo: 'Studio e horário', descricao: 'Dados do studio e dias/faixa de funcionamento.' },
  { to: '/administracao/parametros', titulo: 'Parâmetros operacionais', descricao: 'Janelas de agendamento, antecedências, multa, juros e mais.' },
  { to: '/administracao/professoras', titulo: 'Professoras', descricao: 'Cadastro, categoria vigente e histórico.' },
  { to: '/administracao/categorias', titulo: 'Categorias de professora', descricao: 'Nome e valor por aula.' },
];

export function AdministracaoHome() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Base do studio</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Base para tudo que vem nas próximas fases: grade, alunas, agendamento e financeiro dependem destes cadastros.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARTOES.map((cartao) => (
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
    </div>
  );
}
