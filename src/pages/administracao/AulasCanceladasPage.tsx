import { useState } from 'react';
import {
  creditosDevolvidos,
  linkDoWhatsApp,
  ROTULO_ORIGEM_CANCELAMENTO,
  useAulasCanceladas,
  type AulaCancelada,
} from '../../hooks/alunasAfetadas';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { SelectField } from '../../components/ui/Field';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR, hojeISO } from '../../utils/data';

/**
 * Aulas que o studio cancelou e quem estava agendada (RF-CPR-09, fluxo
 * 6.6.1).
 *
 * Os quatro caminhos de cancelamento — exceção de calendário, exclusão de
 * sessão, solicitação aprovada da professora e conflito com aula
 * excepcional — deixam de terminar num toast que some: a relação das
 * alunas fica registrada na ocorrência, e é daqui que a administração
 * avisa cada uma pelo WhatsApp.
 *
 * O botão abre o aplicativo com a mensagem pronta e **não registra envio**:
 * o escopo é explícito em dizer que o sistema não controla isso enquanto o
 * WhatsApp não é integrado.
 */

type Periodo = 'proximas' | 'todas';

const PERIODOS: Array<{ valor: Periodo; rotulo: string }> = [
  { valor: 'proximas', rotulo: 'Aulas que ainda iam acontecer' },
  { valor: 'todas', rotulo: 'Todas, inclusive as já passadas' },
];

function Detalhe({ aula }: { aula: AulaCancelada }) {
  if (aula.alunas.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-neutral-500">
        Nenhuma aluna estava agendada nesta data — não há ninguém a avisar.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {aula.alunas.map((afetada) => (
        <li key={afetada.alunaId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {afetada.nome}
              {afetada.convenio && (
                <span className="ml-2">
                  <Badge tom="info">Convênio</Badge>
                </span>
              )}
              {afetada.experimental && (
                <span className="ml-2">
                  <Badge tom="neutro">Experimental</Badge>
                </span>
              )}
            </p>
            <p className="text-xs text-neutral-500">
              {afetada.telefone || 'Sem telefone cadastrado'}
              {afetada.creditosDevolvidos > 0 && ` · ${creditosDevolvidos(afetada.creditosDevolvidos)}`}
              {afetada.diasProrrogados > 0 && ` · +${afetada.diasProrrogados} dias de validade`}
            </p>
          </div>
          <a
            href={linkDoWhatsApp(aula, afetada)}
            target="_blank"
            rel="noopener"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Enviar mensagem
          </a>
        </li>
      ))}
    </ul>
  );
}

export function AulasCanceladasPage() {
  const { aulas, carregando } = useAulasCanceladas();
  const [periodo, setPeriodo] = useState<Periodo>('todas');
  const [aberta, setAberta] = useState<string>();

  const hoje = hojeISO();
  const filtradas = periodo === 'proximas' ? aulas.filter((a) => a.data >= hoje) : aulas;
  const totalDeAlunas = filtradas.reduce((soma, aula) => soma + aula.alunas.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Aulas canceladas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Toda aula cancelada pelo studio guarda quem estava agendada, com o contato de cada uma (RF-CPR-09). O
            aviso pelo WhatsApp é manual: o sistema abre a conversa, mas não registra o envio.
          </p>
        </div>
        <button
          type="button"
          disabled={totalDeAlunas === 0}
          onClick={() =>
            baixarCSV({
              nomeArquivo: 'alunas-afetadas',
              itens: filtradas.flatMap((aula) => aula.alunas.map((afetada) => ({ aula, afetada }))),
              colunas: [
                { cabecalho: 'Data da aula', valor: (item) => item.aula.data },
                { cabecalho: 'Horário', valor: (item) => item.aula.horarioInicio },
                { cabecalho: 'Modalidade', valor: (item) => item.aula.nomeModalidade },
                { cabecalho: 'Professora', valor: (item) => item.aula.nomeProfessora },
                { cabecalho: 'Origem', valor: (item) => ROTULO_ORIGEM_CANCELAMENTO[item.aula.origem] },
                { cabecalho: 'Motivo', valor: (item) => item.aula.motivo },
                { cabecalho: 'Aluna', valor: (item) => item.afetada.nome },
                { cabecalho: 'Telefone', valor: (item) => item.afetada.telefone },
                { cabecalho: 'Créditos devolvidos', valor: (item) => item.afetada.creditosDevolvidos },
                { cabecalho: 'Dias de validade', valor: (item) => item.afetada.diasProrrogados },
              ],
            })
          }
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mt-4 max-w-xs">
        <SelectField label="Mostrar" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
          {PERIODOS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </SelectField>
      </div>

      {carregando && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && filtradas.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
          Nenhuma aula cancelada pelo studio neste recorte.
        </p>
      )}

      {!carregando && filtradas.length > 0 && (
        <Tabela
          rotulo="Aulas canceladas pelo studio"
          itens={filtradas}
          chave={(aula) => aula.ocorrenciaId}
          busca={{
            placeholder: 'Buscar por modalidade, professora, motivo ou aluna',
            corresponde: (aula, termo) =>
              aula.nomeModalidade.toLowerCase().includes(termo) ||
              aula.nomeProfessora.toLowerCase().includes(termo) ||
              aula.motivo.toLowerCase().includes(termo) ||
              aula.alunas.some((a) => a.nome.toLowerCase().includes(termo)),
          }}
          colunas={[
            { chave: 'quando', rotulo: 'Quando' },
            { chave: 'aula', rotulo: 'Aula' },
            { chave: 'origem', rotulo: 'Por quê' },
            { chave: 'alunas', rotulo: 'Alunas', alinhamento: 'direita' },
          ]}
          renderLinha={(aula) => (
            <>
            <LinhaTabela key={aula.ocorrenciaId}>
              <CelulaTabela className="whitespace-nowrap">
                <p className="font-medium text-ink">{formatarDataBR(aula.data)}</p>
                <p className="text-xs text-neutral-500">
                  {aula.horarioInicio}–{aula.horarioFim}
                </p>
              </CelulaTabela>
              <CelulaTabela>
                <p>{aula.nomeModalidade}</p>
                <p className="text-xs text-neutral-500">{aula.nomeProfessora}</p>
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom="neutro">{ROTULO_ORIGEM_CANCELAMENTO[aula.origem]}</Badge>
                <p className="mt-1 text-xs text-neutral-500">{aula.motivo}</p>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <button
                  type="button"
                  onClick={() => setAberta(aberta === aula.ocorrenciaId ? undefined : aula.ocorrenciaId)}
                  aria-expanded={aberta === aula.ocorrenciaId}
                  className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  {aula.alunas.length === 0
                    ? 'Nenhuma aluna'
                    : `${aula.alunas.length} aluna(s)${aberta === aula.ocorrenciaId ? ' ▴' : ' ▾'}`}
                </button>
              </CelulaTabela>
            </LinhaTabela>
            {aberta === aula.ocorrenciaId && (
              <tr>
                <td colSpan={4} className="bg-neutral-50 p-0">
                  <Detalhe aula={aula} />
                </td>
              </tr>
            )}
            </>
          )}
        />
      )}
    </div>
  );
}
