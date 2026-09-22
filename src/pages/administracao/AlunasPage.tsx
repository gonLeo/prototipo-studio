import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  alunaCorresponde,
  aplicarFiltroDeAluna,
  FILTROS_ALUNA,
  rotuloDeAcesso,
  useAlunas,
} from '../../hooks/useAlunas';
import type { FiltroAluna } from '../../hooks/useAlunas';
import { usePacotes } from '../../hooks/usePacotes';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import { cadastrarAlunaPelaAdministracao } from '../../hooks/cadastroDeAlunas';
import type { DadosCadastraisAluna } from '../../hooks/cadastroDeAlunas';
import type { SituacaoAluna } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField, CheckboxField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR } from '../../utils/data';
import { formatarCreditos, formatarMoeda, rotuloStatusCarteira } from '../../utils/creditos';

const TOM_POR_SITUACAO: Record<SituacaoAluna, 'sucesso' | 'erro' | 'aviso' | 'neutro' | 'info'> = {
  ativa: 'sucesso',
  trancada: 'aviso',
  aguardando_aceite: 'info',
};

function FormularioNovaAluna({
  onSalvar,
  onFechar,
}: {
  onSalvar: (dados: DadosCadastraisAluna, pacoteId: string, bolsista: boolean) => Promise<void>;
  onFechar: () => void;
}) {
  const { pacotes } = usePacotes();
  const pacotesAtivos = pacotes.filter((p) => p.situacao === 'ativo');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [contatoEmergencia, setContatoEmergencia] = useState('');

  const [pacoteId, setPacoteId] = useState('');
  const [bolsista, setBolsista] = useState(false);

  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const pacoteSelecionado = pacotesAtivos.find((p) => p.id === pacoteId);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ nome, email, cpf, telefone, dataNascimento, contatoEmergencia }, pacoteId, bolsista);
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <section>
        <h3 className="text-sm font-semibold text-ink">Dados pessoais</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dica="É por aqui que a aluna recebe o acesso ao sistema."
          />
          <TextField label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
          <TextField label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
          <TextField
            label="Data de nascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
          <TextField
            label="Contato de emergência"
            value={contatoEmergencia}
            onChange={(e) => setContatoEmergencia(e.target.value)}
            required
            dica="Nome e telefone de quem acionar em caso de necessidade."
            wrapperClassName="sm:col-span-2"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Pacote</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Pacote"
            value={pacoteId}
            onChange={(e) => setPacoteId(e.target.value)}
            required
            wrapperClassName="sm:col-span-2"
          >
            <option value="">Selecione…</option>
            {pacotesAtivos.map((pacote) => (
              <option key={pacote.id} value={pacote.id}>
                {pacote.nome} — {formatarCreditos(pacote.creditos)} · {pacote.validadeDias} dias ·{' '}
                {formatarMoeda(pacote.valor)}
              </option>
            ))}
          </SelectField>

          <div className="sm:col-span-2">
            <CheckboxField label="Aluna bolsista — isenção total do valor do pacote" checked={bolsista} onChange={setBolsista} />
            <p className="mt-1 text-xs text-neutral-500">
              Recurso exclusivo do cadastro administrativo (RF-BOL-01). A carteira da bolsista é renovada
              automaticamente com o mesmo pacote, sem gerar cobrança.
            </p>
          </div>
        </div>

        {pacoteSelecionado && (
          <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm ring-1 ring-inset ring-neutral-200">
            {bolsista ? (
              <span className="font-medium text-emerald-700">
                Bolsista — nenhuma cobrança será gerada. {formatarCreditos(pacoteSelecionado.creditos)} concedidos, com
                validade de {pacoteSelecionado.validadeDias} dias.
              </span>
            ) : (
              <>
                <span className="font-medium text-ink">{formatarMoeda(pacoteSelecionado.valor)}</span>
                <span className="ml-2 text-neutral-500">
                  em pagamento único · {formatarCreditos(pacoteSelecionado.creditos)} · validade de{' '}
                  {pacoteSelecionado.validadeDias} dias. A venda fica pendente até a aluna pagar no primeiro acesso.
                </span>
              </>
            )}
          </p>
        )}
      </section>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Cadastrando…' : 'Cadastrar aluna'}
        </Button>
      </div>
    </form>
  );
}

export function AlunasPage() {
  const { alunas, carregando, recarregar } = useAlunas();
  const { usuario } = useSessao();
  const mostrarToast = useToast();

  // O cartão de pendências do painel administrativo chega com o filtro na
  // URL — por isso ele mora aqui, e não só no estado local.
  const [parametros, setParametros] = useSearchParams();
  const filtro = (parametros.get('filtro') as FiltroAluna | null) ?? 'todas';
  const [modalAberto, setModalAberto] = useState(false);

  function trocarFiltro(novo: FiltroAluna) {
    if (novo === 'todas') setParametros({});
    else setParametros({ filtro: novo });
  }

  const filtradas = alunas.filter((aluna) => aplicarFiltroDeAluna(aluna, filtro));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Alunas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {alunas.length} cadastrada(s). Termo e anamnese pendentes não bloqueiam o agendamento — aparecem aqui
            para acompanhamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={filtradas.length === 0}
            onClick={() =>
              baixarCSV({
                nomeArquivo: 'alunas',
                itens: filtradas,
                colunas: [
                  { cabecalho: 'Nome', valor: (item) => item.usuario.nome },
                  { cabecalho: 'E-mail', valor: (item) => item.usuario.email },
                  { cabecalho: 'CPF', valor: (item) => item.usuario.cpf },
                  { cabecalho: 'Telefone', valor: (item) => item.telefone },
                  { cabecalho: 'Situação', valor: (item) => rotuloDeAcesso(item) },
                  { cabecalho: 'Origem', valor: (item) => (item.origem === 'convenio' ? 'Convênio' : 'Direta') },
                  { cabecalho: 'Pacote', valor: (item) => item.pacote?.nome ?? '' },
                  { cabecalho: 'Créditos disponíveis', valor: (item) => item.leitura?.disponiveis ?? '' },
                  { cabecalho: 'Créditos reservados', valor: (item) => item.leitura?.reservados ?? '' },
                  { cabecalho: 'Validade', valor: (item) => item.carteira?.dataValidade ?? '' },
                  { cabecalho: 'Status da carteira', valor: (item) => (item.leitura ? rotuloStatusCarteira(item.leitura.status) : 'Sem pacote ativo') },
                  { cabecalho: 'Bolsista', valor: (item) => (item.bolsista ? 'Sim' : 'Não') },
                  // REL-09: a relação de bolsistas precisa do valor de
                  // tabela que deixou de ser faturado, não só da marcação.
                  {
                    cabecalho: 'Valor não faturado (bolsa)',
                    valor: (item) => (item.bolsista ? (item.pacote?.valor ?? 0).toFixed(2) : ''),
                  },
                ],
              })
            }
          >
            Exportar CSV
          </Button>
          <Button onClick={() => setModalAberto(true)}>Nova aluna</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1">
        {FILTROS_ALUNA.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => trocarFiltro(opcao.valor)}
            aria-pressed={filtro === opcao.valor}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              filtro === opcao.valor
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && filtradas.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          {alunas.length === 0 ? 'Nenhuma aluna cadastrada ainda.' : 'Nenhuma aluna neste filtro.'}
        </p>
      )}

      {!carregando && filtradas.length > 0 && (
        <Tabela
          rotulo="Alunas cadastradas"
          itens={filtradas}
          chave={(aluna) => aluna.id}
          busca={{
            placeholder: 'Buscar por nome, CPF ou telefone',
            corresponde: alunaCorresponde,
          }}
          colunas={[
            { chave: 'aluna', rotulo: 'Aluna' },
            { chave: 'pacote', rotulo: 'Pacote' },
            { chave: 'saldo', rotulo: 'Créditos' },
            { chave: 'validade', rotulo: 'Validade' },
            { chave: 'carteira', rotulo: 'Status do pacote' },
            { chave: 'situacao', rotulo: 'Acesso' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(aluna) => (
            <LinhaTabela key={aluna.id}>
              <CelulaTabela>
                <p className="font-medium text-ink">{aluna.usuario.nome}</p>
                <p className="text-xs text-neutral-500">{aluna.usuario.email}</p>
              </CelulaTabela>
              <CelulaTabela>
                <p>{aluna.pacote?.nome ?? '—'}</p>
                {aluna.bolsista && <p className="text-xs text-emerald-700">Bolsista · isenta</p>}
              </CelulaTabela>
              <CelulaTabela>
                {aluna.leitura ? (
                  <>
                    <p>{aluna.leitura.disponiveis} disponíveis</p>
                    <p className="text-xs text-neutral-500">{aluna.leitura.reservados} reservados</p>
                  </>
                ) : (
                  '—'
                )}
              </CelulaTabela>
              <CelulaTabela className="whitespace-nowrap">
                {aluna.carteira ? formatarDataBR(aluna.carteira.dataValidade) : '—'}
              </CelulaTabela>
              <CelulaTabela>
                {/* RF-CRE-11: consumida e vencida aparecem igual — "sem pacote ativo". */}
                {aluna.leitura ? (
                  <Badge tom={aluna.leitura.motivoFinalizando ? 'aviso' : 'sucesso'}>
                    {rotuloStatusCarteira(aluna.leitura.status)}
                  </Badge>
                ) : (
                  <Badge tom="neutro">Nenhum pacote ativo</Badge>
                )}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={TOM_POR_SITUACAO[aluna.situacao]}>{rotuloDeAcesso(aluna)}</Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <Link
                  to={`/administracao/alunas/${aluna.id}`}
                  className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  Abrir ficha
                </Link>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal titulo="Nova aluna" largura="larga" onFechar={() => setModalAberto(false)}>
          <FormularioNovaAluna
            onSalvar={async (dados, pacoteId, bolsista) => {
              if (!usuario) return;
              await cadastrarAlunaPelaAdministracao({ dados, pacoteId, bolsista, autorId: usuario.id });
              await recarregar();
              mostrarToast(
                bolsista
                  ? 'Aluna bolsista cadastrada, com os créditos já disponíveis. Termo e anamnese ficam pendentes.'
                  : 'Aluna cadastrada. E-mail de acesso enviado; os créditos são liberados quando ela confirmar o pagamento.',
                'sucesso',
              );
            }}
            onFechar={() => setModalAberto(false)}
          />
        </Modal>
      )}
    </div>
  );
}
