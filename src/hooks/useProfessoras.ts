import { useCallback, useEffect, useState } from 'react';
import {
  categoriaProfessoraRepositorio,
  historicoCategoriaRepositorio,
  professoraRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { CategoriaProfessora, HistoricoCategoria, Professora, Usuario } from '../types/domain';
import { RegraNegocioError } from './useModalidades';

export interface ProfessoraComDetalhes extends Professora {
  usuario: Usuario;
  categoria: CategoriaProfessora | undefined;
}

export function useProfessoras() {
  const [professoras, setProfessoras] = useState<ProfessoraComDetalhes[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [listaProfessoras, usuarios, categorias] = await Promise.all([
      professoraRepositorio.listar(),
      usuarioRepositorio.listar(),
      categoriaProfessoraRepositorio.listar(),
    ]);
    const combinadas = listaProfessoras
      .map((professora) => {
        const usuario = usuarios.find((u) => u.id === professora.usuarioId);
        if (!usuario) return undefined;
        const categoria = categorias.find((c) => c.id === professora.categoriaId);
        return { ...professora, usuario, categoria };
      })
      .filter((p): p is ProfessoraComDetalhes => p !== undefined)
      .sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome));
    setProfessoras(combinadas);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function validarCadastroUnico(email: string, cpf: string, ignorarUsuarioId?: string) {
    const usuarios = await usuarioRepositorio.listar();
    const emailDuplicado = usuarios.some((u) => u.id !== ignorarUsuarioId && u.email.toLowerCase() === email.toLowerCase());
    if (emailDuplicado) {
      throw new RegraNegocioError('Já existe uma usuária cadastrada com este e-mail. Localize o cadastro existente.');
    }
    const cpfDuplicado = usuarios.some((u) => u.id !== ignorarUsuarioId && u.cpf === cpf);
    if (cpfDuplicado) {
      throw new RegraNegocioError('Já existe uma usuária cadastrada com este CPF. Localize o cadastro existente.');
    }
  }

  async function criar(dados: { nome: string; email: string; cpf: string; categoriaId: string; autorId: string }) {
    await validarCadastroUnico(dados.email, dados.cpf);
    const usuario = await usuarioRepositorio.criar({
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      cpf: dados.cpf.trim(),
      // RF-PRO-04: o acesso fica bloqueado até a professora assinar o
      // termo, do mesmo modo que acontece com a aluna.
      situacao: 'aguardando_aceite',
      perfis: ['professora'],
    });
    const professora = await professoraRepositorio.criar({
      usuarioId: usuario.id,
      categoriaId: dados.categoriaId,
      situacao: 'ativa',
    });
    await historicoCategoriaRepositorio.criar({
      professoraId: professora.id,
      categoriaId: dados.categoriaId,
      dataInicioVigencia: new Date().toISOString().slice(0, 10),
      autorId: dados.autorId,
    });
    await recarregar();
  }

  async function atualizarDadosCadastrais(professora: ProfessoraComDetalhes, dados: { nome: string; email: string; cpf: string }) {
    await validarCadastroUnico(dados.email, dados.cpf, professora.usuarioId);
    await usuarioRepositorio.atualizar(professora.usuarioId, {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      cpf: dados.cpf.trim(),
    });
    await recarregar();
  }

  async function trocarCategoria(professora: ProfessoraComDetalhes, novaCategoriaId: string, autorId: string) {
    if (novaCategoriaId === professora.categoriaId) return;
    await professoraRepositorio.atualizar(professora.id, { categoriaId: novaCategoriaId });
    await historicoCategoriaRepositorio.criar({
      professoraId: professora.id,
      categoriaId: novaCategoriaId,
      dataInicioVigencia: new Date().toISOString().slice(0, 10),
      autorId,
    });
    await recarregar();
  }

  async function alternarSituacao(professora: ProfessoraComDetalhes) {
    if (professora.situacao === 'ativa') {
      const sessoes = await sessaoRepositorio.listar();
      const comSessaoFutura = sessoes.some((s) => s.professoraId === professora.id && s.situacao === 'ativo');
      if (comSessaoFutura) {
        throw new RegraNegocioError(
          'Esta professora possui sessões futuras na grade — reatribua-as antes de inativar.',
        );
      }
    }
    await professoraRepositorio.atualizar(professora.id, {
      situacao: professora.situacao === 'ativa' ? 'inativa' : 'ativa',
    });
    await recarregar();
  }

  async function buscarHistoricoCategoria(professoraId: string): Promise<HistoricoCategoria[]> {
    const historico = await historicoCategoriaRepositorio.listar();
    return historico
      .filter((h) => h.professoraId === professoraId)
      .sort((a, b) => b.dataInicioVigencia.localeCompare(a.dataInicioVigencia));
  }

  return {
    professoras,
    carregando,
    criar,
    atualizarDadosCadastrais,
    trocarCategoria,
    alternarSituacao,
    buscarHistoricoCategoria,
  };
}
