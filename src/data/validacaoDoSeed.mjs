/**
 * Coerência do backfill depois de resolver as datas relativas.
 *
 * As datas do seed são tokens (`datasDoSeed.mjs`), e o resolvedor já recusa
 * data literal. Só que resolver certo não basta: os registros precisam
 * continuar coerentes **entre si** em qualquer dia do ano. Uma ocorrência
 * de sessão tem de cair num dia em que aquela sessão existe; um agendamento
 * não pode ter sido feito depois da aula; uma chamada finalizada não pode
 * ser de aula futura.
 *
 * Essas regras estavam só em prosa no README, e nada as verificava. O jeito
 * de quebrá-las é silencioso: basta trocar `diasSemana` de uma sessão e
 * esquecer os tokens que apontam para ela — e aí o protótipo carrega com
 * aulas fora da grade, sem nenhum aviso. Este módulo transforma cada regra
 * em verificação, executada nos dois pontos em que o seed vira banco.
 *
 * `erros` impedem a carga: são inconsistências que deixariam o protótipo
 * mentindo. `avisos` não impedem nada — são cenários do guia que dependem
 * do dia em que o reset acontece, e quem carrega merece saber.
 */

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function diaDaSemanaDe(iso) {
  return DIAS_SEMANA[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()];
}

function diasEntre(inicioISO, fimISO) {
  return Math.round((new Date(fimISO.slice(0, 10)) - new Date(inicioISO.slice(0, 10))) / 86400000);
}

function indexarPorId(lista) {
  return Object.fromEntries((lista ?? []).map((item) => [item.id, item]));
}

/**
 * Devolve `{ erros, avisos }` do seed já resolvido. Não lança: quem chama
 * decide o que fazer com cada lista.
 */
export function validarSeedResolvido(seed, hoje) {
  const erros = [];
  const avisos = [];

  const sessoes = indexarPorId(seed.sessoes);
  const ocorrencias = indexarPorId(seed.ocorrenciasSessao);
  const chamadas = indexarPorId(seed.chamadas);
  const carteiras = indexarPorId(seed.carteiras);

  const dataDaChamada = (chamada) => {
    if (!chamada?.ocorrenciaSessaoId) return undefined;
    return ocorrencias[chamada.ocorrenciaSessaoId]?.data;
  };

  // --- a aula existe na grade -------------------------------------------
  for (const ocorrencia of seed.ocorrenciasSessao ?? []) {
    const sessao = sessoes[ocorrencia.sessaoId];
    if (!sessao) {
      erros.push(`Ocorrência "${ocorrencia.id}" aponta para a sessão inexistente "${ocorrencia.sessaoId}".`);
      continue;
    }
    const dia = diaDaSemanaDe(ocorrencia.data);
    if (!sessao.diasSemana.includes(dia)) {
      erros.push(
        `Ocorrência "${ocorrencia.id}" caiu em ${ocorrencia.data} (${dia}), mas a sessão "${sessao.id}" só acontece em ${sessao.diasSemana.join(', ')}. Ajuste o token da ocorrência para os dias da sessão.`,
      );
    }
  }

  // --- o agendamento antecede a aula e não é do futuro -------------------
  for (const agendamento of seed.agendamentos ?? []) {
    const ocorrencia = ocorrencias[agendamento.ocorrenciaSessaoId];
    if (!ocorrencia) {
      erros.push(`Agendamento "${agendamento.id}" aponta para ocorrência inexistente.`);
      continue;
    }
    const quandoFoiFeito = agendamento.dataHora.slice(0, 10);
    if (quandoFoiFeito > ocorrencia.data) {
      erros.push(
        `Agendamento "${agendamento.id}" foi feito em ${quandoFoiFeito}, depois da aula (${ocorrencia.data}).`,
      );
    }
    if (quandoFoiFeito > hoje) {
      erros.push(`Agendamento "${agendamento.id}" foi feito em ${quandoFoiFeito}, no futuro.`);
    }
  }

  // --- a reserva do convênio é da data da aula --------------------------
  for (const reserva of seed.reservasConvenio ?? []) {
    const ocorrencia = ocorrencias[reserva.ocorrenciaSessaoId];
    if (ocorrencia && reserva.data !== ocorrencia.data) {
      erros.push(
        `Reserva "${reserva.id}" está em ${reserva.data}, mas a aula acontece em ${ocorrencia.data}.`,
      );
    }
  }

  // --- chamada finalizada é de aula que já aconteceu ---------------------
  for (const chamada of seed.chamadas ?? []) {
    const data = dataDaChamada(chamada);
    if (chamada.situacao === 'finalizada' && data && data > hoje) {
      erros.push(`Chamada "${chamada.id}" está finalizada, mas a aula é em ${data}.`);
    }
  }

  // --- a comissão registra a data da aula que a gerou --------------------
  for (const comissao of seed.comissoes ?? []) {
    const data = dataDaChamada(chamadas[comissao.chamadaId]);
    if (data && comissao.dataAula !== data) {
      erros.push(`Comissão "${comissao.id}" diz ${comissao.dataAula}, mas a aula foi em ${data}.`);
    }
  }

  // --- a carteira não vence antes de existir -----------------------------
  for (const carteira of seed.carteiras ?? []) {
    if (carteira.dataAtivacao && carteira.dataAtivacao > carteira.dataValidade) {
      erros.push(`Carteira "${carteira.id}" é ativada depois de vencer.`);
    }
    if (carteira.dataEncerramento && carteira.dataAtivacao && carteira.dataEncerramento < carteira.dataAtivacao) {
      erros.push(`Carteira "${carteira.id}" é encerrada antes de ser ativada.`);
    }
  }

  // --- aula cancelada por exceção tem a exceção da data ------------------
  for (const ocorrencia of seed.ocorrenciasSessao ?? []) {
    if (ocorrencia.origemCancelamento !== 'excecao') continue;
    if (!(seed.excecoesCalendario ?? []).some((excecao) => excecao.data === ocorrencia.data)) {
      erros.push(
        `Ocorrência "${ocorrencia.id}" está cancelada por exceção de calendário, mas não há exceção em ${ocorrencia.data}.`,
      );
    }
  }

  // --- cenários do guia que dependem do dia do reset ---------------------
  const patricia = carteiras['car-patricia'];
  if (patricia && diasEntre(hoje, patricia.dataValidade) > 7) {
    avisos.push('A carteira da Patrícia deixou de estar "Finalizando" — o cenário do aviso de vencimento muda.');
  }

  const justificativa = (seed.justificativas ?? [])[0];
  if (justificativa && diasEntre(justificativa.data, hoje) > 7) {
    avisos.push('A justificativa da Larissa está fora do prazo de 7 dias — o botão "Justificar" não aparece.');
  }

  // O benefício de conversão (PA-04) vale 3 dias corridos a partir da aula
  // experimental, e a aula de dança só acontece terça e quinta: em dois dias
  // da semana a última já passou do prazo. Não dá para resolver sem mexer na
  // grade ou no parâmetro do escopo, então o guia manda ampliar o prazo — e
  // o aviso lembra disso antes de alguém procurar o selo verde em vão.
  const aulaExperimental = ocorrencias['oco-danca-13'];
  if (aulaExperimental && diasEntre(aulaExperimental.data, hoje) > 3) {
    avisos.push(
      'O benefício de conversão da Juliana venceu (a experimental foi há mais de 3 dias). Para ver o cenário, aumente "Validade do benefício de conversão" em Parâmetros, como o guia instrui.',
    );
  }

  return { erros, avisos };
}

/** Lança quando houver erro. Usado por quem prefere falhar a seguir com dado incoerente. */
export function exigirSeedCoerente(seed, hoje) {
  const { erros, avisos } = validarSeedResolvido(seed, hoje);
  if (erros.length > 0) {
    throw new Error(`Backfill incoerente para ${hoje}:\n- ${erros.join('\n- ')}`);
  }
  return avisos;
}
