import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTermos } from '../../hooks/useTermos';
import type { PublicoDoTermo } from '../../types/domain';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { TERMO_PADRAO, TERMO_PADRAO_PROFESSORA } from '../../data/anamnese';
import { formatarDataBR } from '../../utils/data';

const PUBLICOS: { valor: PublicoDoTermo; rotulo: string }[] = [
  { valor: 'aluna', rotulo: 'Alunas' },
  { valor: 'professora', rotulo: 'Professoras' },
];

export function TermosPage() {
  // RF-ALU-06 e RF-PRO-04: cada público tem seu texto e sua sequência de
  // versões. Publicar um termo novo de aluna não pode invalidar o aceite
  // que as professoras já deram, então as duas listas são independentes.
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoDoTermo>('aluna');
  const { termos, vigente, carregando, publicarNovaVersao, quantidadeDeAceites } = useTermos(publicoAlvo);
  const mostrarToast = useToast();

  const [modalAberto, setModalAberto] = useState(false);
  const [conteudo, setConteudo] = useState('');
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [visualizando, setVisualizando] = useState<string | null>(null);

  function abrirNovaVersao() {
    setConteudo(vigente?.conteudo ?? (publicoAlvo === 'professora' ? TERMO_PADRAO_PROFESSORA : TERMO_PADRAO));
    setErro(undefined);
    setModalAberto(true);
  }

  async function publicar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      await publicarNovaVersao(conteudo);
      mostrarToast('Nova versão do termo publicada.', 'sucesso');
      setModalAberto(false);
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Termo de aceite</h1>
          <p className="mt-1 text-sm text-neutral-500">
            O termo é versionado: publicar uma nova versão não altera as anteriores, e o sistema guarda qual versão
            cada usuária aceitou, com data, hora e endereço de IP.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PUBLICOS.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => setPublicoAlvo(item.valor)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  publicoAlvo === item.valor
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-neutral-600 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={abrirNovaVersao}>{vigente ? 'Publicar nova versão' : 'Publicar primeira versão'}</Button>
      </div>

      {carregando && <p className="mt-4 text-sm text-neutral-500">Carregando…</p>}

      {!carregando && termos.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhuma versão publicada ainda. Sem termo vigente, a aluna não consegue concluir o aceite nem a matrícula
          pelo site.
        </p>
      )}

      {!carregando && termos.length > 0 && (
        <Tabela
          rotulo="Versões do termo de aceite"
          itens={termos}
          chave={(termo) => termo.id}
          colunas={[
            { chave: 'versao', rotulo: 'Versão' },
            { chave: 'publicacao', rotulo: 'Publicada em' },
            { chave: 'aceites', rotulo: 'Aceites' },
            { chave: 'situacao', rotulo: 'Situação' },
            { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
          ]}
          renderLinha={(termo) => (
            <LinhaTabela key={termo.id}>
              <CelulaTabela className="font-medium text-ink">v{termo.versao}</CelulaTabela>
              <CelulaTabela>{formatarDataBR(termo.dataPublicacao.slice(0, 10))}</CelulaTabela>
              <CelulaTabela>
                {quantidadeDeAceites(termo.id)} {publicoAlvo === 'professora' ? 'professora(s)' : 'aluna(s)'}
              </CelulaTabela>
              <CelulaTabela>
                <Badge tom={termo.situacao === 'ativo' ? 'sucesso' : 'neutro'}>
                  {termo.situacao === 'ativo' ? 'Vigente' : 'Substituída'}
                </Badge>
              </CelulaTabela>
              <CelulaTabela alinhamento="direita">
                <Button variante="fantasma" onClick={() => setVisualizando(termo.conteudo)}>
                  Ver conteúdo
                </Button>
              </CelulaTabela>
            </LinhaTabela>
          )}
        />
      )}

      {modalAberto && (
        <Modal titulo="Publicar versão do termo" largura="larga" onFechar={() => setModalAberto(false)}>
          <form onSubmit={publicar} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Conteúdo do termo</span>
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={16}
                required
                autoFocus
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm leading-relaxed text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-xs text-neutral-500">
                As alunas que já aceitaram continuam vinculadas à versão que assinaram.
              </span>
            </label>
            {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variante="secundaria" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {visualizando && (
        <Modal titulo="Conteúdo da versão" largura="larga" onFechar={() => setVisualizando(null)}>
          {/* RF-ALU-05 / PA-05: o termo é único; o nome entra por mesclagem. */}
          <p className="mb-3 text-xs text-neutral-500">
            <code className="rounded bg-neutral-100 px-1">{'{{nome}}'}</code> e{' '}
            <code className="rounded bg-neutral-100 px-1">{'{{cpf}}'}</code> são substituídos pelos dados de quem
            assina, na tela e no registro do aceite. É um termo único por versão, não um por pacote.
          </p>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-700">
            {visualizando}
          </div>
        </Modal>
      )}
    </div>
  );
}
