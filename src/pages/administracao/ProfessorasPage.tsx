import { useState } from 'react';
import type { FormEvent } from 'react';
import { useProfessoras } from '../../hooks/useProfessoras';
import type { ProfessoraComDetalhes } from '../../hooks/useProfessoras';
import { useCategoriasProfessora } from '../../hooks/useCategoriasProfessora';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import type { HistoricoCategoria } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoFocus
          wrapperClassName="sm:col-span-2"
        />
        <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        <SelectField
          label="Categoria vigente"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          required
          dica={professora ? 'Trocar a categoria registra a mudança no histórico, sem efeito retroativo.' : undefined}
          wrapperClassName="sm:col-span-2"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </SelectField>
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
          <li key={item.id} className="rounded-md border border-neutral-200 p-2 text-sm">
            <span className="font-medium text-ink">
              {categorias.find((c) => c.id === item.categoriaId)?.nome ?? 'Categoria removida'}
            </span>{' '}
            <span className="text-neutral-500">— vigente desde {item.dataInicioVigencia}</span>
          </li>
        ))}
        {historico.length === 0 && <p className="text-sm text-neutral-500">Sem histórico registrado.</p>}
      </ul>
    </Modal>
  );
}

export function ProfessorasPage() {
  const { professoras, carregando, criar, atualizarDadosCadastrais, trocarCategoria, alternarSituacao, buscarHistoricoCategoria } =
    useProfessoras();
  const { categorias } = useCategoriasProfessora();
  const { usuario } = useSessao();
  const mostrarToast = useToast();

  const [modalAberto, setModalAberto] = useState<'novo' | ProfessoraComDetalhes | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState<{ professora: ProfessoraComDetalhes; historico: HistoricoCategoria[] } | null>(
    null,
  );

  async function abrirHistorico(professora: ProfessoraComDetalhes) {
    const historico = await buscarHistoricoCategoria(professora.id);
    setHistoricoAberto({ professora, historico });
  }

  async function alternar(professora: ProfessoraComDetalhes) {
    try {
      await alternarSituacao(professora);
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Professoras</h1>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Nova professora</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && professoras.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma professora cadastrada ainda.</p>
      )}

      {!carregando && professoras.length > 0 && (
        <Tabela
          rotulo="Professoras cadastradas"
          itens={professoras}
          chave={(professora) => professora.id}
          busca={{
            placeholder: 'Buscar por nome ou e-mail',
            corresponde: (professora, termo) =>
              professora.usuario.nome.toLowerCase().includes(termo) || professora.usuario.email.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'nome', rotulo: 'Professora' },
            { chave: 'categoria', rotulo: 'Categoria' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(professora) => (
            <LinhaTabela key={professora.id}>
              <CelulaTabela>
                <p className="font-medium text-ink">{professora.usuario.nome}</p>
                <p className="text-xs text-neutral-500">{professora.usuario.email}</p>
              </CelulaTabela>
              <CelulaTabela>{categorias.find((c) => c.id === professora.categoriaId)?.nome ?? '—'}</CelulaTabela>
              <CelulaTabela>
                <Badge tom={professora.situacao === 'ativa' ? 'sucesso' : 'neutro'}>
                  {professora.situacao === 'ativa' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
                  <Button variante="fantasma" onClick={() => abrirHistorico(professora)}>
                    Histórico
                  </Button>
                  <Button variante="fantasma" onClick={() => setModalAberto(professora)}>
                    Editar
                  </Button>
                  <Button variante="fantasma" onClick={() => alternar(professora)}>
                    {professora.situacao === 'ativa' ? 'Inativar' : 'Ativar'}
                  </Button>
                </div>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal titulo={modalAberto === 'novo' ? 'Nova professora' : 'Editar dados cadastrais'} onFechar={() => setModalAberto(null)}>
          <FormularioProfessora
            professora={modalAberto === 'novo' ? undefined : modalAberto}
            categorias={categorias}
            onSalvar={async (dados) => {
              if (!usuario) return;
              if (modalAberto === 'novo') {
                await criar({ ...dados, autorId: usuario.id });
              } else {
                await atualizarDadosCadastrais(modalAberto, dados);
                await trocarCategoria(modalAberto, dados.categoriaId, usuario.id);
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
