import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AoVivo, ListaJogos, Ranking } from '../components';
import { placarValido } from '../lib/ranking';
import { opcoesJogosPorPessoa, sortear, type Sexo } from '../lib/sorteio';
import { supabase, useTorneio, type Jogo, type Torneio } from '../lib/supabase';
import { useSessao } from './Inicio';

function Placar({ jogo, n, aoErro, aoSalvar }: { jogo: Jogo; n: number; aoErro: (m: string | null) => void; aoSalvar: () => Promise<void> }) {
  const [a, setA] = useState(jogo.games_a?.toString() ?? '');
  const [b, setB] = useState(jogo.games_b?.toString() ?? '');
  const [salvando, setSalvando] = useState(false);
  const mudou = a !== (jogo.games_a?.toString() ?? '') || b !== (jogo.games_b?.toString() ?? '');

  async function salvar() {
    const ga = Number(a);
    const gb = Number(b);
    if (a === '' || b === '' || !placarValido(ga, gb, n)) {
      aoErro(`Placar ${a || '?'} x ${b || '?'} não vale para set até ${n} games (ex.: ${n}x${n - 2}, ${n + 1}x${n - 1}, ${n + 1}x${n}).`);
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('jogos').update({ games_a: ga, games_b: gb, status: 'finalizado' }).eq('id', jogo.id);
    setSalvando(false);
    aoErro(error ? error.message : null);
    // não depende só do tempo real: recarrega na hora
    await aoSalvar();
  }

  async function limpar() {
    setSalvando(true);
    const { error } = await supabase.from('jogos').update({ games_a: null, games_b: null, status: 'pendente' }).eq('id', jogo.id);
    setSalvando(false);
    if (!error) {
      setA('');
      setB('');
    }
    aoErro(error ? error.message : null);
    await aoSalvar();
  }

  return (
    <div className="placar">
      <input inputMode="numeric" aria-label="Games dupla de cima" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} />
      <span>x</span>
      <input inputMode="numeric" aria-label="Games dupla de baixo" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ''))} />
      {(mudou || jogo.status !== 'finalizado') && (
        <button className="primario" disabled={salvando} onClick={salvar}>
          Salvar
        </button>
      )}
      {jogo.status === 'finalizado' && !mudou && (
        <button className="link" disabled={salvando} onClick={limpar}>
          Apagar placar
        </button>
      )}
    </div>
  );
}

export default function Organizador() {
  const { id } = useParams();
  const sessao = useSessao();
  const { torneio, participantes, jogos, carregando, erro, aoVivo, recarregar } = useTorneio({ id });
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState<Sexo>('M');
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<'jogos' | 'ranking'>('jogos');
  const [copiado, setCopiado] = useState(false);

  if (carregando || sessao === undefined) return <main className="centro">Carregando…</main>;
  if (!torneio) return <main className="centro">{erro ?? 'Torneio não encontrado.'}</main>;
  if (!sessao || sessao.user.id !== torneio.organizador_id)
    return (
      <main className="centro">
        Só o organizador pode editar este torneio. <Link to="/">Entrar</Link>
      </main>
    );

  const t = torneio;
  const link = `${window.location.origin}/t/${t.codigo}`;
  const homens = participantes.filter((p) => p.sexo === 'M').length;
  const mulheres = participantes.length - homens;
  const opcoes = opcoesJogosPorPessoa(participantes);
  const finalizados = jogos.filter((j) => j.status === 'finalizado').length;

  async function alterar(campos: Partial<Torneio>) {
    const { error } = await supabase.from('torneios').update(campos).eq('id', t.id);
    setMsg(error ? error.message : null);
    await recarregar();
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    if (participantes.some((p) => p.nome.toLowerCase() === n.toLowerCase())) return setMsg(`${n} já está na lista.`);
    const { error } = await supabase.from('participantes').insert({ torneio_id: t.id, nome: n, sexo });
    if (error) return setMsg(error.message);
    setNome('');
    setMsg(null);
    await recarregar();
  }

  async function remover(pid: string) {
    const { error } = await supabase.from('participantes').delete().eq('id', pid);
    setMsg(error ? error.message : null);
    await recarregar();
  }

  async function gerar() {
    if (!opcoes.includes(t.jogos_por_pessoa)) return setMsg('Escolha uma quantidade de jogos por pessoa válida para este grupo.');
    setOcupado(true);
    setMsg(null);
    // deixa a tela mostrar "Sorteando…" antes do cálculo
    await new Promise((r) => setTimeout(r, 30));
    const r = sortear(participantes, { jogosPorPessoa: t.jogos_por_pessoa, quadras: t.quadras, tempoMs: 1500 });
    if (!r) {
      setOcupado(false);
      return setMsg(
        t.quadras === 2
          ? 'Não foi possível montar a tabela com 2 quadras para este grupo. Tente com 1 quadra ou outra quantidade de jogos.'
          : 'Não foi possível montar a tabela. Tente outra quantidade de jogos por pessoa.',
      );
    }
    await supabase.from('jogos').delete().eq('torneio_id', t.id);
    const linhas = r.jogos.map((j, i) => ({
      torneio_id: t.id,
      ordem: i + 1,
      rodada: j.rodada,
      quadra: j.quadra,
      a1: j.a[0],
      a2: j.a[1],
      b1: j.b[0],
      b2: j.b[1],
    }));
    const { error } = await supabase.from('jogos').insert(linhas);
    if (!error) await supabase.from('torneios').update({ status: 'em_andamento' }).eq('id', t.id);
    setOcupado(false);
    const avisos: string[] = [];
    if (r.parceirosRepetidos > 0) avisos.push(`${r.parceirosRepetidos} dupla(s) precisaram se repetir.`);
    if (t.quadras === 2) {
      const sozinhos = new Set(r.jogos.map((j) => j.rodada)).size * 2 - r.jogos.length;
      if (sozinhos > 1) avisos.push(`Em ${sozinhos} rodadas só uma quadra terá jogo, por causa da regra de duplas mistas.`);
    }
    setMsg(error ? error.message : avisos.join(' ') || null);
    await recarregar();
  }

  async function refazer() {
    if (finalizados > 0) return setMsg('Já existem placares lançados. Apague-os antes de refazer o sorteio.');
    setOcupado(true);
    await supabase.from('jogos').delete().eq('torneio_id', t.id);
    await supabase.from('torneios').update({ status: 'inscricoes' }).eq('id', t.id);
    setOcupado(false);
    await recarregar();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setMsg(link);
    }
  }

  const totalJogos = (participantes.length * t.jogos_por_pessoa) / 4;
  const minutos = totalJogos * (t.games_por_set === 6 ? 25 : 15) / t.quadras;

  return (
    <main>
      <header className="topo">
        <div>
          <Link to="/" className="voltar">
            ← Meus torneios
          </Link>
          <h1>{t.nome}</h1>
        </div>
        <AoVivo ativo={aoVivo} />
      </header>

      <section className="cartao compartilhar">
        <div>
          <b>Link para os jogadores</b>
          <code>{link}</code>
        </div>
        <div className="linha">
          <button onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar'}</button>
          <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(`Acompanhe o ${t.nome} ao vivo: ${link}`)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>
      </section>

      {msg && (
        <p className="aviso" role="alert" onClick={() => setMsg(null)}>
          {msg}
        </p>
      )}

      {t.status === 'inscricoes' ? (
        <>
          <section className="cartao">
            <h2>
              Participantes <small>{participantes.length} ({homens} H · {mulheres} M)</small>
            </h2>
            <form onSubmit={adicionar} className="linha">
              <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do participante" />
              <div className="segmentos pequeno" role="radiogroup" aria-label="Sexo">
                <button type="button" className={sexo === 'M' ? 'ativo' : ''} onClick={() => setSexo('M')}>
                  H
                </button>
                <button type="button" className={sexo === 'F' ? 'ativo' : ''} onClick={() => setSexo('F')}>
                  M
                </button>
              </div>
              <button className="primario">Adicionar</button>
            </form>
            <ul className="chips">
              {participantes.map((p) => (
                <li key={p.id} className={p.sexo}>
                  {p.nome}
                  <button aria-label={`Remover ${p.nome}`} onClick={() => remover(p.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="cartao">
            <h2>Formato</h2>
            <label>
              Jogos por pessoa
              {opcoes.length === 0 ? (
                <span className="sub"> Adicione pelo menos 4 participantes.</span>
              ) : (
                <div className="segmentos">
                  {opcoes.map((k) => (
                    <button key={k} className={t.jogos_por_pessoa === k ? 'ativo' : ''} onClick={() => alterar({ jogos_por_pessoa: k })}>
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label>
              Set até
              <div className="segmentos">
                {([4, 6] as const).map((g) => (
                  <button key={g} className={t.games_por_set === g ? 'ativo' : ''} onClick={() => alterar({ games_por_set: g })}>
                    {g} games
                  </button>
                ))}
              </div>
            </label>
            <label>
              Quadras
              <div className="segmentos">
                {([1, 2] as const).map((q) => (
                  <button key={q} className={t.quadras === q ? 'ativo' : ''} onClick={() => alterar({ quadras: q })}>
                    {q} quadra{q > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </label>
            {opcoes.includes(t.jogos_por_pessoa) && (
              <p className="sub">
                {totalJogos} jogos no total · cerca de {Math.round(minutos / 30) / 2} h
              </p>
            )}
            <button className="primario grande" disabled={ocupado || !opcoes.includes(t.jogos_por_pessoa)} onClick={gerar}>
              {ocupado ? 'Sorteando…' : 'Gerar jogos'}
            </button>
          </section>
        </>
      ) : (
        <>
          <nav className="abas">
            <button className={aba === 'jogos' ? 'ativo' : ''} onClick={() => setAba('jogos')}>
              Jogos e placares
            </button>
            <button className={aba === 'ranking' ? 'ativo' : ''} onClick={() => setAba('ranking')}>
              Ranking
            </button>
          </nav>
          {aba === 'jogos' ? (
            <ListaJogos
              jogos={jogos}
              participantes={participantes}
              quadras={t.quadras}
              renderPlacar={t.status === 'encerrado' ? undefined : (j) => <Placar key={`${j.id}-${j.games_a}-${j.games_b}`} jogo={j} n={t.games_por_set} aoErro={setMsg} aoSalvar={recarregar} />}
            />
          ) : (
            <Ranking participantes={participantes} jogos={jogos} />
          )}
          <section className="acoes">
            {t.status === 'em_andamento' ? (
              <>
                <button disabled={ocupado || finalizados > 0} onClick={refazer} title={finalizados > 0 ? 'Já há placares lançados' : ''}>
                  Refazer sorteio
                </button>
                <button className="primario" onClick={() => alterar({ status: 'encerrado' })}>
                  Encerrar torneio
                </button>
              </>
            ) : (
              <button onClick={() => alterar({ status: 'em_andamento' })}>Reabrir torneio</button>
            )}
          </section>
        </>
      )}
    </main>
  );
}
