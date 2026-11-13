import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Torneio } from '../lib/supabase';
import { dataBR, Icone, Moldura } from '../ui';

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return sessao;
}

/** Envolve as telas do organizador: mostra o login se não houver sessão. */
export function SoOrganizador({ children }: { children: (s: Session) => JSX.Element }) {
  const sessao = useSessao();
  if (sessao === undefined) return <div className="carregando">Carregando…</div>;
  if (!sessao) return <Entrar />;
  return children(sessao);
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
        : await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
    setEnviando(false);
    if (r.error) {
      const m = r.error.message;
      setMsg(
        m === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : m === 'Email not confirmed'
            ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
            : m,
      );
    } else if (modo === 'criar' && !r.data.session) setMsg('Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.');
  }

  return (
    <div className="entrada">
      <div className="entrada-hero">
        <div className="logo">
          <Icone nome="bola" tam={34} />
        </div>
        <h1>Beach Tennis</h1>
        <p>Torneios com duplas rotativas e ranking ao vivo</p>
      </div>
      <form onSubmit={enviar} className="cartao entrada-form">
        <h2>{modo === 'entrar' ? 'Entrar como organizador' : 'Criar conta de organizador'}</h2>
        <label className="campo">
          <span>E-mail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          />
        </label>
        {msg && <p className="aviso">{msg}</p>}
        <button className="btn primario grande" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" className="btn link" onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}>
          {modo === 'entrar' ? 'Primeira vez? Criar conta' : 'Já tenho conta'}
        </button>
      </form>
      <p className="entrada-rodape">Jogadores não precisam de conta: eles acompanham pelo link do torneio.</p>
    </div>
  );
}

const rotuloStatus = { inscricoes: 'Inscrições', em_andamento: 'Em andamento', encerrado: 'Encerrado' } as const;

function ListaTorneios({ sessao }: { sessao: Session }) {
  const [torneios, setTorneios] = useState<Torneio[] | null>(null);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    supabase
      .from('torneios')
      .select('*')
      .eq('organizador_id', sessao.user.id)
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        setTorneios((data ?? []) as Torneio[]);
      });
  }, [sessao]);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setCriando(true);
    const { data, error } = await supabase.from('torneios').insert({ nome: nome.trim() }).select().single();
    setCriando(false);
    if (error) return setErro(error.message);
    navegar(`/organizar/${data.id}`);
  }

  return (
    <Moldura titulo="Meus torneios">
      <form onSubmit={criar} className="cartao novo-torneio">
        <label className="campo">
          <span>Novo torneio</span>
          <div className="linha">
            <input placeholder="Ex.: Torneio de Sábado" required value={nome} onChange={(e) => setNome(e.target.value)} />
            <button className="btn primario" disabled={criando}>
              <Icone nome="mais" /> Criar
            </button>
          </div>
        </label>
      </form>
      {erro && <p className="aviso">{erro}</p>}
      {torneios === null ? (
        <div className="carregando">Carregando…</div>
      ) : torneios.length === 0 ? (
        <div className="vazio grande">
          <Icone nome="trofeu" tam={40} />
          <p>Nenhum torneio ainda. Crie o primeiro acima.</p>
        </div>
      ) : (
        <ul className="lista-cartoes">
          {torneios.map((t) => (
            <li key={t.id}>
              <Link to={`/organizar/${t.id}`} className="cartao-link">
                <div className={`status-bola ${t.status}`} />
                <div className="cartao-link-txt">
                  <b>{t.nome}</b>
                  <span>
                    {dataBR(t.data)} · {rotuloStatus[t.status]}
                  </span>
                </div>
                <Icone nome="seta" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Moldura>
  );
}

export default function Inicio() {
  return <SoOrganizador>{(s) => <ListaTorneios sessao={s} />}</SoOrganizador>;
}
