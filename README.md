# Torneio de Beach Tennis

App web para organizar torneios de beach tennis com **duplas rotativas** (mistas sempre que possível) e **ranking ao vivo**.

- **Organizador** (com login): cria o torneio, cadastra de 8 a 14 participantes, escolhe jogos por pessoa, set até 4 ou 6 games e 1 ou 2 quadras, gera os jogos e lança os placares.
- **Jogadores** (sem login): abrem o link do torneio e veem os jogos e o ranking geral, masculino e feminino, atualizando sozinho.

As regras do sorteio e do ranking estão em [`docs/regras.md`](docs/regras.md).

## Como colocar no ar

1. **Banco:** no Supabase, abra *SQL Editor*, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em *Run*.
2. **Chaves:** em *Project Settings → API*, copie a *Project URL* e a chave *anon public*.
3. **Vercel:** importe este repositório em [vercel.com/new](https://vercel.com/new) e adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
4. Abra o endereço da Vercel, clique em *Criar conta* e entre como organizador.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # app em http://localhost:5173
npm test                     # testes do sorteio e do ranking
```

Código principal:

- `src/lib/sorteio.ts`: monta as duplas e a ordem dos jogos
- `src/lib/ranking.ts`: calcula o ranking e valida placares
- `src/lib/supabase.ts`: acesso ao banco e atualização em tempo real
- `src/pages/`: telas do organizador (`Inicio`, `Organizador`) e pública (`Publico`)
