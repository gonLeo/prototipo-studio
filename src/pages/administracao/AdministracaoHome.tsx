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
      <h1 className="text-lg font-semibold text-slate-900">Configuração do studio</h1>
      <p className="mt-1 text-sm text-slate-500">
        Base para tudo que vem nas próximas fases: grade, alunas, agendamento e financeiro dependem destes cadastros.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARTOES.map((cartao) => (
          <Link
            key={cartao.to}
            to={cartao.to}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <p className="text-sm font-medium text-slate-900">{cartao.titulo}</p>
            <p className="mt-1 text-xs text-slate-500">{cartao.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
