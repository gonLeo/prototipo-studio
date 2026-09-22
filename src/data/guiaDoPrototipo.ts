/**
 * Conteúdo do guia do protótipo (`/guia`).
 *
 * Cada cenário é um caso do escopo que dá para reproduzir no protótipo,
 * escrito como procedimento: com quem entrar, o que fazer, o que
 * conferir. Os passos marcam o perfil porque é isso que confunde quem
 * testa — os fluxos do studio cruzam três perfis, e a pergunta que trava
 * é sempre "com quem eu entro agora?".
 *
 * As datas dos dados de exemplo são relativas ao dia do reset (tokens
 * resolvidos por `datasDoSeed.mjs`): a aula "de ontem" é sempre de ontem, a
 * "próxima de segunda ou quarta" é sempre a próxima. Um cenário pode citar
 * esses dados sem caducar — mas continua preferindo criar o que precisa
 * quando o estado do seed não basta.
 */

export type PerfilDoPasso = 'administracao' | 'professora' | 'aluna' | 'publico';

export interface PassoDoGuia {
  perfil: PerfilDoPasso;
  texto: string;
}

export interface CenarioDoGuia {
  id: string;
  titulo: string;
  /** Uma linha: o que o cenário demonstra. */
  resumo: string;
  /** Fluxo do capítulo 6 do escopo que ele exercita, quando há um. */
  fluxo?: string;
  regras: string[];
  requisitos: string[];
  /** Estado que precisa existir antes de começar. */
  preparo?: string;
  passos: PassoDoGuia[];
  /** A evidência de que a regra aconteceu. */
  conferir: string[];
}

export interface GrupoDoGuia {
  id: string;
  titulo: string;
  descricao: string;
  cenarios: CenarioDoGuia[];
}

export const ROTULO_PERFIL_DO_PASSO: Record<PerfilDoPasso, string> = {
  administracao: 'Administração',
  professora: 'Professora',
  aluna: 'Aluna',
  publico: 'Sem login',
};

/**
 * As usuárias de exemplo e o estado em que cada uma começa depois de
 * "Resetar protótipo". É o elenco dos cenários.
 */
export const PERSONAS = [
  { nome: 'Camila Duarte', perfil: 'Administração e professora', estado: 'Dona do studio. Entre como Administração para tudo que é operação e configuração.' },
  { nome: 'Beatriz Nogueira', perfil: 'Professora', estado: 'Tem chamadas passadas sem finalizar e uma solicitação de cancelamento aguardando decisão.' },
  { nome: 'Larissa Prado', perfil: 'Aluna', estado: 'Pacote Flow ativo, 9 créditos disponíveis. A aluna "padrão" para agendar, cancelar e comprar.' },
  { nome: 'Patrícia Lima', perfil: 'Aluna', estado: 'Pacote em "Finalizando": 1 crédito e vencimento próximo.' },
  { nome: 'Fernanda Alves', perfil: 'Aluna', estado: 'Bolsista: carteira ativa, mas com termo e anamnese pendentes. É a persona do alerta de pendência.' },
  { nome: 'Helena Castro', perfil: 'Aluna', estado: 'Cadastrada pela administração sem bolsa: a compra aguarda o pagamento, então ela ainda não tem créditos.' },
  { nome: 'Juliana Rocha', perfil: 'Aluna', estado: 'Fez a aula experimental, assinou o termo e pulou a anamnese. Tem uma compra que o gateway recusou.' },
  { nome: 'Renata Souza', perfil: 'Aluna', estado: 'Aluna de convênio: reserva pelo aplicativo do parceiro, sem créditos no studio.' },
  { nome: 'Aline Martins', perfil: 'Aluna', estado: 'Pacote vencido com créditos sobrando. Sem pacote ativo.' },
];

/** O que o protótipo simula em vez de integrar de verdade. */
export const SIMULACOES = [
  { o: 'Pagamento', como: 'O gateway é simulado. Uma venda pendente tem os botões "Aprovar no gateway" e "Confirmar pagamento" em Vendas, que fazem o papel do retorno do provedor.' },
  { o: 'E-mail', como: 'Nenhum e-mail sai de verdade. Cada disparo fica registrado em Configuração → Notificações, com destinatária, evento, requisito e o texto que seria enviado.' },
  { o: 'Convênio', como: 'Não há API do Wellhub ou TotalPass. As mensagens que viriam do parceiro — reserva, cancelamento, check-in — são disparadas pela administração em Convênios.' },
  { o: 'Pendência de aceite', como: 'Termo e anamnese não bloqueiam nada: quem pula vê um alerta no painel e entra na contagem de pendências da administração. Bloquear o agendamento até o aceite é evolução de outra fase (EV-16).' },
  { o: 'Rotinas automáticas', como: 'O que no sistema real rodaria sozinho todo dia (encerrar carteiras vencidas, renovar bolsas, avisar "Finalizando") é o botão "Rodar rotina de carteiras", em Vendas. Carregar uma tela nunca altera dados.' },
  { o: 'Datas', como: 'Os dados de exemplo são gerados em relação ao dia do reset: a última aula de segunda ou quarta às 08:00 já passou (Larissa cancelou em cima da hora e justificou), a próxima está agendada, o pacote da Patrícia vence em 5 dias, o da Aline venceu há semanas. Resetar num outro dia refaz tudo em relação a esse dia.' },
];

const A = 'administracao' as const;
const P = 'professora' as const;
const L = 'aluna' as const;
const S = 'publico' as const;

export const GUIA: GrupoDoGuia[] = [
  {
    id: 'entrada',
    titulo: 'Como a aluna entra',
    descricao: 'Três portas: pelo site, pela aula experimental ou pelo cadastro da administração.',
    cenarios: [
      {
        id: 'matricula-site',
        titulo: 'Matrícula pelo site',
        resumo: 'Paga primeiro; termo, anamnese e primeira aula vêm depois — e dá para pular cada um deles.',
        fluxo: '6.1 Matrícula pelo site',
        regras: ['RN-01', 'RN-19', 'RN-36'],
        requisitos: ['RF-ALU-04', 'RF-ALU-08', 'RF-AGD-10', 'RF-CRE-01', 'RF-NOT-01'],
        passos: [
          { perfil: S, texto: 'Na tela de login, clique em "Abrir a matrícula pública".' },
          { perfil: S, texto: 'Preencha os dados e escolha um pacote. O resumo mostra os créditos e a validade projetada.' },
          { perfil: S, texto: 'Pague. O pagamento é simulado e aprovado na hora: a carteira é ativada e o acesso liberado aí, antes do termo.' },
          { perfil: S, texto: 'Aceite o termo e responda a anamnese — ou clique em "Pular e concluir depois" em cada um.' },
          { perfil: S, texto: 'Agende a primeira aula na grade, ou pule também.' },
          { perfil: A, texto: 'Em Alunas, abra a ficha da nova aluna.' },
        ],
        conferir: [
          'A ficha mostra a carteira ativa desde o pagamento, a venda confirmada e o agendamento com o crédito reservado.',
          'Se pulou algo, a tela final diz o que ficou pendente, e "Termo de aceite" e "Ficha de anamnese" aparecem separados na ficha.',
        ],
      },
      {
        id: 'matricula-pulando',
        titulo: 'Matrícula pulando o termo e a anamnese',
        resumo: 'Pendência não bloqueia: a aluna agenda normalmente e o alerta acompanha até ela concluir.',
        fluxo: '6.1 Matrícula pelo site',
        regras: ['RN-19'],
        requisitos: ['RF-ALU-08', 'RF-PNL-03', 'RF-PNL-05'],
        preparo: 'Faça uma matrícula nova pelo site, pulando o termo e a anamnese. Fernanda Alves já está neste estado, se preferir não cadastrar ninguém.',
        passos: [
          { perfil: S, texto: 'Na matrícula, pague e clique em "Pular e concluir depois" no termo e na anamnese.' },
          { perfil: L, texto: 'Entre como a aluna recém-criada. O menu está completo e o painel mostra o alerta amarelo de pendência.' },
          { perfil: L, texto: 'Agende uma aula pela grade: funciona normalmente, a pendência não impede.' },
          { perfil: A, texto: 'No painel, o cartão "Termo ou anamnese pendente" conta a aluna. Clique nele: a lista abre filtrada.' },
          { perfil: A, texto: 'Abra a ficha dela e use "Lembrar aceite".' },
          { perfil: L, texto: 'De volta ao painel da aluna, clique em "Concluir agora" e resolva o termo; depois repita para a anamnese.' },
        ],
        conferir: [
          'O alerta some quando as duas pendências acabam, e o cartão do painel administrativo desconta a aluna.',
          'Em Configuração → Notificações, o lembrete aparece como "Lembrete de termo ou anamnese".',
          'Na coluna "Acesso" da lista, o rótulo diz qual pendência está aberta — "Termo pendente", "Anamnese pendente" ou "Aguardando aceite".',
        ],
      },
      {
        id: 'experimental',
        titulo: 'Aula experimental',
        resumo: 'Primeiro o horário, depois o pagamento. Cobrada à parte, sem consumir crédito.',
        fluxo: '6.2 Aula experimental',
        regras: ['RN-35', 'RN-36'],
        requisitos: ['RF-EXP-01', 'RF-EXP-02', 'RF-EXP-03', 'RF-EXP-05', 'RF-EXP-06'],
        passos: [
          { perfil: S, texto: 'Na tela de login, clique em "Agendar aula experimental".' },
          { perfil: S, texto: 'Escolha um horário da grade — o horário vem antes de qualquer pagamento.' },
          { perfil: S, texto: 'Preencha o cadastro (o CPF é o que controla o limite por modalidade) e pague os R$ 30,00.' },
          { perfil: S, texto: 'Confirmada a vaga, aparecem o termo e a anamnese, cada um com "Pular e concluir depois".' },
          { perfil: L, texto: 'Entre como a pessoa recém-cadastrada e abra Minhas aulas.' },
          { perfil: P, texto: 'No dia da aula, a chamada mostra a aluna identificada como experimental.' },
        ],
        conferir: [
          'Em Minhas aulas, a linha da aula diz "Sem consumo de créditos".',
          'O que foi pulado vira alerta no painel dela, como na matrícula.',
          'Tente agendar uma segunda experimental na mesma modalidade com o mesmo CPF: o limite bloqueia.',
        ],
      },
      {
        id: 'cadastro-bolsa',
        titulo: 'Cadastro pela administração, com ou sem bolsa',
        resumo: 'Bolsista recebe a carteira ativa na hora. Sem bolsa, os créditos só chegam com o pagamento confirmado.',
        fluxo: '6.3 Cadastro administrativo com bolsa',
        regras: ['RN-18', 'RN-19'],
        requisitos: ['RF-ALU-01', 'RF-ALU-02', 'RF-ALU-03', 'RF-BOL-01', 'RF-BOL-02', 'RF-CRE-01'],
        preparo: 'Fernanda Alves é a bolsista; Helena Castro é o caso sem bolsa, com o pagamento em aberto.',
        passos: [
          { perfil: A, texto: 'Em Alunas, clique em "Nova aluna". Escolha o pacote e, se for o caso, marque "bolsista" — tudo na mesma tela.' },
          { perfil: L, texto: 'Entre como Fernanda: o menu está completo, a carteira já tem 4 créditos e o painel só avisa do termo e da anamnese.' },
          { perfil: L, texto: 'Entre como Helena: além do alerta de pendência, há o alerta laranja de pagamento.' },
        ],
        conferir: [
          'A ficha da bolsista mostra a venda como "Isenta" e a carteira ativa sem cobrança.',
          'Em Vendas, o cartão "não faturados em concessões de bolsa" soma o valor de tabela.',
          'Fernanda consegue agendar; Helena, não — falta carteira, não falta termo.',
        ],
      },
      {
        id: 'pagamento-pendente',
        titulo: 'Aluna com pagamento pendente',
        resumo: 'A carteira nasce na confirmação do pagamento — até lá não há créditos, e é só isso que impede agendar.',
        fluxo: '6.3 Cadastro administrativo com bolsa',
        regras: ['RN-19'],
        requisitos: ['RF-CRE-01', 'RF-VEN-03', 'RF-AGD-05'],
        preparo: 'Helena Castro está cadastrada sem bolsa, com a venda do Starter aguardando pagamento.',
        passos: [
          { perfil: L, texto: 'Entre como Helena. O painel mostra "Pagamento pendente" com o valor e o botão "Pagar agora".' },
          { perfil: L, texto: 'Abra a Grade disponível: o bloqueio diz "Nenhum pacote ativo" — o termo pendente não tem nada a ver com isso.' },
          { perfil: L, texto: 'Volte ao painel e clique em "Pagar agora".' },
          { perfil: A, texto: 'Em Alunas, abra a ficha da Helena.' },
        ],
        conferir: [
          'Depois do pagamento a carteira aparece ativa, com a data de ativação de hoje, e a grade libera.',
          'O alerta de termo e anamnese continua lá: ele nunca dependeu do pagamento.',
          'Em Vendas, a venda saiu de "Pendente" para "Confirmada".',
        ],
      },
      {
        id: 'termo-nominal',
        titulo: 'Termo único, com o nome da aluna',
        resumo: 'Um só termo por versão, exibido com nome e CPF de quem assina. Comprar outro pacote não pede novo aceite.',
        regras: ['RN-19'],
        requisitos: ['RF-ALU-05', 'RF-ALU-06'],
        preparo: 'Fernanda Alves ainda não assinou — o atalho do alerta do painel dela abre o termo. Para ver a compra sem novo aceite, use Larissa Prado, que já assinou.',
        passos: [
          { perfil: A, texto: 'Em Configuração → Termo de aceite, "Ver conteúdo" da versão vigente: o texto traz {{nome}} e {{cpf}} no cabeçalho — é o modelo único, não um contrato por pacote.' },
          { perfil: L, texto: 'Entre como Fernanda e clique em "Concluir agora" no alerta. O termo aparece com "CONTRATANTE: Fernanda Alves, CPF …" mesclado no texto. Aceite.' },
          { perfil: L, texto: 'Entre como Larissa e, em Meu pacote, compre outro pacote.' },
          { perfil: A, texto: 'Publique uma nova versão do termo de alunas.' },
        ],
        conferir: [
          'A compra da Larissa concluiu sem pedir termo: a assinatura é uma por versão (ponto em aberto PA-05, definido).',
          'Na tela de termos, o contador de aceites da versão nova é zero — quem já assinou a anterior segue com aquele aceite registrado, com o nome dela no texto gravado.',
        ],
      },
      {
        id: 'termo-professora',
        titulo: 'Termo de aceite da professora',
        resumo: 'Professora nova também assina termo — e, diferente da aluna, o acesso dela fica bloqueado até o aceite.',
        regras: [],
        requisitos: ['RF-PRO-04', 'RF-ALU-06'],
        passos: [
          { perfil: A, texto: 'Em Configuração → Termo de aceite, veja as abas "Alunas" e "Professoras": cada uma tem seu texto e suas versões.' },
          { perfil: A, texto: 'Em Configuração → Professoras, cadastre uma professora nova.' },
          { perfil: P, texto: 'No login ela aparece com "Aguardando aceite do termo". Entre como ela.' },
          { perfil: P, texto: 'O painel dá lugar ao termo. Aceite.' },
        ],
        conferir: [
          'O menu completo aparece na hora, sem passo de pagamento.',
          'Na aba "Professoras" do termo, o contador de aceites subiu.',
          'O bloqueio vale só para a professora: o RF-PRO-04 manteve a exigência que o RF-ALU-08 tirou da aluna.',
        ],
      },
    ],
  },
  {
    id: 'creditos',
    titulo: 'Créditos, validade e carteira',
    descricao: 'O saldo vive na carteira: uma só, com validade única, alimentada por cada compra.',
    cenarios: [
      {
        id: 'renovacao-antecipada',
        titulo: 'Comprar mais créditos antes de acabar',
        resumo: 'Os créditos somam e passa a valer a validade mais distante — a aluna nunca perde prazo por comprar.',
        fluxo: '6.4 Compra de novo pacote',
        regras: ['RN-04', 'RN-05', 'RN-07'],
        requisitos: ['RF-CRE-13', 'RF-CRE-16', 'RF-NOT-02'],
        preparo: 'O exemplo do escopo: sobram 3 créditos até 10/10, ela compra o Flow (12 créditos, 90 dias) em 01/10 e fica com 15 até 30/12. Patrícia Lima (1 crédito, vence em 5 dias) é o estado equivalente; Larissa Prado (9 créditos, validade daqui a 48 dias) serve para ver a validade mantida.',
        passos: [
          { perfil: L, texto: 'Entre como Patrícia e abra Meu pacote. Escolha o Flow: a prévia soma os créditos restantes aos 12 e mostra a validade nova, 90 dias à frente — mais distante que a atual.' },
          { perfil: L, texto: 'Pague e confira o saldo no topo.' },
          { perfil: L, texto: 'Entre como Larissa e, em Meu pacote, escolha o Starter (45 dias): a prévia soma 9 + 4 e avisa que a validade atual, mais distante que os 45 dias do Starter, foi mantida.' },
        ],
        conferir: [
          'Nos dois casos a carteira continua sendo uma só, com os créditos somados e a validade mais distante — nunca a mais curta.',
          'O histórico de compras registra a venda; em Notificações há a confirmação de compra.',
          'Regra adotada: prevalece a validade mais distante entre a vigente e a do novo pacote (ponto em aberto PA-10, definido), e não "a validade anterior é descartada" como o RF-CRE-13 ainda escreve.',
        ],
      },
      {
        id: 'nova-carteira',
        titulo: 'Comprar depois de o pacote vencer',
        resumo: 'Carteira encerrada não soma: nasce uma nova, e os créditos que sobraram ficaram perdidos.',
        regras: ['RN-02', 'RN-03', 'RN-06'],
        requisitos: ['RF-CRE-11', 'RF-CRE-14', 'RF-CRE-17'],
        preparo: 'Aline Martins tem um pacote vencido com créditos sobrando.',
        passos: [
          { perfil: L, texto: 'Entre como Aline. O painel diz "Nenhum pacote ativo", sem distinguir vencido de consumido.' },
          { perfil: L, texto: 'Em Meu pacote, compre qualquer pacote.' },
          { perfil: A, texto: 'Abra a ficha da Aline.' },
        ],
        conferir: [
          'A carteira nova tem só os créditos do pacote comprado — os da anterior não somaram.',
          'O histórico de pacotes mostra a carteira antiga como expirada, e o extrato registra os créditos perdidos no vencimento.',
        ],
      },
      {
        id: 'finalizando',
        titulo: 'Pacote "Finalizando"',
        resumo: 'Poucos créditos ou vencimento próximo: a aluna é avisada e convidada a renovar, uma vez só.',
        regras: ['RN-02'],
        requisitos: ['RF-CRE-10', 'RF-NOT-08', 'RF-CFG-06'],
        preparo: 'Patrícia Lima tem 1 crédito e vence em breve.',
        passos: [
          { perfil: L, texto: 'Entre como Patrícia. O painel e a grade mostram a faixa "Finalizando" com o motivo e um link para renovar.' },
          { perfil: A, texto: 'Em Vendas, clique em "Rodar rotina de carteiras". O resumo diz quantos avisos de "Finalizando" saíram.' },
          { perfil: A, texto: 'Rode a rotina de novo.' },
          { perfil: A, texto: 'Em Configuração → Parâmetros, altere os limiares do "Finalizando" e observe a frase de efeito mudar.' },
        ],
        conferir: [
          'Em Notificações, o aviso da Patrícia aparece com o requisito RF-NOT-08.',
          'A segunda rotina envia 0 avisos: o mesmo pacote não é avisado duas vezes.',
        ],
      },
      {
        id: 'encerramento',
        titulo: 'Encerramento por vencimento e renovação da bolsa',
        resumo: 'A rotina consolida o que a tela já mostrava: créditos perdidos, carteira encerrada, bolsista renovada.',
        regras: ['RN-02', 'RN-03', 'RN-18'],
        requisitos: ['RF-CRE-10', 'RF-BOL-03', 'RF-NOT-09'],
        preparo: 'Precisa de uma carteira vencida ainda não consolidada. Depois do reset, Aline Martins está assim.',
        passos: [
          { perfil: A, texto: 'Abra a ficha da Aline: a carteira já aparece como expirada, mesmo sem a rotina ter rodado — a situação é lida, não gravada.' },
          { perfil: A, texto: 'Em Vendas, clique em "Rodar rotina de carteiras".' },
          { perfil: A, texto: 'Volte à ficha.' },
        ],
        conferir: [
          'O extrato ganhou a linha de expiração com os créditos perdidos, e a carteira tem data de encerramento.',
          'Se houver bolsista com carteira encerrada, a rotina concede a carteira nova dela na mesma passagem.',
          'Em Notificações, o aviso de pacote encerrado diz o motivo e os créditos perdidos.',
        ],
      },
      {
        id: 'beneficio-conversao',
        titulo: 'Benefício de quem fez a experimental',
        resumo: 'Crédito extra ou desconto na primeira compra depois da aula experimental, dentro do prazo.',
        regras: ['RN-35'],
        requisitos: ['RF-EXP-07', 'RF-EXP-08', 'RF-EXP-09'],
        preparo: 'Juliana Rocha fez a experimental na última aula de dança (terça ou quinta, às 15:00). O benefício vale 3 dias a partir da aula — na segunda e na terça ele já venceu. A compra recusada pelo gateway bloqueia o direito enquanto estiver pendente.',
        passos: [
          { perfil: A, texto: 'Em Parâmetros, aumente a "Validade do benefício de conversão" para 10 dias, para não depender do dia da semana.' },
          { perfil: A, texto: 'Em Vendas, cancele a venda pendente da Juliana com um motivo.' },
          { perfil: A, texto: 'Na ficha da Juliana, "Comprar pacote": o aviso verde mostra o direito e a prévia soma 1 crédito de bônus.' },
          { perfil: A, texto: 'Confirme. Depois abra "Comprar pacote" de novo: o benefício não aparece mais.' },
          { perfil: A, texto: 'Troque o tipo do benefício para "Desconto no valor" e repita com uma pessoa nova vinda da aula experimental: o botão passa a cobrar o valor com desconto.' },
        ],
        conferir: [
          'O extrato diz "Compra do pacote Starter + 1 crédito de bônus da aula experimental".',
          'O benefício vale uma vez: a segunda compra não o oferece.',
          'Em Experimentais, o relatório de conversão conta a Juliana como convertida.',
        ],
      },
      {
        id: 'ajuste-manual',
        titulo: 'Ajuste manual de créditos e prorrogação de validade',
        resumo: 'Conceder, estornar ou prorrogar, sempre com motivo — inclusive numa carteira que já venceu.',
        regras: ['RN-37'],
        requisitos: ['RF-CRE-09', 'RF-PER-03', 'RF-PER-05'],
        preparo: 'Aline Martins tem a carteira vencida: é o caso de quem precisou esperar a fatura para renovar.',
        passos: [
          { perfil: A, texto: 'Na ficha da Larissa, clique em "Ajustar créditos". Conceda 2 créditos com um motivo; depois tente estornar mais créditos do que os utilizados.' },
          { perfil: A, texto: 'Na ficha da Aline (sem pacote ativo), o botão continua disponível. Abra: o aviso diz que a carteira encerrou e o tipo já vem em "Prorrogar validade". Prorrogue por 30 dias com o motivo.' },
          { perfil: L, texto: 'Entre como Aline.' },
        ],
        conferir: [
          'Cada ajuste vira uma linha do extrato com o motivo; a prorrogação aparece em dias, não em créditos.',
          'O estorno acima do utilizado é recusado.',
          'A carteira da Aline voltou a ser ativa, com os créditos que sobravam e a validade nova: ela agenda de novo, sem comprar outro pacote.',
          'Em Configuração → Auditoria, cada operação tem autora, data e hora.',
        ],
      },
    ],
  },
  {
    id: 'aulas',
    titulo: 'Agendar, cancelar e frequentar',
    descricao: 'Agendar reserva o crédito. A chamada, a falta e o cancelamento em cima da hora consomem; cancelar no prazo devolve.',
    cenarios: [
      {
        id: 'agendar-realizar',
        titulo: 'Agendar e realizar a aula',
        resumo: 'A reserva vira consumo quando a professora finaliza a chamada.',
        fluxo: '6.5 Agendamento e realização da aula regular',
        regras: ['RN-07', 'RN-08', 'RN-09', 'RN-11', 'RN-31'],
        requisitos: ['RF-AGD-01', 'RF-AGD-04', 'RF-AGD-11', 'RF-PRE-02', 'RF-PRE-03', 'RF-PRE-04', 'RF-NOT-03'],
        passos: [
          { perfil: L, texto: 'Entre como Larissa. No painel, agende uma aula direto na grade — a confirmação diz quantos créditos serão reservados e a regra de cancelamento.' },
          { perfil: L, texto: 'Repare no saldo: disponíveis caem, reservados sobem.' },
          { perfil: P, texto: 'Como professora da aula, em Minhas aulas navegue até a data e abra a chamada. Todas vêm marcadas presentes; toque só em quem faltou.' },
          { perfil: P, texto: 'Finalize. O toast informa a comissão gerada.' },
          { perfil: L, texto: 'De volta como Larissa, abra Minhas aulas.' },
        ],
        conferir: [
          'A aula aparece como "Presente" com "1 crédito utilizado": reservados caem, utilizados sobem.',
          'Quem cancelou antes não aparece na chamada.',
        ],
      },
      {
        id: 'cancelar',
        titulo: 'Cancelar dentro e fora do prazo',
        resumo: 'Com 4h ou mais o crédito volta. Em cima da hora, é consumido — e o sistema avisa antes.',
        fluxo: '6.6 Cancelamento pela aluna e reposição',
        regras: ['RN-08'],
        requisitos: ['RF-CAN-01', 'RF-CAN-02', 'RF-CAN-03', 'RF-CAN-04'],
        passos: [
          { perfil: L, texto: 'Como Larissa, agende uma aula para daqui a alguns dias e cancele em Minhas aulas: a confirmação diz que o crédito volta.' },
          { perfil: A, texto: 'Para ver o caso fora do prazo, em Parâmetros aumente a "Antecedência mínima de cancelamento" para, por exemplo, 200 horas.' },
          { perfil: L, texto: 'Agende outra aula e cancele. A confirmação agora avisa, em vermelho, que a aula será consumida e que dá para justificar.' },
        ],
        conferir: [
          'Na primeira, a linha diz "1 crédito devolvido ao saldo".',
          'Na segunda, "1 crédito consumido — cancelamento fora do prazo", e o botão "Justificar" aparece.',
        ],
      },
      {
        id: 'justificativa',
        titulo: 'Justificar a falta',
        resumo: 'A aluna envia, a administração decide. Aprovar devolve o crédito; recusar mantém o consumo.',
        regras: ['RN-08'],
        requisitos: ['RF-JUS-01', 'RF-JUS-02', 'RF-JUS-03', 'RF-JUS-04', 'RF-JUS-05', 'RF-NOT-10'],
        preparo: 'Larissa já tem uma justificativa pendente da última aula de segunda ou quarta às 08:00 — sempre dentro do prazo de 7 dias, que é o limite para enviar uma nova.',
        passos: [
          { perfil: A, texto: 'No painel, o bloco de pendências mostra "Justificativas a analisar". Abra.' },
          { perfil: A, texto: 'Analise a da Larissa: escreva o parecer e aprove.' },
          { perfil: L, texto: 'Entre como Larissa e abra o histórico em Minhas aulas.' },
        ],
        conferir: [
          'A aula diz "1 crédito devolvido — justificativa aprovada" e mostra o parecer.',
          'O extrato ganhou uma linha de estorno; o disponível subiu 1.',
          'Recusando, os créditos seguem consumidos e a aluna vê o parecer do mesmo jeito.',
        ],
      },
      {
        id: 'admin-remarca',
        titulo: 'A administração cancela ou remarca',
        resumo: 'Em nome da aluna, com autoria registrada. O crédito volta sempre, e a troca de horário não custa nada.',
        regras: ['RN-37'],
        requisitos: ['RF-AGD-08', 'RF-AGD-09'],
        passos: [
          { perfil: A, texto: 'Na ficha da Larissa, use "Agendar aula" para marcar uma aula futura.' },
          { perfil: A, texto: 'No histórico de frequência, clique em "Remarcar" nessa aula e escolha outro horário.' },
          { perfil: A, texto: 'Clique em "Cancelar" na aula remarcada.' },
        ],
        conferir: [
          'Depois de remarcar, o saldo é o mesmo de antes: o extrato mostra o par "Liberação +1" e "Reserva −1".',
          'O cancelamento devolve o crédito mesmo em cima da hora — a antecedência é regra para a aluna, não para o studio.',
          'A auditoria registra as duas operações com a autora.',
        ],
      },
      {
        id: 'corrigir-chamada',
        titulo: 'Corrigir a chamada',
        resumo: 'A professora corrige dentro do prazo; fora dele, só a administração, com justificativa. Comissão e crédito acompanham.',
        regras: ['RN-27', 'RN-37'],
        requisitos: ['RF-PRE-05', 'RF-PRE-06'],
        preparo: 'Uma chamada já finalizada. Se precisar, finalize uma pelo cenário "Agendar e realizar a aula".',
        passos: [
          { perfil: P, texto: 'Abra a chamada finalizada dentro do prazo (3 dias): dá para trocar presença e "Salvar correção".' },
          { perfil: A, texto: 'Para o caso fora do prazo, em Parâmetros reduza o "Prazo de correção de chamada" para 0 dias e volte à mesma chamada: o botão passa a exigir a justificativa do ajuste.' },
          { perfil: A, texto: 'Caso especial: marque presente uma aluna cuja falta teve justificativa aprovada.' },
        ],
        conferir: [
          'A comissão é recalculada a cada correção.',
          'No caso especial, o crédito devolvido pela justificativa volta a ser consumido, e a justificativa passa a "Sem efeito".',
          'A correção fora do prazo fica na auditoria com a justificativa.',
        ],
      },
      {
        id: 'bloqueios',
        titulo: 'Quando a grade bloqueia',
        resumo: 'Sem pacote, saldo insuficiente, trancada, data após a validade, turma lotada: cada caso diz o motivo.',
        regras: ['RN-07', 'RN-10', 'RN-11', 'RN-30'],
        requisitos: ['RF-AGD-03', 'RF-AGD-05', 'RF-AGD-06', 'RF-AGD-07'],
        passos: [
          { perfil: L, texto: 'Entre como Aline (sem pacote): a grade mostra o bloqueio com o link para Meu pacote.' },
          { perfil: L, texto: 'Entre como Helena (pagamento pendente): o bloqueio é o mesmo, "Nenhum pacote ativo" — pendência de termo nunca bloqueia (RF-ALU-08).' },
          { perfil: L, texto: 'Entre como Patrícia (1 crédito) e agende uma aula. Volte à grade: "Saldo insuficiente".' },
          { perfil: L, texto: 'Como qualquer aluna, navegue a grade além da validade do pacote: as aulas ficam esmaecidas com o motivo.' },
          { perfil: A, texto: 'Em Configuração → Parâmetros, mude a janela de agendamento e veja a grade da aluna encurtar ou alongar.' },
        ],
        conferir: [
          'Nenhum bloqueio esconde a aula sem dizer por quê, e os de saldo e pacote levam à compra.',
          'A janela do convênio é um parâmetro separado do das alunas com pacote.',
          'Nenhum dos bloqueios é por termo ou anamnese: a aluna com pendência agenda igual às outras.',
        ],
      },
    ],
  },
  {
    id: 'excepcionais',
    titulo: 'Workshop e aula particular',
    descricao: 'Criadas e alocadas pela administração, fora da grade. O crédito sai na hora, sem reserva.',
    cenarios: [
      {
        id: 'workshop',
        titulo: 'Criar um workshop e alocar as alunas',
        resumo: 'Categoria, professoras com comissão própria, alocação com consumo imediato.',
        fluxo: '6.7 Criação de workshop ou aula particular',
        regras: ['RN-09', 'RN-12', 'RN-13', 'RN-14', 'RN-15', 'RN-34'],
        requisitos: ['RF-AEX-01', 'RF-AEX-04', 'RF-AEX-05', 'RF-AEX-06', 'RF-AEX-07', 'RF-AEX-08', 'RF-AEX-11', 'RF-NOT-04'],
        passos: [
          { perfil: A, texto: 'Em Aulas excepcionais, "Nova aula excepcional": categoria Workshop, nome, data, horário, espaço.' },
          { perfil: A, texto: 'Vincule Beatriz Nogueira com R$ 180,00 de comissão. Crie.' },
          { perfil: A, texto: 'Em "Alocar alunas", aloque Larissa: 2 créditos saem na hora.' },
          { perfil: A, texto: 'Tente alocar Renata Souza (convênio) e Aline Martins (sem pacote).' },
          { perfil: A, texto: 'Aloque alguém marcando "Sem consumo de créditos" e escolha o motivo.' },
          { perfil: A, texto: 'Cancele uma alocação.' },
        ],
        conferir: [
          'No extrato da Larissa o consumo aparece direto, sem passar por reserva.',
          'Renata é recusada (convênio não participa); Aline também, com a saída sugerida.',
          'A alocação sem consumo mostra o motivo na lista; o cancelamento estorna os créditos.',
          'A tela diz quantas estão alocadas, mas não impõe limite.',
        ],
      },
      {
        id: 'conflito-excepcional',
        titulo: 'Conflito com a grade e horário fora do funcionamento',
        resumo: 'Conflito de espaço ou professora bloqueia. Sessão regular no mesmo horário pode ser cancelada. Fora do horário só alerta.',
        regras: ['RN-16', 'RN-23'],
        requisitos: ['RF-AEX-02', 'RF-AEX-03', 'RF-AEX-13'],
        passos: [
          { perfil: A, texto: 'Crie uma aula excepcional numa segunda ou quarta às 08:00, no mesmo espaço da sessão de POLE INICIANTE.' },
          { perfil: A, texto: 'A tela informa a sessão em conflito, quantas alunas estão agendadas e oferece cancelá-la.' },
          { perfil: A, texto: 'Crie outra às 22:00: o alerta de fora do funcionamento aparece e o botão vira "Confirmar assim mesmo".' },
        ],
        conferir: [
          'Cancelando a sessão em conflito, as alunas recebem os créditos de volta e a validade prorrogada.',
          'A aula fora do horário nasce com o selo "Fora do funcionamento".',
          'A aula excepcional nunca aparece na grade da aluna nem na lista de espelhamento dos convênios.',
        ],
      },
      {
        id: 'chamada-excepcional',
        titulo: 'Chamada e comissão da aula excepcional',
        resumo: 'Um lançamento por professora vinculada, com o valor do cadastro. Sem professora, sem comissão.',
        regras: ['RN-24'],
        requisitos: ['RF-AEX-10', 'RF-AEX-12', 'RF-COM-01', 'RF-COM-02'],
        preparo: 'Um workshop criado com professora vinculada e ao menos uma aluna alocada.',
        passos: [
          { perfil: A, texto: 'Em Aulas excepcionais, clique em "Chamada" na aula. Ela mostra quanto cada participação consumiu e quanto cada professora vai receber.' },
          { perfil: A, texto: 'Finalize.' },
          { perfil: P, texto: 'Como Beatriz, em Meus pagamentos.' },
        ],
        conferir: [
          'A comissão é R$ 180,00 — o valor do cadastro, não os R$ 35,00 da categoria dela.',
          'A linha traz a base de cálculo e o selo "Excepcional".',
          'A finalização não mexe em crédito: eles já saíram na alocação.',
        ],
      },
    ],
  },
  {
    id: 'studio-cancela',
    titulo: 'Quando o studio cancela',
    descricao: 'Feriado, professora indisponível, sessão excluída: crédito devolvido e validade prorrogada, sempre.',
    cenarios: [
      {
        id: 'excecao-calendario',
        titulo: 'Exceção no calendário',
        resumo: 'Uma data em que o studio não abre: as sessões do dia são canceladas e a aluna vê o motivo na grade.',
        regras: ['RN-16', 'RN-29'],
        requisitos: ['RF-EXC-01', 'RF-EXC-03', 'RF-EXC-04', 'RF-EXC-05', 'RF-NOT-05', 'RF-CPR-07'],
        passos: [
          { perfil: L, texto: 'Como Larissa, agende uma aula para uma data futura.' },
          { perfil: A, texto: 'Em Exceções, "Nova exceção" nessa data, com o motivo. A prévia diz quantas alunas serão afetadas.' },
          { perfil: A, texto: 'Confirme.' },
          { perfil: L, texto: 'Como Larissa, navegue a grade até a data.' },
        ],
        conferir: [
          'A grade mostra "O studio não abre em…" com o motivo, em vez de um dia vazio.',
          'Em Minhas aulas, a aula aparece "Cancelada pelo studio" com o crédito devolvido, e a validade da carteira ganhou os dias de prorrogação.',
          'Duas exceções em datas diferentes prorrogam duas vezes: a prorrogação é por ocorrência.',
        ],
      },
      {
        id: 'solicitacao-professora',
        titulo: 'A professora pede para cancelar',
        resumo: 'A aula segue ativa até a administração decidir: substituta, cancelamento ou recusa.',
        regras: ['RN-16', 'RN-26', 'RN-32'],
        requisitos: ['RF-CPR-01', 'RF-CPR-02', 'RF-CPR-03', 'RF-CPR-04', 'RF-CPR-05', 'RF-CPR-06', 'RF-NOT-06', 'RF-NOT-11'],
        passos: [
          { perfil: P, texto: 'Como Beatriz, em Minhas aulas, escolha uma aula futura e clique em "Solicitar cancelamento" com um motivo.' },
          { perfil: A, texto: 'No painel, "Solicitações de cancelamento". Abra a fila.' },
          { perfil: A, texto: 'Aprove com substituta (a aula continua, com outra professora) ou "Aprovar e cancelar a aula".' },
          { perfil: P, texto: 'Como Beatriz, veja a situação da solicitação em Minhas aulas.' },
        ],
        conferir: [
          'Enquanto pendente, a aula continua na grade da aluna.',
          'Com substituta, a comissão daquela aula vai para quem conduziu.',
          'Cancelando, cada aluna agendada recebe o crédito e a prorrogação, e é notificada.',
        ],
      },
    ],
  },
  {
    id: 'pausa-e-devolucao',
    titulo: 'Trancamento e reembolso',
    descricao: 'Duas operações exclusivas da administração. A aluna não pede nenhuma delas pelo sistema.',
    cenarios: [
      {
        id: 'trancamento',
        titulo: 'Trancar e registrar o retorno',
        resumo: 'A validade congela e volta prorrogada pelos dias parados. Aulas do período são canceladas com devolução.',
        fluxo: '6.8 Trancamento',
        regras: ['RN-17'],
        requisitos: ['RF-TRA-01', 'RF-TRA-02', 'RF-TRA-03', 'RF-TRA-04', 'RF-TRA-05', 'RF-TRA-06'],
        passos: [
          { perfil: L, texto: 'Como Larissa, agende uma aula para os próximos dias.' },
          { perfil: A, texto: 'Na ficha dela, "Trancar". A prévia mostra os créditos congelados, a nova validade e as aulas do período que serão canceladas. Confirme.' },
          { perfil: L, texto: 'Entre como Larissa: a grade está bloqueada e, em Meu pacote, a compra está desabilitada com a explicação.' },
          { perfil: A, texto: 'Na ficha, "Registrar retorno" antes da data prevista.' },
        ],
        conferir: [
          'No trancamento, a validade avança pelos dias previstos e a aula agendada volta ao saldo.',
          'No retorno antecipado, o extrato registra o acerto negativo em dias: a prorrogação fica igual ao tempo realmente parado.',
          'A seção "Trancamentos" da ficha guarda o histórico.',
        ],
      },
      {
        id: 'reembolso',
        titulo: 'Reembolso por arrependimento',
        resumo: 'Até 7 dias da compra e no máximo 50% usados. Desconta o que foi utilizado e encerra a carteira.',
        fluxo: '6.9 Reembolso por arrependimento',
        regras: ['RN-20', 'RN-21', 'RN-22', 'RN-37'],
        requisitos: ['RF-REE-01', 'RF-REE-02', 'RF-REE-03', 'RF-REE-05', 'RF-REE-08', 'RF-REE-09', 'RF-REE-10', 'RF-NOT-12'],
        preparo: 'Uma compra recente. Faça uma nova compra na ficha de uma aluna, ou use a matrícula pelo site.',
        passos: [
          { perfil: A, texto: 'Na ficha, no histórico de compras, clique em "Reembolsar" na venda recente.' },
          { perfil: A, texto: 'A prévia aplica as regras: prazo, percentual usado, valor devolvido já descontando os créditos utilizados. Confirme.' },
          { perfil: A, texto: 'Tente reembolsar uma compra antiga (a Starter da Larissa, de mais de três meses atrás).' },
          { perfil: L, texto: 'Entre como a aluna reembolsada.' },
        ],
        conferir: [
          'A carteira encerra; em Vendas, a venda vira "Reembolsada" com o valor devolvido, e a lista "Reembolsos aplicados" registra autora e motivo.',
          'A compra antiga é recusada pelo prazo.',
          'A aluna vê só o efeito no histórico de compras dela. Nenhuma tela de aluna oferece pedir reembolso, e quem nunca teve um não vê a palavra.',
          'Numa renovação antecipada, o reembolso devolve só a compra e restaura a validade anterior (PA-09).',
        ],
      },
    ],
  },
  {
    id: 'convenios',
    titulo: 'Convênios',
    descricao: 'Wellhub e TotalPass reservam pelo aplicativo do parceiro. O check-in validado é o que autoriza o repasse.',
    cenarios: [
      {
        id: 'reserva-convenio',
        titulo: 'Reserva, check-in e repasse',
        resumo: 'A reserva ocupa vaga na sessão espelhada, sem crédito. O relatório confere o que o convênio deve pagar.',
        fluxo: '6.10 Fluxo de aluna de convênio',
        regras: ['RN-30', 'RN-33'],
        requisitos: ['RF-CNV-01', 'RF-CNV-02', 'RF-CNV-03', 'RF-CNV-06', 'RF-CNV-07', 'RF-CNV-08', 'RF-CNV-10', 'RF-CNV-11', 'RF-CNV-12', 'RF-CNV-14'],
        passos: [
          { perfil: A, texto: 'Em Convênios → Grade espelhada, escolha quais sessões vão para os convênios. Workshops não aparecem aqui.' },
          { perfil: A, texto: 'Em "Registrar reserva", simule a reserva da Renata numa sessão espelhada — é a mensagem que viria do aplicativo.' },
          { perfil: P, texto: 'Na chamada da aula, Renata aparece como convênio com check-in pendente. Dá para marcá-la presente para controle interno.' },
          { perfil: A, texto: 'Em Convênios → Reservas, "Validar check-in" — o que o aplicativo do parceiro faria.' },
          { perfil: A, texto: 'Abra "Relatório do período".' },
        ],
        conferir: [
          'A reserva ocupa a mesma capacidade da sessão que as alunas com pacote.',
          'A presença marcada pela professora não substitui o check-in nem gera repasse: só o check-in validado conta.',
          'O relatório não tem "aulas restantes": o limite é do convênio, e a tela diz isso.',
        ],
      },
      {
        id: 'pacote-e-convenio',
        titulo: 'Pacote e convênio na mesma pessoa',
        resumo: 'Uma condição não bloqueia a outra. Cada aula registra de onde veio.',
        regras: ['RN-33'],
        requisitos: ['RF-CNV-09'],
        passos: [
          { perfil: A, texto: 'Na ficha da Renata, "Comprar pacote".' },
          { perfil: L, texto: 'Entre como Renata: o aviso do convênio continua, e agora convive com o saldo e a grade para agendar por crédito.' },
          { perfil: A, texto: 'Em Convênios → Reservas.' },
        ],
        conferir: [
          'As reservas dela passam a dizer "Também tem pacote de créditos no studio".',
          'No histórico de frequência, cada aula diz se foi reserva pelo convênio (sem crédito) ou agendamento por crédito.',
        ],
      },
    ],
  },
  {
    id: 'comissao',
    titulo: 'Comissão da professora',
    descricao: 'Gerada na chamada, apurada por mês, paga até o quinto dia útil do mês seguinte.',
    cenarios: [
      {
        id: 'fechamento',
        titulo: 'Fechar o mês e registrar o pagamento',
        resumo: 'O total por professora, o detalhamento para conferência, o fechamento e a marcação de pago.',
        fluxo: '6.11 Fechamento de comissão',
        regras: ['RN-24', 'RN-28', 'RN-37'],
        requisitos: ['RF-COM-05', 'RF-COM-06', 'RF-COM-07', 'RF-COM-08', 'RF-COM-09', 'RF-COM-10', 'RF-PNL-04'],
        passos: [
          { perfil: P, texto: 'Como Beatriz, finalize as chamadas pendentes que o painel dela lista.' },
          { perfil: P, texto: 'Em Meus pagamentos: aulas do período, valor por aula, total, data de fechamento e de pagamento.' },
          { perfil: A, texto: 'Em Comissões, "Detalhar" mostra cada aula com a base de cálculo, separando regulares de excepcionais. "Exportar CSV" leva o mesmo.' },
          { perfil: A, texto: '"Fechar período" — a confirmação avisa se ainda há chamadas pendentes. Depois, "Registrar pagamento".' },
        ],
        conferir: [
          'O fechamento aparece como "Pago" para a administração e para a professora.',
          'Chamada pendente não entra no fechamento: a comissão dela não existe ainda.',
        ],
      },
      {
        id: 'sem-presenca',
        titulo: 'Aula em que ninguém apareceu',
        resumo: 'Não gera comissão. Fica destacada no fechamento para a administração decidir.',
        regras: ['RN-25'],
        requisitos: ['RF-COM-03'],
        passos: [
          { perfil: P, texto: 'Numa chamada pendente, marque todas as alunas como ausentes e finalize.' },
          { perfil: A, texto: 'Em Comissões.' },
        ],
        conferir: [
          'O toast da finalização já avisa que nenhuma comissão foi gerada.',
          'Em Comissões, a aula aparece no bloco "finalizada(s) sem nenhuma presença", separada das chamadas pendentes, e não entra em nenhum total.',
        ],
      },
      {
        id: 'ajuste-fechado',
        titulo: 'Correção em mês já fechado',
        resumo: 'O fechamento anterior não muda. A diferença entra como ajuste no próximo.',
        regras: ['RN-27'],
        requisitos: ['RF-COM-11'],
        preparo: 'Um período fechado (cenário "Fechar o mês").',
        passos: [
          { perfil: A, texto: 'Abra uma chamada do período fechado e corrija a presença, com a justificativa do ajuste fora do prazo.' },
          { perfil: A, texto: 'Em Comissões.' },
        ],
        conferir: [
          'O fechamento anterior continua igual.',
          'A comissão recalculada aparece como "ajuste de período anterior" no período em aberto, e será absorvida pelo próximo fechamento.',
        ],
      },
    ],
  },
];
