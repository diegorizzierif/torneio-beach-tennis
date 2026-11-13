import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from './lib/supabase';

const caminhos: Record<string, ReactNode> = {
  trofeu: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2A5 5 0 0 1 21.5 19" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  sair: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </>
  ),
  voltar: <path d="M15 18l-6-6 6-6" />,
  seta: <path d="M9 18l6-6-6-6" />,
  copiar: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
  enviar: <path d="M4 12l16-8-6 16-2.5-6.5L4 12Z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  bola: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6c3.2 3.2 3.2 9.6 0 12.8M18.4 5.6c-3.2 3.2-3.2 9.6 0 12.8" />
    </>
  ),
  lixo: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  lapis: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  busca: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
};

export function Icone({ nome, tam = 20 }: { nome: keyof typeof caminhos; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  );
}

/** Moldura da área do organizador: cabeçalho e barra de abas fixa embaixo (estilo app de celular). */
export function Moldura({ titulo, voltar, acao, children }: { titulo: string; voltar?: ReactNode; acao?: ReactNode; children: ReactNode }) {
  return (
    <div className="app">
      <header className="barra-topo">
        <div className="barra-topo-in">
          {voltar}
          <h1>{titulo}</h1>
          <div className="barra-acao">
            {acao ?? (
              <button className="icone-btn" aria-label="Sair" title="Sair" onClick={() => supabase.auth.signOut()}>
                <Icone nome="sair" />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="conteudo">{children}</main>
      <nav className="abas-baixo" aria-label="Seções">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : '')}>
          <Icone nome="trofeu" tam={22} />
          <span>Torneios</span>
        </NavLink>
        <NavLink to="/jogadores" className={({ isActive }) => (isActive ? 'ativo' : '')}>
          <Icone nome="pessoas" tam={22} />
          <span>Jogadores</span>
        </NavLink>
      </nav>
    </div>
  );
}

export function AoVivo({ ativo }: { ativo: boolean }) {
  return (
    <span className={`aovivo ${ativo ? 'on' : ''}`} title={ativo ? 'Atualizando em tempo real' : 'Conectando…'}>
      <i /> {ativo ? 'Ao vivo' : 'Conectando'}
    </span>
  );
}

export function Avatar({ nome, sexo, tam = 36 }: { nome: string; sexo: 'M' | 'F'; tam?: number }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className={`avatar ${sexo}`} style={{ width: tam, height: tam, fontSize: tam * 0.38 }} aria-hidden="true">
      {iniciais}
    </span>
  );
}

export function Segmentos<T extends string | number>({
  valor,
  opcoes,
  aoMudar,
  rotulo,
}: {
  valor: T;
  opcoes: readonly (readonly [T, ReactNode])[];
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div className="segmentos" role="radiogroup" aria-label={rotulo}>
      {opcoes.map(([v, r]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={valor === v} className={valor === v ? 'ativo' : ''} onClick={() => aoMudar(v)}>
          {r}
        </button>
      ))}
    </div>
  );
}

export function dataBR(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}
