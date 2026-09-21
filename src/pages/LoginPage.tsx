import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usuarioRepositorio } from '../services/repositorios';
import { useSessao } from '../hooks/useSessao';
import type { PerfilAcesso, Usuario } from '../types/domain';

const ROTULO_PERFIL: Record<PerfilAcesso, string> = {
  administracao: 'Administração',
  professora: 'Professora',
  aluna: 'Aluna',
};

const ROTA_PERFIL: Record<PerfilAcesso, string> = {
  administracao: '/administracao',
  professora: '/professora',
  aluna: '/aluna',
};

export function LoginPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { entrarComo } = useSessao();
  const navegar = useNavigate();

  useEffect(() => {
    usuarioRepositorio.listar().then((lista) => {
      setUsuarios(lista);
      setCarregando(false);
    });
  }, []);

  function acessar(usuario: Usuario, perfil: PerfilAcesso) {
    entrarComo(usuario, perfil);
    navegar(ROTA_PERFIL[perfil]);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-700 text-base font-bold text-white">
            M
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Studio MUV</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ambiente de demonstração, sem senha real. Escolha uma usuária de exemplo e o perfil para entrar.
          </p>
        </div>

        {carregando && <p className="text-center text-sm text-neutral-500">Carregando usuárias de exemplo…</p>}

        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-center text-sm text-neutral-600 shadow-sm">
          <p>
            Quer simular uma matrícula pelo site?{' '}
            <Link to="/matricula" className="font-medium text-primary-700 hover:text-primary-800">
              Abrir a matrícula pública
            </Link>
          </p>
          <p>
            Quer experimentar antes de contratar?{' '}
            <Link to="/experimental" className="font-medium text-primary-700 hover:text-primary-800">
              Agendar aula experimental
            </Link>
          </p>
          <p className="border-t border-neutral-100 pt-2">
            Primeira vez por aqui?{' '}
            <Link to="/guia" className="font-medium text-primary-700 hover:text-primary-800">
              Ver o guia de como usar o protótipo
            </Link>
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {usuarios.map((usuario) => (
            <li key={usuario.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-ink">{usuario.nome}</p>
              <p className="text-xs text-neutral-500">{usuario.email}</p>
              {usuario.situacao === 'aguardando_aceite' && (
                <p className="mt-1 text-xs font-medium text-amber-600">Aguardando aceite do termo</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {usuario.perfis.map((perfil) => (
                  <button
                    key={perfil}
                    onClick={() => acessar(usuario, perfil)}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                  >
                    Entrar como {ROTULO_PERFIL[perfil]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
