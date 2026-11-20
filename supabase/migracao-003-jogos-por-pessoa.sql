-- Migração 003: jogos por pessoa passam a ser 4, 6, 8 ou 10.
-- Rodar uma vez no SQL Editor do Supabase (depois da migração 002).
-- Torneios antigos com outros valores (2, 3, 5...) continuam aceitos pelo banco;
-- o app só oferece 4, 6, 8 e 10 na criação e na tela de formato.

alter table public.torneios
  drop constraint if exists torneios_jogos_por_pessoa_check;

alter table public.torneios
  add constraint torneios_jogos_por_pessoa_check
  check (jogos_por_pessoa between 1 and 10);
