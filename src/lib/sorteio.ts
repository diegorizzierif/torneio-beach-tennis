// Sorteio de duplas rotativas, mistas sempre que possível.
// Regras completas em docs/regras.md.

export type Sexo = 'M' | 'F';
export interface Jogador {
  id: string;
  sexo: Sexo;
}
export interface JogoSorteado {
  rodada: number; // 0, 1, 2...
  quadra: number; // 1 ou 2
  a: [string, string];
  b: [string, string];
}
export interface ResultadoSorteio {
  jogos: JogoSorteado[];
  parceirosRepetidos: number;
  maxSeguidos: number;
}

/** Quantidade de jogos por pessoa que fecham a conta para esse grupo. */
export function opcoesJogosPorPessoa(jogadores: Jogador[], max = 6): number[] {
  const n = jogadores.length;
  if (n < 4) return [];
  const w = jogadores.filter((j) => j.sexo === 'F').length;
  const minoria = Math.min(w, n - w);
  const out: number[] = [];
  for (let k = 2; k <= max; k++) {
    if ((n * k) % 4 !== 0) continue;
    // Se o sexo em menor número é ímpar (e maior que 1), todos dele jogam
    // só em mista x mista, então o total de vagas dele (minoria × k) precisa ser par.
    if (minoria > 1 && minoria % 2 === 1 && k % 2 === 1) continue;
    // Total de jogos grande demais para uma tarde.
    if ((n * k) / 4 > 21) continue;
    out.push(k);
  }
  return out;
}

/** Gerador pseudoaleatório com semente (mulberry32), para o sorteio ser reproduzível. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const parKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

function combinacoes4<T>(arr: T[], fn: (a: T, b: T, c: T, d: T) => void) {
  const n = arr.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++) fn(arr[i], arr[j], arr[k], arr[l]);
}

export interface OpcoesSorteio {
  jogosPorPessoa: number;
  quadras?: 1 | 2;
  semente?: number;
  /** Tempo máximo de busca em ms. */
  tempoMs?: number;
}

/**
 * Monta a tabela de jogos. Retorna null se nenhuma tentativa fechou a tabela.
 * Prioridades: tipo de jogo válido > mesmo número de jogos para todos >
 * não repetir parceiro > até 2 jogos seguidos > variar adversários.
 */
export function sortear(jogadores: Jogador[], op: OpcoesSorteio): ResultadoSorteio | null {
  const k = op.jogosPorPessoa;
  const quadras = op.quadras ?? 1;
  const n = jogadores.length;
  if (n < 4 || (n * k) % 4 !== 0) return null;
  const N = (n * k) / 4;
  const sexo = new Map(jogadores.map((j) => [j.id, j.sexo]));
  const ids = jogadores.map((j) => j.id);
  const w = jogadores.filter((j) => j.sexo === 'F').length;
  // Com só 1 pessoa de um sexo não existe mista x mista: libera o tipo do jogo.
  const relaxado = Math.min(w, n - w) <= 1;
  const tipo = (x: string, y: string) => [sexo.get(x), sexo.get(y)].sort().join('');
  const valido = (p1: [string, string], p2: [string, string]) =>
    relaxado || tipo(...p1) === tipo(...p2);

  const rand = rng(op.semente ?? Date.now());
  const fim = Date.now() + (op.tempoMs ?? 1500);
  let melhor: { score: number[]; res: ResultadoSorteio } | null = null;
  let tentativas = 0;

  while (tentativas < 20 || (Date.now() < fim && tentativas < 5000)) {
    tentativas++;
    const restam = new Map(ids.map((id) => [id, k]));
    const parceiros = new Map<string, number>();
    const adversarios = new Map<string, number>();
    const seguidos = new Map(ids.map((id) => [id, 0]));
    const jogos: JogoSorteado[] = [];
    let naRodada = new Set<string>();
    let rodada = 0;
    let usadas = 0;
    let ok = true;

    const fecharRodada = () => {
      for (const id of ids) seguidos.set(id, naRodada.has(id) ? seguidos.get(id)! + 1 : 0);
      naRodada = new Set();
      rodada++;
      usadas = 0;
    };

    for (let m = 0; m < N && ok; m++) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const disp = ids.filter((id) => restam.get(id)! > 0 && !naRodada.has(id));
        let best: { s: number; p1: [string, string]; p2: [string, string] } | null = null;
        combinacoes4(disp, (a, b, c, d) => {
          const splits: [[string, string], [string, string]][] = [
            [[a, b], [c, d]],
            [[a, c], [b, d]],
            [[a, d], [b, c]],
          ];
          for (const [p1, p2] of splits) {
            if (!valido(p1, p2)) continue;
            let s = 100 * ((parceiros.get(parKey(...p1)) ?? 0) + (parceiros.get(parKey(...p2)) ?? 0));
            for (const x of p1) for (const y of p2) s += 3 * (adversarios.get(parKey(x, y)) ?? 0);
            for (const x of [a, b, c, d]) {
              if (seguidos.get(x)! >= 2) s += 20;
              s -= 2 * restam.get(x)!;
            }
            s += rand() * 4;
            if (!best || s < best.s) best = { s, p1, p2 };
          }
        });
        if (!best) {
          if (naRodada.size > 0) {
            fecharRodada();
            continue;
          }
          ok = false;
          break;
        }
        const { p1, p2 } = best as { p1: [string, string]; p2: [string, string] };
        for (const x of [...p1, ...p2]) {
          restam.set(x, restam.get(x)! - 1);
          naRodada.add(x);
        }
        parceiros.set(parKey(...p1), (parceiros.get(parKey(...p1)) ?? 0) + 1);
        parceiros.set(parKey(...p2), (parceiros.get(parKey(...p2)) ?? 0) + 1);
        for (const x of p1) for (const y of p2) adversarios.set(parKey(x, y), (adversarios.get(parKey(x, y)) ?? 0) + 1);
        usadas++;
        jogos.push({ rodada, quadra: usadas, a: p1, b: p2 });
        if (usadas === quadras) fecharRodada();
        break;
      }
    }
    if (!ok || jogos.length !== N) continue;

    const res = avaliar(jogos, ids);
    const score = [res.parceirosRepetidos, jogos[jogos.length - 1].rodada, res.maxSeguidos];
    if (!melhor || menor(score, melhor.score)) melhor = { score, res };
    if (Date.now() >= fim && tentativas >= 20) break;
  }
  return melhor?.res ?? null;
}

function menor(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

export function avaliar(jogos: JogoSorteado[], ids: string[]): ResultadoSorteio {
  const parceiros = new Map<string, number>();
  for (const j of jogos) for (const p of [j.a, j.b]) parceiros.set(parKey(...p), (parceiros.get(parKey(...p)) ?? 0) + 1);
  let parceirosRepetidos = 0;
  parceiros.forEach((v) => (parceirosRepetidos += Math.max(0, v - 1)));
  const rodadas = jogos.length ? jogos[jogos.length - 1].rodada + 1 : 0;
  const seg = new Map(ids.map((id) => [id, 0]));
  let maxSeguidos = 0;
  for (let r = 0; r < rodadas; r++) {
    const em = new Set(jogos.filter((j) => j.rodada === r).flatMap((j) => [...j.a, ...j.b]));
    for (const id of ids) {
      seg.set(id, em.has(id) ? seg.get(id)! + 1 : 0);
      maxSeguidos = Math.max(maxSeguidos, seg.get(id)!);
    }
  }
  return { jogos, parceirosRepetidos, maxSeguidos };
}
