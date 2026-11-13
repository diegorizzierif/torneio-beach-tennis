import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ListaJogos, Ranking } from '../components';
import { useTorneio } from '../lib/supabase';
import { AoVivo, dataBR, Icone, Segmentos } from '../ui';

export default function Publico() {
  const { codigo } = useParams();
  const { torneio, participantes, jogos, carregando, erro, aoVivo } = useTorneio({ codigo });
  const [aba, setAba] = useState<'ranking' | 'jogos'>('ranking');

  if (carregando) return <div className="carregando">Carregando…</div>;
  if (!torneio)
    return (
      <div className="vazio grande tela-cheia">
        <Icone nome="bola" tam={40} />
        <p>{erro ?? 'Torneio não encontrado.'}</p>
      </div>
    );

  const feitos = jogos.filter((j) => j.status === 'finalizado').length;
  return (
    <div className="publico">
      <header className="hero">
        <div className="hero-in">
          <div className="hero-topo">
            <span className="hero-marca">
              <Icone nome="bola" tam={18} /> Beach Tennis
            </span>
            {torneio.status === 'encerrado' ? <span className="selo-fin claro">Encerrado</span> : <AoVivo ativo={aoVivo} />}
          </div>
          <h1>{torneio.nome}</h1>
          <p>
            {dataBR(torneio.data)} · {participantes.length} jogadores · set até {torneio.games_por_set}
            {jogos.length > 0 && ` · ${feitos}/${jogos.length} jogos`}
          </p>
        </div>
      </header>
      <main className="conteudo publico-conteudo">
        <Segmentos rotulo="Visão" valor={aba} aoMudar={setAba} opcoes={[['ranking', 'Ranking'], ['jogos', 'Jogos']]} />
        {aba === 'ranking' ? (
          <Ranking participantes={participantes} jogos={jogos} />
        ) : (
          <ListaJogos jogos={jogos} participantes={participantes} quadras={torneio.quadras} />
        )}
      </main>
    </div>
  );
}
