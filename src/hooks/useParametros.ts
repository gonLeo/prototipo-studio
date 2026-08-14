import { useCallback, useEffect, useState } from 'react';
import { parametroRepositorio } from '../services/repositorios';
import type { Parametro } from '../types/domain';

// RF-CFG-05 (Decisão de UX): cada parâmetro exibe, ao lado do campo, o efeito
// prático do valor informado em linguagem natural.
const EFEITO_POR_CHAVE: Record<string, (valor: number) => string> = {
  janela_agendamento_matriculadas_dias: (v) => `A aluna matriculada enxerga e agenda a grade até ${v} dias à frente.`,
  janela_agendamento_convenio_dias: (v) => `A aluna de convênio enxerga e agenda a grade até ${v} dias à frente.`,
  antecedencia_cancelamento_horas: (v) => `Cancelar com ${v}h ou mais de antecedência devolve o crédito ao saldo.`,
  prazo_bloqueio_inadimplencia_dias: (v) => `Após ${v} dias sem pagamento, a aluna é marcada como inadimplente e o agendamento é bloqueado.`,
  prazo_correcao_chamada_dias: (v) => `A professora pode corrigir a chamada em até ${v} dias após a aula.`,
  dias_adicionais_cancelamento_studio: (v) => `Sessão cancelada pelo studio concede ${v} dias adicionais de vigência às alunas afetadas.`,
  limite_aulas_experimentais_por_modalidade: (v) => `Cada pessoa pode fazer ${v} aula(s) experimental(is) por modalidade.`,
  valor_aula_experimental: (v) => `A aula experimental custa R$ ${v.toFixed(2)}, qualquer que seja a modalidade.`,
  prazo_justificativa_dias: (v) => `A aluna tem até ${v} dias após a aula para enviar justificativa de falta.`,
  percentual_multa: (v) => `Cobranças em atraso recebem multa de ${v}%.`,
  percentual_juros_mes: (v) => `Cobranças em atraso recebem juros de ${v}% ao mês.`,
  antecedencia_aviso_vencimento_dias_1: (v) => `Primeiro aviso de término de contrato enviado ${v} dias antes do vencimento.`,
  antecedencia_aviso_vencimento_dias_2: (v) => `Segundo aviso de término de contrato enviado ${v} dias antes do vencimento.`,
};

export function efeitoDoParametro(parametro: Parametro): string | undefined {
  const gerarFrase = EFEITO_POR_CHAVE[parametro.chave];
  const valorNumerico = Number(parametro.valor);
  if (!gerarFrase || Number.isNaN(valorNumerico)) return undefined;
  return gerarFrase(valorNumerico);
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

  async function atualizarValor(id: string, valor: number) {
    if (Number.isNaN(valor) || valor < 0) {
      throw new Error('Informe um valor numérico válido.');
    }
    await parametroRepositorio.atualizar(id, { valor });
    await recarregar();
  }

  return { parametros, carregando, atualizarValor };
}
