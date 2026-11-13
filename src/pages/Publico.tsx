import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AoVivo, ListaJogos, Ranking } from '../components';
import { useTorneio } from '../lib/supabase';

export default function Publico() {
  const { codigo } = useParams();
  const { torneio, participantes, jogos, carregando, erro, aoVivo } = useTorneio({ codigo });
  const [aba, setAba] = useState<'ranking' | 'jogos'>('ranking');

  if (carregando) return <main className="centro">Carregando…</main>;
  if (!torneio) return <main className="centro">{erro ?? 'Torneio não encontrado.'}</main>;

  return (
    <main>
      <header className="topo">
        <div>
          <h1>{torneio.nome}</h1>
          <p className="sub">
            {new Date(torneio.data + 'T12:00').toLocaleDateString('pt-BR')} · {participantes.length} jogadores · set até{' '}
            {torneio.games_por_set} games
            {torneio.status === 'encerrado' && ' · Encerrado'}
          </p>
        </div>
        <AoVivo ativo={aoVivo} />
      </header>
      <nav className="abas">
        <button className={aba === 'ranking' ? 'ativo' : ''} onClick={() => setAba('ranking')}>
          Ranking
        </button>
        <button className={aba === 'jogos' ? 'ativo' : ''} onClick={() => setAba('jogos')}>
          Jogos
        </button>
      </nav>
      {aba === 'ranking' ? (
        <Ranking participantes={participantes} jogos={jogos} />
      ) : (
        <ListaJogos jogos={jogos} participantes={participantes} quadras={torneio.quadras} />
      )}
    </main>
  );
}
