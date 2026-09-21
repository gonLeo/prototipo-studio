import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GUIA,
  PERSONAS,
  ROTULO_PERFIL_DO_PASSO,
  SIMULACOES,
  type CenarioDoGuia,
  type PerfilDoPasso,
} from '../data/guiaDoPrototipo';

/**
 * Guia do protótipo: como reproduzir cada cenário do escopo.
 *
 * É uma página de leitura, mas procedural: a lista mostra só título e uma
 * linha por cenário, e o passo a passo abre ao clicar. O elemento que
 * organiza tudo é o **perfil de cada passo** — os fluxos cruzam
 * Administração, Professora e Aluna, e o que trava quem testa é não saber
 * com quem entrar. O rótulo só aparece quando o perfil muda, para que a
 * troca salte aos olhos e os passos seguidos do mesmo perfil fiquem limpos.
 *
 * Fica fora do `AppShell` de propósito: abre em outra aba e acompanha a
 * navegação, sem o menu de um perfil que pode não ser o do passo atual.
 */

const ESTILO_PERFIL: Record<PerfilDoPasso, string> = {
  administracao: 'bg-primary-700 text-white',
  professora: 'bg-primary-100 text-primary-800',
  aluna: 'bg-neutral-800 text-white',
  publico: 'border border-dashed border-neutral-400 bg-white text-neutral-600',
};

type FiltroPerfil = 'todos' | PerfilDoPasso;

const FILTROS: { valor: FiltroPerfil; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'administracao', rotulo: 'Administração' },
  { valor: 'professora', rotulo: 'Professora' },
  { valor: 'aluna', rotulo: 'Aluna' },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function cenarioCorresponde(cenario: CenarioDoGuia, termo: string, perfil: FiltroPerfil): boolean {
  if (perfil !== 'todos' && !cenario.passos.some((p) => p.perfil === perfil)) return false;
  if (!termo) return true;
  const alvo = normalizar(
    [
      cenario.titulo,
      cenario.resumo,
      cenario.fluxo ?? '',
      ...cenario.regras,
      ...cenario.requisitos,
      ...cenario.passos.map((p) => p.texto),
      ...cenario.conferir,
    ].join(' '),
  );
  return alvo.includes(normalizar(termo));
}

function Etiqueta({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-tight text-neutral-600 ring-1 ring-inset ring-neutral-200">
      {children}
    </span>
  );
}

function ChipPerfil({ perfil }: { perfil: PerfilDoPasso }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ESTILO_PERFIL[perfil]}`}
    >
      {ROTULO_PERFIL_DO_PASSO[perfil]}
    </span>
  );
}

function Cenario({ cenario, aberto, onAlternar }: { cenario: CenarioDoGuia; aberto: boolean; onAlternar: () => void }) {
  return (
    <li className="border-t border-neutral-100 first:border-t-0">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
      >
        <span
          aria-hidden="true"
          className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${aberto ? 'bg-primary-600' : 'bg-neutral-300'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-ink">{cenario.titulo}</span>
            {cenario.fluxo && <span className="text-xs text-neutral-500">fluxo {cenario.fluxo.split(' ')[0]}</span>}
          </span>
          <span className="mt-0.5 block text-sm text-neutral-600">{cenario.resumo}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4 sm:pl-11">
          {cenario.preparo && (
            <p className="mb-4 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
              <span className="font-semibold text-ink">Antes: </span>
              {cenario.preparo}
            </p>
          )}

          <ol className="flex flex-col">
            {cenario.passos.map((passo, indice) => {
              const trocouPerfil = indice === 0 || cenario.passos[indice - 1].perfil !== passo.perfil;
              return (
                <li key={indice} className={`flex gap-3 ${trocouPerfil && indice > 0 ? 'mt-3' : 'mt-1.5'}`}>
                  {/* A coluna do perfil só rotula quando o perfil muda: é a
                      troca que precisa saltar aos olhos. */}
                  <span className="w-28 shrink-0 pt-0.5 sm:w-32">
                    {trocouPerfil && <ChipPerfil perfil={passo.perfil} />}
                  </span>
                  <span className="flex min-w-0 gap-2 text-sm text-neutral-800">
                    <span className="w-4 shrink-0 text-right tabular-nums text-neutral-400">{indice + 1}</span>
                    <span>{passo.texto}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-800">O que conferir</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {cenario.conferir.map((item, indice) => (
                <li key={indice} className="flex gap-2 text-sm text-neutral-800">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {cenario.fluxo && <Etiqueta>{cenario.fluxo}</Etiqueta>}
            {cenario.regras.map((regra) => (
              <Etiqueta key={regra}>{regra}</Etiqueta>
            ))}
            {cenario.requisitos.map((requisito) => (
              <Etiqueta key={requisito}>{requisito}</Etiqueta>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export function GuiaDoPrototipoPage() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroPerfil>('todos');
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const grupos = useMemo(
    () =>
      GUIA.map((grupo) => ({
        ...grupo,
        cenarios: grupo.cenarios.filter((c) => cenarioCorresponde(c, busca.trim(), filtro)),
      })).filter((grupo) => grupo.cenarios.length > 0),
    [busca, filtro],
  );

  const totalCenarios = GUIA.reduce((soma, g) => soma + g.cenarios.length, 0);
  const visiveis = grupos.reduce((soma, g) => soma + g.cenarios.length, 0);

  return (
    <div className="min-h-full bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-700 text-xs font-bold text-white">
              M
            </span>
            <span className="text-sm font-semibold text-ink">Studio MUV</span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">
              Guia do protótipo
            </span>
          </div>
          <Link to="/login" className="text-sm font-medium text-primary-700 hover:text-primary-800">
            Ir para o login →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-ink">Como reproduzir o escopo neste protótipo</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Cada cenário abaixo é uma regra ou um fluxo do escopo v2.0, escrito como um roteiro: com quem entrar, o que
          fazer e o que conferir no fim. Abra este guia numa aba e o protótipo em outra.
        </p>

        <section className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Antes de começar</h2>

          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">Quem entra</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Não há senha. Na tela de login, escolha a usuária e o perfil. É o estado de cada uma logo depois de
                resetar.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {PERSONAS.map((pessoa) => (
                  <li key={pessoa.nome} className="text-sm">
                    <span className="font-medium text-ink">{pessoa.nome}</span>
                    <span className="text-neutral-500"> · {pessoa.perfil}</span>
                    <span className="block text-xs text-neutral-600">{pessoa.estado}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">Voltar ao início</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  O botão <span className="font-medium text-ink">"Resetar protótipo"</span>, no topo de qualquer tela,
                  apaga tudo que você fez e restaura os dados de exemplo. Use sempre que quiser começar um cenário do
                  zero.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">O que é simulado</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {SIMULACOES.map((item) => (
                    <li key={item.o} className="text-sm">
                      <span className="font-medium text-ink">{item.o}. </span>
                      <span className="text-neutral-600">{item.como}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Cenários
              <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
                {visiveis === totalCenarios ? totalCenarios : `${visiveis} de ${totalCenarios}`}
              </span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {FILTROS.map((item) => (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => setFiltro(item.valor)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    filtro === item.valor
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-neutral-600 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {item.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3">
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13.5 13.5 17 17" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por regra, requisito ou palavra (ex.: RN-17, trancamento, convênio)"
              aria-label="Buscar cenário"
              className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {grupos.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
              Nenhum cenário com esse filtro. Tente uma regra (RN-08), um requisito (RF-TRA-01) ou uma palavra
              (reembolso).
            </p>
          ) : (
            grupos.map((grupo) => (
              <section key={grupo.id} className="mt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                  <h3 className="text-base font-semibold text-ink">{grupo.titulo}</h3>
                  <span className="text-xs text-neutral-400">
                    {grupo.cenarios.length} cenário{grupo.cenarios.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-0.5 px-1 text-sm text-neutral-500">{grupo.descricao}</p>
                <ul className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  {grupo.cenarios.map((cenario) => (
                    <Cenario
                      key={cenario.id}
                      cenario={cenario}
                      aberto={abertoId === cenario.id}
                      onAlternar={() => setAbertoId((atual) => (atual === cenario.id ? null : cenario.id))}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </section>

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          Os códigos entre etiquetas apontam para o documento de escopo: <Etiqueta>RN-xx</Etiqueta> são regras de
          negócio (capítulo 5), <Etiqueta>RF-xxx-xx</Etiqueta> são requisitos (capítulo 4) e "fluxo 6.x" é o fluxo de
          processo correspondente (capítulo 6).
        </footer>
      </main>
    </div>
  );
}
