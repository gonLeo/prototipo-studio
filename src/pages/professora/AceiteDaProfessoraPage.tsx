import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSessao } from '../../hooks/useSessao';
import { useTermos, registrarAceiteDaProfessora } from '../../hooks/useTermos';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { CheckboxField } from '../../components/ui/Field';

/**
 * Primeiro acesso da professora (RF-PRO-04).
 *
 * Mesmo mecanismo aplicado às alunas — termo versionado, conteúdo gravado
 * por extenso no aceite —, com uma diferença: aqui o aceite basta para
 * liberar o acesso. Não há pagamento nem anamnese a esperar.
 */
export function AceiteDaProfessoraPage() {
  const { usuario, recarregarUsuario } = useSessao();
  const { vigente, carregando } = useTermos('professora');
  const mostrarToast = useToast();

  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!usuario) return null;

  async function concluir(e: FormEvent) {
    e.preventDefault();
    if (!vigente || !usuario) return;
    setEnviando(true);
    try {
      await registrarAceiteDaProfessora({ usuarioId: usuario.id, termo: vigente });
      mostrarToast('Termo aceito. Seu acesso está liberado.', 'sucesso');
      await recarregarUsuario();
    } catch (erroCapturado) {
      mostrarToast(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.', 'erro');
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Falta pouco, {usuario.nome.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Para acessar suas aulas e seus pagamentos, aceite o termo de prestação de serviço.
      </p>

      {!vigente ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O studio ainda não publicou o termo para professoras. Assim que ele estiver disponível, você poderá concluir
          esta etapa.
        </p>
      ) : (
        <form onSubmit={concluir} className="mt-6 flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Termo de prestação de serviço</h2>
              <span className="text-xs text-neutral-500">Versão {vigente.versao}</span>
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-200">
              {vigente.conteudo}
            </div>
          </div>

          <CheckboxField
            label="Li e aceito integralmente as condições do termo acima."
            checked={aceito}
            onChange={setAceito}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={!aceito || enviando}>
              {enviando ? 'Registrando…' : 'Aceitar e liberar meu acesso'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
