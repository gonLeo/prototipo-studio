import { useCallback, useEffect, useState } from 'react';
import { registroAuditoriaRepositorio, usuarioRepositorio } from '../../services/repositorios';
import type { RegistroAuditoria } from '../../types/domain';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR } from '../../utils/data';

interface RegistroDetalhado extends RegistroAuditoria {
  nomeAutor: string;
  rotuloOperacao: string;
}

function rotularOperacao(operacao: string): string {
  const texto = operacao.replaceAll('_', ' ');
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

function formatarValor(valor: unknown): string {
  if (valor === undefined || valor === null) return '—';
  return JSON.stringify(valor, null, 2);
}

/**
 * Trilha de auditoria (RF-PER-05): autor, data e hora de toda operação que
 * alterou contrato, saldo, situação financeira, chamada ou comissão.
 *
 * A tela é só leitura — registro de auditoria não se edita nem se apaga,
 * porque é exatamente isso que o torna confiável.
 */
export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroDetalhado[]>([]);
  const [entidade, setEntidade] = useState('todas');
  const [detalhe, setDetalhe] = useState<RegistroDetalhado | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [lista, usuarios] = await Promise.all([
      registroAuditoriaRepositorio.listar(),
      usuarioRepositorio.listar(),
    ]);

    setRegistros(
      lista
        .map((registro) => ({
          ...registro,
          nomeAutor: usuarios.find((u) => u.id === registro.autorId)?.nome ?? 'Autor removido',
          rotuloOperacao: rotularOperacao(registro.operacao),
        }))
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const entidades = [...new Set(registros.map((r) => r.entidadeAfetada))].sort();
  const visiveis = entidade === 'todas' ? registros : registros.filter((r) => r.entidadeAfetada === entidade);

  function exportar() {
    baixarCSV({
      nomeArquivo: 'auditoria',
      itens: visiveis,
      colunas: [
        { cabecalho: 'Data e hora', valor: (item) => item.dataHora },
        { cabecalho: 'Autor', valor: (item) => item.nomeAutor },
        { cabecalho: 'Entidade', valor: (item) => item.entidadeAfetada },
        { cabecalho: 'Operação', valor: (item) => item.rotuloOperacao },
        { cabecalho: 'Valor anterior', valor: (item) => JSON.stringify(item.valorAnterior ?? '') },
        { cabecalho: 'Valor novo', valor: (item) => JSON.stringify(item.valorNovo ?? '') },
      ],
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Trilha de auditoria</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {registros.length} operação(ões) registrada(s) com autor, data e hora. Somente leitura.
          </p>
        </div>
        <Button variante="secundaria" onClick={exportar} disabled={visiveis.length === 0}>
          Exportar CSV
        </Button>
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : registros.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhuma operação auditável registrada ainda. Alterações de contrato, bolsa, financeiro, chamada e comissão
          aparecem aqui automaticamente.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[{ valor: 'todas', rotulo: 'Todas as entidades' }, ...entidades.map((e) => ({ valor: e, rotulo: e }))].map(
              (item) => (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => setEntidade(item.valor)}
                  aria-pressed={entidade === item.valor}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    entidade === item.valor
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {item.rotulo}
                </button>
              ),
            )}
          </div>

          <Tabela
            rotulo="Trilha de auditoria"
            itens={visiveis}
            chave={(item) => item.id}
            busca={{
              placeholder: 'Buscar por autor ou operação',
              corresponde: (item, termo) =>
                item.nomeAutor.toLowerCase().includes(termo) || item.rotuloOperacao.toLowerCase().includes(termo),
            }}
            colunas={[
              { chave: 'quando', rotulo: 'Quando' },
              { chave: 'autor', rotulo: 'Autor' },
              { chave: 'entidade', rotulo: 'Entidade' },
              { chave: 'operacao', rotulo: 'Operação' },
              { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
            ]}
            renderLinha={(item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela>
                  <p>{formatarDataBR(item.dataHora.slice(0, 10))}</p>
                  <p className="text-xs text-neutral-500">{item.dataHora.slice(11, 16)}</p>
                </CelulaTabela>
                <CelulaTabela>{item.nomeAutor}</CelulaTabela>
                <CelulaTabela>
                  <Badge tom="neutro">{item.entidadeAfetada}</Badge>
                </CelulaTabela>
                <CelulaTabela>{item.rotuloOperacao}</CelulaTabela>
                <CelulaTabela alinhamento="direita">
                  <Button variante="fantasma" onClick={() => setDetalhe(item)}>
                    Ver valores
                  </Button>
                </CelulaTabela>
              </LinhaTabela>
            )}
          />
        </>
      )}

      {detalhe && (
        <Modal titulo={detalhe.rotuloOperacao} largura="larga" onFechar={() => setDetalhe(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              {detalhe.entidadeAfetada} · {detalhe.nomeAutor} · {formatarDataBR(detalhe.dataHora.slice(0, 10))} às{' '}
              {detalhe.dataHora.slice(11, 16)}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Valor anterior</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-ink">
                  {formatarValor(detalhe.valorAnterior)}
                </pre>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Valor novo</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-ink">
                  {formatarValor(detalhe.valorNovo)}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
