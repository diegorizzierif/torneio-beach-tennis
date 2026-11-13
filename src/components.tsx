import { useState, type ReactNode } from 'react';
import { calcularRanking, type LinhaRanking } from './lib/ranking';
import type { Jogo, Participante } from './lib/supabase';
import { Avatar, Segmentos } from './ui';

export function nomeDupla(ids: string[], mapa: Map<string, Participante>) {
  return ids.map((id) => mapa.get(id)?.nome ?? '?').join(' + ');
}

const medalha = ['🥇', '🥈', '🥉'];

function Podio({ linhas }: { linhas: LinhaRanking[] }) {
  const top = linhas.filter((l) => l.posicao <= 3 && l.vitorias > 0).slice(0, 3);
  if (top.length === 0) return null;
  // ordem visual: 2º, 1º, 3º
  const ordem = [top[1], top[0], top[2]].filter(Boolean) as LinhaRanking[];
  return (
    <div className="podio">
      {ordem.map((l) => (
        <div key={l.id} className={`degrau p${l.posicao}`}>
          <span className="medalha">{medalha[l.posicao - 1]}</span>
          <Avatar nome={l.nome} sexo={l.sexo} tam={l.posicao === 1 ? 56 : 46} />
          <b className="degrau-nome">{l.nome}</b>
          <span className="degrau-info">
            {l.vitorias}V · {l.saldo > 0 ? `+${l.saldo}` : l.saldo}
          </span>
          <div className="degrau-base">{l.posicao}º</div>
        </div>
      ))}
    </div>
  );
}

export function Ranking({ participantes, jogos }: { participantes: Participante[]; jogos: Jogo[] }) {
  const [filtro, setFiltro] = useState<'geral' | 'M' | 'F'>('geral');
  const linhas = calcularRanking(participantes, jogos, filtro);
  return (
    <section className="pilha">
      <Segmentos
        rotulo="Ranking"
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          ['geral', 'Geral'],
          ['M', 'Masculino'],
          ['F', 'Feminino'],
        ]}
      />
      {linhas.length === 0 ? (
        <p className="vazio">Ninguém nesta categoria.</p>
      ) : (
        <>
          <Podio linhas={linhas} />
          <ol className="tabela-ranking">
            <li className="cab" aria-hidden="true">
              <span>#</span>
              <span>Jogador</span>
              <span title="Vitórias">V</span>
              <span title="Jogos">J</span>
              <span title="Saldo de games">SG</span>
            </li>
            {linhas.map((l, i) => (
              <li key={l.id} className={l.posicao === 1 && l.vitorias > 0 ? 'lider' : ''}>
                <span className="pos">{i > 0 && linhas[i - 1].posicao === l.posicao ? '' : l.posicao}</span>
                <span className="quem">
                  <Avatar nome={l.nome} sexo={l.sexo} tam={30} />
                  <span className="nome">{l.nome}</span>
                </span>
                <span className="forte">{l.vitorias}</span>
                <span>{l.jogos}</span>
                <span className={l.saldo > 0 ? 'pos-saldo' : l.saldo < 0 ? 'neg-saldo' : ''}>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</span>
              </li>
            ))}
          </ol>
          <p className="legenda">V vitórias · J jogos · SG saldo de games. Desempate: saldo, games feitos e confronto direto.</p>
        </>
      )}
    </section>
  );
}

/** Lista de jogos agrupada por rodada. `renderPlacar` permite à tela do organizador lançar placares. */
export function ListaJogos({
  jogos,
  participantes,
  quadras,
  renderPlacar,
}: {
  jogos: Jogo[];
  participantes: Participante[];
  quadras: number;
  renderPlacar?: (j: Jogo) => ReactNode;
}) {
  const mapa = new Map(participantes.map((p) => [p.id, p]));
  if (jogos.length === 0) return <p className="vazio">Os jogos ainda não foram sorteados.</p>;
  const proximo = jogos.find((j) => j.status !== 'finalizado');
  const rodadas = [...new Set(jogos.map((j) => j.rodada))];
  const feitos = jogos.filter((j) => j.status === 'finalizado').length;
  return (
    <section className="pilha">
      <div className="progresso" aria-label={`${feitos} de ${jogos.length} jogos concluídos`}>
        <div className="progresso-txt">
          <b>
            {feitos}/{jogos.length}
          </b>{' '}
          jogos concluídos
        </div>
        <div className="progresso-barra">
          <i style={{ width: `${(feitos / jogos.length) * 100}%` }} />
        </div>
      </div>
      {rodadas.map((r) => {
        const js = jogos.filter((j) => j.rodada === r);
        return (
          <div key={r} className="rodada">
            {quadras > 1 && <h3 className="rotulo">Rodada {r + 1}</h3>}
            {js.map((j) => {
              const fin = j.status === 'finalizado';
              const venceuA = fin && j.games_a! > j.games_b!;
              const ehProximo = !!proximo && proximo.rodada === j.rodada && !fin;
              return (
                <article key={j.id} className={`jogo ${fin ? 'fin' : ''} ${ehProximo ? 'proximo' : ''}`}>
                  <div className="jogo-cab">
                    <span>
                      Jogo {j.ordem}
                      {quadras > 1 ? ` · Quadra ${j.quadra}` : ''}
                    </span>
                    {ehProximo && <span className="selo">{quadras > 1 ? 'Em quadra' : 'Próximo'}</span>}
                    {fin && <span className="selo-fin">Encerrado</span>}
                  </div>
                  <div className="confronto">
                    <div className={`lado ${fin ? (venceuA ? 'venceu' : 'perdeu') : ''}`}>
                      <span>{nomeDupla([j.a1, j.a2], mapa)}</span>
                      {fin && !renderPlacar && <b>{j.games_a}</b>}
                    </div>
                    <div className={`lado ${fin ? (!venceuA ? 'venceu' : 'perdeu') : ''}`}>
                      <span>{nomeDupla([j.b1, j.b2], mapa)}</span>
                      {fin && !renderPlacar && <b>{j.games_b}</b>}
                    </div>
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
