import { describe, expect, it } from 'vitest';
import { opcoesJogosPorPessoa, sortear, type Jogador } from './sorteio';
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
  }, 120_000);

  it('funciona com 2 quadras para 10 a 14 jogadores, 4 jogos', () => {
    for (let n = 10; n <= 14; n++)
      for (let w = 2; w <= n / 2; w++) {
        const js = grupo(n - w, w);
        if (opcoesJogosPorPessoa(js).includes(4)) conferir(js, 4, 2);
      }
  }, 120_000);

  it('opções de jogos por pessoa', () => {
    expect(opcoesJogosPorPessoa(grupo(4, 4))).toEqual([2, 3, 4, 5, 6]);
    expect(opcoesJogosPorPessoa(grupo(5, 3))).toEqual([2, 4, 6]);
    expect(opcoesJogosPorPessoa(grupo(7, 7))).toEqual([2, 4, 6]);
    expect(opcoesJogosPorPessoa(grupo(6, 3))).toEqual([4]);
  });
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
  it('placar válido', () => {
    expect(placarValido(6, 4, 6)).toBe(true);
    expect(placarValido(6, 5, 6)).toBe(false);
    expect(placarValido(7, 6, 6)).toBe(true);
    expect(placarValido(4, 2, 4)).toBe(true);
    expect(placarValido(5, 4, 4)).toBe(true);
    expect(placarValido(4, 3, 4)).toBe(false);
  });
});
