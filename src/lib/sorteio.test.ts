import { describe, expect, it } from 'vitest';
import { minimoTodosContraTodos, motivoJogosInvalido, opcoesJogosPorPessoa, sortear, type Jogador } from './sorteio';
import { calcularRanking, placarValido } from './ranking';

function grupo(homens: number, mulheres: number): Jogador[] {
  return [
    ...Array.from({ length: homens }, (_, i) => ({ id: `H${i}`, sexo: 'M' as const })),
    ...Array.from({ length: mulheres }, (_, i) => ({ id: `M${i}`, sexo: 'F' as const })),
  ];
}

function conferir(js: Jogador[], k: number, quadras: 1 | 2) {
  const r = sortear(js, { jogosPorPessoa: k, quadras, semente: 42, tempoMs: 300 });
  expect(r, `${js.length} jogadores, ${k} jogos, ${quadras} quadra(s)`).not.toBeNull();
  const sexo = new Map(js.map((j) => [j.id, j.sexo]));
  const cont = new Map<string, number>();
  for (const j of r!.jogos) {
    const t = (p: string[]) => p.map((x) => sexo.get(x)).sort().join('');
    const ta = t(j.a);
    const tb = t(j.b);
    if (Math.min(...['M', 'F'].map((s) => js.filter((x) => x.sexo === s).length)) > 1) expect(ta).toBe(tb);
    const todos = [...j.a, ...j.b];
    expect(new Set(todos).size).toBe(4);
    for (const x of todos) cont.set(x, (cont.get(x) ?? 0) + 1);
  }
  for (const j of js) expect(cont.get(j.id)).toBe(k);
  // ninguém em dois jogos da mesma rodada
  const porRodada = new Map<number, string[]>();
  for (const j of r!.jogos) porRodada.set(j.rodada, [...(porRodada.get(j.rodada) ?? []), ...j.a, ...j.b]);
  porRodada.forEach((v) => expect(new Set(v).size).toBe(v.length));
  return r!;
}

describe('sorteio', () => {
  it('8 jogadores, 4H+4M, 4 jogos: tudo misto, sem repetir parceiro, no máx. 2 seguidos', () => {
    const r = conferir(grupo(4, 4), 4, 1);
    expect(r.jogos).toHaveLength(8);
    expect(r.parceirosRepetidos).toBe(0);
    expect(r.maxSeguidos).toBeLessThanOrEqual(2);
  });

  it('funciona para todas as opções de 8 a 14 jogadores (1 quadra)', () => {
    for (let n = 8; n <= 14; n++)
      for (let w = 2; w <= n / 2; w++) {
        const js = grupo(n - w, w);
        for (const k of opcoesJogosPorPessoa(js)) conferir(js, k, 1);
      }
  }, 300_000);

  it('3 mulheres com 2 quadras e 8 ou 10 jogos não trava', () => {
    conferir(grupo(6, 3), 8, 2);
    conferir(grupo(6, 3), 4, 2);
    conferir(grupo(7, 3), 10, 2);
    conferir(grupo(7, 3), 8, 2);
  }, 60_000);

  it('funciona com 2 quadras para 10 a 14 jogadores, 4 jogos', () => {
    for (let n = 10; n <= 14; n++)
      for (let w = 2; w <= n / 2; w++) {
        const js = grupo(n - w, w);
        if (opcoesJogosPorPessoa(js).includes(4)) conferir(js, 4, 2);
      }
  }, 120_000);

  it('opções de jogos por pessoa: 4, 6, 7, 8 e 10', () => {
    expect(opcoesJogosPorPessoa(grupo(4, 4))).toEqual([4, 6, 7, 8, 10]);
    expect(opcoesJogosPorPessoa(grupo(6, 6))).toEqual([4, 6, 7, 8, 10]);
    // 7 jogos com 3 mulheres: vagas femininas ímpares, não fecha
    expect(motivoJogosInvalido(8, 7, 3)).toMatch(/ímpar/);
    expect(opcoesJogosPorPessoa(grupo(5, 3))).toEqual([4, 6, 8, 10]);
    expect(opcoesJogosPorPessoa(grupo(7, 7))).toEqual([4, 6, 8, 10]);
    // número ímpar de jogadores: 6 e 10 não fecham a conta
    expect(opcoesJogosPorPessoa(grupo(6, 3))).toEqual([4, 8]);
    expect(motivoJogosInvalido(9, 6)).toMatch(/9 jogadores/);
    expect(motivoJogosInvalido(9, 8)).toBeNull();
  });
});

describe('8 jogadores (4H+4M), 7 jogos, 2 quadras', () => {
  it('todo mundo joga com todo mundo, 7 rodadas sem descanso', () => {
    const js = grupo(4, 4);
    const sexo = new Map(js.map((j) => [j.id, j.sexo]));
    for (const semente of [1, 2, 3]) {
      const r = sortear(js, { jogosPorPessoa: 7, quadras: 2, semente, tempoMs: 800 })!;
      expect(r.jogos).toHaveLength(14);
      expect(r.parceirosRepetidos).toBe(0);
      // 28 parcerias possíveis, cada uma exatamente uma vez
      const pares = new Set(r.jogos.flatMap((j) => [j.a, j.b]).map((p) => [...p].sort().join('|')));
      expect(pares.size).toBe(28);
      const rodadas = new Map<number, string[]>();
      for (const j of r.jogos) rodadas.set(j.rodada, [...(rodadas.get(j.rodada) ?? []), [...j.a].map((x) => sexo.get(x)).sort().join('')]);
      expect(rodadas.size).toBe(7);
      const tipos = [...rodadas.values()].map((t) => t.sort().join(' + '));
      expect(tipos.filter((t) => t === 'FF + MM')).toHaveLength(3);
      expect(tipos.filter((t) => t === 'FM + FM')).toHaveLength(4);
    }
  });
});

describe('todos contra todos', () => {
  it('mínimo de jogos por pessoa', () => {
    expect(minimoTodosContraTodos(grupo(4, 4))).toBe(4);
    expect(minimoTodosContraTodos(grupo(5, 4))).toBe(5); // 9 jogadores: na prática 8 jogos
    expect(minimoTodosContraTodos(grupo(6, 6))).toBe(6);
    expect(minimoTodosContraTodos(grupo(10, 2))).toBe(10);
  });

  it('com jogos suficientes, todo mundo enfrenta todo mundo (8 a 14 jogadores)', () => {
    for (let n = 8; n <= 14; n++)
      for (let w = 2; w <= n / 2; w++) {
        const js = grupo(n - w, w);
        const k = opcoesJogosPorPessoa(js).find((x) => x >= minimoTodosContraTodos(js));
        if (!k) continue;
        const r = sortear(js, { jogosPorPessoa: k, quadras: 1, semente: 42, tempoMs: 1000, todosContraTodos: true });
        expect(r, `${n - w}H+${w}M, ${k} jogos`).not.toBeNull();
        expect(r!.naoSeEnfrentaram, `${n - w}H+${w}M, ${k} jogos`).toBe(0);
        // dupla masculina só enfrenta dupla masculina
        const sexo = new Map(js.map((j) => [j.id, j.sexo]));
        for (const j of r!.jogos) {
          const t = (p: string[]) => p.map((x) => sexo.get(x)).sort().join('');
          expect(t(j.a)).toBe(t(j.b));
        }
      }
  }, 120_000);
});

describe('ranking', () => {
  const ps = [
    { id: 'a', nome: 'Ana', sexo: 'F' as const },
    { id: 'b', nome: 'Bia', sexo: 'F' as const },
    { id: 'e', nome: 'Edu', sexo: 'M' as const },
    { id: 'f', nome: 'Fabio', sexo: 'M' as const },
  ];
  it('ordena por vitórias, saldo e separa por sexo', () => {
    const jogos = [
      { a1: 'a', a2: 'e', b1: 'b', b2: 'f', games_a: 6, games_b: 3, status: 'finalizado' },
      { a1: 'a', a2: 'f', b1: 'b', b2: 'e', games_a: 6, games_b: 4, status: 'finalizado' },
      { a1: 'a', a2: 'b', b1: 'e', b2: 'f', games_a: null, games_b: null, status: 'pendente' },
    ];
    const g = calcularRanking(ps, jogos);
    expect(g[0]).toMatchObject({ nome: 'Ana', posicao: 1, vitorias: 2, saldo: 5 });
    expect(g.map((l) => l.nome)).toEqual(['Ana', 'Edu', 'Fabio', 'Bia']);
    expect(calcularRanking(ps, jogos, 'M').map((l) => l.nome)).toEqual(['Edu', 'Fabio']);
  });
  it('confronto direto desempata dois', () => {
    const jogos = [
      { a1: 'e', a2: 'a', b1: 'f', b2: 'b', games_a: 6, games_b: 4, status: 'finalizado' },
      { a1: 'f', a2: 'a', b1: 'e', b2: 'b', games_a: 6, games_b: 4, status: 'finalizado' },
    ];
    // Edu e Fabio: 1 vitória, saldo 0, 10 games cada; Edu venceu Fabio como adversário... e vice-versa
    const r = calcularRanking(ps, jogos, 'M');
    expect(r.map((l) => l.posicao)).toEqual([1, 1]);
  });
  it('empate conta como empate, sem vitória nem derrota', () => {
    const jogos = [{ a1: 'a', a2: 'e', b1: 'b', b2: 'f', games_a: 3, games_b: 3, status: 'finalizado' }];
    const g = calcularRanking(ps, jogos);
    for (const l of g) expect(l).toMatchObject({ jogos: 1, vitorias: 0, empates: 1, derrotas: 0, saldo: 0 });
  });
  it('placar válido: qualquer placar de 0 a 99, com empate', () => {
    expect(placarValido(5, 1)).toBe(true);
    expect(placarValido(4, 2)).toBe(true);
    expect(placarValido(6, 3)).toBe(true);
    expect(placarValido(1, 5)).toBe(true);
    expect(placarValido(3, 3)).toBe(true);
    expect(placarValido(-1, 4)).toBe(false);
    expect(placarValido(100, 2)).toBe(false);
  });
});
