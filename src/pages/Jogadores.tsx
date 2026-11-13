import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { calcularRanking } from '../lib/ranking';
import type { Sexo } from '../lib/sorteio';
import { supabase, type Jogador, type Jogo, type Participante } from '../lib/supabase';
import { Avatar, Icone, Moldura, Segmentos } from '../ui';
import { SoOrganizador } from './Inicio';

export interface Historico {
  torneios: number;
  jogos: number;
  vitorias: number;
  titulos: number;
}

/** Carrega os jogadores salvos do organizador. */
export function useJogadores(organizadorId: string) {
  const [jogadores, setJogadores] = useState<Jogador[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('jogadores').select('*').eq('organizador_id', organizadorId).order('nome');
    setErro(error?.message ?? null);
    setJogadores((data ?? []) as Jogador[]);
  }, [organizadorId]);
  useEffect(() => {
    recarregar();
  }, [recarregar]);
  return { jogadores, erro, recarregar };
}

/** Soma o histórico de cada jogador salvo em todos os torneios em que participou. */
async function carregarHistorico(ids: string[]): Promise<Map<string, Historico>> {
  const out = new Map<string, Historico>();
  if (ids.length === 0) return out;
  const { data: ps } = await supabase.from('participantes').select('*').in('jogador_id', ids);
  const parts = (ps ?? []) as Participante[];
  const tids = [...new Set(parts.map((p) => p.torneio_id))];
  if (tids.length === 0) return out;
  const [{ data: js }, { data: todos }, { data: ts }] = await Promise.all([
    supabase.from('jogos').select('*').in('torneio_id', tids),
    supabase.from('participantes').select('*').in('torneio_id', tids),
    supabase.from('torneios').select('id,status').in('id', tids),
  ]);
  const encerrado = new Set((ts ?? []).filter((t) => t.status === 'encerrado').map((t) => t.id));
  for (const tid of tids) {
    const doTorneio = ((todos ?? []) as Participante[]).filter((p) => p.torneio_id === tid);
    const linhas = calcularRanking(doTorneio, ((js ?? []) as Jogo[]).filter((j) => j.torneio_id === tid));
    for (const l of linhas) {
      const jid = doTorneio.find((p) => p.id === l.id)?.jogador_id;
      if (!jid || !ids.includes(jid)) continue;
      const h = out.get(jid) ?? { torneios: 0, jogos: 0, vitorias: 0, titulos: 0 };
      h.torneios++;
      h.jogos += l.jogos;
      h.vitorias += l.vitorias;
      if (encerrado.has(tid) && l.posicao === 1 && l.vitorias > 0) h.titulos++;
      out.set(jid, h);
    }
  }
  return out;
}

function LinhaJogador({ j, h, aoMudar }: { j: Jogador; h?: Historico; aoMudar: (m: string | null) => void }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(j.nome);
  const [sexo, setSexo] = useState<Sexo>(j.sexo);
  const [confirmar, setConfirmar] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('jogadores').update({ nome: nome.trim(), sexo }).eq('id', j.id);
    if (error) return aoMudar(error.code === '23505' ? `Já existe um jogador chamado ${nome.trim()}.` : error.message);
    setEditando(false);
    aoMudar(null);
  }
  async function apagar() {
    const { error } = await supabase.from('jogadores').delete().eq('id', j.id);
    aoMudar(error ? error.message : null);
  }

  if (editando)
    return (
      <li className="jogador editando">
        <form onSubmit={salvar} className="pilha">
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" autoFocus required />
          <Segmentos rotulo="Sexo" valor={sexo} aoMudar={setSexo} opcoes={[['M', 'Homem'], ['F', 'Mulher']]} />
          <div className="linha fim">
            {confirmar ? (
              <>
                <span className="sub">Apagar {j.nome}? O histórico dos torneios continua.</span>
                <button type="button" className="btn perigo" onClick={apagar}>
                  Apagar
                </button>
                <button type="button" className="btn" onClick={() => setConfirmar(false)}>
                  Não
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn fantasma perigo-txt" onClick={() => setConfirmar(true)}>
                  <Icone nome="lixo" tam={18} /> Apagar
                </button>
                <span className="espaco" />
                <button type="button" className="btn" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button className="btn primario">Salvar</button>
              </>
            )}
          </div>
        </form>
      </li>
    );

  return (
    <li className="jogador">
      <Avatar nome={j.nome} sexo={j.sexo} tam={42} />
      <div className="jogador-txt">
        <b>{j.nome}</b>
        <span>
          {h
            ? `${h.torneios} torneio${h.torneios > 1 ? 's' : ''} · ${h.vitorias} vitória${h.vitorias !== 1 ? 's' : ''} em ${h.jogos} jogo${h.jogos !== 1 ? 's' : ''}${h.titulos ? ` · ${h.titulos} 🏆` : ''}`
            : 'Ainda não jogou'}
        </span>
      </div>
      <button className="icone-btn" aria-label={`Editar ${j.nome}`} onClick={() => setEditando(true)}>
        <Icone nome="lapis" tam={18} />
      </button>
    </li>
  );
}

function TelaJogadores({ sessao }: { sessao: Session }) {
  const { jogadores, erro, recarregar } = useJogadores(sessao.user.id);
  const [hist, setHist] = useState<Map<string, Historico>>(new Map());
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState<Sexo>('M');
  const [filtro, setFiltro] = useState<'todos' | Sexo>('todos');
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (jogadores) carregarHistorico(jogadores.map((j) => j.id)).then(setHist);
  }, [jogadores]);

  const visiveis = useMemo(
    () =>
      (jogadores ?? []).filter(
        (j) => (filtro === 'todos' || j.sexo === filtro) && j.nome.toLowerCase().includes(busca.trim().toLowerCase()),
      ),
    [jogadores, filtro, busca],
  );
  const h = (jogadores ?? []).filter((j) => j.sexo === 'M').length;
  const m = (jogadores ?? []).length - h;

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    const { error } = await supabase.from('jogadores').insert({ nome: n, sexo });
    if (error) return setMsg(error.code === '23505' ? `${n} já está salvo.` : error.message);
    setNome('');
    setMsg(null);
    recarregar();
  }

  return (
    <Moldura titulo="Jogadores">
      <form onSubmit={adicionar} className="cartao pilha">
        <label className="campo">
          <span>Adicionar jogador</span>
          <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <div className="linha">
          <Segmentos rotulo="Sexo" valor={sexo} aoMudar={setSexo} opcoes={[['M', 'Homem'], ['F', 'Mulher']]} />
          <button className="btn primario">
            <Icone nome="mais" /> Salvar
          </button>
        </div>
      </form>
      {(msg || erro) && (
        <p className="aviso" role="alert">
          {msg ?? erro}
        </p>
      )}

      {jogadores === null ? (
        <div className="carregando">Carregando…</div>
      ) : jogadores.length === 0 ? (
        <div className="vazio grande">
          <Icone nome="pessoas" tam={40} />
          <p>Salve aqui quem costuma jogar. Depois é só tocar no nome para incluir no torneio.</p>
        </div>
      ) : (
        <>
          <div className="filtros">
            <label className="busca">
              <Icone nome="busca" tam={18} />
              <input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar jogador" />
            </label>
            <Segmentos
              rotulo="Filtrar"
              valor={filtro}
              aoMudar={setFiltro}
              opcoes={[
                ['todos', `Todos ${jogadores.length}`],
                ['M', `H ${h}`],
                ['F', `M ${m}`],
              ]}
            />
          </div>
          <ul className="lista-jogadores">
            {visiveis.map((j) => (
              <LinhaJogador
                key={j.id + j.nome + j.sexo}
                j={j}
                h={hist.get(j.id)}
                aoMudar={(m) => {
                  setMsg(m);
                  if (!m) recarregar();
                }}
              />
            ))}
          </ul>
        </>
      )}
    </Moldura>
  );
}

export default function Jogadores() {
  return <SoOrganizador>{(s) => <TelaJogadores sessao={s} />}</SoOrganizador>;
}
