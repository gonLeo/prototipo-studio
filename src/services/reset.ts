import seed from '../data/seed.json';
import { http } from './http';

type Registro = { id: string } & Record<string, unknown>;
type BaseDeDados = Record<string, Registro[]>;

/**
 * Restaura o protótipo ao estado original do backfill (src/data/seed.json).
 * Para cada recurso do seed: remove tudo que existe hoje no json-server e
 * recria os registros originais. Usa somente a API REST já exposta pelos
 * repositórios (http), o mesmo caminho que o app real usará no futuro.
 */
export async function resetarPrototipo(): Promise<void> {
  const dados = seed as BaseDeDados;

  for (const [recurso, registrosOriginais] of Object.entries(dados)) {
    const base = `/${recurso}`;
    const atuais = await http.get<Registro[]>(base);

    for (const item of atuais) {
      await http.delete(`${base}/${item.id}`);
    }

    for (const item of registrosOriginais) {
      await http.post(base, item);
    }
  }
}
