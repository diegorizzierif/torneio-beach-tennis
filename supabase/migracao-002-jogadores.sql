-- Migração 002: cadastro permanente de jogadores do organizador.
-- Rodar uma vez no SQL Editor do Supabase (depois do schema.sql).

create table public.jogadores (
  id              uuid primary key default gen_random_uuid(),
  organizador_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome            text not null check (length(trim(nome)) > 0),
  sexo            char(1) not null check (sexo in ('M', 'F')),
  criado_em       timestamptz not null default now(),
  unique (organizador_id, nome)
);
create index on public.jogadores (organizador_id);

-- Cada participante de torneio pode apontar para o jogador salvo (histórico entre torneios).
alter table public.participantes
  add column jogador_id uuid references public.jogadores(id) on delete set null;
create index on public.participantes (jogador_id);

-- A lista de jogadores é privada do organizador.
alter table public.jogadores enable row level security;
create policy "organizador gerencia seus jogadores" on public.jogadores
  for all to authenticated
  using (organizador_id = auth.uid())
  with check (organizador_id = auth.uid());

grant select, insert, update, delete on public.jogadores to authenticated;
