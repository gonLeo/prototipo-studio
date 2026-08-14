import { http, ApiError } from './http';

export interface EntidadeBase {
  id: string;
}

/**
 * Interface estável de acesso a dados. Hoje implementada sobre json-server;
 * quando a API real existir, basta trocar a implementação interna sem
 * alterar nenhum componente ou hook que consome o repositório.
 */
export interface Repositorio<T extends EntidadeBase> {
  listar(): Promise<T[]>;
  buscarPorId(id: string): Promise<T | undefined>;
  criar(dados: Omit<T, 'id'> & { id?: string }): Promise<T>;
  atualizar(id: string, dados: Partial<Omit<T, 'id'>>): Promise<T>;
  remover(id: string): Promise<void>;
}

export function criarRepositorio<T extends EntidadeBase>(recurso: string): Repositorio<T> {
  const base = `/${recurso}`;

  return {
    listar: () => http.get<T[]>(base),

    buscarPorId: async (id) => {
      try {
        return await http.get<T>(`${base}/${id}`);
      } catch (erro) {
        if (erro instanceof ApiError && erro.status === 404) {
          return undefined;
        }
        throw erro;
      }
    },

    criar: (dados) => http.post<T>(base, dados),

    atualizar: (id, dados) => http.patch<T>(`${base}/${id}`, dados),

    remover: (id) => http.delete(`${base}/${id}`),
  };
}
