import { useState } from 'react';
import type { FormEvent } from 'react';
import { useModalidades } from '../../hooks/useModalidades';
import type { Modalidade } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';

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
        dica="Reflete a limitação por equipamento (ex.: aulas com barra comportam menos alunas)."
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

export function ModalidadesPage() {
  const { modalidades, carregando, criar, atualizar, alternarSituacao, remover } = useModalidades();
  const [modalAberto, setModalAberto] = useState<'novo' | Modalidade | null>(null);
  const [erroLista, setErroLista] = useState<string>();

  async function excluir(modalidade: Modalidade) {
    setErroLista(undefined);
    if (!confirm(`Excluir a modalidade "${modalidade.nome}"?`)) return;
    try {
      await remover(modalidade.id);
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : 'Erro inesperado.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Modalidades</h1>
        <Button onClick={() => setModalAberto('novo')}>Nova modalidade</Button>
      </div>

      {erroLista && <p className="mt-3 text-sm font-medium text-rose-600">{erroLista}</p>}
      {carregando && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {modalidades.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{m.nome}</p>
              <p className="text-xs text-slate-500">Capacidade máxima: {m.capacidadeMaxima} alunas</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tom={m.situacao === 'ativo' ? 'sucesso' : 'neutro'}>{m.situacao === 'ativo' ? 'Ativa' : 'Inativa'}</Badge>
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
          </li>
        ))}
        {!carregando && modalidades.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma modalidade cadastrada ainda.</p>
        )}
      </ul>

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
