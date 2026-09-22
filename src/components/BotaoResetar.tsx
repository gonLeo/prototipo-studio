import { useState } from 'react';
import { resetarPrototipo } from '../services/reset';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';

export function BotaoResetar() {
  const confirmar = useConfirm();
  const mostrarToast = useToast();
  const [resetando, setResetando] = useState(false);

  async function iniciar() {
    const ok = await confirmar({
      titulo: 'Resetar protótipo',
      mensagem: 'Todas as alterações feitas na navegação serão apagadas e os dados originais de exemplo (backfill) serão restaurados. Esta ação não pode ser desfeita.',
      textoConfirmar: 'Resetar',
      perigo: true,
    });
    if (!ok) return;

    setResetando(true);
    try {
      await resetarPrototipo();
      mostrarToast('Protótipo resetado — dados originais restaurados.', 'sucesso');
      setTimeout(() => window.location.assign('/login'), 800);
    } catch (erro) {
      // Um backfill incoerente é erro de quem editou o seed, não falha de
      // rede: esconder a causa atrás de "tente novamente" faria procurar no
      // lugar errado.
      mostrarToast(
        erro instanceof Error && erro.message.startsWith('Backfill incoerente')
          ? erro.message
          : 'Não foi possível resetar o protótipo. Tente novamente.',
        'erro',
      );
      setResetando(false);
    }
  }

  return (
    <button
      onClick={iniciar}
      disabled={resetando}
      className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
    >
      {resetando ? 'Resetando…' : 'Resetar protótipo'}
    </button>
  );
}
