import { useState } from 'react';
import { calcularRanking } from './lib/ranking';
import type { Jogo, Participante } from './lib/supabase';

export function nomeDupla(ids: string[], mapa: Map<string, Participante>) {
  return ids.map((id) => mapa.get(id)?.nome ?? '?').join(' + ');
}

export function Ranking({ participantes, jogos }: { participantes: Participante[]; jogos: Jogo[] }) {
  const [filtro, setFiltro] = useState<'geral' | 'M' | 'F'>('geral');
  const linhas = calcularRanking(participantes, jogos, filtro);
  return (
    <section>
      <div className="segmentos" role="tablist" aria-label="Ranking">
        {(
          [
            ['geral', 'Geral'],
            ['M', 'Masculino'],
            ['F', 'Feminino'],
          ] as const
        ).map(([v, rot]) => (
          <button key={v} role="tab" aria-selected={filtro === v} className={filtro === v ? 'ativo' : ''} onClick={() => setFiltro(v)}>
            {rot}
          </button>
        ))}
      </div>
      {linhas.length === 0 ? (
        <p className="vazio">Ninguém nesta categoria.</p>
      ) : (
        <table className="ranking">
          <thead>
            <tr>
              <th>#</th>
              <th className="esq">Jogador</th>
              <th title="Jogos">J</th>
              <th title="Vitórias">V</th>
              <th title="Saldo de games">SG</th>
              <th title="Games feitos">GF</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.id} className={l.posicao <= 3 && l.vitorias > 0 ? `top top${l.posicao}` : ''}>
                <td className="pos">{i > 0 && linhas[i - 1].posicao === l.posicao ? '' : `${l.posicao}º`}</td>
                <td className="esq nome">
                  {l.nome}
                  <span className={`tag ${l.sexo}`}>{l.sexo === 'F' ? 'M' : 'H'}</span>
                </td>
                <td>{l.jogos}</td>
                <td className="forte">{l.vitorias}</td>
                <td>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</td>
                <td>{l.feitos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="legenda">J jogos · V vitórias · SG saldo de games · GF games feitos</p>
    </section>
  );
}

/** Lista de jogos, agrupada por rodada. `renderAcoes` permite à tela do organizador pôr o lançamento de placar. */
export function ListaJogos({
  jogos,
  participantes,
  quadras,
  renderPlacar,
}: {
  jogos: Jogo[];
  participantes: Participante[];
  quadras: number;
  renderPlacar?: (j: Jogo) => React.ReactNode;
}) {
  const mapa = new Map(participantes.map((p) => [p.id, p]));
  const proximo = jogos.find((j) => j.status !== 'finalizado');
  const rodadas = [...new Set(jogos.map((j) => j.rodada))];
  if (jogos.length === 0) return <p className="vazio">Os jogos ainda não foram sorteados.</p>;
  const feitos = jogos.filter((j) => j.status === 'finalizado').length;
  return (
    <section>
      <p className="progresso">
        {feitos} de {jogos.length} jogos concluídos
      </p>
      {rodadas.map((r) => {
        const js = jogos.filter((j) => j.rodada === r);
        return (
          <div key={r} className="rodada">
            {quadras > 1 && <h3>Rodada {r + 1}</h3>}
            {js.map((j) => {
              const fin = j.status === 'finalizado';
              const venceuA = fin && j.games_a! > j.games_b!;
              const ehProximo = proximo && proximo.rodada === j.rodada && !fin;
              return (
                <article key={j.id} className={`jogo ${fin ? 'fin' : ''} ${ehProximo ? 'proximo' : ''}`}>
                  <div className="jogo-cab">
                    <span>
                      Jogo {j.ordem}
                      {quadras > 1 ? ` · Quadra ${j.quadra}` : ''}
                    </span>
                    {ehProximo && <span className="selo">{quadras > 1 ? 'Agora' : 'Próximo'}</span>}
                  </div>
                  <div className={`dupla ${fin ? (venceuA ? 'venceu' : 'perdeu') : ''}`}>
                    <span>{nomeDupla([j.a1, j.a2], mapa)}</span>
                    {fin && !renderPlacar && <b>{j.games_a}</b>}
                  </div>
                  <div className={`dupla ${fin ? (!venceuA ? 'venceu' : 'perdeu') : ''}`}>
                    <span>{nomeDupla([j.b1, j.b2], mapa)}</span>
                    {fin && !renderPlacar && <b>{j.games_b}</b>}
                  </div>
                  {renderPlacar?.(j)}
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

export function AoVivo({ ativo }: { ativo: boolean }) {
  return (
    <span className={`aovivo ${ativo ? 'on' : ''}`} title={ativo ? 'Atualizando em tempo real' : 'Conectando...'}>
      <i /> {ativo ? 'Ao vivo' : 'Conectando'}
    </span>
  );
}
