import { useCallback, useEffect, useState } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useTermos, registrarAceiteEAnamnese } from '../../hooks/useTermos';
import { useToast } from '../../hooks/useToast';
import { alunaRepositorio, contratoRepositorio, pacoteRepositorio } from '../../services/repositorios';
import type { Aluna, Contrato, Pacote } from '../../types/domain';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TermoEAnamnese } from '../../components/TermoEAnamnese';
import { diferencaEmDias, formatarDataBR, hojeISO } from '../../utils/data';
import { ehIsencaoTotal, formatarMoeda, valorComBolsa } from '../../utils/contrato';

/**
 * Painel da aluna.
 *
 * Enquanto o termo não é aceito e a anamnese não é preenchida, esta é a
 * única coisa que a aluna vê — o acesso ao agendamento fica bloqueado
 * (RF-ALU-08). Depois do aceite, o painel mostra pacote, saldo e validade
 * de forma persistente, como pede a decisão de UX do escopo.
 */
export function PainelAlunaPage() {
  const { usuario, recarregarUsuario } = useSessao();
  const { vigente: termoVigente, carregando: carregandoTermo } = useTermos();
  const mostrarToast = useToast();

  const [aluna, setAluna] = useState<Aluna | undefined>();
  const [contrato, setContrato] = useState<Contrato | undefined>();
  const [pacote, setPacote] = useState<Pacote | undefined>();
  const [carregando, setCarregando] = useState(true);

  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    const [alunas, contratos, pacotes] = await Promise.all([
      alunaRepositorio.listar(),
      contratoRepositorio.listar(),
      pacoteRepositorio.listar(),
    ]);
    const minha = alunas.find((a) => a.usuarioId === usuario.id);
    const meuContrato = contratos.find((c) => c.alunaId === minha?.id && c.situacao !== 'encerrado');
    setAluna(minha);
    setContrato(meuContrato);
    setPacote(pacotes.find((p) => p.id === meuContrato?.pacoteId));
    setCarregando(false);
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (carregando || carregandoTermo) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!usuario) return null;

  const precisaAceitar = usuario.situacao === 'aguardando_aceite' || aluna?.situacao === 'aguardando_aceite';

  if (precisaAceitar) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">Falta pouco, {usuario.nome.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Para liberar o agendamento, aceite o termo de prestação de serviço e preencha a ficha de anamnese.
        </p>

        {!termoVigente ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            O studio ainda não publicou o termo de aceite. Assim que ele estiver disponível, você poderá concluir esta
            etapa.
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEnviando(true);
              try {
                await registrarAceiteEAnamnese({
                  usuarioId: usuario.id,
                  alunaId: aluna?.id,
                  termo: termoVigente,
                  respostasAnamnese: respostas,
                });
                mostrarToast('Termo aceito e anamnese registrada. Seu agendamento está liberado.', 'sucesso');
                // A situação da usuária mudou nesta própria tela: relê a
                // sessão e a ficha para sair do estado "aguardando aceite".
                await recarregarUsuario();
                await recarregar();
              } catch (erroCapturado) {
                mostrarToast(
                  erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.',
                  'erro',
                );
                setEnviando(false);
              }
            }}
            className="mt-6 flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <TermoEAnamnese
              termo={termoVigente}
              aceito={aceito}
              onAceitar={setAceito}
              respostas={respostas}
              onResponder={(chave, valor) => setRespostas((atual) => ({ ...atual, [chave]: valor }))}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!aceito || enviando}>
                {enviando ? 'Registrando…' : 'Aceitar e liberar meu acesso'}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const percentualBolsa = aluna?.percentualBolsa ?? 0;
  const pausado = contrato?.situacao === 'trancado' || contrato?.situacao === 'suspenso';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">Seu pacote, saldo e validade ficam sempre visíveis por aqui.</p>

      {!contrato ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Você não tem um pacote ativo no momento. Fale com a administração do studio para contratar.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Saldo de aulas</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{contrato.saldoAulas}</p>
              <p className="text-xs text-neutral-500">{pacote?.nome ?? 'Pacote'}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Validade do ciclo</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatarDataBR(contrato.dataVencimentoCiclo)}
              </p>
              <p className="text-xs text-neutral-500">
                {diferencaEmDias(hojeISO(), contrato.dataVencimentoCiclo)} dias restantes
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Mensalidade</p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {!pacote
                  ? '—'
                  : ehIsencaoTotal(percentualBolsa)
                    ? 'Isenta'
                    : formatarMoeda(valorComBolsa(pacote.valorMensal, percentualBolsa))}
              </p>
              {percentualBolsa > 0 && !ehIsencaoTotal(percentualBolsa) && (
                <p className="text-xs text-emerald-700">Com {percentualBolsa}% de bolsa</p>
              )}
            </div>
          </div>

          {pausado && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom="aviso">{contrato.situacao === 'trancado' ? 'Contrato trancado' : 'Contrato suspenso'}</Badge>
              </div>
              <p className="mt-2 text-sm text-amber-800">
                Seu agendamento está pausado neste período. Fale com a administração para registrar o retorno.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
            A grade disponível e o agendamento das suas aulas chegam na próxima fase do protótipo.
          </div>
        </>
      )}
    </div>
  );
}
