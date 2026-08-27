import { useCallback, useEffect, useState } from 'react';
import { parametroRepositorio } from '../services/repositorios';
import type { Parametro } from '../types/domain';

export type ValorParametro = string | number;

/**
 * Nem todo parâmetro é um número. O v2.0 trouxe dois que não são: o tipo do
 * benefício de conversão da experimental (escolha entre alternativas, PA-04)
 * e o texto do prazo de reembolso mostrado à aluna (PA-03). É o que define
 * qual controle a tela de parâmetros usa em cada linha.
 */
export type TipoParametro = 'numero' | 'texto' | 'opcao';

export interface OpcaoParametro {
  valor: string;
  rotulo: string;
}

interface DefinicaoParametro {
  tipo: TipoParametro;
  /**
   * RF-CFG-06 (Decisão de interface): a frase em linguagem natural com o
   * efeito prático do valor informado, exibida ao lado do campo.
   */
  efeito: (valor: ValorParametro) => string;
  opcoes?: OpcaoParametro[];
}

const OPCOES_BENEFICIO_CONVERSAO: OpcaoParametro[] = [
  { valor: 'credito_adicional', rotulo: 'Crédito adicional no primeiro pacote' },
  { valor: 'desconto_valor', rotulo: 'Desconto no valor do pacote' },
];

function rotuloDoBeneficio(valor: ValorParametro): string {
  return OPCOES_BENEFICIO_CONVERSAO.find((o) => o.valor === String(valor))?.rotulo ?? String(valor);
}

const DEFINICOES: Record<string, DefinicaoParametro> = {
  // --- Agendamento e cancelamento ---
  janela_agendamento_com_pacote_dias: {
    tipo: 'numero',
    efeito: (v) => `A aluna com pacote enxerga e agenda a grade até ${v} dias à frente.`,
  },
  janela_agendamento_convenio_dias: {
    tipo: 'numero',
    efeito: (v) => `A aluna de convênio enxerga e agenda a grade até ${v} dias à frente.`,
  },
  antecedencia_cancelamento_horas: {
    tipo: 'numero',
    efeito: (v) => `Cancelar com ${v}h ou mais de antecedência libera os créditos reservados.`,
  },
  prazo_correcao_chamada_dias: {
    tipo: 'numero',
    efeito: (v) => `A professora pode corrigir a chamada em até ${v} dias após a aula.`,
  },
  dias_adicionais_cancelamento_studio: {
    tipo: 'numero',
    efeito: (v) => `Cada aula cancelada pelo studio prorroga em ${v} dias a validade das carteiras afetadas.`,
  },
  prazo_justificativa_dias: {
    tipo: 'numero',
    efeito: (v) => `A aluna tem até ${v} dias após a aula para enviar justificativa de falta.`,
  },

  // --- Carteira de créditos (v2.0) ---
  limiar_finalizando_creditos: {
    tipo: 'numero',
    efeito: (v) => `A carteira entra em "Finalizando" quando restam ${v} créditos ou menos.`,
  },
  limiar_finalizando_dias: {
    tipo: 'numero',
    efeito: (v) => `A carteira entra em "Finalizando" quando faltam ${v} dias ou menos para o vencimento.`,
  },

  // --- Reembolso (v2.0) ---
  prazo_arrependimento_dias: {
    tipo: 'numero',
    efeito: (v) => `A aluna pode obter reembolso por arrependimento em até ${v} dias corridos da compra.`,
  },
  percentual_maximo_creditos_reembolso: {
    tipo: 'numero',
    efeito: (v) => `Só há reembolso se a aluna tiver usado no máximo ${v}% dos créditos comprados.`,
  },
  texto_prazo_reembolso: {
    tipo: 'texto',
    efeito: () => 'Texto exibido à aluna na confirmação do reembolso.',
  },

  // --- Aula experimental ---
  limite_aulas_experimentais_por_modalidade: {
    tipo: 'numero',
    efeito: (v) => `Cada pessoa pode fazer ${v} aula(s) experimental(is) por modalidade.`,
  },
  valor_aula_experimental: {
    tipo: 'numero',
    efeito: (v) => `A aula experimental custa R$ ${Number(v).toFixed(2)}, qualquer que seja a modalidade.`,
  },
  beneficio_conversao_tipo: {
    tipo: 'opcao',
    opcoes: OPCOES_BENEFICIO_CONVERSAO,
    efeito: (v) => `Quem faz a experimental e compra um pacote recebe: ${rotuloDoBeneficio(v).toLowerCase()}.`,
  },
  beneficio_conversao_quantidade: {
    tipo: 'numero',
    efeito: (v) => `O benefício de conversão vale ${v} (crédito ou real, conforme o tipo escolhido acima).`,
  },
  beneficio_conversao_validade_dias: {
    tipo: 'numero',
    efeito: (v) => `O benefício de conversão precisa ser usado em até ${v} dias após a aula experimental.`,
  },

};

export function tipoDoParametro(parametro: Parametro): TipoParametro {
  return DEFINICOES[parametro.chave]?.tipo ?? 'numero';
}

export function opcoesDoParametro(parametro: Parametro): OpcaoParametro[] {
  return DEFINICOES[parametro.chave]?.opcoes ?? [];
}

export function efeitoDoParametro(parametro: Parametro): string | undefined {
  const definicao = DEFINICOES[parametro.chave];
  if (!definicao) return undefined;
  if (definicao.tipo === 'numero' && Number.isNaN(Number(parametro.valor))) return undefined;
  return definicao.efeito(parametro.valor);
}

export function useParametros() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await parametroRepositorio.listar();
    setParametros(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function atualizarValor(parametro: Parametro, valor: ValorParametro) {
    const tipo = tipoDoParametro(parametro);

    if (tipo === 'numero') {
      const numero = Number(valor);
      if (String(valor).trim() === '' || Number.isNaN(numero) || numero < 0) {
        throw new Error('Informe um valor numérico válido.');
      }
      await parametroRepositorio.atualizar(parametro.id, { valor: numero });
    } else if (tipo === 'opcao') {
      const permitidas = opcoesDoParametro(parametro).map((o) => o.valor);
      if (!permitidas.includes(String(valor))) {
        throw new Error('Escolha uma das opções disponíveis.');
      }
      await parametroRepositorio.atualizar(parametro.id, { valor: String(valor) });
    } else {
      const texto = String(valor).trim();
      if (!texto) throw new Error('O texto não pode ficar vazio.');
      await parametroRepositorio.atualizar(parametro.id, { valor: texto });
    }

    await recarregar();
  }

  return { parametros, carregando, atualizarValor };
}
