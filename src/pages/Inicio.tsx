import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Torneio } from '../lib/supabase';

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return sessao;
}

function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    const r =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha });
    setEnviando(false);
    if (r.error) setMsg(r.error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : r.error.message);
    else if (modo === 'criar' && !r.data.session) setMsg('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.');
  }

  return (
    <main className="estreito">
      <h1>🎾 Torneio de Beach Tennis</h1>
      <p className="sub">Área do organizador. Os jogadores não precisam de login: eles acompanham pelo link do torneio.</p>
      <form onSubmit={enviar} className="cartao">
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          />
        </label>
        <button className="primario" disabled={enviando}>
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        {msg && <p className="aviso">{msg}</p>}
        <button type="button" className="link" onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}>
          {modo === 'entrar' ? 'Primeira vez? Criar conta' : 'Já tenho conta'}
        </button>
      </form>
    </main>
  );
}

export default function Inicio() {
  const sessao = useSessao();
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const navegar = useNavigate();

  useEffect(() => {
    if (!sessao) return;
    supabase
      .from('torneios')
      .select('*')
      .eq('organizador_id', sessao.user.id)
      .order('data', { ascending: false })
      .then(({ data }) => setTorneios((data ?? []) as Torneio[]));
  }, [sessao]);

  if (sessao === undefined) return <main className="centro">Carregando…</main>;
  if (!sessao) return <Entrar />;

  async function criar(e: FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from('torneios').insert({ nome: nome.trim() }).select().single();
    if (error) return setErro(error.message);
    navegar(`/organizar/${data.id}`);
  }

  const rotulo = { inscricoes: 'Inscrições', em_andamento: 'Em andamento', encerrado: 'Encerrado' };
  return (
    <main className="estreito">
      <header className="topo">
        <h1>Meus torneios</h1>
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>
      <form onSubmit={criar} className="cartao linha">
        <input placeholder="Nome do novo torneio" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="primario">Criar</button>
      </form>
      {erro && <p className="aviso">{erro}</p>}
      {torneios.length === 0 && <p className="vazio">Nenhum torneio ainda.</p>}
      <ul className="lista">
        {torneios.map((t) => (
          <li key={t.id}>
            <Link to={`/organizar/${t.id}`}>
              <b>{t.nome}</b>
              <span>
                {new Date(t.data + 'T12:00').toLocaleDateString('pt-BR')} · {rotulo[t.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
