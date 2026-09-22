import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  NOMES_CONVENIO,
  temIntegracaoAutomatica,
  alternarEspelhamento,
  cadastrarAlunaDeConvenio,
  cancelarReserva,
  descreverIntegracao,
  janelaDoConvenioEmDias,
  listarAlunasDeConvenio,
  listarAulasEspelhadas,
  listarIntegracoes,
  listarReservas,
  listarSessoesParaEspelhamento,
  receberReserva,
  registrarSincronizacao,
  relatorioDeConvenios,
  rotuloDoConvenio,
  salvarIntegracao,
  validarCheckin,
} from '../../hooks/convenios';
import type {
  AulaEspelhadaDisponivel,
  LinhaRelatorioConvenio,
  ReservaDetalhada,
  SessaoEspelhada,
} from '../../hooks/convenios';
import { periodoAtual } from '../../hooks/comissoes';
import type { Aluna, ConvenioIntegracao, NomeConvenio } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SelectField, TextField } from '../../components/ui/Field';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR, nomeDoMes } from '../../utils/data';
import { rotularDias } from '../../utils/grade';

type Aba = 'reservas' | 'espelhamento' | 'integracoes' | 'relatorio';

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: 'reservas', rotulo: 'Reservas' },
  { id: 'espelhamento', rotulo: 'Grade espelhada' },
  { id: 'integracoes', rotulo: 'Credenciais' },
  { id: 'relatorio', rotulo: 'Relatório do período' },
];

interface AlunaDeConvenio extends Aluna {
  nome: string;
}

function FormularioReserva({
  aulas,
  alunas,
  onConfirmar,
  onFechar,
}: {
  aulas: AulaEspelhadaDisponivel[];
  alunas: AlunaDeConvenio[];
  onConfirmar: (dados: {
    convenio: NomeConvenio;
    alunaId: string;
    chaveAula: string;
    identificadorExterno: string;
    contingencia: boolean;
  }) => Promise<void>;
  onFechar: () => void;
}) {
  const [convenio, setConvenio] = useState<NomeConvenio>('wellhub');
  const [alunaId, setAlunaId] = useState(alunas[0]?.id ?? '');
  const [chaveAula, setChaveAula] = useState('');
  const [identificadorExterno, setIdentificadorExterno] = useState('');
  const [contingencia, setContingencia] = useState(false);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ convenio, alunaId, chaveAula, identificadorExterno, contingencia });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        No sistema final, a reserva chega pela integração quando a aluna reserva no aplicativo do convênio. Sem API
        no protótipo, ela é registrada aqui — o efeito no studio é idêntico: ocupa vaga na sessão e aparece na
        chamada.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Convênio" value={convenio} onChange={(e) => setConvenio(e.target.value as NomeConvenio)}>
          {NOMES_CONVENIO.map((item) => (
            <option key={item.valor} value={item.valor}>
              {item.rotulo}
            </option>
          ))}
        </SelectField>

        <SelectField label="Aluna de convênio" value={alunaId} onChange={(e) => setAlunaId(e.target.value)} required>
          <option value="">Selecione…</option>
          {alunas.map((aluna) => (
            <option key={aluna.id} value={aluna.id}>
              {aluna.nome}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Aula espelhada"
          value={chaveAula}
          onChange={(e) => setChaveAula(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
          dica="Só aparecem sessões marcadas para espelhamento, dentro da janela do convênio."
        >
          <option value="">Selecione…</option>
          {aulas.map((aula) => (
            <option
              key={`${aula.sessao.id}|${aula.data}`}
              value={`${aula.sessao.id}|${aula.data}`}
              disabled={aula.vagas === 0}
            >
              {formatarDataBR(aula.data)} · {aula.sessao.horarioInicio} · {aula.modalidade?.nome ?? 'Modalidade'} ·{' '}
              {aula.vagas} vaga(s)
            </option>
          ))}
        </SelectField>

        <TextField
          label="Identificador no convênio"
          value={identificadorExterno}
          onChange={(e) => setIdentificadorExterno(e.target.value)}
          dica="Opcional. Em branco, o protótipo gera um código."
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={contingencia}
          onChange={(e) => setContingencia(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
        Registro de contingência (integração indisponível)
      </label>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Registrando…' : 'Registrar reserva'}
        </Button>
      </div>
    </form>
  );
}

function FormularioAlunaDeConvenio({
  onConfirmar,
  onFechar,
}: {
  onConfirmar: (dados: { nome: string; email: string; cpf: string; telefone: string }) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onConfirmar({ nome, email, cpf, telefone });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        A aluna de convênio existe no studio para ocupar vaga e aparecer na chamada. Ela não tem pacote nem saldo — o
        vínculo financeiro dela é com o parceiro.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoFocus
          wrapperClassName="sm:col-span-2"
        />
        <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        <TextField
          label="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variante="secundaria" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

function FormularioIntegracao({
  convenio,
  integracao,
  onSalvar,
  onFechar,
}: {
  convenio: NomeConvenio;
  integracao: ConvenioIntegracao | undefined;
  onSalvar: (dados: {
    credenciais: string;
    situacaoIntegracao: ConvenioIntegracao['situacaoIntegracao'];
  }) => Promise<void>;
  onFechar: () => void;
}) {
  const [credenciais, setCredenciais] = useState(integracao?.credenciais ?? '');
  const [situacao, setSituacao] = useState<ConvenioIntegracao['situacaoIntegracao']>(
    integracao?.situacaoIntegracao ?? 'ativa',
  );
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await onSalvar({ credenciais, situacaoIntegracao: situacao });
      onFechar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={`Credencial do ${rotuloDoConvenio(convenio)}`}
          value={credenciais}
          onChange={(e) => setCredenciais(e.target.value)}
          required
          autoFocus
          dica="Chave de integração fornecida pelo parceiro. Não vai para a trilha de auditoria."
          wrapperClassName="sm:col-span-2"
        />
        <SelectField
          label="Situação da integração"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as ConvenioIntegracao['situacaoIntegracao'])}
          wrapperClassName="sm:col-span-2"
        >
          <option value="ativa">Ativa</option>
          <option value="contingencia">Em contingência</option>
          <option value="inativa">Inativa</option>
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

type ModalAberto =
  | { tipo: 'reserva' }
  | { tipo: 'aluna' }
  | { tipo: 'integracao'; convenio: NomeConvenio }
  | null;

/**
 * Convênios corporativos (M13): credenciais, seleção do que é espelhado,
 * reservas recebidas com check-in e o relatório de conferência do repasse.
 */
export function ConveniosPage() {
  const { usuario } = useSessao();
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const [aba, setAba] = useState<Aba>('reservas');
  const [integracoes, setIntegracoes] = useState<ConvenioIntegracao[]>([]);
  const [sessoes, setSessoes] = useState<SessaoEspelhada[]>([]);
  const [aulas, setAulas] = useState<AulaEspelhadaDisponivel[]>([]);
  const [reservas, setReservas] = useState<ReservaDetalhada[]>([]);
  const [alunas, setAlunas] = useState<AlunaDeConvenio[]>([]);
  const [relatorio, setRelatorio] = useState<LinhaRelatorioConvenio[]>([]);
  const [janela, setJanela] = useState(7);
  const [modal, setModal] = useState<ModalAberto>(null);
  const [carregando, setCarregando] = useState(true);

  const periodo = useMemo(() => periodoAtual(), []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [
      listaIntegracoes,
      listaSessoes,
      listaAulas,
      listaReservas,
      listaAlunas,
      linhas,
      janelaDias,
    ] = await Promise.all([
      listarIntegracoes(),
      listarSessoesParaEspelhamento(),
      listarAulasEspelhadas(),
      listarReservas(),
      listarAlunasDeConvenio(),
      relatorioDeConvenios({ dataInicio: periodo.dataInicio, dataFim: periodo.dataFim }),
      janelaDoConvenioEmDias(),
    ]);

    setIntegracoes(listaIntegracoes);
    setSessoes(listaSessoes);
    setAulas(listaAulas);
    setReservas(listaReservas);
    setAlunas(listaAlunas);
    setRelatorio(linhas);
    setJanela(janelaDias);
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<void>, mensagem: string) {
    try {
      await acao();
      await carregar();
      mostrarToast(mensagem, 'sucesso');
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    }
  }

  const espelhadas = sessoes.filter((s) => s.sessao.espelhadaConvenio).length;
  const confirmadas = reservas.filter((r) => r.situacao === 'confirmada');
  const semCheckin = confirmadas.filter((r) => !r.checkinValidado);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Convênios corporativos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {espelhadas} sessão(ões) espelhada(s) · janela própria de {janela} dias · {confirmadas.length} reserva(s)
            confirmada(s), {semCheckin.length} sem check-in.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={reservas.length === 0}
            onClick={() =>
              baixarCSV({
                nomeArquivo: 'convenios',
                itens: reservas,
                colunas: [
                  { cabecalho: 'Convênio', valor: (item) => rotuloDoConvenio(item.convenio) },
                  { cabecalho: 'Identificador', valor: (item) => item.identificadorExterno },
                  { cabecalho: 'Aluna', valor: (item) => item.nomeAluna },
                  { cabecalho: 'Data da aula', valor: (item) => item.dataAula },
                  { cabecalho: 'Aula', valor: (item) => item.descricaoAula },
                  { cabecalho: 'Situação', valor: (item) => item.situacao },
                  { cabecalho: 'Check-in', valor: (item) => (item.checkinValidado ? 'validado' : 'pendente') },
                  { cabecalho: 'Presença', valor: (item) => item.presenca ?? '' },
                  { cabecalho: 'Origem do registro', valor: (item) => item.origemRegistro ?? 'integracao' },
                ],
              })
            }
          >
            Exportar CSV
          </Button>
          <Button variante="secundaria" onClick={() => setModal({ tipo: 'aluna' })}>
            Nova aluna de convênio
          </Button>
          <Button onClick={() => setModal({ tipo: 'reserva' })} disabled={alunas.length === 0}>
            Registrar reserva
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            aria-pressed={aba === item.id}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              aba === item.id
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : (
        <>
          {aba === 'reservas' && (
            <>
              {reservas.length === 0 ? (
                <p className="mt-6 text-sm text-neutral-500">
                  Nenhuma reserva recebida ainda. Marque sessões para espelhamento e use "Registrar reserva" para
                  simular o que chega do aplicativo do convênio.
                </p>
              ) : (
                <Tabela
                  rotulo="Reservas de convênio"
                  itens={reservas}
                  chave={(item) => item.id}
                  busca={{
                    placeholder: 'Buscar por aluna',
                    corresponde: (item, termo) => item.nomeAluna.toLowerCase().includes(termo),
                  }}
                  colunas={[
                    { chave: 'aluna', rotulo: 'Aluna' },
                    { chave: 'aula', rotulo: 'Aula' },
                    { chave: 'convenio', rotulo: 'Convênio' },
                    { chave: 'checkin', rotulo: 'Check-in' },
                    { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
                  ]}
                  renderLinha={(item) => (
                    <LinhaTabela key={item.id}>
                      <CelulaTabela>
                        <p className="font-medium text-ink">{item.nomeAluna}</p>
                        <p className="text-xs text-neutral-500">{item.identificadorExterno}</p>
                        {/* RF-CNV-09: esta aula é do convênio, mas a aluna
                            também tem créditos — as duas coisas convivem. */}
                        {item.tambemTemPacote && (
                          <p className="text-xs text-neutral-500">Também tem pacote de créditos no studio</p>
                        )}
                      </CelulaTabela>
                      <CelulaTabela>
                        <p>{item.descricaoAula}</p>
                        <p className="text-xs text-neutral-500">
                          {item.dataAula ? formatarDataBR(item.dataAula) : '—'}
                          {item.presenca ? ` · ${item.presenca === 'presente' ? 'presente' : 'faltou'}` : ''}
                        </p>
                      </CelulaTabela>
                      <CelulaTabela>
                        <Badge tom="info">{rotuloDoConvenio(item.convenio)}</Badge>
                        {item.origemRegistro === 'contingencia' && (
                          <p className="mt-1 text-xs text-amber-700">Contingência</p>
                        )}
                      </CelulaTabela>
                      <CelulaTabela>
                        {item.situacao === 'cancelada' ? (
                          <Badge tom="neutro">Cancelada</Badge>
                        ) : item.checkinValidado ? (
                          <Badge tom="sucesso">Validado</Badge>
                        ) : (
                          <Badge tom="aviso">Pendente</Badge>
                        )}
                      </CelulaTabela>
                      <CelulaTabela alinhamento="direita">
                        {item.situacao === 'confirmada' && (
                          <div className="inline-flex gap-1">
                            {!item.checkinValidado && (
                              <Button
                                variante="fantasma"
                                onClick={() =>
                                  executar(() => validarCheckin(item).then(() => undefined), 'Check-in validado.')
                                }
                              >
                                Validar check-in
                              </Button>
                            )}
                            <Button
                              variante="fantasma"
                              onClick={async () => {
                                if (!usuario) return;
                                const ok = await confirmar({
                                  titulo: 'Cancelar reserva',
                                  mensagem: `Cancelar a reserva de ${item.nomeAluna} libera a vaga na aula. No sistema final, isso chega do aplicativo do convênio.`,
                                  textoConfirmar: 'Cancelar reserva',
                                  perigo: true,
                                });
                                if (!ok) return;
                                await executar(
                                  () => cancelarReserva({ reserva: item, autorId: usuario.id }),
                                  'Reserva cancelada e vaga liberada.',
                                );
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </CelulaTabela>
                    </LinhaTabela>
                  )}
                />
              )}
            </>
          )}

          {aba === 'espelhamento' && (
            <>
              <p className="mt-6 text-sm text-neutral-500">
                A administração escolhe quais sessões da grade recorrente são publicadas nos aplicativos dos convênios
                (RF-CNV-02). As vagas ocupadas por convênio contam na mesma capacidade da modalidade.
              </p>
              {/* RF-CNV-01: a regra nova do v2.0. Sem dizer isso aqui, a
                  ausência das aulas excepcionais na lista parece falha. */}
              <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 ring-1 ring-inset ring-neutral-200">
                <strong className="font-medium text-ink">Workshops e aulas particulares não são espelhados.</strong> As
                aulas excepcionais são criadas pela administração e alocadas por ela, e não chegam aos convênios — por
                isso não aparecem nesta lista.
              </p>
              <Tabela
                rotulo="Sessões e espelhamento"
                itens={sessoes}
                chave={(item) => item.sessao.id}
                busca={{
                  placeholder: 'Buscar por modalidade ou professora',
                  corresponde: (item, termo) =>
                    (item.modalidade?.nome ?? '').toLowerCase().includes(termo) ||
                    item.nomeProfessora.toLowerCase().includes(termo),
                }}
                colunas={[
                  { chave: 'modalidade', rotulo: 'Modalidade' },
                  { chave: 'quando', rotulo: 'Dias e horário' },
                  { chave: 'professora', rotulo: 'Professora' },
                  { chave: 'espelhada', rotulo: 'Espelhamento' },
                  { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
                ]}
                renderLinha={(item) => (
                  <LinhaTabela key={item.sessao.id}>
                    <CelulaTabela>
                      <p className="font-medium text-ink">{item.modalidade?.nome ?? 'Modalidade removida'}</p>
                      <p className="text-xs text-neutral-500">até {item.sessao.capacidade} alunas</p>
                    </CelulaTabela>
                    <CelulaTabela>
                      <p>{rotularDias(item.sessao.diasSemana)}</p>
                      <p className="text-xs text-neutral-500">
                        {item.sessao.horarioInicio}–{item.sessao.horarioFim}
                      </p>
                    </CelulaTabela>
                    <CelulaTabela>{item.nomeProfessora}</CelulaTabela>
                    <CelulaTabela>
                      <Badge tom={item.sessao.espelhadaConvenio ? 'sucesso' : 'neutro'}>
                        {item.sessao.espelhadaConvenio ? 'Publicada' : 'Fora dos convênios'}
                      </Badge>
                    </CelulaTabela>
                    <CelulaTabela alinhamento="direita">
                      <Button
                        variante="fantasma"
                        onClick={() => {
                          if (!usuario) return;
                          executar(
                            () => alternarEspelhamento(item.sessao, usuario.id).then(() => undefined),
                            item.sessao.espelhadaConvenio
                              ? 'Sessão retirada do espelhamento.'
                              : 'Sessão publicada nos convênios.',
                          );
                        }}
                      >
                        {item.sessao.espelhadaConvenio ? 'Retirar' : 'Publicar'}
                      </Button>
                    </CelulaTabela>
                  </LinhaTabela>
                )}
              />
            </>
          )}

          {aba === 'integracoes' && (
            <ul className="mt-6 flex flex-col gap-3">
              {NOMES_CONVENIO.map((item) => {
                const integracao = integracoes.find((i) => i.convenio === item.valor);
                return (
                  <li
                    key={item.valor}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.rotulo}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{descreverIntegracao(integracao)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {integracao && (
                        <Badge
                          tom={
                            integracao.situacaoIntegracao === 'ativa'
                              ? 'sucesso'
                              : integracao.situacaoIntegracao === 'contingencia'
                                ? 'aviso'
                                : 'neutro'
                          }
                        >
                          {integracao.situacaoIntegracao === 'ativa'
                            ? 'Ativa'
                            : integracao.situacaoIntegracao === 'contingencia'
                              ? 'Contingência'
                              : 'Inativa'}
                        </Badge>
                      )}
                      {integracao && integracao.situacaoIntegracao !== 'inativa' && temIntegracaoAutomatica(item.valor) && (
                        <Button
                          variante="secundaria"
                          onClick={() =>
                            executar(
                              () => registrarSincronizacao(integracao).then(() => undefined),
                              `Grade sincronizada com o ${item.rotulo}.`,
                            )
                          }
                        >
                          Sincronizar grade
                        </Button>
                      )}
                      {/* Sem integração automática nesta fase não há
                          credencial a guardar: o que existe é a reserva
                          manual, na aba Reservas (RF-CNV-14, EV-21). */}
                      {temIntegracaoAutomatica(item.valor) ? (
                        <Button
                          variante="secundaria"
                          onClick={() => setModal({ tipo: 'integracao', convenio: item.valor })}
                        >
                          {integracao ? 'Editar credenciais' : 'Cadastrar credenciais'}
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-500">Sem credencial nesta fase</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {aba === 'relatorio' && (
            <>
              <p className="mt-6 text-sm text-neutral-500 first-letter:uppercase">
                {nomeDoMes(periodo.mes)} de {periodo.ano} · base de conferência do repasse: só o check-in validado
                autoriza o pagamento pelo convênio.
              </p>
              {/* RF-CNV-08: a ausência de um "usadas / restantes" na tabela é
                  regra de escopo, não lacuna — e precisa estar dita. */}
              <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 ring-1 ring-inset ring-neutral-200">
                <strong className="font-medium text-ink">O studio não controla quantas aulas cada aluna pode fazer.</strong>{' '}
                Esse limite é do próprio convênio: aqui o que se confere é o que aconteceu no período — reservas,
                check-ins validados, ausências e reservas sem check-in.
              </p>
              <Tabela
                rotulo="Relatório de convênios"
                itens={relatorio}
                chave={(item) => item.convenio}
                colunas={[
                  { chave: 'convenio', rotulo: 'Convênio' },
                  { chave: 'reservas', rotulo: 'Reservas', alinhamento: 'direita' },
                  { chave: 'checkins', rotulo: 'Check-ins', alinhamento: 'direita' },
                  { chave: 'semCheckin', rotulo: 'Sem check-in', alinhamento: 'direita' },
                  { chave: 'ausencias', rotulo: 'Ausências', alinhamento: 'direita' },
                  { chave: 'canceladas', rotulo: 'Canceladas', alinhamento: 'direita' },
                ]}
                renderLinha={(item) => (
                  <LinhaTabela key={item.convenio}>
                    <CelulaTabela>
                      <span className="font-medium text-ink">{rotuloDoConvenio(item.convenio)}</span>
                    </CelulaTabela>
                    <CelulaTabela alinhamento="direita">{item.reservas}</CelulaTabela>
                    <CelulaTabela alinhamento="direita">{item.checkinsValidados}</CelulaTabela>
                    <CelulaTabela alinhamento="direita">{item.semCheckin}</CelulaTabela>
                    <CelulaTabela alinhamento="direita">{item.ausencias}</CelulaTabela>
                    <CelulaTabela alinhamento="direita">{item.canceladas}</CelulaTabela>
                  </LinhaTabela>
                )}
              />
            </>
          )}
        </>
      )}

      {modal?.tipo === 'reserva' && (
        <Modal titulo="Registrar reserva de convênio" largura="larga" onFechar={() => setModal(null)}>
          <FormularioReserva
            aulas={aulas}
            alunas={alunas}
            onConfirmar={async (dados) => {
              if (!usuario) return;
              const [sessaoId, data] = dados.chaveAula.split('|');
              const aula = aulas.find((a) => a.sessao.id === sessaoId && a.data === data);
              if (!aula) throw new Error('Selecione uma aula da grade espelhada.');

              await receberReserva({
                convenio: dados.convenio,
                alunaId: dados.alunaId,
                sessao: aula.sessao,
                data: aula.data,
                identificadorExterno: dados.identificadorExterno,
                origemRegistro: dados.contingencia ? 'contingencia' : 'integracao',
                autorId: usuario.id,
              });
              await carregar();
              mostrarToast('Reserva confirmada e vaga ocupada na sessão.', 'sucesso');
            }}
            onFechar={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.tipo === 'aluna' && (
        <Modal titulo="Nova aluna de convênio" largura="larga" onFechar={() => setModal(null)}>
          <FormularioAlunaDeConvenio
            onConfirmar={async (dados) => {
              await cadastrarAlunaDeConvenio(dados);
              await carregar();
              mostrarToast('Aluna de convênio cadastrada.', 'sucesso');
            }}
            onFechar={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.tipo === 'integracao' && (
        <Modal
          titulo={`Credenciais — ${rotuloDoConvenio(modal.convenio)}`}
          largura="larga"
          onFechar={() => setModal(null)}
        >
          <FormularioIntegracao
            convenio={modal.convenio}
            integracao={integracoes.find((i) => i.convenio === modal.convenio)}
            onSalvar={async (dados) => {
              if (!usuario) return;
              await salvarIntegracao({ convenio: modal.convenio, autorId: usuario.id, ...dados });
              await carregar();
              mostrarToast('Credenciais salvas.', 'sucesso');
            }}
            onFechar={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
