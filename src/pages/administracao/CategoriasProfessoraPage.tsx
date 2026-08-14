import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCategoriasProfessora } from '../../hooks/useCategoriasProfessora';
import type { CategoriaProfessora } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';

function FormularioCategoria({
  categoria,
  onSalvar,
  onFechar,
}: {
  categoria?: CategoriaProfessora;
  onSalvar: (dados: { nome: string; valorPorAula: number }) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [valor, setValor] = useState(String(categoria?.valorPorAula ?? ''));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ nome, valorPorAula: Number(valor) });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <TextField label="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      <TextField
        label="Valor por aula (R$)"
        type="number"
        min={0.01}
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
      />
      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

export function CategoriasProfessoraPage() {
  const { categorias, carregando, criar, atualizar, alternarSituacao, remover } = useCategoriasProfessora();
  const [modalAberto, setModalAberto] = useState<'novo' | CategoriaProfessora | null>(null);
  const [erroLista, setErroLista] = useState<string>();

  async function excluir(categoria: CategoriaProfessora) {
    setErroLista(undefined);
    if (!confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    try {
      await remover(categoria.id);
    } catch (erroCapturado) {
      setErroLista(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Categorias de professora</h1>
          <p className="mt-1 text-sm text-slate-500">Base para o cálculo automático de comissão por aula.</p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova categoria</Button>
      </div>

      {erroLista && <p className="mt-3 text-sm font-medium text-rose-600">{erroLista}</p>}
      {carregando && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {categorias.map((categoria) => (
          <li key={categoria.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{categoria.nome}</p>
              <p className="text-xs text-slate-500">R$ {categoria.valorPorAula.toFixed(2)} por aula</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tom={categoria.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                {categoria.situacao === 'ativo' ? 'Ativa' : 'Inativa'}
              </Badge>
              <Button variante="fantasma" onClick={() => setModalAberto(categoria)}>
                Editar
              </Button>
              <Button variante="fantasma" onClick={() => alternarSituacao(categoria)}>
                {categoria.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
              </Button>
              <Button variante="perigo" onClick={() => excluir(categoria)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
        {!carregando && categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria cadastrada ainda.</p>}
      </ul>

      {modalAberto && (
        <Modal titulo={modalAberto === 'novo' ? 'Nova categoria' : 'Editar categoria'} onFechar={() => setModalAberto(null)}>
          <FormularioCategoria
            categoria={modalAberto === 'novo' ? undefined : modalAberto}
            onSalvar={(dados) => (modalAberto === 'novo' ? criar(dados) : atualizar(modalAberto.id, dados))}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
