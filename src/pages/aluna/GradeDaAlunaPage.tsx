import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessao } from '../../hooks/useSessao';
import { useAgendaDaAluna } from '../../hooks/useAgendaDaAluna';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { agendarAula } from '../../hooks/agendamentoDeAulas';
import type { AulaDisponivel } from '../../hooks/agendamentoDeAulas';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CartaoDeAula } from '../../components/ui/CartaoDeAula';
import { formatarCreditos } from '../../utils/creditos';
import { NavegadorDeDatas } from '../../components/ui/NavegadorDeDatas';
import { ResumoDoPacote } from './ResumoDoPacote';
import { formatarDataBR, hojeISO, somarDias } from '../../utils/data';

/**
 * Grade disponível para a aluna (RF-AGD-01).
 *
 * A navegação é por dia: a faixa começa em hoje — não existe agendamento
 * retroativo — e vai até o limite da janela configurada para o perfil
 * (RF-AGD-02). O saldo fica visível de forma persistente no topo, e os
 * bloqueios aparecem na própria tela com os botões desabilitados.
 */
export function GradeDaAlunaPage() {
  const { usuario } = useSessao();
  const agenda = useAgendaDaAluna(usuario?.id);
  const confirmar = useConfirm();
  const mostrarToast = useToast();

  const hoje = hojeISO();
  const [dataSelecionada, setDataSelecionada] = useState(hoje);
  const [agendando, setAgendando] = useState(false);

  if (agenda.carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!agenda.aluna) return <p className="text-sm text-neutral-500">Cadastro de aluna não encontrado.</p>;

  const dataMaxima = somarDias(hoje, agenda.janelaDias);
  const aulasDoDia = agenda.disponiveis.filter((aula) => aula.data === dataSelecionada);

  async function tentarAgendar(aula: AulaDisponivel) {
    if (!agenda.aluna || !usuario) return;

    const ok = await confirmar({
      titulo: 'Confirmar agendamento',
      mensagem: `${aula.modalidade?.nome ?? 'Aula'} em ${formatarDataBR(aula.data)}, às ${aula.sessao.horarioInicio}. ${formatarCreditos(aula.custoEmCreditos)} serão reservados do seu saldo. Cancelamentos com ${agenda.antecedenciaHoras}h ou mais de antecedência liberam os créditos reservados.`,
      textoConfirmar: 'Agendar',
    });
    if (!ok) return;

    setAgendando(true);
    try {
      const resultado = await agendarAula({
        aluna: agenda.aluna,
        sessao: aula.sessao,
        data: aula.data,
        origem: 'portal',
        autorId: usuario.id,
      });
      await agenda.recarregar();
      mostrarToast(
        `Aula agendada. Saldo restante: ${resultado.novoSaldo} aula(s). Cancele com ${resultado.antecedenciaMinimaHoras}h de antecedência para não perder o crédito.`,
        'sucesso',
      );
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
    } finally {
      setAgendando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Grade disponível</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Você pode agendar aulas dos próximos {agenda.janelaDias} dias.
      </p>

      <div className="mt-4">
        <ResumoDoPacote carteira={agenda.carteira} leitura={agenda.leitura} pacote={agenda.pacote} />
      </div>

      {agenda.bloqueio && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{agenda.bloqueio.motivo}</p>
          {agenda.bloqueio.detalhe && <p className="mt-1 text-sm text-amber-800">{agenda.bloqueio.detalhe}</p>}
          {/* UX-01: bloqueio de saldo ou de pacote leva direto para onde a
              aluna resolve — não faz sentido listar aulas que ela não pode
              marcar sem indicar a saída. */}
          {(agenda.bloqueio.motivo === 'Nenhum pacote ativo.' ||
            agenda.bloqueio.motivo === 'Saldo de créditos insuficiente.') && (
            <Link
              to="/aluna/meu-pacote"
              className="mt-2 inline-block text-sm font-semibold text-amber-900 underline hover:no-underline"
            >
              Ir para Meu pacote →
            </Link>
          )}
        </div>
      )}

      <div className="mt-4">
        <NavegadorDeDatas
          dataSelecionada={dataSelecionada}
          onSelecionar={setDataSelecionada}
          dataMinima={hoje}
          dataMaxima={dataMaxima}
        />
      </div>

      {aulasDoDia.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Nenhuma aula nesta data.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {aulasDoDia.map((aula) => (
            <CartaoDeAula
              key={`${aula.sessao.id}-${aula.data}`}
              titulo={`${aula.modalidade?.nome ?? 'Modalidade'} — ${aula.nomeProfessora}`}
              subtitulo={aula.nomeEspaco}
              etiqueta={aula.modalidade?.nome}
              horario={`${aula.sessao.horarioInicio} - ${aula.sessao.horarioFim}`}
              detalhe={aula.vagas > 0 ? `${aula.vagas} vaga(s)` : 'Sem vagas'}
              valor={formatarCreditos(aula.custoEmCreditos)}
              aviso={aula.impedimento}
              esmaecido={aula.impedimento !== undefined && !aula.jaAgendada}
              acao={
                aula.jaAgendada ? (
                  <Badge tom="sucesso">Agendada</Badge>
                ) : (
                  <Button
                    onClick={() => tentarAgendar(aula)}
                    disabled={agenda.bloqueio !== undefined || aula.impedimento !== undefined || agendando}
                  >
                    Agendar
                  </Button>
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
