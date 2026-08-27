import { useState } from 'react';
import {
  efeitoDoParametro,
  ehParametroLegado,
  opcoesDoParametro,
  tipoDoParametro,
  useParametros,
  type ValorParametro,
} from '../../hooks/useParametros';
import type { Parametro } from '../../types/domain';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

const CLASSE_CAMPO =
  'rounded-md border border-neutral-300 px-2 py-1 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

function LinhaParametro({
  parametro,
  onSalvar,
}: {
  parametro: Parametro;
  onSalvar: (valor: ValorParametro) => Promise<void>;
}) {
  const [valor, setValor] = useState(String(parametro.valor));
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);

  const tipo = tipoDoParametro(parametro);
  const legado = ehParametroLegado(parametro);

  async function salvar(valorASalvar: ValorParametro = valor) {
    setErro(undefined);
    setSalvo(false);
    try {
      await onSalvar(valorASalvar);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1800);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  const efeito = efeitoDoParametro({ ...parametro, valor });

  return (
    <LinhaTabela>
      <CelulaTabela className="font-medium text-ink">
        <div className="flex flex-wrap items-center gap-2">
          <span>{parametro.descricao}</span>
          {legado && <Badge tom="aviso">Modelo antigo</Badge>}
        </div>
      </CelulaTabela>
      <CelulaTabela>
        <div className="flex items-center gap-2">
          {tipo === 'numero' && (
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={() => salvar()}
              className={`${CLASSE_CAMPO} w-24`}
            />
          )}

          {tipo === 'opcao' && (
            <select
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                salvar(e.target.value);
              }}
              className={`${CLASSE_CAMPO} w-64 bg-white`}
            >
              {opcoesDoParametro(parametro).map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          )}

          {tipo === 'texto' && (
            <textarea
              value={valor}
              rows={3}
              onChange={(e) => setValor(e.target.value)}
              onBlur={() => salvar()}
              className={`${CLASSE_CAMPO} w-full min-w-[18rem]`}
            />
          )}

          {salvo && <span className="text-xs font-medium text-emerald-600">Salvo</span>}
        </div>
        {erro && <p className="mt-1 text-xs font-medium text-rose-600">{erro}</p>}
      </CelulaTabela>
      <CelulaTabela className="text-neutral-500">{efeito}</CelulaTabela>
    </LinhaTabela>
  );
}

export function ParametrosPage() {
  const { parametros, carregando, atualizarValor } = useParametros();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Parâmetros operacionais</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ajustável pela administração, sem depender de suporte técnico. Cada linha mostra o efeito prático do valor
        informado. Os parâmetros marcados como <strong>modelo antigo</strong> pertencem à cobrança recorrente e saem
        quando a carteira de créditos substituir o contrato.
      </p>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && (
        <Tabela
          rotulo="Parâmetros operacionais"
          itens={parametros}
          chave={(parametro) => parametro.id}
          busca={{
            placeholder: 'Buscar parâmetro',
            corresponde: (parametro, termo) => parametro.descricao.toLowerCase().includes(termo),
          }}
          colunas={[
            { chave: 'descricao', rotulo: 'Parâmetro' },
            { chave: 'valor', rotulo: 'Valor' },
            { chave: 'efeito', rotulo: 'Efeito prático' },
          ]}
          renderLinha={(parametro) => (
            <LinhaParametro
              key={parametro.id}
              parametro={parametro}
              onSalvar={(valor) => atualizarValor(parametro, valor)}
            />
          )}
        />
      )}
    </div>
  );
}
