import type { TermoAceite } from '../types/domain';
import { PERGUNTAS_ANAMNESE } from '../data/anamnese';
import { CheckboxField, TextField } from './ui/Field';

/**
 * Termo de aceite + ficha de anamnese (RF-ALU-05/07).
 *
 * É o mesmo bloco em dois contextos: na auto-matrícula pelo site e no
 * primeiro acesso da aluna cadastrada pela administração. Por isso vive em
 * `components/`, não dentro de uma página.
 */
export function TermoEAnamnese({
  termo,
  aceito,
  onAceitar,
  respostas,
  onResponder,
}: {
  termo: TermoAceite;
  aceito: boolean;
  onAceitar: (valor: boolean) => void;
  respostas: Record<string, string>;
  onResponder: (chave: string, valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Termo de prestação de serviço</h2>
          <span className="text-xs text-neutral-500">Versão {termo.versao}</span>
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-700">
          {termo.conteudo}
        </div>
        <div className="mt-3">
          <CheckboxField
            label="Li e aceito integralmente as condições do termo acima."
            checked={aceito}
            onChange={onAceitar}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Ficha de anamnese</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Respostas autodeclaradas. Elas ficam registradas na sua ficha e ajudam a equipe a cuidar de você em aula.
        </p>

        <div className="mt-3 flex flex-col gap-4">
          {PERGUNTAS_ANAMNESE.map((pergunta) => {
            const resposta = respostas[pergunta.chave] ?? '';

            if (pergunta.tipo === 'texto') {
              return (
                <TextField
                  key={pergunta.chave}
                  label={pergunta.pergunta}
                  value={resposta}
                  onChange={(e) => onResponder(pergunta.chave, e.target.value)}
                />
              );
            }

            const respondeuSim = resposta.startsWith('Sim');
            return (
              <div key={pergunta.chave}>
                <p className="text-sm font-medium text-neutral-700">{pergunta.pergunta}</p>
                <div className="mt-1 flex gap-1">
                  {['Sim', 'Não'].map((opcao) => {
                    const marcado = resposta === opcao || (opcao === 'Sim' && respondeuSim);
                    return (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() => onResponder(pergunta.chave, opcao)}
                        aria-pressed={marcado}
                        className={`rounded-md border px-3 py-1 text-xs font-medium ${
                          marcado
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        {opcao}
                      </button>
                    );
                  })}
                </div>
                {pergunta.detalharQuandoSim && respondeuSim && (
                  <div className="mt-2">
                    <TextField
                      label="Conte um pouco mais"
                      value={resposta === 'Sim' ? '' : resposta.replace(/^Sim — /, '')}
                      onChange={(e) =>
                        onResponder(pergunta.chave, e.target.value ? `Sim — ${e.target.value}` : 'Sim')
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
