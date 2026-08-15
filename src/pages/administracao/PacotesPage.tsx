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
import { formatarMoeda } from '../../utils/contrato';

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
  const [valorMensal, setValorMensal] = useState(String(pacote?.valorMensal ?? ''));
  const [aulasPorCiclo, setAulasPorCiclo] = useState(String(pacote?.aulasPorCiclo ?? ''));
  const [aulasPorSemana, setAulasPorSemana] = useState(String(pacote?.aulasPorSemana ?? ''));
  const [duracaoMeses, setDuracaoMeses] = useState(String(pacote?.duracaoMeses ?? '1'));
  const [validadeCicloDias, setValidadeCicloDias] = useState(String(pacote?.validadeCicloDias ?? '30'));
  const [limiteDiasPausa, setLimiteDiasPausa] = useState(String(pacote?.limiteDiasPausa ?? '0'));
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({
        nome,
        valorMensal: Number(valorMensal),
        aulasPorCiclo: Number(aulasPorCiclo),
        aulasPorSemana: Number(aulasPorSemana),
        duracaoMeses: Number(duracaoMeses),
        validadeCicloDias: Number(validadeCicloDias),
        limiteDiasPausa: Number(limiteDiasPausa),
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
          label="Valor mensal (R$)"
          type="number"
          min={0.01}
          step="0.01"
          value={valorMensal}
          onChange={(e) => setValorMensal(e.target.value)}
          required
        />
        <TextField
          label="Aulas por ciclo"
          type="number"
          min={1}
          value={aulasPorCiclo}
          onChange={(e) => setAulasPorCiclo(e.target.value)}
          required
        />
        <TextField
          label="Aulas por semana"
          type="number"
          min={1}
          value={aulasPorSemana}
          onChange={(e) => setAulasPorSemana(e.target.value)}
          required
        />
        <TextField
          label="Duração do contrato (meses)"
          type="number"
          min={1}
          value={duracaoMeses}
          onChange={(e) => setDuracaoMeses(e.target.value)}
          dica="Usada quando o contrato é mensal. Semestral sempre vale 6 meses."
          required
        />
        <TextField
          label="Validade do ciclo (dias)"
          type="number"
          min={1}
          value={validadeCicloDias}
          onChange={(e) => setValidadeCicloDias(e.target.value)}
          required
        />
        <TextField
          label="Limite de dias de pausa"
          type="number"
          min={0}
          value={limiteDiasPausa}
          onChange={(e) => setLimiteDiasPausa(e.target.value)}
          dica="Máximo de dias de trancamento ou suspensão. 0 = sem limite."
          required
        />
      </div>

      <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800 ring-1 ring-inset ring-primary-100">
        Todo pacote dá acesso a todas as modalidades ofertadas, sem restrição por tipo de aula.
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
            Base da contratação: quantidade de aulas, valor mensal e duração. Inativar tira o pacote das novas
            contratações sem afetar quem já o contratou.
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
            { chave: 'aulas', rotulo: 'Aulas' },
            { chave: 'valor', rotulo: 'Valor mensal' },
            { chave: 'vigencia', rotulo: 'Duração e pausa' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(pacote) => (
            <LinhaTabela key={pacote.id}>
              <CelulaTabela className="font-medium text-ink">{pacote.nome}</CelulaTabela>
              <CelulaTabela>
                <p>{pacote.aulasPorCiclo} por ciclo</p>
                <p className="text-xs text-neutral-500">{pacote.aulasPorSemana} por semana</p>
              </CelulaTabela>
              <CelulaTabela>{formatarMoeda(pacote.valorMensal)}</CelulaTabela>
              <CelulaTabela>
                <p className="text-xs">{pacote.duracaoMeses} mês(es) · ciclo de {pacote.validadeCicloDias} dias</p>
                <p className="text-xs text-neutral-500">
                  {pacote.limiteDiasPausa > 0 ? `Pausa até ${pacote.limiteDiasPausa} dias` : 'Pausa sem limite'}
                </p>
              </CelulaTabela>
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
