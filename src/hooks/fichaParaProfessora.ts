import { useCallback, useEffect, useState } from 'react';
import {
  agendamentoRepositorio,
  alunaRepositorio,
  anamneseRepositorio,
  carteiraRepositorio,
  modalidadeRepositorio,
  ocorrenciaSessaoRepositorio,
  registroAuditoriaRepositorio,
  sessaoRepositorio,
  usuarioRepositorio,
} from '../services/repositorios';
import type { Anamnese, Aluna, Carteira, Usuario } from '../types/domain';
import { hojeISO } from '../utils/data';
import { lerCarteira, type LeituraDaCarteira } from '../utils/creditos';
import { limiaresFinalizando } from './carteiraDeCreditos';

/**
 * Ficha da aluna vista pela professora (RF-PRE-09).
 *
 * A professora consulta **qualquer** aluna do studio, não só as das turmas
 * dela: o requisito existe para ela conhecer condições de saúde relevantes
 * à condução da aula, e uma aluna pode aparecer numa reposição, numa aula
 * excepcional ou substituindo alguém.
 *
 * A leitura é **reduzida de propósito**: dados de contato, anamnese,
 * situação do pacote e próximas aulas. Valores, histórico de compras,
 * reembolsos e ajustes de carteira continuam só na ficha administrativa —
 * a professora precisa saber se a aluna pode treinar, não quanto ela pagou.
 *
 * Cada consulta é registrada na trilha de auditoria (RNF-05). É a **única
 * escrita que uma tela faz ao carregar** em todo o protótipo, e é o
 * próprio requisito que a exige: sem o registro, não há como saber quem
 * viu a anamnese de quem.
 */

export interface AulaDaAluna {
  data: string;
  horarioInicio: string;
  nomeModalidade: string;
}

export interface FichaParaProfessora {
  aluna: Aluna;
  usuario: Usuario;
  anamnese: Anamnese | undefined;
  carteira: Carteira | undefined;
  leitura: LeituraDaCarteira | undefined;
  proximasAulas: AulaDaAluna[];
}

/** Lista de alunas para a professora: nome, contato e se há anamnese. */
export interface AlunaParaProfessora {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  temAnamnese: boolean;
  /** Sinaliza pontos de atenção declarados na anamnese, sem abrir a ficha. */
  temRestricaoDeSaude: boolean;
}

/** Respostas que significam "há algo a observar" na condução da aula. */
function declarouRestricao(anamnese: Anamnese | undefined): boolean {
  if (!anamnese) return false;
  return ['lesao_ou_cirurgia', 'dor_articular', 'condicao_cardiaca', 'medicacao_continua', 'gestante'].some((chave) =>
    (anamnese.respostas[chave] ?? '').startsWith('Sim'),
  );
}

export function useAlunasParaProfessora() {
  const [alunas, setAlunas] = useState<AlunaParaProfessora[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let valido = true;
    Promise.all([alunaRepositorio.listar(), usuarioRepositorio.listar(), anamneseRepositorio.listar()]).then(
      ([lista, usuarios, anamneses]) => {
        if (!valido) return;
        const combinadas = lista.flatMap((aluna) => {
          const usuario = usuarios.find((u) => u.id === aluna.usuarioId);
          if (!usuario) return [];
          const anamnese = anamneses.find((a) => a.alunaId === aluna.id);
          return [
            {
              id: aluna.id,
              nome: usuario.nome,
              telefone: aluna.telefone,
              cpf: usuario.cpf,
              temAnamnese: anamnese !== undefined,
              temRestricaoDeSaude: declarouRestricao(anamnese),
            },
          ];
        });
        setAlunas(combinadas.sort((a, b) => a.nome.localeCompare(b.nome)));
        setCarregando(false);
      },
    );
    return () => {
      valido = false;
    };
  }, []);

  return { alunas, carregando };
}

/**
 * Carrega a ficha e **registra a consulta** (RNF-05).
 *
 * O registro é feito uma vez por abertura, não a cada renderização: a
 * dependência é o par aluna + professora, e o efeito da tela é disparado
 * pela navegação.
 */
export function useFichaParaProfessora(params: {
  alunaId: string | undefined;
  professoraId: string | undefined;
  autorId: string | undefined;
}) {
  const { alunaId, professoraId, autorId } = params;
  const [ficha, setFicha] = useState<FichaParaProfessora>();
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!alunaId) return;
    setCarregando(true);
    const hoje = hojeISO();

    const [alunas, usuarios, anamneses, carteiras, agendamentos, ocorrencias, sessoes, modalidades, limiares] =
      await Promise.all([
        alunaRepositorio.listar(),
        usuarioRepositorio.listar(),
        anamneseRepositorio.listar(),
        carteiraRepositorio.listar(),
        agendamentoRepositorio.listar(),
        ocorrenciaSessaoRepositorio.listar(),
        sessaoRepositorio.listar(),
        modalidadeRepositorio.listar(),
        limiaresFinalizando(),
      ]);

    const aluna = alunas.find((a) => a.id === alunaId);
    const usuario = usuarios.find((u) => u.id === aluna?.usuarioId);
    if (!aluna || !usuario) {
      setFicha(undefined);
      setCarregando(false);
      return;
    }

    const carteira = carteiras
      .filter((c) => c.alunaId === aluna.id && c.situacao === 'ativa')
      .find((c) => !lerCarteira(c, hoje, limiares).encerrada);

    const proximasAulas = agendamentos
      .filter((a) => a.alunaId === aluna.id && a.situacao === 'ativo')
      .flatMap((agendamento) => {
        const ocorrencia = ocorrencias.find((o) => o.id === agendamento.ocorrenciaSessaoId);
        if (!ocorrencia || ocorrencia.data < hoje || ocorrencia.situacao === 'cancelada') return [];
        const sessao = sessoes.find((s) => s.id === ocorrencia.sessaoId);
        return [
          {
            data: ocorrencia.data,
            horarioInicio: sessao?.horarioInicio ?? '',
            nomeModalidade: modalidades.find((m) => m.id === sessao?.modalidadeId)?.nome ?? 'Modalidade',
          },
        ];
      })
      .sort((a, b) => a.data.localeCompare(b.data));

    setFicha({
      aluna,
      usuario,
      anamnese: anamneses.find((a) => a.alunaId === aluna.id),
      carteira,
      leitura: carteira ? lerCarteira(carteira, hoje, limiares) : undefined,
      proximasAulas,
    });
    setCarregando(false);

    // RNF-05: a consulta à ficha por uma professora é auditada. Gravar
    // aqui, e não num efeito à parte, mantém o registro atrelado ao que foi
    // efetivamente carregado.
    if (professoraId && autorId) {
      await registroAuditoriaRepositorio.criar({
        entidadeAfetada: 'Aluna',
        operacao: 'consulta_ficha_pela_professora',
        autorId,
        dataHora: new Date().toISOString(),
        valorNovo: { alunaId: aluna.id, aluna: usuario.nome, professoraId },
      });
    }
  }, [alunaId, professoraId, autorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ficha, carregando };
}
