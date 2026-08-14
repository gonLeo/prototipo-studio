import { NavLink, Outlet } from 'react-router-dom';

const ABAS = [
  { to: '/administracao', label: 'Visão geral', fim: true },
  { to: '/administracao/modalidades', label: 'Modalidades' },
  { to: '/administracao/espacos', label: 'Espaços' },
  { to: '/administracao/studio', label: 'Studio e horário' },
  { to: '/administracao/parametros', label: 'Parâmetros' },
  { to: '/administracao/professoras', label: 'Professoras' },
  { to: '/administracao/categorias', label: 'Categorias' },
];

export function AdministracaoLayout() {
  return (
    <div className="flex flex-col gap-5">
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {ABAS.map((aba) => (
          <NavLink
            key={aba.to}
            to={aba.to}
            end={aba.fim}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {aba.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
