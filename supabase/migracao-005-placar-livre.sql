-- Migração 005: placar livre. Aceita qualquer placar de 0 a 99, desde que tenha vencedor
-- (ex.: 5x1, 4x2, 6x3). Antes só valiam placares de set até 4 ou 6 games.
-- Rodar uma vez no SQL Editor do Supabase (depois da migração 004).

create or replace function public.validar_placar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.status <> 'finalizado' then
    return new;
  end if;
  if new.games_a > 99 or new.games_b > 99 or new.games_a = new.games_b then
    raise exception 'Placar inválido: % x % (precisa ter vencedor, de 0 a 99)', new.games_a, new.games_b;
  end if;
  return new;
end $$;
