import { useState } from 'react';
import { efeitoDoParametro, useParametros } from '../../hooks/useParametros';
import type { Parametro } from '../../types/domain';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';

function LinhaParametro({
  parametro,
  onSalvar,
}: {
  parametro: Parametro;
  onSalvar: (valor: number) => Promise<void>;
}) {
  const [valor, setValor] = useState(String(parametro.valor));
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(undefined);
    setSalvo(false);
    const numero = Number(valor);
    try {
      await onSalvar(numero);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1800);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    }
  }

  const efeito = efeitoDoParametro({ ...parametro, valor: Number(valor) || parametro.valor });

  return (
    <LinhaTabela>
      <CelulaTabela className="font-medium text-ink">{parametro.descricao}</CelulaTabela>
      <CelulaTabela>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onBlur={salvar}
            className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
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
        informado.
      </p>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && (
        <Tabela
          rotulo="Parâmetros operacionais"
          itens={parametros}
          chave={(parametro) => parametro.id}
          busca={{ placeholder: 'Buscar parâmetro', corresponde: (parametro, termo) => parametro.descricao.toLowerCase().includes(termo) }}
          colunas={[
            { chave: 'descricao', rotulo: 'Parâmetro' },
            { chave: 'valor', rotulo: 'Valor' },
            { chave: 'efeito', rotulo: 'Efeito prático' },
          ]}
          renderLinha={(parametro) => (
            <LinhaParametro key={parametro.id} parametro={parametro} onSalvar={(valor) => atualizarValor(parametro.id, valor)} />
          )}
        />
      )}
    </div>
  );
}
