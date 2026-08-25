import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import {
  carregarChamada,
  corrigirChamada,
  finalizarChamada,
  podeProfessoraEditar,
} from '../../hooks/chamadaDeAulas';
import type { AlunaNaChamada } from '../../hooks/chamadaDeAulas';
import { modalidadeRepositorio, sessaoRepositorio } from '../../services/repositorios';
import type { Chamada, Modalidade, Sessao } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatarDataBR } from '../../utils/data';
import { formatarMoeda } from '../../utils/contrato';

/**
 * Chamada de uma aula (M9).
 *
 * Feita para o celular durante a aula: lista vertical, alvo de toque
 * grande e todas as alunas já marcadas como presentes — a professora só
 * aponta as ausências (decisão de UX registrada no escopo).
 */
export function ChamadaPage() {
  const { sessaoId, data } = useParams<{ sessaoId: string; data: string }>();
  const { usuario, perfilAtivo } = useSessao();
  const mostrarToast = useToast();
  const navegar = useNavigate();

  const [sessao, setSessao] = useState<Sessao>();
  const [modalidade, setModalidade] = useState<Modalidade>();
  const [chamada, setChamada] = useState<Chamada>();
  const [alunas, setAlunas] = useState<AlunaNaChamada[]>([]);
  const [dentroDoPrazo, setDentroDoPrazo] = useState(true);
  const [prazoDias, setPrazoDias] = useState(3);
  const [justificativa, setJustificativa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const ehAdministracao = perfilAtivo === 'administracao';

  const carregar = useCallback(async () => {
    if (!sessaoId || !data) return;
    setCarregando(true);
    setErro(undefined);
    try {
      const [sessoes, modalidades] = await Promise.all([
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
      ]);
      const encontrada = sessoes.find((s) => s.id === sessaoId);
      if (!encontrada) {
        setErro('Esta sessão não existe mais.');
        return;
      }
      setSessao(encontrada);
      setModalidade(modalidades.find((m) => m.id === encontrada.modalidadeId));

      const resultado = await carregarChamada({ sessao: encontrada, data });
      setChamada(resultado.chamada);
      setAlunas(resultado.alunas);

      const prazo = await podeProfessoraEditar(data);
      setDentroDoPrazo(prazo.pode);
      setPrazoDias(prazo.prazoDias);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, [sessaoId, data]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alternarPresenca(alunaId: string) {
    setAlunas((atual) =>
      atual.map((aluna) => (aluna.alunaId === alunaId ? { ...aluna, presente: !aluna.presente } : aluna)),
    );
  }

  const voltarPara = ehAdministracao ? '/administracao/comissoes' : '/professora/aulas';
  const finalizada = chamada?.situacao === 'finalizada';
  const bloqueada = finalizada && !dentroDoPrazo && !ehAdministracao;

  async function salvar() {
    if (!sessao || !usuario || !data) return;
    setSalvando(true);
    try {
      const resultado = finalizada
        ? await corrigirChamada({
            sessao,
            alunas,
            dataAula: data,
            autorId: usuario.id,
            ehAdministracao,
            justificativa,
          })
        : await finalizarChamada({ sessao, alunas, dataAula: data, autorId: usuario.id });

      mostrarToast(
        `${finalizada ? 'Chamada corrigida' : 'Chamada finalizada'}: ${resultado.presentes} presente(s), ${resultado.ausentes} ausente(s). Comissão de ${formatarMoeda(resultado.valorComissao)}${
          resultado.ehAjuste ? ' lançada como ajuste no próximo período.' : ' gerada para o período atual.'
        }`,
        'sucesso',
      );
      navegar(voltarPara);
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;

  if (erro) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-rose-600">{erro}</p>
        <Link to={voltarPara} className="mt-2 inline-block text-sm font-medium text-primary-700">
          ← Voltar
        </Link>
      </div>
    );
  }

  const presentes = alunas.filter((a) => a.presente).length;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={voltarPara} className="text-sm font-medium text-primary-700 hover:text-primary-800">
        ← Voltar
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{modalidade?.nome ?? 'Aula'}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data && formatarDataBR(data)} · {sessao?.horarioInicio}–{sessao?.horarioFim}
          </p>
        </div>
        <Badge tom={finalizada ? 'sucesso' : 'aviso'}>{finalizada ? 'Chamada finalizada' : 'Chamada aberta'}</Badge>
      </div>

      {bloqueada && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          O prazo de {prazoDias} dias para corrigir esta chamada já passou. Peça o ajuste à administração.
        </p>
      )}

      {finalizada && ehAdministracao && !dentroDoPrazo && (
        <div className="mt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Justificativa do ajuste fora do prazo</span>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={2}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-xs text-neutral-500">Fica registrada na trilha de auditoria.</span>
          </label>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-sm">
        <span className="text-neutral-600">
          {presentes} de {alunas.length} presente(s)
        </span>
        <span className="text-xs text-neutral-500">Toque no nome para marcar ausência</span>
      </div>

      {alunas.some((a) => a.origemConvenio && !a.checkinConvenio) && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Há aluna de convênio sem check-in no aplicativo. Você pode marcá-la como presente para o controle de
          ocupação do studio — isso não substitui o check-in do convênio nem gera repasse.
        </p>
      )}

      {alunas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Nenhuma aluna agendada nesta aula.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {alunas.map((aluna) => (
            <li key={aluna.alunaId}>
              <button
                type="button"
                onClick={() => alternarPresenca(aluna.alunaId)}
                disabled={bloqueada}
                aria-pressed={aluna.presente}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  aluna.presente
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-base font-medium ${aluna.presente ? 'text-ink' : 'text-neutral-500'}`}>
                    {aluna.nome}
                  </span>
                  {aluna.experimental && (
                    <span className="mr-2 inline-block text-xs font-medium text-primary-700">Aula experimental</span>
                  )}
                  {aluna.origemConvenio && (
                    <span
                      className={`text-xs ${aluna.checkinConvenio ? 'text-emerald-700' : 'text-amber-700'}`}
                    >
                      Convênio · {aluna.checkinConvenio ? 'check-in validado' : 'check-in pendente'}
                    </span>
                  )}
                </span>

                <span
                  className={`flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold ${
                    aluna.presente ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {aluna.presente ? 'Presente' : 'Ausente'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!bloqueada && alunas.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : finalizada ? 'Salvar correção' : 'Finalizar chamada'}
          </Button>
        </div>
      )}
    </div>
  );
}
