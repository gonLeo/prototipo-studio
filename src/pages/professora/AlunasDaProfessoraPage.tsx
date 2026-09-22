import { Link } from 'react-router-dom';
import { useAlunasParaProfessora } from '../../hooks/fichaParaProfessora';
import { Badge } from '../../components/ui/Badge';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

/**
 * Lista de alunas para a professora (RF-PRE-09).
 *
 * São todas as alunas do studio, não só as das turmas dela: a professora
 * pode receber uma aluna em reposição, numa aula excepcional ou numa
 * substituição, e precisa poder consultar quem chegou.
 *
 * A lista mostra só o que serve à condução da aula — contato e se há
 * anamnese. Nada de pacote, valores ou histórico financeiro.
 */
export function AlunasDaProfessoraPage() {
  const { alunas, carregando } = useAlunasParaProfessora();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Alunas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Consulte a ficha de qualquer aluna do studio para conhecer as condições de saúde declaradas antes da aula.
        Cada consulta fica registrada na trilha de auditoria.
      </p>

      {carregando && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && alunas.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
          Nenhuma aluna cadastrada ainda.
        </p>
      )}

      {!carregando && alunas.length > 0 && (
        <Tabela
          rotulo="Alunas do studio"
          itens={alunas}
          chave={(aluna) => aluna.id}
          busca={{
            placeholder: 'Buscar por nome, CPF ou telefone',
            corresponde: (aluna, termo) =>
              aluna.nome.toLowerCase().includes(termo) ||
              aluna.cpf.includes(termo) ||
              aluna.telefone.replace(/\D/g, '').includes(termo.replace(/\D/g, '')),
          }}
          colunas={[
            { chave: 'aluna', rotulo: 'Aluna' },
            { chave: 'anamnese', rotulo: 'Anamnese' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(aluna) => (
            <LinhaTabela key={aluna.id}>
              <CelulaTabela>
                <p className="font-medium text-ink">{aluna.nome}</p>
                <p className="text-xs text-neutral-500">{aluna.telefone}</p>
              </CelulaTabela>
              <CelulaTabela>
                {!aluna.temAnamnese ? (
                  <Badge tom="neutro">Não preenchida</Badge>
                ) : aluna.temRestricaoDeSaude ? (
                  <Badge tom="aviso">Com pontos de atenção</Badge>
                ) : (
                  <Badge tom="sucesso">Sem restrições declaradas</Badge>
                )}
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <Link
                  to={`/professora/alunas/${aluna.id}`}
                  className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  Ver ficha
                </Link>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}
    </div>
  );
}
