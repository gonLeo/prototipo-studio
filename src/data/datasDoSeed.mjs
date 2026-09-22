/**
 * Datas relativas do backfill (`seed.json`).
 *
 * O protótipo usa a data real como "hoje", e um seed com datas fixas
 * envelhece: a aula "futura" vira passada, o pacote "Finalizando" vence, a
 * justificativa sai do prazo. Por isso nenhuma data do seed é literal — cada
 * campo de data guarda um token que este módulo resolve no momento em que o
 * seed vira banco: na primeira carga (`scripts/seed.mjs`) e no botão
 * "Resetar protótipo" (`src/services/reset.ts`).
 *
 * É JavaScript puro, e não TypeScript, porque precisa rodar nos dois lados:
 * no Node do script de carga e no bundle do Vite. A declaração de tipos fica
 * em `datasDoSeed.d.mts`.
 *
 * Gramática de um token (string inteira, começando com `@`):
 *
 *   @hoje                      hoje
 *   @hoje-5   @hoje+30         hoje mais ou menos N dias
 *   @hoje-1s                   hoje menos N semanas
 *   @ultima(quarta)            a data mais recente ANTERIOR a hoje nesse dia
 *   @ultima(segunda,quarta)    idem, aceitando qualquer dia da lista
 *   @proxima(terca,quinta)     a primeira data POSTERIOR a hoje na lista
 *   @proxima(sexta)+1s         deslocamentos valem para qualquer base
 *   @hoje-2T10:15              sufixo de horário: vira ISO completo, em UTC
 *   @fixa(1995-03-22)          não resolve — a data é fixa de propósito
 *
 * Dentro de um texto, o token vai entre chaves duplas e sai formatado:
 *
 *   "Agendamento de {{@proxima(segunda,quarta)}} às 08:00"   → 23/09/2026
 *   "{{@hoje-40|mes}}"                                       → agosto
 *   "{{@hoje|iso}}"                                          → 2026-09-21
 *
 * Toda data literal no seed (`YYYY-MM-DD…`) fora de um `@fixa(...)` é erro de
 * carga: melhor o `npm run seed` quebrar do que voltar a envelhecer.
 */

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const TOKEN = /^@(hoje|ultima\(([a-z,]+)\)|proxima\(([a-z,]+)\)|fixa\(([^)]+)\))((?:[+-]\d+s?)*)(?:T(\d{2}):(\d{2}))?$/;
const TOKEN_EMBUTIDO = /\{\{(@[^}|]+)(?:\|(br|mes|iso))?\}\}/g;
const DATA_LITERAL = /^\d{4}-\d{2}-\d{2}/;

function paraUTC(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraISO(data) {
  return data.toISOString().slice(0, 10);
}

function somarDias(iso, dias) {
  const data = paraUTC(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraISO(data);
}

/** Data de hoje no fuso local da máquina, como `YYYY-MM-DD` — a mesma conta de `hojeISO()` em `utils/data.ts`. */
export function hojeLocalISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function indicesDosDias(lista, token) {
  const indices = lista.split(',').map((nome) => DIAS_SEMANA.indexOf(nome.trim()));
  if (indices.length === 0 || indices.some((i) => i < 0)) {
    throw new Error(`Token de data inválido "${token}": dia da semana desconhecido em "${lista}".`);
  }
  return indices;
}

function dataMaisProximaNoDia(hoje, indices, sentido) {
  let data = hoje;
  for (let passo = 0; passo < 7; passo += 1) {
    data = somarDias(data, sentido);
    if (indices.includes(paraUTC(data).getUTCDay())) return data;
  }
  throw new Error('Nenhum dia da semana encontrado em sete dias — impossível.');
}

function aplicarDeslocamentos(iso, deslocamentos) {
  let data = iso;
  for (const trecho of deslocamentos.match(/[+-]\d+s?/g) ?? []) {
    const semanas = trecho.endsWith('s');
    const quantidade = Number(trecho.replace('s', ''));
    data = somarDias(data, semanas ? quantidade * 7 : quantidade);
  }
  return data;
}

/**
 * Resolve um token inteiro para `YYYY-MM-DD`, ou para ISO completo quando o
 * token traz horário. Lança erro se o token não for reconhecido.
 */
export function resolverToken(token, hoje = hojeLocalISO()) {
  const partes = TOKEN.exec(token);
  if (!partes) throw new Error(`Token de data inválido no seed: "${token}".`);

  const [, base, diasUltima, diasProxima, fixa, deslocamentos, hora, minuto] = partes;

  if (fixa !== undefined) {
    if (deslocamentos || hora) {
      throw new Error(`Token de data inválido "${token}": @fixa não aceita deslocamento nem horário.`);
    }
    return fixa;
  }

  let data;
  if (base === 'hoje') data = hoje;
  else if (diasUltima !== undefined) data = dataMaisProximaNoDia(hoje, indicesDosDias(diasUltima, token), -1);
  else data = dataMaisProximaNoDia(hoje, indicesDosDias(diasProxima, token), +1);

  data = aplicarDeslocamentos(data, deslocamentos);

  return hora ? `${data}T${hora}:${minuto}:00.000Z` : data;
}

function formatar(iso, formato) {
  const data = iso.slice(0, 10);
  if (formato === 'iso') return data;
  if (formato === 'mes') return NOMES_MES[paraUTC(data).getUTCMonth()];
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function resolverTexto(texto, hoje, caminho) {
  if (texto.startsWith('@')) return resolverToken(texto, hoje);

  if (texto.includes('{{')) {
    return texto.replace(TOKEN_EMBUTIDO, (_, token, formato) => formatar(resolverToken(token, hoje), formato ?? 'br'));
  }

  if (DATA_LITERAL.test(texto)) {
    throw new Error(
      `Data literal "${texto}" em ${caminho}: o seed só aceita tokens relativos. Se a data é fixa de propósito, use @fixa(${texto}).`,
    );
  }

  return texto;
}

function resolverValor(valor, hoje, caminho) {
  if (typeof valor === 'string') return resolverTexto(valor, hoje, caminho);
  if (Array.isArray(valor)) return valor.map((item, indice) => resolverValor(item, hoje, `${caminho}[${indice}]`));
  if (valor && typeof valor === 'object') {
    const resolvido = {};
    for (const [chave, conteudo] of Object.entries(valor)) {
      resolvido[chave] = resolverValor(conteudo, hoje, `${caminho}.${chave}`);
    }
    return resolvido;
  }
  return valor;
}

/**
 * Devolve uma cópia do seed com todos os tokens de data resolvidos em
 * relação a `hoje`. O objeto original não é alterado.
 */
export function resolverDatasDoSeed(seed, hoje = hojeLocalISO()) {
  return resolverValor(seed, hoje, 'seed');
}
