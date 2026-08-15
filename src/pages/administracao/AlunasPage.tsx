import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAlunas, aplicarFiltroDeAluna, FILTROS_ALUNA, ROTULO_SITUACAO_ALUNA } from '../../hooks/useAlunas';
import type { FiltroAluna } from '../../hooks/useAlunas';
import { usePacotes } from '../../hooks/usePacotes';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import { matricularAlunaPelaAdministracao } from '../../hooks/contratosDeAluna';
import type { DadosCadastraisAluna, DadosContratacao } from '../../hooks/contratosDeAluna';
import type { SituacaoAluna, TipoContrato } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TextField, SelectField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { formatarDataBR, hojeISO } from '../../utils/data';
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../../utils/contrato';

const TOM_POR_SITUACAO: Record<SituacaoAluna, 'sucesso' | 'erro' | 'aviso' | 'neutro' | 'info'> = {
  ativa: 'sucesso',
  inadimplente: 'erro',
  trancada: 'neutro',
  suspensa: 'aviso',
  encerrada: 'neutro',
  aguardando_aceite: 'info',
};

function FormularioNovaAluna({
  onSalvar,
  onFechar,
}: {
  onSalvar: (dados: DadosCadastraisAluna, contratacao: DadosContratacao) => Promise<void>;
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
  const [tipo, setTipo] = useState<TipoContrato>('mensal');
  const [dataPrimeiraCobranca, setDataPrimeiraCobranca] = useState(hojeISO());
  const [percentualBolsa, setPercentualBolsa] = useState('0');

  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const pacoteSelecionado = pacotesAtivos.find((p) => p.id === pacoteId);
  const percentual = Number(percentualBolsa) || 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar(
        { nome, email, cpf, telefone, dataNascimento, contatoEmergencia },
        { pacoteId, tipo, dataPrimeiraCobranca, percentualBolsa: percentual },
      );
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
          <SelectField label="Pacote" value={pacoteId} onChange={(e) => setPacoteId(e.target.value)} required>
            <option value="">Selecione…</option>
            {pacotesAtivos.map((pacote) => (
              <option key={pacote.id} value={pacote.id}>
                {pacote.nome} — {pacote.aulasPorCiclo} aulas · {formatarMoeda(pacote.valorMensal)}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Duração do contrato"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoContrato)}
            required
            dica="Em ambos os casos a cobrança é mensal e recorrente."
          >
            <option value="mensal">Mensal</option>
            <option value="semestral">Semestral</option>
          </SelectField>

          <TextField
            label="Data da primeira cobrança"
            type="date"
            value={dataPrimeiraCobranca}
            onChange={(e) => setDataPrimeiraCobranca(e.target.value)}
            required
            dica="O vencimento passa a ser sempre este dia do mês."
          />

          <TextField
            label="Bolsa (% de desconto)"
            type="number"
            min={0}
            max={100}
            value={percentualBolsa}
            onChange={(e) => setPercentualBolsa(e.target.value)}
            dica="0 = sem bolsa. Recurso exclusivo do cadastro administrativo."
          />
        </div>

        {pacoteSelecionado && (
          <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm ring-1 ring-inset ring-neutral-200">
            {ehIsencaoTotal(percentual) ? (
              <span className="font-medium text-emerald-700">Isenta — nenhuma cobrança será gerada.</span>
            ) : (
              <>
                <span className="font-medium text-ink">
                  {formatarMoeda(valorComBolsa(pacoteSelecionado.valorMensal, percentual))}
                </span>
                {percentual > 0 && (
                  <span className="ml-2 text-neutral-400 line-through">
                    {formatarMoeda(pacoteSelecionado.valorMensal)}
                  </span>
                )}
                <span className="ml-2 text-neutral-500">
                  por mês · {pacoteSelecionado.aulasPorCiclo} aulas creditadas no primeiro ciclo
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
  const { alunas, carregando, recarregar, hoje } = useAlunas();
  const { usuario } = useSessao();
  const mostrarToast = useToast();

  const [filtro, setFiltro] = useState<FiltroAluna>('todas');
  const [modalAberto, setModalAberto] = useState(false);

  const filtradas = alunas.filter((aluna) => aplicarFiltroDeAluna(aluna, filtro, hoje));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Alunas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {alunas.length} cadastrada(s). O acesso ao agendamento só abre depois do aceite do termo e da anamnese.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>Nova aluna</Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1">
        {FILTROS_ALUNA.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => setFiltro(opcao.valor)}
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
            placeholder: 'Buscar por nome, e-mail ou CPF',
            corresponde: (aluna, termo) =>
              aluna.usuario.nome.toLowerCase().includes(termo) ||
              aluna.usuario.email.toLowerCase().includes(termo) ||
              aluna.usuario.cpf.includes(termo),
          }}
          colunas={[
            { chave: 'aluna', rotulo: 'Aluna' },
            { chave: 'pacote', rotulo: 'Pacote' },
            { chave: 'saldo', rotulo: 'Saldo' },
            { chave: 'validade', rotulo: 'Validade' },
            { chave: 'situacao', rotulo: 'Situação' },
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
                {aluna.bolsista && (
                  <p className="text-xs text-emerald-700">
                    Bolsista · {aluna.percentualBolsa ?? 0}%
                    {ehIsencaoTotal(aluna.percentualBolsa ?? 0) ? ' (isenta)' : ''}
                  </p>
                )}
              </CelulaTabela>
              <CelulaTabela>{aluna.contrato ? `${aluna.contrato.saldoAulas} aulas` : '—'}</CelulaTabela>
              <CelulaTabela className="whitespace-nowrap">
                {aluna.contrato ? formatarDataBR(aluna.contrato.dataVencimentoCiclo) : '—'}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={TOM_POR_SITUACAO[aluna.situacao]}>{ROTULO_SITUACAO_ALUNA[aluna.situacao]}</Badge>
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
            onSalvar={async (dados, contratacao) => {
              if (!usuario) return;
              await matricularAlunaPelaAdministracao({ dados, contratacao, autorId: usuario.id });
              await recarregar();
              mostrarToast(
                'Aluna cadastrada. E-mail de acesso enviado com o saldo creditado e a orientação para assinar o termo.',
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
