import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PerfilAcesso, Usuario } from '../types/domain';
import { usuarioRepositorio } from '../services/repositorios';

const CHAVE_SESSAO = 'muv:sessao';

interface SessaoPersistida {
  usuarioId: string;
  perfilAtivo: PerfilAcesso;
}

interface SessaoContexto {
  usuario: Usuario | undefined;
  perfilAtivo: PerfilAcesso | undefined;
  carregando: boolean;
  entrarComo: (usuario: Usuario, perfil: PerfilAcesso) => void;
  trocarPerfil: (perfil: PerfilAcesso) => void;
  sair: () => void;
}

const SessaoContext = createContext<SessaoContexto | undefined>(undefined);

/**
 * Simula autenticação/perfis (RF-PER-01 a RF-PER-04) sem backend real:
 * a "entrada" escolhe um usuário do backfill e um dos perfis vinculados a
 * ele, sem senha. Não é uma trilha de autenticação real — o protótipo não
 * implementa segurança de acesso, apenas a navegação por perfil.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | undefined>(undefined);
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilAcesso | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) {
      setCarregando(false);
      return;
    }

    const persistida = JSON.parse(bruto) as SessaoPersistida;
    usuarioRepositorio
      .buscarPorId(persistida.usuarioId)
      .then((encontrado) => {
        if (encontrado && encontrado.perfis.includes(persistida.perfilAtivo)) {
          setUsuario(encontrado);
          setPerfilAtivo(persistida.perfilAtivo);
        } else {
          localStorage.removeItem(CHAVE_SESSAO);
        }
      })
      .finally(() => setCarregando(false));
  }, []);

  const entrarComo = useCallback((usuarioSelecionado: Usuario, perfil: PerfilAcesso) => {
    setUsuario(usuarioSelecionado);
    setPerfilAtivo(perfil);
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ usuarioId: usuarioSelecionado.id, perfilAtivo: perfil } satisfies SessaoPersistida),
    );
  }, []);

  const trocarPerfil = useCallback(
    (perfil: PerfilAcesso) => {
      if (!usuario || !usuario.perfis.includes(perfil)) return;
      setPerfilAtivo(perfil);
      localStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({ usuarioId: usuario.id, perfilAtivo: perfil } satisfies SessaoPersistida),
      );
    },
    [usuario],
  );

  const sair = useCallback(() => {
    setUsuario(undefined);
    setPerfilAtivo(undefined);
    localStorage.removeItem(CHAVE_SESSAO);
  }, []);

  const valor = useMemo(
    () => ({ usuario, perfilAtivo, carregando, entrarComo, trocarPerfil, sair }),
    [usuario, perfilAtivo, carregando, entrarComo, trocarPerfil, sair],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const contexto = useContext(SessaoContext);
  if (!contexto) {
    throw new Error('useSessao deve ser usado dentro de <SessaoProvider>');
  }
  return contexto;
}
