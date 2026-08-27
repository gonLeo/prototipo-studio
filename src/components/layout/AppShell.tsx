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

interface ItemNav {
  to: string;
  label: string;
  fim?: boolean;
}

interface GrupoNav {
  titulo?: string;
  itens: ItemNav[];
}

const NAV_POR_PERFIL: Record<PerfilAcesso, GrupoNav[]> = {
  administracao: [
    { itens: [{ to: '/administracao', label: 'Visão geral', fim: true }] },
    {
      titulo: 'Operação',
      itens: [
        { to: '/administracao/alunas', label: 'Alunas' },
        { to: '/administracao/grade', label: 'Grade de horários' },
        { to: '/administracao/excecoes', label: 'Exceções' },
        { to: '/administracao/justificativas', label: 'Justificativas' },
        { to: '/administracao/solicitacoes', label: 'Solicitações' },
        { to: '/administracao/vendas', label: 'Vendas' },
        { to: '/administracao/comissoes', label: 'Comissões' },
        { to: '/administracao/experimentais', label: 'Experimentais' },
        { to: '/administracao/convenios', label: 'Convênios' },
      ],
    },
    {
      titulo: 'Configuração',
      itens: [
        { to: '/administracao/pacotes', label: 'Pacotes' },
        { to: '/administracao/categorias-aula', label: 'Categorias de aula' },
        { to: '/administracao/modalidades', label: 'Modalidades' },
        { to: '/administracao/espacos', label: 'Espaços' },
        { to: '/administracao/studio', label: 'Studio e horário' },
        { to: '/administracao/parametros', label: 'Parâmetros' },
        { to: '/administracao/professoras', label: 'Professoras' },
        { to: '/administracao/categorias', label: 'Categorias de professora' },
        { to: '/administracao/termos', label: 'Termo de aceite' },
        { to: '/administracao/notificacoes', label: 'Notificações' },
        { to: '/administracao/auditoria', label: 'Auditoria' },
      ],
    },
  ],
  professora: [
    {
      itens: [
        { to: '/professora', label: 'Painel', fim: true },
        { to: '/professora/aulas', label: 'Minhas aulas' },
        { to: '/professora/pagamentos', label: 'Meus pagamentos' },
      ],
    },
  ],
  aluna: [
    {
      itens: [
        { to: '/aluna', label: 'Painel', fim: true },
        { to: '/aluna/grade', label: 'Grade disponível' },
        { to: '/aluna/minhas-aulas', label: 'Minhas aulas' },
      ],
    },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, perfilAtivo, trocarPerfil, sair } = useSessao();
  const [nomeStudio, setNomeStudio] = useState('Studio');

  useEffect(() => {
    studioRepositorio.listar().then((lista) => {
      if (lista[0]) setNomeStudio(lista[0].nome);
    });
  }, []);

  // Enquanto o termo não é aceito, a aluna só tem o painel — é lá que ela
  // conclui o aceite e o pagamento (RF-ALU-08).
  const aguardandoAceite = usuario?.situacao === 'aguardando_aceite';
  const gruposNav = !perfilAtivo
    ? []
    : perfilAtivo === 'aluna' && aguardandoAceite
      ? [{ itens: [{ to: '/aluna', label: 'Painel', fim: true }] }]
      : NAV_POR_PERFIL[perfilAtivo];
  const outrosPerfis = usuario?.perfis.filter((p) => p !== perfilAtivo) ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-700 text-xs font-bold text-white">
            {nomeStudio.charAt(0)}
          </span>
          <span className="text-sm font-semibold text-ink">{nomeStudio}</span>
          {perfilAtivo && (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-100">
              {ROTULO_PERFIL[perfilAtivo]}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outrosPerfis.map((perfil) => (
            <button
              key={perfil}
              onClick={() => trocarPerfil(perfil)}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Ver como {ROTULO_PERFIL[perfil]}
            </button>
          ))}
          <BotaoResetar />
          {usuario && (
            <button
              onClick={sair}
              className="rounded-md px-3 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        {gruposNav.length > 0 && (
          <nav className="order-2 flex gap-1 overflow-x-auto border-t border-neutral-200 bg-white px-2 py-1.5 sm:order-1 sm:w-52 sm:flex-col sm:justify-start sm:gap-0.5 sm:overflow-visible sm:border-t-0 sm:border-r sm:px-3 sm:py-4">
            {gruposNav.map((grupo, indice) => (
              <div key={grupo.titulo ?? indice} className="flex shrink-0 gap-1 sm:mt-1 sm:flex-col sm:gap-0.5">
                {grupo.titulo && (
                  <p className="hidden px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 sm:block">
                    {grupo.titulo}
                  </p>
                )}
                {grupo.itens.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.fim}
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-center text-sm sm:text-left ${
                        isActive
                          ? 'bg-primary-50 font-semibold text-primary-800'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        )}

        <main className="order-1 flex-1 bg-neutral-50 p-4 sm:order-2 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
