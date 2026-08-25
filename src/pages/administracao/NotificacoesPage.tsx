import { useCallback, useEffect, useState } from 'react';
import { notificacaoRepositorio, usuarioRepositorio } from '../../services/repositorios';
import { rotuloDoEvento, requisitoDoEvento } from '../../services/notificador';
import type { Notificacao } from '../../types/domain';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabela, LinhaTabela, CelulaTabela } from '../../components/ui/Table';
import { baixarCSV } from '../../utils/csv';
import { formatarDataBR } from '../../utils/data';

interface NotificacaoDetalhada extends Notificacao {
  nomeDestinatario: string;
  emailDestinatario: string;
  rotulo: string;
  requisito: string | undefined;
}

/**
 * Registro de envios (RF-NOT-11): tudo que o sistema disparou, com
 * destinatário, evento, canal, data e situação.
 *
 * O canal aparece como coluna própria de propósito — hoje é sempre e-mail,
 * e é aqui que o WhatsApp da Fase 2 vai aparecer sem que nenhuma regra de
 * disparo precise mudar (RF-NOT-10).
 */
export function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoDetalhada[]>([]);
  const [evento, setEvento] = useState('todos');
  const [lendo, setLendo] = useState<NotificacaoDetalhada | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [lista, usuarios] = await Promise.all([
      notificacaoRepositorio.listar(),
      usuarioRepositorio.listar(),
    ]);

    setNotificacoes(
      lista
        .map((notificacao) => {
          const usuario = usuarios.find((u) => u.id === notificacao.destinatarioId);
          return {
            ...notificacao,
            nomeDestinatario: usuario?.nome ?? 'Destinatário removido',
            emailDestinatario: usuario?.email ?? '—',
            rotulo: rotuloDoEvento(notificacao.evento),
            requisito: requisitoDoEvento(notificacao.evento),
          };
        })
        .sort((a, b) => b.dataEnvio.localeCompare(a.dataEnvio)),
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const eventos = [...new Set(notificacoes.map((n) => n.evento))].sort((a, b) =>
    rotuloDoEvento(a).localeCompare(rotuloDoEvento(b)),
  );
  const visiveis = evento === 'todos' ? notificacoes : notificacoes.filter((n) => n.evento === evento);

  function exportar() {
    baixarCSV({
      nomeArquivo: 'notificacoes',
      itens: visiveis,
      colunas: [
        { cabecalho: 'Data', valor: (item) => item.dataEnvio },
        { cabecalho: 'Destinatário', valor: (item) => item.nomeDestinatario },
        { cabecalho: 'E-mail', valor: (item) => item.emailDestinatario },
        { cabecalho: 'Evento', valor: (item) => item.rotulo },
        { cabecalho: 'Requisito', valor: (item) => item.requisito ?? '' },
        { cabecalho: 'Canal', valor: (item) => item.canal },
        { cabecalho: 'Situação', valor: (item) => item.situacaoEnvio },
        { cabecalho: 'Conteúdo', valor: (item) => item.conteudo },
      ],
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Configuração</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Notificações enviadas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {notificacoes.length} envio(s) registrado(s). Na Fase 1 todas as comunicações saem por e-mail; a camada de
            notificação já é independente de canal.
          </p>
        </div>
        <Button variante="secundaria" onClick={exportar} disabled={visiveis.length === 0}>
          Exportar CSV
        </Button>
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-neutral-500">Carregando…</p>
      ) : notificacoes.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          Nenhuma notificação disparada ainda. Elas aparecem aqui conforme o sistema é usado — agendamento,
          cobrança, justificativa e afins.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[{ valor: 'todos', rotulo: 'Todos os eventos' }, ...eventos.map((e) => ({ valor: e, rotulo: rotuloDoEvento(e) }))].map(
              (item) => (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => setEvento(item.valor)}
                  aria-pressed={evento === item.valor}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    evento === item.valor
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
            rotulo="Notificações enviadas"
            itens={visiveis}
            chave={(item) => item.id}
            busca={{
              placeholder: 'Buscar por destinatário',
              corresponde: (item, termo) =>
                item.nomeDestinatario.toLowerCase().includes(termo) ||
                item.emailDestinatario.toLowerCase().includes(termo),
            }}
            colunas={[
              { chave: 'destinatario', rotulo: 'Destinatária' },
              { chave: 'evento', rotulo: 'Evento' },
              { chave: 'canal', rotulo: 'Canal' },
              { chave: 'data', rotulo: 'Envio' },
              { chave: 'acoes', rotulo: '', alinhamento: 'direita' },
            ]}
            renderLinha={(item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela>
                  <p className="font-medium text-ink">{item.nomeDestinatario}</p>
                  <p className="text-xs text-neutral-500">{item.emailDestinatario}</p>
                </CelulaTabela>
                <CelulaTabela>
                  <p>{item.rotulo}</p>
                  {item.requisito && <p className="text-xs text-neutral-500">{item.requisito}</p>}
                </CelulaTabela>
                <CelulaTabela>
                  <Badge tom="info">{item.canal === 'email' ? 'E-mail' : 'WhatsApp'}</Badge>
                </CelulaTabela>
                <CelulaTabela>
                  <p>{formatarDataBR(item.dataEnvio.slice(0, 10))}</p>
                  <p className="text-xs text-neutral-500">
                    {item.dataEnvio.slice(11, 16)} ·{' '}
                    {item.situacaoEnvio === 'enviada' ? 'enviada' : 'falha no envio'}
                  </p>
                </CelulaTabela>
                <CelulaTabela alinhamento="direita">
                  <Button variante="fantasma" onClick={() => setLendo(item)}>
                    Ver conteúdo
                  </Button>
                </CelulaTabela>
              </LinhaTabela>
            )}
          />
        </>
      )}

      {lendo && (
        <Modal titulo={lendo.rotulo} largura="larga" onFechar={() => setLendo(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              Para {lendo.nomeDestinatario} ({lendo.emailDestinatario}) em{' '}
              {formatarDataBR(lendo.dataEnvio.slice(0, 10))} às {lendo.dataEnvio.slice(11, 16)} ·{' '}
              {lendo.canal === 'email' ? 'e-mail' : 'WhatsApp'}
              {lendo.requisito ? ` · ${lendo.requisito}` : ''}
            </p>
            <p className="whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-ink">
              {lendo.conteudo}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
