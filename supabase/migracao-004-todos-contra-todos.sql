-- Migração 004: opção "todo mundo enfrenta todo mundo" no torneio.
-- Rodar uma vez no SQL Editor do Supabase (depois da migração 003).

alter table public.torneios
  add column if not exists todos_contra_todos boolean not null default false;
