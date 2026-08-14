import { useState } from 'react';
import type { FormEvent } from 'react';
import { useEspacos } from '../../hooks/useEspacos';
import type { Espaco } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';

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
  const [modalAberto, setModalAberto] = useState<'novo' | Espaco | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Espaços</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cadastro opcional. Com um único espaço, a validação de conflito de sala é automática.
          </p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Novo espaço</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {espacos.map((espaco) => (
          <li key={espaco.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-900">{espaco.nome}</p>
            <div className="flex items-center gap-2">
              <Badge tom={espaco.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                {espaco.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
              </Badge>
              <Button variante="fantasma" onClick={() => setModalAberto(espaco)}>
                Editar
              </Button>
              <Button variante="fantasma" onClick={() => alternarSituacao(espaco)}>
                {espaco.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
              </Button>
              <Button variante="perigo" onClick={() => remover(espaco.id)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
        {!carregando && espacos.length === 0 && <p className="text-sm text-slate-500">Nenhum espaço cadastrado ainda.</p>}
      </ul>

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
