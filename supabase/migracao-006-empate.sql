-- Migração 006: placar pode terminar empatado (ex.: 3x3).
-- Rodar uma vez no SQL Editor do Supabase (depois da migração 005).

create or replace function public.validar_placar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.status <> 'finalizado' then
    return new;
  end if;
  if new.games_a > 99 or new.games_b > 99 then
    raise exception 'Placar inválido: % x % (use números de 0 a 99)', new.games_a, new.games_b;
  end if;
  return new;
end $$;
