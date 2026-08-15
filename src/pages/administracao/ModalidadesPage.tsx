import { useState } from 'react';
import type { FormEvent } from 'react';
import { useModalidades } from '../../hooks/useModalidades';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { Modalidade } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

function FormularioModalidade({
  modalidade,
  onSalvar,
  onFechar,
}: {
  modalidade?: Modalidade;
  onSalvar: (dados: { nome: string; capacidadeMaxima: number }) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(modalidade?.nome ?? '');
  const [capacidade, setCapacidade] = useState(String(modalidade?.capacidadeMaxima ?? ''));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ nome, capacidadeMaxima: Number(capacidade) });
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
          label="Nome da modalidade"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          dica="Normalizado em maiúsculas ao salvar."
          required
          autoFocus
        />
        <TextField
          label="Capacidade máxima de alunas"
          type="number"
          min={1}
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value)}
          dica="Reflete a limitação por equipamento."
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

export function ModalidadesPage() {
  const { modalidades, carregando, criar, atualizar, alternarSituacao, remover } = useModalidades();
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [modalAberto, setModalAberto] = useState<'novo' | Modalidade | null>(null);

  async function excluir(modalidade: Modalidade) {
    const ok = await confirmar({
      titulo: 'Excluir modalidade',
      mensagem: `Excluir "${modalidade.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(modalidade.id);
      mostrarToast('Modalidade excluída.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Modalidades</h1>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova modalidade</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && modalidades.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma modalidade cadastrada ainda.</p>
      )}

      {!carregando && modalidades.length > 0 && (
        <Tabela
          rotulo="Modalidades cadastradas"
          itens={modalidades}
          chave={(m) => m.id}
          busca={{ placeholder: 'Buscar por nome', corresponde: (m, termo) => m.nome.toLowerCase().includes(termo) }}
          colunas={[
            { chave: 'nome', rotulo: 'Modalidade' },
            { chave: 'capacidade', rotulo: 'Capacidade máxima' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(m) => (
            <LinhaTabela key={m.id}>
              <CelulaTabela className="font-medium text-ink">{m.nome}</CelulaTabela>
              <CelulaTabela>{m.capacidadeMaxima} alunas</CelulaTabela>
              <CelulaTabela>
                <Badge tom={m.situacao === 'ativo' ? 'sucesso' : 'neutro'}>{m.situacao === 'ativo' ? 'Ativa' : 'Inativa'}</Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
                  <Button variante="fantasma" onClick={() => setModalAberto(m)}>
                    Editar
                  </Button>
                  <Button variante="fantasma" onClick={() => alternarSituacao(m)}>
                    {m.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
                  </Button>
                  <Button variante="perigo" onClick={() => excluir(m)}>
                    Excluir
                  </Button>
                </div>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal titulo={modalAberto === 'novo' ? 'Nova modalidade' : 'Editar modalidade'} onFechar={() => setModalAberto(null)}>
          <FormularioModalidade
            modalidade={modalAberto === 'novo' ? undefined : modalAberto}
            onSalvar={(dados) => (modalAberto === 'novo' ? criar(dados) : atualizar(modalAberto.id, dados))}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
