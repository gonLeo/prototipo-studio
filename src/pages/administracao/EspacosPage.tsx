import { useState } from 'react';
import type { FormEvent } from 'react';
import { useEspacos } from '../../hooks/useEspacos';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { Espaco } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

function FormularioEspaco({
  espaco,
  onSalvar,
  onFechar,
}: {
  espaco?: Espaco;
  onSalvar: (nome: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(espaco?.nome ?? '');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar(nome);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <TextField label="Nome do espaço" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
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

export function EspacosPage() {
  const { espacos, carregando, criar, atualizar, alternarSituacao, remover } = useEspacos();
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [modalAberto, setModalAberto] = useState<'novo' | Espaco | null>(null);

  async function excluir(espaco: Espaco) {
    const ok = await confirmar({
      titulo: 'Excluir espaço',
      mensagem: `Excluir "${espaco.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(espaco.id);
      mostrarToast('Espaço excluído.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Espaços</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cadastro opcional. Com um único espaço, a validação de conflito de sala é automática.
          </p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Novo espaço</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && espacos.length === 0 && <p className="mt-6 text-sm text-neutral-500">Nenhum espaço cadastrado ainda.</p>}

      {!carregando && espacos.length > 0 && (
        <Tabela
          rotulo="Espaços cadastrados"
          itens={espacos}
          chave={(espaco) => espaco.id}
          busca={{ placeholder: 'Buscar por nome', corresponde: (espaco, termo) => espaco.nome.toLowerCase().includes(termo) }}
          colunas={[
            { chave: 'nome', rotulo: 'Espaço' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(espaco) => (
            <LinhaTabela key={espaco.id}>
              <CelulaTabela className="font-medium text-ink">{espaco.nome}</CelulaTabela>
              <CelulaTabela>
                <Badge tom={espaco.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                  {espaco.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
                  <Button variante="fantasma" onClick={() => setModalAberto(espaco)}>
                    Editar
                  </Button>
                  <Button variante="fantasma" onClick={() => alternarSituacao(espaco)}>
                    {espaco.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
                  </Button>
                  <Button variante="perigo" onClick={() => excluir(espaco)}>
                    Excluir
                  </Button>
                </div>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal titulo={modalAberto === 'novo' ? 'Novo espaço' : 'Editar espaço'} onFechar={() => setModalAberto(null)}>
          <FormularioEspaco
            espaco={modalAberto === 'novo' ? undefined : modalAberto}
            onSalvar={(nome) => (modalAberto === 'novo' ? criar(nome) : atualizar(modalAberto.id, nome))}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
