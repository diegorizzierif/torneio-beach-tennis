import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { ListaJogos, Ranking } from '../components';
import { placarValido } from '../lib/ranking';
import { opcoesJogosPorPessoa, sortear, type Sexo } from '../lib/sorteio';
import { supabase, useTorneio, type Jogador, type Jogo, type Torneio } from '../lib/supabase';
import { AoVivo, Icone, Moldura, Segmentos } from '../ui';
import { SoOrganizador } from './Inicio';
import { useJogadores } from './Jogadores';

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

  const so = (v: string) => v.replace(/\D/g, '').slice(0, 2);
  return (
    <div className="placar">
      <input inputMode="numeric" aria-label="Games da primeira dupla" placeholder="–" value={a} onChange={(e) => setA(so(e.target.value))} />
      <span className="placar-x">×</span>
      <input inputMode="numeric" aria-label="Games da segunda dupla" placeholder="–" value={b} onChange={(e) => setB(so(e.target.value))} />
      {(mudou || jogo.status !== 'finalizado') && (
        <button className="btn primario" disabled={salvando || a === '' || b === ''} onClick={salvar}>
          <Icone nome="check" tam={18} /> Salvar
        </button>
      )}
      {jogo.status === 'finalizado' && !mudou && (
        <button className="btn fantasma" disabled={salvando} onClick={limpar}>
          Apagar
        </button>
      )}
    </div>
  );
}

function Inscricoes({
  t,
  sessao,
  participantes,
  recarregar,
  setMsg,
}: {
  t: Torneio;
  sessao: Session;
  participantes: ReturnType<typeof useTorneio>['participantes'];
  recarregar: () => Promise<void>;
  setMsg: (m: string | null) => void;
}) {
  const { jogadores, recarregar: recarregarJogadores } = useJogadores(sessao.user.id);
  const [busca, setBusca] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState<Sexo>('M');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const porJogador = useMemo(() => new Map(participantes.filter((p) => p.jogador_id).map((p) => [p.jogador_id!, p])), [participantes]);
  const avulsos = participantes.filter((p) => !p.jogador_id);
  const visiveis = (jogadores ?? []).filter((j) => j.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  async function alternar(j: Jogador) {
    setOcupado(j.id);
    const p = porJogador.get(j.id);
    const { error } = p
      ? await supabase.from('participantes').delete().eq('id', p.id)
      : await supabase.from('participantes').insert({ torneio_id: t.id, nome: j.nome, sexo: j.sexo, jogador_id: j.id });
    setOcupado(null);
    setMsg(error ? (error.code === '23505' ? `${j.nome} já está no torneio.` : error.message) : null);
    await recarregar();
  }

  async function novo(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    if (participantes.some((p) => p.nome.toLowerCase() === n.toLowerCase())) return setMsg(`${n} já está no torneio.`);
    // salva na lista de jogadores (ou reaproveita, se já existir) e inclui no torneio
    let jog = (jogadores ?? []).find((j) => j.nome.toLowerCase() === n.toLowerCase());
    if (!jog) {
      const { data, error } = await supabase.from('jogadores').insert({ nome: n, sexo }).select().single();
      if (error) return setMsg(error.message);
      jog = data as Jogador;
    }
    const { error } = await supabase.from('participantes').insert({ torneio_id: t.id, nome: jog.nome, sexo: jog.sexo, jogador_id: jog.id });
    if (error) return setMsg(error.message);
    setNome('');
    setMsg(null);
    await Promise.all([recarregar(), recarregarJogadores()]);
  }

  async function removerAvulso(id: string) {
    const { error } = await supabase.from('participantes').delete().eq('id', id);
    setMsg(error ? error.message : null);
    await recarregar();
  }

  const h = participantes.filter((p) => p.sexo === 'M').length;
  return (
    <section className="cartao pilha">
      <div className="titulo-secao">
        <h2>Quem vai jogar</h2>
        <span className="contagem">
          <b>{participantes.length}</b> · {h} H · {participantes.length - h} M
        </span>
      </div>

      {jogadores && jogadores.length > 0 && (
        <>
          {jogadores.length > 10 && (
            <label className="busca">
              <Icone nome="busca" tam={18} />
              <input placeholder="Buscar jogador salvo" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar jogador salvo" />
            </label>
          )}
          <p className="sub">Toque para incluir ou tirar do torneio.</p>
          <ul className="escolha">
            {visiveis.map((j) => {
              const dentro = porJogador.has(j.id);
              return (
                <li key={j.id}>
                  <button
                    className={`escolha-item ${j.sexo} ${dentro ? 'dentro' : ''}`}
                    aria-pressed={dentro}
                    disabled={ocupado === j.id}
                    onClick={() => alternar(j)}
                  >
                    <span className="escolha-marca">{dentro ? <Icone nome="check" tam={14} /> : null}</span>
                    {j.nome}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {avulsos.length > 0 && (
        <ul className="chips">
          {avulsos.map((p) => (
            <li key={p.id} className={p.sexo}>
              {p.nome}
              <button aria-label={`Remover ${p.nome}`} onClick={() => removerAvulso(p.id)}>
                <Icone nome="x" tam={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={novo} className="novo-jogador">
        <input placeholder={jogadores?.length ? 'Jogador novo' : 'Nome do jogador'} value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do jogador novo" />
        <Segmentos rotulo="Sexo" valor={sexo} aoMudar={setSexo} opcoes={[['M', 'H'], ['F', 'M']]} />
        <button className="btn primario quadrado" aria-label="Adicionar">
          <Icone nome="mais" />
        </button>
      </form>
      <p className="sub mini">Quem você adicionar aqui fica salvo na aba Jogadores.</p>
    </section>
  );
}

function TelaOrganizador({ sessao }: { sessao: Session }) {
  const { id } = useParams();
  const { torneio, participantes, jogos, carregando, erro, aoVivo, recarregar } = useTorneio({ id });
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<'jogos' | 'ranking'>('jogos');
  const [copiado, setCopiado] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const navegar = useNavigate();

  const voltar = (
    <Link to="/" className="icone-btn" aria-label="Voltar">
      <Icone nome="voltar" />
    </Link>
  );
  if (carregando) return <Moldura titulo="Torneio" voltar={voltar}><div className="carregando">Carregando…</div></Moldura>;
  if (!torneio) return <Moldura titulo="Torneio" voltar={voltar}><p className="vazio">{erro ?? 'Torneio não encontrado.'}</p></Moldura>;
  if (sessao.user.id !== torneio.organizador_id)
    return (
      <Moldura titulo={torneio.nome} voltar={voltar}>
        <p className="vazio">Só quem criou este torneio pode editá-lo.</p>
      </Moldura>
    );

  const t = torneio;
  const link = `${window.location.origin}/t/${t.codigo}`;
  const opcoes = opcoesJogosPorPessoa(participantes);
  const finalizados = jogos.filter((j) => j.status === 'finalizado').length;
  const totalJogos = (participantes.length * t.jogos_por_pessoa) / 4;
  const minutos = (totalJogos * (t.games_por_set === 6 ? 25 : 15)) / t.quadras;

  async function alterar(campos: Partial<Torneio>) {
    const { error } = await supabase.from('torneios').update(campos).eq('id', t.id);
    setMsg(error ? error.message : null);
    await recarregar();
  }

  async function gerar() {
    if (!opcoes.includes(t.jogos_por_pessoa)) return setMsg('Escolha uma quantidade de jogos por pessoa válida para este grupo.');
    setOcupado(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 30)); // deixa a tela mostrar "Sorteando…"
    const r = sortear(participantes, { jogosPorPessoa: t.jogos_por_pessoa, quadras: t.quadras, tempoMs: 1500 });
    if (!r) {
      setOcupado(false);
      return setMsg(
        t.quadras === 2
          ? 'Não deu para montar a tabela com 2 quadras para este grupo. Tente com 1 quadra ou outra quantidade de jogos.'
          : 'Não deu para montar a tabela. Tente outra quantidade de jogos por pessoa.',
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

  async function apagarTorneio() {
    setOcupado(true);
    // participantes e jogos são apagados junto (on delete cascade); jogadores salvos continuam
    const { error } = await supabase.from('torneios').delete().eq('id', t.id);
    setOcupado(false);
    if (error) return setMsg(error.message);
    navegar('/', { replace: true });
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

  return (
    <Moldura titulo={t.nome} voltar={voltar} acao={<AoVivo ativo={aoVivo} />}>
      <section className="compartilhar">
        <div className="compartilhar-txt">
          <span>Link para os jogadores</span>
          <code>{link.replace(/^https?:\/\//, '')}</code>
        </div>
        <div className="linha">
          <button className="btn claro" onClick={copiar}>
            <Icone nome={copiado ? 'check' : 'copiar'} tam={18} /> {copiado ? 'Copiado' : 'Copiar'}
          </button>
          <a className="btn claro" href={`https://wa.me/?text=${encodeURIComponent(`🎾 Acompanhe o ${t.nome} ao vivo: ${link}`)}`} target="_blank" rel="noreferrer">
            <Icone nome="enviar" tam={18} /> WhatsApp
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
          <Inscricoes t={t} sessao={sessao} participantes={participantes} recarregar={recarregar} setMsg={setMsg} />

          <section className="cartao pilha">
            <h2>Formato</h2>
            <div className="campo">
              <span>Jogos por pessoa</span>
              {opcoes.length === 0 ? (
                <p className="sub">Inclua pelo menos 4 jogadores para ver as opções.</p>
              ) : (
                <Segmentos rotulo="Jogos por pessoa" valor={t.jogos_por_pessoa} aoMudar={(k) => alterar({ jogos_por_pessoa: k })} opcoes={opcoes.map((k) => [k, String(k)] as const)} />
              )}
            </div>
            <div className="campo">
              <span>Set até</span>
              <Segmentos rotulo="Set até" valor={t.games_por_set} aoMudar={(g) => alterar({ games_por_set: g })} opcoes={[[4, '4 games'], [6, '6 games']]} />
            </div>
            <div className="campo">
              <span>Quadras</span>
              <Segmentos rotulo="Quadras" valor={t.quadras} aoMudar={(q) => alterar({ quadras: q })} opcoes={[[1, '1 quadra'], [2, '2 quadras']]} />
            </div>
            {opcoes.includes(t.jogos_por_pessoa) && (
              <div className="resumo">
                <div>
                  <b>{totalJogos}</b>
                  <span>jogos</span>
                </div>
                <div>
                  <b>~{Math.round(minutos / 30) / 2}h</b>
                  <span>duração</span>
                </div>
                <div>
                  <b>{t.jogos_por_pessoa}</b>
                  <span>por pessoa</span>
                </div>
              </div>
            )}
            <button className="btn primario grande" disabled={ocupado || !opcoes.includes(t.jogos_por_pessoa)} onClick={gerar}>
              {ocupado ? 'Sorteando…' : 'Sortear jogos'}
            </button>
          </section>
        </>
      ) : (
        <>
          <Segmentos rotulo="Visão" valor={aba} aoMudar={setAba} opcoes={[['jogos', 'Jogos e placares'], ['ranking', 'Ranking']]} />
          {aba === 'jogos' ? (
            <ListaJogos
              jogos={jogos}
              participantes={participantes}
              quadras={t.quadras}
              renderPlacar={
                t.status === 'encerrado'
                  ? undefined
                  : (j) => <Placar key={`${j.id}-${j.games_a}-${j.games_b}`} jogo={j} n={t.games_por_set} aoErro={setMsg} aoSalvar={recarregar} />
              }
            />
          ) : (
            <Ranking participantes={participantes} jogos={jogos} />
          )}
          <section className="acoes">
            {t.status === 'em_andamento' ? (
              <>
                <button className="btn" disabled={ocupado || finalizados > 0} onClick={refazer} title={finalizados > 0 ? 'Já há placares lançados' : ''}>
                  Refazer sorteio
                </button>
                <button className="btn primario" onClick={() => alterar({ status: 'encerrado' })}>
                  Encerrar torneio
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => alterar({ status: 'em_andamento' })}>
                Reabrir torneio
              </button>
            )}
          </section>
        </>
      )}

      <section className="zona-perigo">
        {confirmarApagar ? (
          <div className="cartao pilha confirmar">
            <b>Apagar “{t.nome}”?</b>
            <p className="sub">
              Isso apaga {jogos.length > 0 ? `os ${jogos.length} jogos, os placares e ` : ''}a lista de quem jogou e não pode ser desfeito. Os jogadores salvos na aba Jogadores continuam.
            </p>
            <div className="linha">
              <button className="btn" onClick={() => setConfirmarApagar(false)} disabled={ocupado}>
                Cancelar
              </button>
              <button className="btn perigo" onClick={apagarTorneio} disabled={ocupado}>
                <Icone nome="lixo" tam={18} /> Apagar de vez
              </button>
            </div>
          </div>
        ) : (
          <button className="btn fantasma perigo-txt" onClick={() => setConfirmarApagar(true)}>
            <Icone nome="lixo" tam={18} /> Apagar torneio
          </button>
        )}
      </section>
    </Moldura>
  );
}

export default function Organizador() {
  return <SoOrganizador>{(s) => <TelaOrganizador sessao={s} />}</SoOrganizador>;
}
