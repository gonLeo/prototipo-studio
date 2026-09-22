/**
 * Busca de aluna por nome, CPF ou telefone num único campo (RF-ALU-10).
 *
 * CPF e telefone são comparados **só pelos dígitos**: quem procura digita
 * "65968" ou "12345678900" sem a pontuação que o cadastro guarda.
 *
 * O cuidado que dá nome a esta função: `''.includes('')` é `true`, então
 * comparar os dígitos de um termo que não tem nenhum — qualquer busca por
 * nome — faria todas as alunas corresponderem, e o filtro pareceria não
 * funcionar. Por isso a comparação numérica só entra quando o termo tem
 * dígito.
 */
export interface DadosDeBuscaDaAluna {
  nome: string;
  cpf: string;
  telefone: string;
  /** Nem toda tela expõe o e-mail; quando expõe, ele também é pesquisável. */
  email?: string;
}

export function alunaCorrespondeAoTermo(dados: DadosDeBuscaDaAluna, termoNormalizado: string): boolean {
  const termo = termoNormalizado.trim().toLowerCase();
  if (!termo) return true;

  const digitos = termo.replace(/\D/g, '');
  const apenasDigitos = (valor: string) => valor.replace(/\D/g, '');

  if (dados.nome.toLowerCase().includes(termo)) return true;
  if (dados.email?.toLowerCase().includes(termo)) return true;

  if (digitos.length === 0) return false;
  return apenasDigitos(dados.cpf).includes(digitos) || apenasDigitos(dados.telefone).includes(digitos);
}
