import { useState } from 'react';
import type { Aluna, TermoAceite, Usuario } from '../../types/domain';
import type { PendenciaDeAceite } from '../../hooks/pendenciasDeAceite';
import { registrarAceiteDoTermo, registrarAnamnese } from '../../hooks/pendenciasDeAceite';
import { perguntasNaoRespondidas } from '../../data/anamnese';
import { AceiteDoTermo, FichaDeAnamnese } from '../../components/AceiteEAnamnese';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

/**
 * Onde a aluna conclui o que ficou pendente (RF-ALU-08).
 *
 * É o destino do alerta persistente do painel. Resolve uma pendência de
 * cada vez — quem pulou só a anamnese não precisa reler o termo — e fecha
 * quando não há mais nada pendente.
 */
export function ModalPendencias({
  usuario,
  aluna,
  pendencia,
  termoVigente,
  aoFechar,
  aoConcluir,
}: {
  usuario: Usuario;
  aluna: Aluna;
  pendencia: PendenciaDeAceite;
  termoVigente: TermoAceite | undefined;
  aoFechar: () => void;
  aoConcluir: (mensagem: string) => Promise<void>;
}) {
  const [aceito, setAceito] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string>();

  // Termo primeiro quando os dois faltam: é a ordem do fluxo de matrícula.
  const etapa = pendencia.termo ? 'termo' : 'anamnese';
  const faltamRespostas = perguntasNaoRespondidas(respostas);

  async function concluir() {
    setErro(undefined);
    setEnviando(true);
    try {
      if (etapa === 'termo') {
        if (!termoVigente) return;
        await registrarAceiteDoTermo({
          usuarioId: usuario.id,
          assinante: { nome: usuario.nome, cpf: usuario.cpf },
          termo: termoVigente,
          aluna,
        });
        await aoConcluir(
          pendencia.anamnese
            ? 'Termo aceito. Falta só a ficha de anamnese.'
            : 'Termo aceito. Seu cadastro está completo.',
        );
      } else {
        await registrarAnamnese({ aluna, respostas });
        await aoConcluir('Anamnese registrada. Seu cadastro está completo.');
      }
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof Error ? erroCapturado.message : 'Erro inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      // O título diz a ação; o bloco de dentro já se identifica.
      titulo="Concluir pendência"
      onFechar={aoFechar}
      largura="larga"
    >
      <div className="flex flex-col gap-4">
        {etapa === 'termo' ? (
          termoVigente ? (
            <AceiteDoTermo
              termo={termoVigente}
              assinante={{ nome: usuario.nome, cpf: usuario.cpf }}
              aceito={aceito}
              onAceitar={setAceito}
            />
          ) : (
            <p className="text-sm text-neutral-600">
              O studio ainda não publicou o termo de aceite. Assim que ele estiver disponível, você conclui por aqui.
            </p>
          )
        ) : (
          <>
            <FichaDeAnamnese
              respostas={respostas}
              onResponder={(chave, valor) => setRespostas((atual) => ({ ...atual, [chave]: valor }))}
            />
            {faltamRespostas.length > 0 && (
              <p className="text-xs text-neutral-500">
                Responda {faltamRespostas.length} pergunta(s) de saúde para concluir.
              </p>
            )}
          </>
        )}

        {erro && <p className="text-sm font-medium text-rose-600">{erro}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button variante="secundaria" onClick={aoFechar}>
            Deixar para depois
          </Button>
          <Button
            onClick={concluir}
            disabled={enviando || (etapa === 'termo' ? !aceito || !termoVigente : faltamRespostas.length > 0)}
          >
            {enviando ? 'Registrando…' : etapa === 'termo' ? 'Aceitar o termo' : 'Concluir a anamnese'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
