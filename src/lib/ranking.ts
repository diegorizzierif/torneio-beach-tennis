import type { Sexo } from './sorteio';

export interface ParticipanteR {
  id: string;
  nome: string;
  sexo: Sexo;
}
export interface JogoR {
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  games_a: number | null;
  games_b: number | null;
  status: string;
}
export interface LinhaRanking {
  posicao: number;
  id: string;
  nome: string;
  sexo: Sexo;
  jogos: number;
  vitorias: number;
  derrotas: number;
  feitos: number;
  sofridos: number;
  saldo: number;
}

/**
 * Ranking individual. Ordem: vitórias, saldo de games, games feitos,
 * confronto direto (só quando exatamente dois estão empatados) e, por fim, empate.
 */
export function calcularRanking(
  participantes: ParticipanteR[],
  jogos: JogoR[],
  filtro: 'geral' | Sexo = 'geral',
): LinhaRanking[] {
  const base = new Map<string, Omit<LinhaRanking, 'posicao'>>();
  for (const p of participantes)
    base.set(p.id, { id: p.id, nome: p.nome, sexo: p.sexo, jogos: 0, vitorias: 0, derrotas: 0, feitos: 0, sofridos: 0, saldo: 0 });
  // vitoriasContra["x|y"] = quantas vezes x venceu tendo y como adversário
  const vitoriasContra = new Map<string, number>();

  for (const j of jogos) {
    if (j.status !== 'finalizado' || j.games_a == null || j.games_b == null) continue;
    const lados: [string[], number, number][] = [
      [[j.a1, j.a2], j.games_a, j.games_b],
      [[j.b1, j.b2], j.games_b, j.games_a],
    ];
    for (const [dupla, f, s] of lados) {
      for (const id of dupla) {
        const l = base.get(id);
        if (!l) continue;
        l.jogos++;
        l.feitos += f;
        l.sofridos += s;
        l.saldo += f - s;
        if (f > s) l.vitorias++;
        else l.derrotas++;
      }
    }
    const [venc, perd] = j.games_a > j.games_b ? [[j.a1, j.a2], [j.b1, j.b2]] : [[j.b1, j.b2], [j.a1, j.a2]];
    for (const x of venc) for (const y of perd) vitoriasContra.set(`${x}|${y}`, (vitoriasContra.get(`${x}|${y}`) ?? 0) + 1);
  }

  const linhas = [...base.values()].filter((l) => filtro === 'geral' || l.sexo === filtro);
  const chave = (l: Omit<LinhaRanking, 'posicao'>) => [l.vitorias, l.saldo, l.feitos];
  const cmpChave = (x: number[], y: number[]) => {
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i];
    return 0;
  };
  linhas.sort((x, y) => cmpChave(chave(x), chave(y)) || x.nome.localeCompare(y.nome, 'pt-BR'));

  // Confronto direto: só resolve empates de exatamente duas pessoas.
  const h2h = (x: string, y: string) => (vitoriasContra.get(`${x}|${y}`) ?? 0) - (vitoriasContra.get(`${y}|${x}`) ?? 0);
  const out: LinhaRanking[] = [];
  let i = 0;
  while (i < linhas.length) {
    let j = i;
    while (j + 1 < linhas.length && cmpChave(chave(linhas[i]), chave(linhas[j + 1])) === 0) j++;
    const grupo = linhas.slice(i, j + 1);
    if (grupo.length === 2) {
      const d = h2h(grupo[0].id, grupo[1].id);
      if (d < 0) grupo.reverse();
      out.push({ ...grupo[0], posicao: i + 1 });
      out.push({ ...grupo[1], posicao: d === 0 ? i + 1 : i + 2 });
    } else {
      for (const l of grupo) out.push({ ...l, posicao: i + 1 });
    }
    i = j + 1;
  }
  return out;
}

/** Placar válido para 1 set até N games com tie-break em N a N (igual à regra do banco). */
export function placarValido(a: number, b: number, n: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi === n && lo <= n - 2) || (hi === n + 1 && (lo === n - 1 || lo === n));
}
