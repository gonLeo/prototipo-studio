import { useCallback, useEffect, useMemo, useState } from 'react';
import { periodoAtual, periodoDoMes } from '../../hooks/comissoes';
import { indicadoresDeProfessoras } from '../../hooks/indicadoresDeProfessoras';
import type { IndicadoresDeProfessoras } from '../../hooks/indicadoresDeProfessoras';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { SelectField } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { baixarCSV } from '../../utils/csv';
import { nomeDoMes } from '../../utils/data';

/**
 * Retenção e frequência das professoras (RF-PNL-07, REL-14).
 *
 * Fica na administração, não no painel da professora: são números de
 * acompanhamento do studio sobre quem conduz as aulas.
 *
 * As duas contas estão explicadas na tela porque "retenção" e "frequência"
 * significam coisas diferentes em cada studio — e quem vai ler o número
 * precisa saber qual foi a conta.
 */

function Percentual({ valor }: { valor: number | undefined }) {
  if (valor === undefined) return <span className="text-neutral-400">—</span>;
  const tom = valor >= 80 ? 'sucesso' : valor >= 50 ? 'aviso' : 'erro';
  return <Badge tom={tom}>{valor}%</Badge>;
}

export function IndicadoresDeProfessorasPage() {
  const atual = useMemo(() => periodoAtual(), []);
  const [ano, setAno] = useState(atual.ano);
  const [mes, setMes] = useState(atual.mes);
  const [dados, setDados] = useState<IndicadoresDeProfessoras>();
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setDados(await indicadoresDeProfessoras(periodoDoMes(ano, mes)));
    setCarregando(false);
  }, [ano, mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const anos = [atual.ano - 1, atual.ano];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Indicadores de professoras</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Retenção por turma e por professora, e frequência da professora no período (RF-PNL-07).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SelectField label="Mês" value={String(mes)} onChange={(e) => setMes(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, indice) => (
              <option key={indice} value={indice}>
                {nomeDoMes(indice)}
              </option>
            ))}
          </SelectField>
          <SelectField label="Ano" value={String(ano)} onChange={(e) => setAno(Number(e.target.value))}>
            {anos.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </SelectField>
          <Button
            variante="secundaria"
            disabled={!dados || dados.professoras.length === 0}
            onClick={() => {
              if (!dados) return;
              baixarCSV({
                nomeArquivo: `indicadores-professoras-${ano}-${String(mes + 1).padStart(2, '0')}`,
                itens: dados.professoras,
                colunas: [
                  { cabecalho: 'Professora', valor: (item) => item.nome },
                  { cabecalho: 'Aulas atribuídas', valor: (item) => item.aulasAtribuidas },
                  { cabecalho: 'Aulas conduzidas', valor: (item) => item.aulasConduzidas },
                  { cabecalho: 'Frequência (%)', valor: (item) => item.frequencia ?? '' },
                  { cabecalho: 'Alunas no período anterior', valor: (item) => item.alunasNoPeriodoAnterior },
                  { cabecalho: 'Alunas que voltaram', valor: (item) => item.alunasQueVoltaram },
                  { cabecalho: 'Retenção (%)', valor: (item) => item.retencao ?? '' },
                ],
              });
            }}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {carregando || !dados ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : (
        <>
          <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
            <span className="font-semibold text-ink">Como as contas são feitas.</span> Frequência: aulas conduzidas
            (chamada finalizada) sobre aulas atribuídas no período — a substituição conta para quem conduziu, e aulas
            canceladas pelo studio saem da conta. Retenção: alunas com presença no período anterior (
            {nomeDoMes(dados.periodoAnterior.mes)} de {dados.periodoAnterior.ano}) que voltaram a ter presença neste
            período. Sem alunas no período anterior, não há o que reter e o indicador aparece como "—".
          </p>

          <Tabela
            rotulo="Indicadores por professora"
            itens={dados.professoras}
            chave={(item) => item.professoraId}
            colunas={[
              { chave: 'professora', rotulo: 'Professora' },
              { chave: 'aulas', rotulo: 'Aulas' },
              { chave: 'frequencia', rotulo: 'Frequência' },
              { chave: 'alunas', rotulo: 'Alunas do mês anterior' },
              { chave: 'retencao', rotulo: 'Retenção' },
            ]}
            renderLinha={(item) => (
              <LinhaTabela key={item.professoraId}>
                <CelulaTabela>
                  <p className="font-medium text-ink">{item.nome}</p>
                </CelulaTabela>
                <CelulaTabela>
                  {item.aulasConduzidas} de {item.aulasAtribuidas} atribuída(s)
                </CelulaTabela>
                <CelulaTabela>
                  <Percentual valor={item.frequencia} />
                </CelulaTabela>
                <CelulaTabela>
                  {item.alunasNoPeriodoAnterior === 0
                    ? '—'
                    : `${item.alunasQueVoltaram} de ${item.alunasNoPeriodoAnterior} voltaram`}
                </CelulaTabela>
                <CelulaTabela>
                  <Percentual valor={item.retencao} />
                </CelulaTabela>
              </LinhaTabela>
            )}
          />

          <h2 className="mt-8 text-sm font-semibold text-ink">Retenção por turma</h2>
          <Tabela
            rotulo="Retenção por turma"
            itens={dados.turmas}
            chave={(item) => item.sessaoId}
            colunas={[
              { chave: 'turma', rotulo: 'Turma' },
              { chave: 'professora', rotulo: 'Professora' },
              { chave: 'alunas', rotulo: 'Alunas do mês anterior' },
              { chave: 'retencao', rotulo: 'Retenção' },
            ]}
            renderLinha={(item) => (
              <LinhaTabela key={item.sessaoId}>
                <CelulaTabela>
                  <p className="font-medium text-ink">{item.nomeModalidade}</p>
                  <p className="text-xs text-neutral-500">{item.diasEHorario}</p>
                </CelulaTabela>
                <CelulaTabela>{item.nomeProfessora}</CelulaTabela>
                <CelulaTabela>
                  {item.alunasNoPeriodoAnterior === 0
                    ? '—'
                    : `${item.alunasQueVoltaram} de ${item.alunasNoPeriodoAnterior} voltaram`}
                </CelulaTabela>
                <CelulaTabela>
                  <Percentual valor={item.retencao} />
                </CelulaTabela>
              </LinhaTabela>
            )}
          />
        </>
      )}
    </div>
  );
}
