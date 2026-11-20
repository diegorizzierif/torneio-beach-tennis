# Regras do torneio de beach tennis

Versão 3, 13/11/2026 (com as respostas do Diego). Este documento define como o app monta os jogos e calcula o ranking. Tudo que estiver marcado como **configurável** poderá ser alterado na tela do organizador.

## 1. Formato

- **Duplas rotativas:** a cada jogo os parceiros mudam. O ranking é **individual**, porque ninguém tem dupla fixa.
- **Mistas sempre que possível:** uma dupla mista só enfrenta outra dupla mista.
- **Sobrando homens (ou mulheres):** os excedentes formam duplas do mesmo sexo, que só enfrentam duplas do mesmo tipo. Ou seja, nunca acontece um jogo de dupla masculina contra dupla mista, e as mulheres não ficam em desvantagem.
- **De 8 a 14 participantes.**
- **Todos jogam o mesmo número de jogos**, escolhido pelo organizador ao criar o torneio: **4, 6, 7, 8 ou 10** (padrão: 4). Assim o ranking é justo.
- **1 ou 2 quadras**, escolhido ao criar o torneio. Com 1 quadra, os jogos ficam numa fila numerada. Com 2 quadras, o app monta rodadas com dois jogos ao mesmo tempo, sem ninguém escalado nas duas quadras.

## 2. Como o sorteio monta os jogos

Quando o organizador clica em "Gerar jogos", o app testa milhares de combinações e escolhe a melhor seguindo esta ordem de prioridade:

1. Respeitar o tipo de jogo (mista x mista, masculina x masculina, feminina x feminina).
2. Todo mundo com o mesmo número de jogos.
3. **Nunca repetir parceiro.**
4. Ninguém jogar mais de 2 jogos seguidos, para dar descanso.
5. Variar ao máximo os adversários.

Se o organizador não gostar do resultado, pode clicar em "Sortear de novo".

**Quantidade de jogos:** total de jogos = participantes × jogos por pessoa ÷ 4. A conta precisa dar um número inteiro. Com 4 ou 8 jogos por pessoa sempre fecha. Com 6 ou 10, o número de participantes precisa ser par; com número ímpar, o app mostra essas opções riscadas e explica o motivo.

| Participantes | 4 jogos | 6 jogos | 8 jogos | 10 jogos |
|---|---|---|---|---|
| 8 | 8 | 12 | 16 | 20 |
| 9 | 9 | não fecha | 18 | não fecha |
| 10 | 10 | 15 | 20 | 25 |
| 11 | 11 | não fecha | 22 | não fecha |
| 12 | 12 | 18 | 24 | 30 |
| 13 | 13 | não fecha | 26 | não fecha |
| 14 | 14 | 21 | 28 | 35 |

(total de jogos na quadra)

**7 jogos por pessoa:** só fecha a conta quando o número de participantes é múltiplo de 4 (8 ou 12) e há número par de homens e de mulheres. O caso típico é **8 jogadores (4 H + 4 M) com 7 jogos**: cada um joga exatamente uma vez com cada outro jogador como parceiro. São 14 jogos. Com 2 quadras, ficam 7 rodadas sem ninguém descansar: 3 rodadas de dupla masculina x masculina numa quadra e feminina x feminina na outra, e 4 rodadas de mista x mista nas duas quadras.

**Parceiros repetidos:** com 8 ou 10 jogos por pessoa e poucos participantes, nem sempre dá para jogar com um parceiro diferente em todo jogo. Com 8 pessoas, por exemplo, cada um tem só 7 parceiros possíveis (e menos ainda com a regra das mistas), então em 8 ou 10 jogos alguém vai repetir. O sorteio repete o mínimo possível e o app avisa quantas duplas se repetiram.

**Tempo:** numa quadra só, 14 jogos com set até 6 games passam de 5 horas. Para 12 a 14 pessoas, vale usar sets até 4 games ou 2 quadras.

**Com 2 quadras:** testei de 8 a 14 participantes. De 10 pessoas para cima o tempo cai quase pela metade, porque os dois jogos acontecem juntos. Com 8 pessoas, todos jogam em toda rodada e ninguém descansa. Com número ímpar de mulheres e poucos jogadores (por exemplo, 5 homens e 3 mulheres), muitas vezes só dá para formar um jogo misto por vez, e a segunda quadra fica parada. Nesses casos o app avisa e sugere usar 1 quadra.

**Todo mundo enfrenta todo mundo (opcional):** ao criar o torneio, o organizador pode ligar esta opção. O sorteio então coloca como prioridade máxima que cada jogador enfrente cada outro pelo menos uma vez, sem quebrar a regra das duplas (dupla masculina só joga contra dupla masculina, mista contra mista, feminina contra feminina). Para isso é preciso um mínimo de jogos por pessoa, e o app risca as opções que não bastam:

- cada jogo coloca a pessoa contra 2 adversários, então são pelo menos (participantes − 1) ÷ 2 jogos;
- uma mulher só enfrenta homens em jogo misto, e cada misto tem só 1 homem do outro lado. Então ela precisa de pelo menos um jogo por homem. O mesmo vale para os homens em relação às mulheres.

| Grupo | Mínimo de jogos por pessoa |
|---|---|
| 8 (4 H + 4 M) | 4 |
| 8 (5 H + 3 M) | 6 |
| 9 (5 H + 4 M) | 8 |
| 10 (5 H + 5 M) | 6 |
| 10 (6 H + 4 M) | 6 |
| 12 (6 H + 6 M) | 6 |
| 12 (8 H + 4 M) | 8 |
| 14 (7 H + 7 M) | 8 |

Testei de 8 a 14 participantes, com 2 a 7 mulheres: no mínimo de jogos, todo mundo enfrentou todo mundo em todos os casos. O custo é que, com o mínimo de jogos, às vezes alguém repete parceiro. Se o sorteio não conseguir que todos se enfrentem, o app avisa quantos pares ficaram de fora.

**Caso especial, só 1 mulher (ou 1 homem):** não há como formar mista x mista. Nesse caso o app avisa, e o organizador escolhe entre deixar essa pessoa jogar em dupla mista contra dupla masculina ou montar o torneio todo sem a regra de mistas.

## 3. Pontuação e ranking

- **Cada jogo:** 1 set. Ao criar o torneio, o organizador escolhe **até 4 games** (tie-break no 4 a 4) ou **até 6 games** (tie-break no 6 a 6).
- O organizador lança o placar como foi jogado, **livre** (ex.: 5 x 1, 4 x 2, 6 x 3). Vale qualquer placar de 0 a 99, inclusive **empate** (ex.: 3 x 3). No empate ninguém ganha vitória, e o jogo conta como empate (coluna E do ranking). O "set até 4 ou 6 games" serve como referência e para estimar a duração. Os dois jogadores da dupla vencedora ganham a vitória e os dois recebem o mesmo saldo.
- **Ordem do ranking:**
  1. Número de vitórias
  2. Saldo de games (games feitos menos games sofridos)
  3. Games feitos
  4. Confronto direto, se dois empatados se enfrentaram como adversários
  5. Se ainda empatar, aparecem empatados na mesma posição
- **Três rankings:** um **geral**, um **masculino** e um **feminino**, todos com os mesmos critérios. Na tela dá para alternar entre eles.
- O ranking atualiza na tela de todos assim que o placar é salvo.

## 4. Exemplos de sorteio (8 jogadores, 1 quadra, 4 jogos cada)

Rodei o sorteio no computador com três combinações. Em todas, **ninguém repetiu parceiro e ninguém jogou mais de 2 jogos seguidos.**

**4 homens + 4 mulheres:** todos os 8 jogos são mistos e cada mulher joga uma vez com cada homem.

| Jogo | Dupla 1 | Dupla 2 |
|---|---|---|
| 1 | Ana + Gui | Bia + Hugo |
| 2 | Carla + Edu | Duda + Fabio |
| 3 | Bia + Edu | Carla + Hugo |
| 4 | Ana + Fabio | Duda + Gui |
| 5 | Bia + Gui | Duda + Edu |
| 6 | Ana + Hugo | Carla + Fabio |
| 7 | Bia + Fabio | Duda + Hugo |
| 8 | Ana + Edu | Carla + Gui |

**5 homens + 3 mulheres:** 6 jogos mistos e 2 jogos masculinos.

| Jogo | Dupla 1 | Dupla 2 |
|---|---|---|
| 1 | Ana + Igor | Bia + Fabio |
| 2 | Ana + Hugo | Carla + Edu |
| 3 | Edu + Hugo | Gui + Igor |
| 4 | Bia + Gui | Carla + Fabio |
| 5 | Ana + Fabio | Carla + Hugo |
| 6 | Ana + Gui | Bia + Igor |
| 7 | Bia + Edu | Carla + Gui |
| 8 | Edu + Igor | Fabio + Hugo |

**6 homens + 2 mulheres:** 4 jogos mistos e 4 masculinos. Como só há 2 mulheres, as duas se enfrentam em todos os jogos delas. Isso é inevitável com a regra de mista x mista.

| Jogo | Dupla 1 | Dupla 2 |
|---|---|---|
| 1 | Ana + Hugo | Bia + Fabio |
| 2 | Edu + Joao | Gui + Igor |
| 3 | Edu + Gui | Fabio + Hugo |
| 4 | Ana + Joao | Bia + Igor |
| 5 | Edu + Hugo | Igor + Joao |
| 6 | Ana + Fabio | Bia + Hugo |
| 7 | Edu + Igor | Fabio + Gui |
| 8 | Ana + Gui | Bia + Joao |

## 5. Decisões confirmadas pelo Diego (13/11)

1. **Jogos por pessoa:** 4, 6, 7, 8 ou 10, escolhido ao criar o torneio (padrão 4). Atualizado em 20/11.
2. **Set:** até 4 ou até 6 games, escolhido na hora de criar o torneio.
3. **Ranking:** vitórias, depois saldo de games, depois games feitos.
4. **Rankings:** geral, masculino e feminino.
5. **Quadras:** opção de 1 ou 2 quadras.
