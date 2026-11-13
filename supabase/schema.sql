-- Torneio de beach tennis: banco de dados (Supabase / Postgres)
-- Rodar uma vez no SQL Editor do Supabase.
-- Quem lê: qualquer pessoa com o link (sem login).
-- Quem altera: só o organizador que criou o torneio (logado no Supabase Auth).

create extension if not exists pgcrypto;

-- ============ TORNEIOS ============
create table public.torneios (
  id               uuid primary key default gen_random_uuid(),
  organizador_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome             text not null check (length(trim(nome)) > 0),
  data             date not null default current_date,
  jogos_por_pessoa int  not null default 4 check (jogos_por_pessoa between 1 and 8),
  games_por_set    int  not null default 6 check (games_por_set in (4, 6)),
  quadras          int  not null default 1 check (quadras in (1, 2)),
  status           text not null default 'inscricoes'
                   check (status in ('inscricoes', 'em_andamento', 'encerrado')),
  -- código curto usado no link público, ex.: /t/3fa92c1b
  codigo           text not null unique default encode(gen_random_bytes(4), 'hex'),
  criado_em        timestamptz not null default now()
);

-- ============ PARTICIPANTES ============
create table public.participantes (
  id          uuid primary key default gen_random_uuid(),
  torneio_id  uuid not null references public.torneios(id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  sexo        char(1) not null check (sexo in ('M', 'F')),
  criado_em   timestamptz not null default now(),
  unique (torneio_id, nome)
);
create index on public.participantes (torneio_id);

-- ============ JOGOS ============
-- Dupla A = a1 + a2, dupla B = b1 + b2. "ordem" é a posição na fila;
-- "rodada" agrupa jogos simultâneos quando há 2 quadras.
create table public.jogos (
  id          uuid primary key default gen_random_uuid(),
  torneio_id  uuid not null references public.torneios(id) on delete cascade,
  ordem       int  not null,
  rodada      int  not null,
  quadra      int  not null default 1 check (quadra in (1, 2)),
  a1 uuid not null references public.participantes(id) on delete cascade,
  a2 uuid not null references public.participantes(id) on delete cascade,
  b1 uuid not null references public.participantes(id) on delete cascade,
  b2 uuid not null references public.participantes(id) on delete cascade,
  games_a     int check (games_a >= 0),
  games_b     int check (games_b >= 0),
  status      text not null default 'pendente'
              check (status in ('pendente', 'em_andamento', 'finalizado')),
  atualizado_em timestamptz not null default now(),
  unique (torneio_id, ordem),
  check (a1 <> a2 and b1 <> b2 and a1 not in (b1, b2) and a2 not in (b1, b2)),
  check (status <> 'finalizado' or (games_a is not null and games_b is not null))
);
create index on public.jogos (torneio_id);

-- Placar válido para 1 set até N games com tie-break em N a N:
-- vencedor com N e perdedor com até N-2, ou vencedor com N+1 e perdedor com N-1 ou N.
create or replace function public.validar_placar() returns trigger
language plpgsql as $$
declare
  n int;
  hi int;
  lo int;
begin
  new.atualizado_em := now();
  if new.status <> 'finalizado' then
    return new;
  end if;
  select games_por_set into n from public.torneios where id = new.torneio_id;
  hi := greatest(new.games_a, new.games_b);
  lo := least(new.games_a, new.games_b);
  if not ((hi = n and lo <= n - 2) or (hi = n + 1 and lo in (n - 1, n))) then
    raise exception 'Placar inválido para set até % games: % x %', n, new.games_a, new.games_b;
  end if;
  return new;
end $$;

create trigger jogos_validar_placar
  before insert or update on public.jogos
  for each row execute function public.validar_placar();

-- ============ RANKING ============
-- Uma linha por participante. Só conta jogos finalizados.
-- Ordem: vitórias, saldo de games, games feitos (o confronto direto é resolvido no app).
create or replace view public.ranking with (security_invoker = true) as
with lados as (
  select j.torneio_id, x.participante_id, x.feitos, x.sofridos
  from public.jogos j
  cross join lateral (values
    (j.a1, j.games_a, j.games_b),
    (j.a2, j.games_a, j.games_b),
    (j.b1, j.games_b, j.games_a),
    (j.b2, j.games_b, j.games_a)
  ) as x(participante_id, feitos, sofridos)
  where j.status = 'finalizado'
)
select
  p.torneio_id,
  p.id   as participante_id,
  p.nome,
  p.sexo,
  count(l.participante_id)::int                                    as jogos,
  coalesce(sum((l.feitos > l.sofridos)::int), 0)::int              as vitorias,
  coalesce(sum((l.feitos < l.sofridos)::int), 0)::int              as derrotas,
  coalesce(sum(l.feitos), 0)::int                                  as games_feitos,
  coalesce(sum(l.sofridos), 0)::int                                as games_sofridos,
  coalesce(sum(l.feitos - l.sofridos), 0)::int                     as saldo
from public.participantes p
left join lados l on l.participante_id = p.id
group by p.torneio_id, p.id, p.nome, p.sexo;

-- ============ SEGURANÇA (RLS) ============
alter table public.torneios      enable row level security;
alter table public.participantes enable row level security;
alter table public.jogos         enable row level security;

-- Leitura pública (o link do torneio funciona sem login)
create policy "leitura publica" on public.torneios      for select using (true);
create policy "leitura publica" on public.participantes for select using (true);
create policy "leitura publica" on public.jogos         for select using (true);

-- Escrita só do organizador
create policy "organizador cria" on public.torneios
  for insert to authenticated with check (organizador_id = auth.uid());
create policy "organizador altera" on public.torneios
  for update to authenticated using (organizador_id = auth.uid()) with check (organizador_id = auth.uid());
create policy "organizador apaga" on public.torneios
  for delete to authenticated using (organizador_id = auth.uid());

create or replace function public.e_organizador(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.torneios where id = t and organizador_id = auth.uid());
$$;

create policy "organizador escreve" on public.participantes
  for all to authenticated using (public.e_organizador(torneio_id)) with check (public.e_organizador(torneio_id));
create policy "organizador escreve" on public.jogos
  for all to authenticated using (public.e_organizador(torneio_id)) with check (public.e_organizador(torneio_id));

-- ============ TEMPO REAL ============
-- Faz o app receber na hora qualquer placar ou mudança de participante.
alter publication supabase_realtime add table public.torneios, public.participantes, public.jogos;
