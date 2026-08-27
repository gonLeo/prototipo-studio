import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCategoriasAula, type DadosCategoriaAula } from '../../hooks/useCategoriasAula';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { CategoriaAula } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, CheckboxField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

function FormularioCategoria({
  categoria,
  onSalvar,
  onFechar,
}: {
  categoria?: CategoriaAula;
  onSalvar: (dados: DadosCategoriaAula) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [custo, setCusto] = useState(String(categoria?.custoEmCreditos ?? ''));
  const [excepcional, setExcepcional] = useState(categoria?.excepcional ?? false);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ nome, custoEmCreditos: Number(custo), excepcional });
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
        <TextField
          label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          dica="Ex.: Aula regular, Workshop, Aula particular."
          required
          autoFocus
        />
        <TextField
          label="Custo em créditos"
          type="number"
          min={1}
          step={1}
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          dica="Quantos créditos a aluna gasta ao participar de uma aula desta categoria."
          required
        />
        <div className="sm:col-span-2">
          <CheckboxField
            label="Aula excepcional — criada pela administração, fora da grade regular"
            checked={excepcional}
            onChange={setExcepcional}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Categoria excepcional não aparece na grade para a aluna agendar. Workshop e aula particular são criados pela
            administração, que aloca as participantes.
          </p>
        </div>
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

export function CategoriasAulaPage() {
  const { categorias, carregando, criar, atualizar, alternarSituacao, remover } = useCategoriasAula();
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [modalAberto, setModalAberto] = useState<'novo' | CategoriaAula | null>(null);

  async function excluir(categoria: CategoriaAula) {
    const ok = await confirmar({
      titulo: 'Excluir categoria de aula',
      mensagem: `Excluir "${categoria.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(categoria.id);
      mostrarToast('Categoria de aula excluída.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Categorias de aula</h1>
          <p className="mt-1 text-sm text-neutral-500">
            O que a aluna gasta em cada aula é definido aqui. Qualquer pacote dá acesso a todas as modalidades — o que
            diferencia o uso é o custo em créditos da categoria.
          </p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova categoria</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && categorias.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma categoria de aula cadastrada ainda.</p>
      )}

      {!carregando && categorias.length > 0 && (
        <Tabela
          rotulo="Categorias de aula"
          itens={categorias}
          chave={(c) => c.id}
          busca={{ placeholder: 'Buscar por nome', corresponde: (c, termo) => c.nome.toLowerCase().includes(termo) }}
          colunas={[
            { chave: 'nome', rotulo: 'Categoria' },
            { chave: 'custo', rotulo: 'Custo em créditos' },
            { chave: 'tipo', rotulo: 'Onde acontece' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(c) => (
            <LinhaTabela key={c.id}>
              <CelulaTabela className="font-medium text-ink">{c.nome}</CelulaTabela>
              <CelulaTabela>
                {c.custoEmCreditos} {c.custoEmCreditos === 1 ? 'crédito' : 'créditos'}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={c.excepcional ? 'info' : 'neutro'}>
                  {c.excepcional ? 'Fora da grade' : 'Grade regular'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={c.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                  {c.situacao === 'ativo' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
                  <Button variante="fantasma" onClick={() => setModalAberto(c)}>
                    Editar
                  </Button>
                  <Button variante="fantasma" onClick={() => alternarSituacao(c)}>
                    {c.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
                  </Button>
                  <Button variante="perigo" onClick={() => excluir(c)}>
                    Excluir
                  </Button>
                </div>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal
          titulo={modalAberto === 'novo' ? 'Nova categoria de aula' : 'Editar categoria de aula'}
          onFechar={() => setModalAberto(null)}
        >
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
