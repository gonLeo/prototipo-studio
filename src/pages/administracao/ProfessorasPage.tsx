import { useState } from 'react';
import type { FormEvent } from 'react';
import { useProfessoras } from '../../hooks/useProfessoras';
import type { ProfessoraComDetalhes } from '../../hooks/useProfessoras';
import { useCategoriasProfessora } from '../../hooks/useCategoriasProfessora';
import { useSessao } from '../../hooks/useSessao';
import type { HistoricoCategoria } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';

function FormularioProfessora({
  professora,
  categorias,
  onSalvar,
  onFechar,
}: {
  professora?: ProfessoraComDetalhes;
  categorias: { id: string; nome: string }[];
  onSalvar: (dados: { nome: string; email: string; cpf: string; categoriaId: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(professora?.usuario.nome ?? '');
  const [email, setEmail] = useState(professora?.usuario.email ?? '');
  const [cpf, setCpf] = useState(professora?.usuario.cpf ?? '');
  const [categoriaId, setCategoriaId] = useState(professora?.categoriaId ?? categorias[0]?.id ?? '');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ nome, email, cpf, categoriaId });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <TextField label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
      {!professora && (
        <SelectField label="Categoria vigente" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </SelectField>
      )}
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

function ModalHistorico({
  professora,
  historico,
  categorias,
  onFechar,
}: {
  professora: ProfessoraComDetalhes;
  historico: HistoricoCategoria[];
  categorias: { id: string; nome: string }[];
  onFechar: () => void;
}) {
  return (
    <Modal titulo={`Histórico de categoria — ${professora.usuario.nome}`} onFechar={onFechar}>
      <ul className="flex flex-col gap-2">
        {historico.map((item) => (
          <li key={item.id} className="rounded-md border border-slate-200 p-2 text-sm">
            <span className="font-medium text-slate-900">
              {categorias.find((c) => c.id === item.categoriaId)?.nome ?? 'Categoria removida'}
            </span>{' '}
            <span className="text-slate-500">— vigente desde {item.dataInicioVigencia}</span>
          </li>
        ))}
        {historico.length === 0 && <p className="text-sm text-slate-500">Sem histórico registrado.</p>}
      </ul>
    </Modal>
  );
}

export function ProfessorasPage() {
  const { professoras, carregando, criar, atualizarDadosCadastrais, trocarCategoria, alternarSituacao, buscarHistoricoCategoria } =
    useProfessoras();
  const { categorias } = useCategoriasProfessora();
  const { usuario } = useSessao();

  const [modalAberto, setModalAberto] = useState<'novo' | ProfessoraComDetalhes | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState<{ professora: ProfessoraComDetalhes; historico: HistoricoCategoria[] } | null>(
    null,
  );
  const [erroLinha, setErroLinha] = useState<string>();

  async function abrirHistorico(professora: ProfessoraComDetalhes) {
    const historico = await buscarHistoricoCategoria(professora.id);
    setHistoricoAberto({ professora, historico });
  }

  async function mudarCategoria(professora: ProfessoraComDetalhes, novaCategoriaId: string) {
    if (!usuario) return;
    setErroLinha(undefined);
    try {
      await trocarCategoria(professora, novaCategoriaId, usuario.id);
    } catch (erroCapturado) {
      setErroLinha(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  async function alternar(professora: ProfessoraComDetalhes) {
    setErroLinha(undefined);
    try {
      await alternarSituacao(professora);
    } catch (erroCapturado) {
      setErroLinha(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Professoras</h1>
        <Button onClick={() => setModalAberto('novo')}>Nova professora</Button>
      </div>

      {erroLinha && <p className="mt-3 text-sm font-medium text-rose-600">{erroLinha}</p>}
      {carregando && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {professoras.map((professora) => (
          <li key={professora.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{professora.usuario.nome}</p>
                <p className="text-xs text-slate-500">{professora.usuario.email}</p>
              </div>
              <Badge tom={professora.situacao === 'ativa' ? 'sucesso' : 'neutro'}>
                {professora.situacao === 'ativa' ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SelectField
                label="Categoria"
                value={professora.categoriaId}
                onChange={(e) => mudarCategoria(professora, e.target.value)}
                className="text-xs"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </SelectField>
              <Button variante="fantasma" onClick={() => abrirHistorico(professora)}>
                Ver histórico
              </Button>
              <Button variante="fantasma" onClick={() => setModalAberto(professora)}>
                Editar dados
              </Button>
              <Button variante="fantasma" onClick={() => alternar(professora)}>
                {professora.situacao === 'ativa' ? 'Inativar' : 'Ativar'}
              </Button>
            </div>
          </li>
        ))}
        {!carregando && professoras.length === 0 && <p className="text-sm text-slate-500">Nenhuma professora cadastrada ainda.</p>}
      </ul>

      {modalAberto && (
        <Modal titulo={modalAberto === 'novo' ? 'Nova professora' : 'Editar dados cadastrais'} onFechar={() => setModalAberto(null)}>
          <FormularioProfessora
            professora={modalAberto === 'novo' ? undefined : modalAberto}
            categorias={categorias}
            onSalvar={async (dados) => {
              if (modalAberto === 'novo') {
                if (!usuario) return;
                await criar({ ...dados, autorId: usuario.id });
              } else {
                await atualizarDadosCadastrais(modalAberto, dados);
              }
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}

      {historicoAberto && (
        <ModalHistorico
          professora={historicoAberto.professora}
          historico={historicoAberto.historico}
          categorias={categorias}
          onFechar={() => setHistoricoAberto(null)}
        />
      )}
    </div>
  );
}
