import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { studioRepositorio } from '../../services/repositorios';
import { BotaoResetar } from '../BotaoResetar';
import type { PerfilAcesso } from '../../types/domain';

const ROTULO_PERFIL: Record<PerfilAcesso, string> = {
  administracao: 'Administração',
  professora: 'Professora',
  aluna: 'Aluna',
};

const NAV_POR_PERFIL: Record<PerfilAcesso, Array<{ to: string; label: string }>> = {
  administracao: [{ to: '/administracao', label: 'Painel' }],
  professora: [{ to: '/professora', label: 'Painel' }],
  aluna: [{ to: '/aluna', label: 'Painel' }],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, perfilAtivo, trocarPerfil, sair } = useSessao();
  const [nomeStudio, setNomeStudio] = useState('Studio');

  useEffect(() => {
    studioRepositorio.listar().then((lista) => {
      if (lista[0]) setNomeStudio(lista[0].nome);
    });
  }, []);

  const itensNav = perfilAtivo ? NAV_POR_PERFIL[perfilAtivo] : [];
  const outrosPerfis = usuario?.perfis.filter((p) => p !== perfilAtivo) ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">{nomeStudio}</span>
          {perfilAtivo && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {ROTULO_PERFIL[perfilAtivo]}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outrosPerfis.map((perfil) => (
            <button
              key={perfil}
              onClick={() => trocarPerfil(perfil)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Ver como {ROTULO_PERFIL[perfil]}
            </button>
          ))}
          <BotaoResetar />
          {usuario && (
            <button
              onClick={sair}
              className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        {itensNav.length > 0 && (
          <nav className="order-2 flex justify-around border-t border-slate-200 bg-white sm:order-1 sm:w-48 sm:flex-col sm:justify-start sm:gap-1 sm:border-t-0 sm:border-r sm:p-3">
            {itensNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 px-4 py-3 text-center text-sm font-medium sm:flex-none sm:rounded-md sm:text-left sm:px-3 sm:py-2 ${
                    isActive ? 'text-indigo-700 sm:bg-indigo-50' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <main className="order-1 flex-1 p-4 sm:order-2 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
