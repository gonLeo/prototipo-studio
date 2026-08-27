import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePacotes } from '../../hooks/usePacotes';
import type { DadosPacote } from '../../hooks/usePacotes';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import type { Pacote, TipoContrato } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarMoeda, rotuloTipoContrato } from '../../utils/contrato';

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
  const [legadoAberto, setLegadoAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoContrato>(pacote?.tipo ?? 'mensal');
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
      const numeroCreditos = Number(creditos);
      const numeroValidade = Number(validadeDias);
      const numeroValor = Number(valor);

      // Os campos do modelo antigo ficam num collapse fechado por padrão, e
      // um campo fechado não está no DOM — o `required` do HTML não alcança
      // ele. Quem cadastra pelo modelo de créditos, sem abrir o collapse,
      // teria a criação recusada por um campo que não viu. Enquanto a ponte
      // existir, o não informado é espelhado a partir do pacote de créditos.
      await onSalvar({
        nome,
        creditos: numeroCreditos,
        validadeDias: numeroValidade,
        valor: numeroValor,
        tipo,
        valorMensal: Number(valorMensal) || numeroValor,
        aulasPorCiclo: Number(aulasPorCiclo) || numeroCreditos,
        aulasPorSemana: Number(aulasPorSemana) || 1,
        duracaoMeses: Number(duracaoMeses) || 1,
        validadeCicloDias: Number(validadeCicloDias) || numeroValidade,
        limiteDiasPausa: Number(limiteDiasPausa) || 0,
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
          dica="Pagamento único, no ato da compra. Não há mensalidade."
          required
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <button
          type="button"
          onClick={() => setLegadoAberto((atual) => !atual)}
          aria-expanded={legadoAberto}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-neutral-50"
        >
          <span className="text-sm font-semibold text-ink">
            Campos do modelo antigo
            <span className="ml-2 text-xs font-normal text-neutral-500">
              contrato com mensalidade — saem quando a carteira de créditos substituir o contrato
            </span>
          </span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${legadoAberto ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {legadoAberto && (
      <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 p-3 sm:grid-cols-2">
        <SelectField
          label="Duração do contrato"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoContrato)}
          required
          dica="Definida aqui, no pacote. Em ambos os casos a cobrança é mensal e recorrente."
        >
          <option value="mensal">Mensal</option>
          <option value="semestral">Semestral</option>
        </SelectField>
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
        {tipo === 'mensal' && (
          <TextField
            label="Duração do contrato (meses)"
            type="number"
            min={1}
            value={duracaoMeses}
            onChange={(e) => setDuracaoMeses(e.target.value)}
            dica="Por quantos meses o contrato mensal vale. Pacote semestral sempre vale 6 meses."
            required
          />
        )}
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
        )}
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
            { chave: 'legado', rotulo: 'Modelo antigo' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(pacote) => (
            <LinhaTabela key={pacote.id}>
              <CelulaTabela className="font-medium text-ink">{pacote.nome}</CelulaTabela>
              <CelulaTabela>
                {pacote.creditos ? (
                  <>
                    <p>{pacote.creditos} créditos</p>
                    <p className="text-xs text-neutral-500">
                      {formatarMoeda(pacote.valor / pacote.creditos)} por crédito
                    </p>
                  </>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </CelulaTabela>
              <CelulaTabela>
                {pacote.validadeDias ? `${pacote.validadeDias} dias` : <span className="text-neutral-400">—</span>}
              </CelulaTabela>
              <CelulaTabela>
                {pacote.valor ? formatarMoeda(pacote.valor) : <span className="text-neutral-400">—</span>}
              </CelulaTabela>
              <CelulaTabela className="text-xs text-neutral-500">
                <p>
                  {rotuloTipoContrato(pacote.tipo)} · {pacote.aulasPorCiclo} aulas/ciclo
                </p>
                <p>{formatarMoeda(pacote.valorMensal)}/mês</p>
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
