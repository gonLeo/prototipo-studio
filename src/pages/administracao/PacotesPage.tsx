import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePacotes } from '../../hooks/usePacotes';
import type { DadosPacote } from '../../hooks/usePacotes';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { Pacote } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarMoeda, valorUnitarioDoCredito } from '../../utils/creditos';

function FormularioPacote({
  pacote,
  onSalvar,
  onFechar,
}: {
  pacote?: Pacote;
  onSalvar: (dados: DadosPacote) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(pacote?.nome ?? '');
  const [creditos, setCreditos] = useState(String(pacote?.creditos ?? ''));
  const [validadeDias, setValidadeDias] = useState(String(pacote?.validadeDias ?? ''));
  const [valor, setValor] = useState(String(pacote?.valor ?? ''));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const numeroCreditos = Number(creditos);
  const numeroValor = Number(valor);
  const unitario = numeroCreditos > 0 && numeroValor > 0 ? valorUnitarioDoCredito(numeroValor, numeroCreditos) : 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({
        nome,
        creditos: numeroCreditos,
        validadeDias: Number(validadeDias),
        valor: numeroValor,
      });
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
          label="Nome do pacote"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoFocus
          wrapperClassName="sm:col-span-2"
        />
        <TextField
          label="Créditos"
          type="number"
          min={1}
          step={1}
          value={creditos}
          onChange={(e) => setCreditos(e.target.value)}
          dica="Quantos créditos a compra concede à carteira da aluna."
          required
        />
        <TextField
          label="Validade (dias)"
          type="number"
          min={1}
          value={validadeDias}
          onChange={(e) => setValidadeDias(e.target.value)}
          dica="Prazo de uso dos créditos, contado da ativação da carteira."
          required
        />
        <TextField
          label="Valor (R$)"
          type="number"
          min={0.01}
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          dica={unitario > 0 ? `Sai a ${formatarMoeda(unitario)} por crédito.` : 'Pagamento único, no ato da compra.'}
          required
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800 ring-1 ring-inset ring-primary-100">
        Todo pacote dá acesso a todas as modalidades ofertadas. O que diferencia o uso é o custo em créditos de cada
        categoria de aula.
      </p>

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

export function PacotesPage() {
  const { pacotes, carregando, criar, atualizar, alternarSituacao, remover } = usePacotes();
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [modalAberto, setModalAberto] = useState<'novo' | Pacote | null>(null);

  async function excluir(pacote: Pacote) {
    const ok = await confirmar({
      titulo: 'Excluir pacote',
      mensagem: `Excluir "${pacote.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await remover(pacote.id);
      mostrarToast('Pacote excluído.', 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Pacotes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Catálogo de venda: quantidade de créditos, validade e valor, pago uma única vez na compra. Inativar tira o
            pacote das novas vendas sem afetar as carteiras já ativas.
          </p>
        </div>
        <Button onClick={() => setModalAberto('novo')}>Novo pacote</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && pacotes.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Nenhum pacote cadastrado ainda.</p>
      )}

      {!carregando && pacotes.length > 0 && (
        <Tabela
          rotulo="Pacotes cadastrados"
          itens={pacotes}
          chave={(pacote) => pacote.id}
          busca={{
            placeholder: 'Buscar por nome',
            corresponde: (pacote, termo) => pacote.nome.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'nome', rotulo: 'Pacote' },
            { chave: 'creditos', rotulo: 'Créditos' },
            { chave: 'validade', rotulo: 'Validade' },
            { chave: 'valor', rotulo: 'Valor' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(pacote) => (
            <LinhaTabela key={pacote.id}>
              <CelulaTabela className="font-medium text-ink">{pacote.nome}</CelulaTabela>
              <CelulaTabela>
                <p>{pacote.creditos} créditos</p>
                <p className="text-xs text-neutral-500">
                  {formatarMoeda(valorUnitarioDoCredito(pacote.valor, pacote.creditos))} por crédito
                </p>
              </CelulaTabela>
              <CelulaTabela>{pacote.validadeDias} dias</CelulaTabela>
              <CelulaTabela>{formatarMoeda(pacote.valor)}</CelulaTabela>
              <CelulaTabela>
                <Badge tom={pacote.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                  {pacote.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <div className="inline-flex items-center gap-1">
                  <Button variante="fantasma" onClick={() => setModalAberto(pacote)}>
                    Editar
                  </Button>
                  <Button variante="fantasma" onClick={() => alternarSituacao(pacote)}>
                    {pacote.situacao === 'ativo' ? 'Inativar' : 'Ativar'}
                  </Button>
                  <Button variante="perigo" onClick={() => excluir(pacote)}>
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
          titulo={modalAberto === 'novo' ? 'Novo pacote' : 'Editar pacote'}
          largura="larga"
          onFechar={() => setModalAberto(null)}
        >
          <FormularioPacote
            pacote={modalAberto === 'novo' ? undefined : modalAberto}
            onSalvar={async (dados) => {
              if (modalAberto === 'novo') {
                await criar(dados);
                mostrarToast('Pacote criado.', 'sucesso');
              } else {
                await atualizar(modalAberto.id, dados);
                mostrarToast('Pacote atualizado.', 'sucesso');
              }
            }}
            onFechar={() => setModalAberto(null)}
          />
        </Modal>
      )}
    </div>
  );
}
