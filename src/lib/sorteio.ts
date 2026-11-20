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
  /** Pares de jogadores que nunca jogaram um contra o outro. */
  naoSeEnfrentaram: number;
}

/** Quantidades de jogos por pessoa que o organizador pode escolher. */
export const JOGOS_POR_PESSOA = [4, 6, 8, 10] as const;

/**
 * Motivo para uma quantidade de jogos por pessoa não fechar a conta neste grupo,
 * ou null se ela funciona.
 */
export function motivoJogosInvalido(n: number, k: number): string | null {
  if (n < 4) return 'Inclua pelo menos 4 jogadores.';
  if ((n * k) % 4 !== 0)
    return `Com ${n} jogadores, ${k} jogos por pessoa não fecham a conta (o total de vagas precisa dividir por 4). Use 4 ou 8, ou inclua/retire um jogador.`;
  return null;
}

/** Quantidades de jogos por pessoa (entre 4, 6, 8 e 10) que fecham a conta para esse grupo. */
export function opcoesJogosPorPessoa(jogadores: Jogador[]): number[] {
  return JOGOS_POR_PESSOA.filter((k) => motivoJogosInvalido(jogadores.length, k) === null);
}

/**
 * Menor número de jogos por pessoa com que dá, em tese, para todo mundo enfrentar
 * todo mundo pelo menos uma vez, respeitando a regra das mistas.
 * - Cada jogo coloca a pessoa contra 2 adversários: k >= (n - 1) / 2.
 * - Uma mulher só enfrenta homens em jogos mistos, e cada misto tem só 1 homem do
 *   outro lado: ela precisa de pelo menos um jogo por homem (k >= homens).
 *   O mesmo vale para os homens em relação às mulheres (k >= mulheres).
 */
export function minimoTodosContraTodos(jogadores: Jogador[]): number {
  const n = jogadores.length;
  const w = jogadores.filter((j) => j.sexo === 'F').length;
  const base = Math.ceil((n - 1) / 2);
  if (Math.min(w, n - w) <= 1) return base;
  return Math.max(base, w, n - w);
}

/** Motivo para k jogos não bastarem para todos se enfrentarem, ou null se bastam. */
export function motivoTodosContraTodos(jogadores: Jogador[], k: number): string | null {
  if (jogadores.length < 4) return null;
  const min = minimoTodosContraTodos(jogadores);
  if (k >= min) return null;
  return `Para todo mundo enfrentar todo mundo com ${jogadores.length} jogadores, cada um precisa de pelo menos ${min} jogos.`;
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
  /** Prioriza que todo mundo enfrente todo mundo pelo menos uma vez. */
  todosContraTodos?: boolean;
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
    // Alterna o peso de "ainda não se enfrentaram": com peso maior todos se
    // enfrentam mais fácil, com peso menor repetem menos parceiros. Fica a melhor.
    const bonusNovo = [40, 120, 300][tentativas % 3];
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

    // Mede o quanto a escolha deixa o resto da tabela impossível de fechar.
    const qtd = { M: n - w, F: w };
    const desequilibrio = (jogam: string[]) => {
      const soma = { M: 0, F: 0 };
      const maior = { M: 0, F: 0 };
      for (const id of ids) {
        const sx = sexo.get(id)!;
        const r = restam.get(id)! - (jogam.includes(id) ? 1 : 0);
        soma[sx] += r;
        if (r > maior[sx]) maior[sx] = r;
      }
      let ruim = 0;
      for (const sx of ['M', 'F'] as const) {
        // Todo jogo tem pelo menos duas pessoas de cada sexo presente, então
        // ninguém pode ter mais jogos sobrando do que a soma dos outros do mesmo sexo.
        ruim += Math.max(0, 2 * maior[sx] - soma[sx]);
        // Com menos de 4 pessoas de um sexo não existe dupla x dupla do mesmo sexo:
        // cada vaga delas precisa de uma vaga do outro sexo num jogo misto.
        const outro = sx === 'M' ? 'F' : 'M';
        if (qtd[sx] < 4) ruim += Math.max(0, soma[sx] - soma[outro]);
      }
      return ruim;
    };

    for (let m = 0; m < N && ok; m++) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const disp = ids.filter((id) => restam.get(id)! > 0 && !naRodada.has(id));
        let best: { s: number; trava: number; p1: [string, string]; p2: [string, string] } | null = null;
        combinacoes4(disp, (a, b, c, d) => {
          const splits: [[string, string], [string, string]][] = [
            [[a, b], [c, d]],
            [[a, c], [b, d]],
            [[a, d], [b, c]],
          ];
          for (const [p1, p2] of splits) {
            if (!valido(p1, p2)) continue;
            let s = 100 * ((parceiros.get(parKey(...p1)) ?? 0) + (parceiros.get(parKey(...p2)) ?? 0));
            for (const x of p1)
              for (const y of p2) {
                const vezes = adversarios.get(parKey(x, y)) ?? 0;
                s += 3 * vezes;
                // Bônus para quem ainda não se enfrentou.
                if (op.todosContraTodos && vezes === 0) s -= bonusNovo;
              }
            for (const x of [a, b, c, d]) {
              if (seguidos.get(x)! >= 2) s += 20;
              s -= 2 * restam.get(x)!;
            }
            // Ninguém pode ficar com mais jogos sobrando do que a soma dos outros do
            // mesmo sexo: todo jogo tem pelo menos duas pessoas de cada sexo presente.
            const trava = relaxado ? 0 : desequilibrio([a, b, c, d]);
            s += 1000 * trava;
            s += rand() * 4;
            if (!best || s < best.s) best = { s, trava, p1, p2 };
          }
        });
        // Se o único jogo possível nesta rodada travaria o resto da tabela,
        // deixa a outra quadra vazia e começa uma rodada nova.
        if (!best || ((best as { trava: number }).trava > 0 && naRodada.size > 0)) {
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
    if (op.todosContraTodos) score.unshift(res.naoSeEnfrentaram);
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
  const enfrentaram = new Set<string>();
  for (const j of jogos) for (const x of j.a) for (const y of j.b) enfrentaram.add(parKey(x, y));
  const naoSeEnfrentaram = (ids.length * (ids.length - 1)) / 2 - enfrentaram.size;
  return { jogos, parceirosRepetidos, maxSeguidos, naoSeEnfrentaram };
}
