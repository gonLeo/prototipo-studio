import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePacotes } from '../hooks/usePacotes';
import { useTermos, registrarAceiteEAnamnese, liberarAcessoDaAluna } from '../hooks/useTermos';
import { matricularAlunaPeloSite, registrarPagamentoDaPrimeiraCobranca } from '../hooks/contratosDeAluna';
import type { DadosCadastraisAluna } from '../hooks/contratosDeAluna';
import type { TipoContrato } from '../types/domain';
import { Button } from '../components/ui/Button';
import { TextField, SelectField } from '../components/ui/Field';
import { TermoEAnamnese } from '../components/TermoEAnamnese';
import { perguntasNaoRespondidas } from '../data/anamnese';
import { formatarMoeda } from '../utils/contrato';
import { formatarDataBR, hojeISO } from '../utils/data';

type Passo = 'dados' | 'pacote' | 'termo' | 'pagamento' | 'concluido';

const PASSOS: Array<{ id: Passo; rotulo: string }> = [
  { id: 'dados', rotulo: 'Seus dados' },
  { id: 'pacote', rotulo: 'Pacote' },
  { id: 'termo', rotulo: 'Termo e anamnese' },
  { id: 'pagamento', rotulo: 'Pagamento' },
];

function Trilha({ atual }: { atual: Passo }) {
  const indiceAtual = PASSOS.findIndex((p) => p.id === atual);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {PASSOS.map((passo, indice) => {
        const concluido = indice < indiceAtual;
        const ehAtual = indice === indiceAtual;
        return (
          <li key={passo.id} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                ehAtual
                  ? 'bg-primary-600 text-white'
                  : concluido
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {indice + 1}
            </span>
            <span className={ehAtual ? 'font-medium text-ink' : 'text-neutral-500'}>{passo.rotulo}</span>
            {indice < PASSOS.length - 1 && <span className="text-neutral-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Auto-matrícula pelo site (RF-ALU-04): dados, pacote, termo com anamnese
 * e pagamento em fluxo único. O acesso é liberado automaticamente ao fim,
 * sem aprovação manual.
 *
 * O pagamento é simulado — o gateway real entra no M11 (Fase 6). O
 * agendamento da primeira aula, previsto no mesmo fluxo pelo escopo,
 * depende do M7 e entra na Fase 4; até lá a conclusão orienta a aluna a
 * agendar pelo painel.
 */
export function MatriculaPage() {
  const { pacotes, carregando: carregandoPacotes } = usePacotes();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();

  const [passo, setPasso] = useState<Passo>('dados');
  const [dados, setDados] = useState<DadosCadastraisAluna>({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    contatoEmergencia: '',
  });
  const [pacoteId, setPacoteId] = useState('');
  const [tipo, setTipo] = useState<TipoContrato>('mensal');
  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string>();
  const [processando, setProcessando] = useState(false);

  const pacotesAtivos = pacotes.filter((p) => p.situacao === 'ativo');
  const pacoteEscolhido = pacotesAtivos.find((p) => p.id === pacoteId);

  // Só avança do termo com o aceite marcado E as perguntas de saúde
  // respondidas (RF-ALU-08).
  const faltamRespostas = perguntasNaoRespondidas(respostas);
  const podeAvancarDoTermo = aceito && faltamRespostas.length === 0;

  function mudarDado(campo: keyof DadosCadastraisAluna, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function concluir(e: FormEvent) {
    e.preventDefault();
    if (!termoVigente || !pacoteEscolhido) return;
    setErro(undefined);
    setProcessando(true);
    try {
      const { aluna, usuario, contrato } = await matricularAlunaPeloSite({
        dados,
        contratacao: { pacoteId, tipo, dataPrimeiraCobranca: hojeISO() },
      });
      await registrarAceiteEAnamnese({
        usuarioId: usuario.id,
        alunaId: aluna.id,
        termo: termoVigente,
        respostasAnamnese: respostas,
      });
      await registrarPagamentoDaPrimeiraCobranca(contrato);
      await liberarAcessoDaAluna({ usuarioId: usuario.id, alunaId: aluna.id });
      setPasso('concluido');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setProcessando(false);
    }
  }

  if (carregandoPacotes || carregandoTermo) {
    return <p className="p-8 text-sm text-neutral-500">Carregando…</p>;
  }

  return (
    <div className="min-h-full bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-700 text-base font-bold text-white">
            M
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Matrícula no Studio MUV</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Preencha seus dados, escolha o pacote e comece a agendar suas aulas.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {passo !== 'concluido' && (
            <div className="mb-5 border-b border-neutral-200 pb-4">
              <Trilha atual={passo} />
            </div>
          )}

          {passo === 'dados' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('pacote');
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Nome completo"
                  value={dados.nome}
                  onChange={(e) => mudarDado('nome', e.target.value)}
                  required
                  autoFocus
                  wrapperClassName="sm:col-span-2"
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={dados.email}
                  onChange={(e) => mudarDado('email', e.target.value)}
                  required
                  dica="Você receberá o acesso ao sistema neste e-mail."
                />
                <TextField
                  label="CPF"
                  value={dados.cpf}
                  onChange={(e) => mudarDado('cpf', e.target.value)}
                  required
                />
                <TextField
                  label="Telefone"
                  value={dados.telefone}
                  onChange={(e) => mudarDado('telefone', e.target.value)}
                  required
                />
                <TextField
                  label="Data de nascimento"
                  type="date"
                  value={dados.dataNascimento}
                  onChange={(e) => mudarDado('dataNascimento', e.target.value)}
                  required
                />
                <TextField
                  label="Contato de emergência"
                  value={dados.contatoEmergencia}
                  onChange={(e) => mudarDado('contatoEmergencia', e.target.value)}
                  required
                  dica="Nome e telefone de quem podemos acionar se precisar."
                  wrapperClassName="sm:col-span-2"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          )}

          {passo === 'pacote' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('termo');
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                {pacotesAtivos.map((pacote) => (
                  <label
                    key={pacote.id}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 ${
                      pacoteId === pacote.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="pacote"
                        value={pacote.id}
                        checked={pacoteId === pacote.id}
                        onChange={() => setPacoteId(pacote.id)}
                        required
                        className="mt-1 h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{pacote.nome}</span>
                        <span className="block text-xs text-neutral-500">
                          {pacote.aulasPorCiclo} aulas por ciclo · até {pacote.aulasPorSemana} por semana · acesso a
                          todas as modalidades
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {formatarMoeda(pacote.valorMensal)}
                      <span className="block text-right text-xs font-normal text-neutral-500">por mês</span>
                    </span>
                  </label>
                ))}
                {pacotesAtivos.length === 0 && (
                  <p className="text-sm text-neutral-500">Nenhum pacote disponível no momento.</p>
                )}
              </div>

              <SelectField
                label="Duração do contrato"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoContrato)}
                dica="Em ambos os casos a cobrança é mensal e recorrente."
              >
                <option value="mensal">Mensal</option>
                <option value="semestral">Semestral</option>
              </SelectField>

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('dados')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={!pacoteId}>
                  Continuar
                </Button>
              </div>
            </form>
          )}

          {passo === 'termo' && termoVigente && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasso('pagamento');
              }}
              className="flex flex-col gap-5"
            >
              <TermoEAnamnese
                termo={termoVigente}
                aceito={aceito}
                onAceitar={setAceito}
                respostas={respostas}
                onResponder={(chave, valor) => setRespostas((atual) => ({ ...atual, [chave]: valor }))}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variante="secundaria" onClick={() => setPasso('pacote')}>
                  Voltar
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  {!podeAvancarDoTermo && (
                    <p className="text-xs text-neutral-500">
                      {!aceito && 'Aceite o termo'}
                      {!aceito && faltamRespostas.length > 0 && ' e '}
                      {faltamRespostas.length > 0 && `responda ${faltamRespostas.length} pergunta(s) de saúde`} para
                      continuar.
                    </p>
                  )}
                  <Button type="submit" disabled={!podeAvancarDoTermo}>
                    Continuar
                  </Button>
                </div>
              </div>
            </form>
          )}

          {passo === 'termo' && !termoVigente && (
            <p className="text-sm text-rose-600">
              Nenhuma versão do termo está publicada. A administração precisa publicar o termo antes de abrir a
              matrícula pelo site.
            </p>
          )}

          {passo === 'pagamento' && pacoteEscolhido && (
            <form onSubmit={concluir} className="flex flex-col gap-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <h2 className="text-sm font-semibold text-ink">Resumo</h2>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Pacote</dt>
                    <dd className="text-ink">{pacoteEscolhido.nome}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Aulas creditadas</dt>
                    <dd className="text-ink">{pacoteEscolhido.aulasPorCiclo} aulas</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500">Primeira cobrança</dt>
                    <dd className="text-ink">{formatarDataBR(hojeISO())}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-neutral-200 pt-1">
                    <dt className="font-medium text-ink">Valor mensal</dt>
                    <dd className="font-semibold text-ink">{formatarMoeda(pacoteEscolhido.valorMensal)}</dd>
                  </div>
                </dl>
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                Pagamento simulado neste protótipo — a integração com o gateway entra junto do módulo financeiro.
                Ao concluir, seu acesso é liberado automaticamente.
              </p>

              {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

              <div className="flex justify-between">
                <Button type="button" variante="secundaria" onClick={() => setPasso('termo')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={processando}>
                  {processando ? 'Processando…' : 'Pagar e concluir matrícula'}
                </Button>
              </div>
            </form>
          )}

          {passo === 'concluido' && (
            <div className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
                ✓
              </span>
              <h2 className="mt-3 text-lg font-semibold text-ink">Matrícula concluída</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Enviamos o acesso para <span className="font-medium text-ink">{dados.email}</span>. Seu saldo de{' '}
                {pacoteEscolhido?.aulasPorCiclo} aulas já está creditado e o agendamento está liberado.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Ir para o login
              </Link>
            </div>
          )}
        </div>

        {passo !== 'concluido' && (
          <p className="mt-4 text-center text-xs text-neutral-500">
            Já é aluna?{' '}
            <Link to="/login" className="font-medium text-primary-700">
              Entrar no sistema
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
