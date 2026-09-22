import { Link, useParams } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaProfessora } from '../../hooks/useAgendaDaProfessora';
import { useFichaParaProfessora } from '../../hooks/fichaParaProfessora';
import { Badge } from '../../components/ui/Badge';
import { PERGUNTAS_ANAMNESE } from '../../data/anamnese';
import { formatarDataBR } from '../../utils/data';
import { rotuloStatusCarteira } from '../../utils/creditos';

/**
 * Ficha da aluna vista pela professora (RF-PRE-09), somente leitura.
 *
 * A anamnese vem primeiro porque é o motivo de a tela existir: a professora
 * abre isto antes da aula para saber o que observar. O pacote aparece só
 * como situação — se a aluna tem crédito e até quando —, sem valores.
 *
 * Abrir esta tela **grava** um registro de auditoria (RNF-05). É a única
 * exceção documentada à regra de que carregar uma tela não escreve no
 * banco: o requisito pede exatamente esse registro.
 */
export function FichaDaAlunaProfessoraPage() {
  const { alunaId } = useParams<{ alunaId: string }>();
  const { usuario } = useSessao();
  const { professora } = useAgendaDaProfessora(usuario?.id);
  const { ficha, carregando } = useFichaParaProfessora({
    alunaId,
    professoraId: professora?.id,
    autorId: usuario?.id,
  });

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!ficha) return <p className="text-sm text-neutral-500">Aluna não encontrada.</p>;

  const { aluna, usuario: dadosDaAluna, anamnese, leitura } = ficha;

  return (
    <div className="max-w-3xl">
      <Link to="/professora/alunas" className="text-sm font-medium text-primary-700 hover:text-primary-800">
        ← Alunas
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink">{dadosDaAluna.nome}</h1>
        {leitura ? (
          <Badge tom={leitura.motivoFinalizando ? 'aviso' : 'sucesso'}>{rotuloStatusCarteira(leitura.status)}</Badge>
        ) : (
          <Badge tom="neutro">Sem pacote ativo</Badge>
        )}
        {aluna.origem === 'convenio' && <Badge tom="info">Convênio</Badge>}
      </div>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Ficha de anamnese</h2>
        {!anamnese ? (
          <p className="mt-2 text-sm text-neutral-500">
            Ainda não preenchida. Converse com a aluna antes da aula sobre lesões, dores e condições de saúde.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-neutral-500">
              Respostas autodeclaradas em {formatarDataBR(anamnese.dataPreenchimento.slice(0, 10))}.
            </p>
            <dl className="mt-3 flex flex-col gap-3">
              {PERGUNTAS_ANAMNESE.map((pergunta) => {
                const resposta = anamnese.respostas[pergunta.chave] || '—';
                const atencao = resposta.startsWith('Sim');
                return (
                  <div key={pergunta.chave}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {pergunta.pergunta}
                    </dt>
                    <dd className={`text-sm ${atencao ? 'font-medium text-amber-700' : 'text-ink'}`}>{resposta}</dd>
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Contato</h2>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Telefone</dt>
              <dd className="text-ink">{aluna.telefone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Contato de emergência</dt>
              <dd className="text-ink">{aluna.contatoEmergencia || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Data de nascimento</dt>
              <dd className="text-ink">
                {aluna.dataNascimento ? formatarDataBR(aluna.dataNascimento) : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Pacote</h2>
          {!leitura ? (
            <p className="mt-2 text-sm text-neutral-500">
              {aluna.origem === 'convenio'
                ? 'Aluna de convênio: reserva pelo aplicativo do parceiro, sem créditos no studio.'
                : 'Sem pacote ativo no momento.'}
            </p>
          ) : (
            <dl className="mt-2 flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Créditos disponíveis</dt>
                <dd className="text-ink">{leitura.disponiveis}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Validade</dt>
                <dd className="text-ink">
                  {ficha.carteira ? formatarDataBR(ficha.carteira.dataValidade) : '—'}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Próximas aulas</h2>
        {ficha.proximasAulas.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nenhuma aula agendada.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {ficha.proximasAulas.map((aula) => (
              <li key={`${aula.data}-${aula.horarioInicio}`} className="flex justify-between gap-3">
                <span className="text-ink">
                  {formatarDataBR(aula.data)} · {aula.nomeModalidade}
                </span>
                <span className="text-neutral-500">{aula.horarioInicio}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-xs text-neutral-500">
        Esta consulta foi registrada na trilha de auditoria, com a sua identificação e a data e hora (RNF-05).
      </p>
    </div>
  );
}
