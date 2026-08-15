import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCategoriasProfessora } from '../../hooks/useCategoriasProfessora';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { CategoriaProfessora } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
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
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [modalAberto, setModalAberto] = useState<'novo' | CategoriaProfessora | null>(null);

  async function excluir(categoria: CategoriaProfessora) {
    const ok = await confirmar({
      titulo: 'Excluir categoria',
      mensagem: `Excluir "${categoria.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(categoria.id);
      mostrarToast('Categoria excluída.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Categorias de professora</h1>
          <p className="mt-1 text-sm text-neutral-500">Base para o cálculo automático de comissão por aula.</p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova categoria</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && categorias.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma categoria cadastrada ainda.</p>
      )}

      {!carregando && categorias.length > 0 && (
        <Tabela
          rotulo="Categorias de professora cadastradas"
          itens={categorias}
          chave={(categoria) => categoria.id}
          busca={{ placeholder: 'Buscar por nome', corresponde: (categoria, termo) => categoria.nome.toLowerCase().includes(termo) }}
          colunas={[
            { chave: 'nome', rotulo: 'Categoria' },
            { chave: 'valor', rotulo: 'Valor por aula' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(categoria) => (
            <LinhaTabela key={categoria.id}>
              <CelulaTabela className="font-medium text-ink">{categoria.nome}</CelulaTabela>
              <CelulaTabela>R$ {categoria.valorPorAula.toFixed(2)}</CelulaTabela>
              <CelulaTabela>
                <Badge tom={categoria.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                  {categoria.situacao === 'ativo' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
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
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

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
