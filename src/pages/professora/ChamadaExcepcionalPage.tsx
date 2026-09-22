import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useToast } from '../../hooks/useToast';
import {
  carregarChamadaDeAulaExcepcional,
  finalizarChamadaDeAulaExcepcional,
} from '../../hooks/chamadaDeAulas';
import type { AlunaNaChamada } from '../../hooks/chamadaDeAulas';
import { listarAulasExcepcionais } from '../../hooks/aulasExcepcionais';
import type { AulaExcepcionalDetalhada } from '../../hooks/aulasExcepcionais';
import type { Chamada } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatarDataBR } from '../../utils/data';
import { formatarCreditos, formatarMoeda } from '../../utils/creditos';

/**
 * Chamada de uma aula excepcional (RF-AEX-10).
 *
 * Workshop e aula particular têm chamada como qualquer outra aula. A
 * diferença está em quem aparece na lista — as alunas alocadas, não as
 * agendadas — e em quem recebe: cada professora vinculada gera um
 * lançamento com o valor informado no cadastro da aula (RF-AEX-12).
 *
 * Não havendo professora vinculada, a chamada é feita pela administração e
 * a aula não gera comissão nenhuma.
 */
export function ChamadaExcepcionalPage() {
  const { aulaId } = useParams<{ aulaId: string }>();
  const { usuario, perfilAtivo } = useSessao();
  const mostrarToast = useToast();
  const navegar = useNavigate();

  const [aula, setAula] = useState<AulaExcepcionalDetalhada>();
  const [chamada, setChamada] = useState<Chamada>();
  const [alunas, setAlunas] = useState<AlunaNaChamada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  const voltarPara =
    perfilAtivo === 'administracao' ? '/administracao/aulas-excepcionais' : '/professora/aulas';

  const carregar = useCallback(async () => {
    if (!aulaId) return;
    setCarregando(true);
    setErro(undefined);
    try {
      const aulas = await listarAulasExcepcionais();
      const encontrada = aulas.find((a) => a.id === aulaId);
      if (!encontrada) {
        setErro('Esta aula não existe mais.');
        return;
      }
      if (encontrada.situacao === 'cancelada') {
        setErro('Esta aula foi cancelada — não há chamada a fazer.');
        return;
      }
      setAula(encontrada);

      const resultado = await carregarChamadaDeAulaExcepcional(aulaId);
      setChamada(resultado.chamada);
      setAlunas(resultado.alunas);
    } finally {
      setCarregando(false);
    }
  }, [aulaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // A chave é o id da aluna ou, para participante sem cadastro, o da
  // alocação (RF-AEX-06).
  function alternarPresenca(chave: string) {
    setAlunas((atual) =>
      atual.map((aluna) => (aluna.chave === chave ? { ...aluna, presente: !aluna.presente } : aluna)),
    );
  }

  const finalizada = chamada?.situacao === 'finalizada';

  async function salvar() {
    if (!aula || !usuario) return;
    setSalvando(true);
    try {
      const resultado = await finalizarChamadaDeAulaExcepcional({ aula, alunas, autorId: usuario.id });

      mostrarToast(
        `Chamada finalizada: ${resultado.presentes} presente(s), ${resultado.ausentes} ausente(s). ` +
          (resultado.comissoesGeradas === 0
            ? 'Sem professora vinculada, a aula não gera comissão.'
            : `${resultado.comissoesGeradas} lançamento(s) de comissão, somando ${formatarMoeda(resultado.totalComissao)}${
                resultado.ehAjuste ? ', como ajuste no próximo período.' : ', no período atual.'
              }`),
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

  if (erro || !aula) {
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
          <h1 className="text-2xl font-semibold text-ink">{aula.nome}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {aula.nomeCategoria} · {formatarDataBR(aula.data)} · {aula.horarioInicio}–{aula.horarioFim}
            {aula.nomeEspaco && ` · ${aula.nomeEspaco}`}
          </p>
        </div>
        <Badge tom={finalizada ? 'sucesso' : 'aviso'}>{finalizada ? 'Chamada finalizada' : 'Chamada aberta'}</Badge>
      </div>

      <div className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm">
        <p className="text-neutral-600">
          {/* Parte das participantes pode ter sido alocada sem consumo, e
              até sem cadastro (RF-AEX-06): o custo é da categoria da aula,
              não uma afirmação sobre o que cada uma pagou. */}
          {presentes} de {alunas.length} presente(s) · {formatarCreditos(aula.custoEmCreditos)} por participação com
          consumo
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {aula.professoras.length === 0
            ? 'Sem professora vinculada: esta aula não gera comissão.'
            : `Ao finalizar: ${aula.professoras
                .map((p) => `${p.nome} — ${formatarMoeda(p.valorComissao)}`)
                .join(' · ')}`}
        </p>
      </div>

      {alunas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Nenhuma aluna alocada nesta aula.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {alunas.map((aluna) => (
            <li key={aluna.chave} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => alternarPresenca(aluna.chave)}
                disabled={finalizada}
                aria-pressed={aluna.presente}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  aluna.presente ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-300 bg-white'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-base font-medium ${aluna.presente ? 'text-ink' : 'text-neutral-500'}`}>
                    {aluna.nome}
                  </span>
                  {/* RF-PRE-02: a participante sem cadastro aparece na lista
                      identificada, com o telefone no lugar do link da ficha. */}
                  {aluna.semCadastro && (
                    <span className="text-xs text-neutral-500">Sem cadastro · {aluna.telefone}</span>
                  )}
                  {aluna.origemConvenio && (
                    <span className="text-xs text-neutral-500">Convênio · participação paga à parte</span>
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
              {/* RF-PRE-09: o mesmo atalho da chamada regular. Participante
                  sem cadastro não tem ficha para abrir. */}
              {aluna.alunaId && (
                <Link
                  to={`/professora/alunas/${aluna.alunaId}`}
                  className="self-start rounded px-1 py-0.5 text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  Ver ficha da aluna
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {!finalizada && alunas.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Finalizar chamada'}
          </Button>
        </div>
      )}
    </div>
  );
}
