import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Studio MUV — protótipo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ambiente de demonstração, sem senha real. Escolha uma usuária de exemplo e o perfil para entrar.
        </p>
      </div>

      {carregando && <p className="text-sm text-slate-500">Carregando usuárias de exemplo…</p>}

      <ul className="flex flex-col gap-3">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-900">{usuario.nome}</p>
            <p className="text-xs text-slate-500">{usuario.email}</p>
            {usuario.situacao === 'aguardando_aceite' && (
              <p className="mt-1 text-xs font-medium text-amber-600">Aguardando aceite do termo</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {usuario.perfis.map((perfil) => (
                <button
                  key={perfil}
                  onClick={() => acessar(usuario, perfil)}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Entrar como {ROTULO_PERFIL[perfil]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
