# Gebeta-JS

Gebeta is a two‑player, two‑row mancala‑style game with six holes in each row. The holes are called “homes”, i.e., “ቤት” [bä.t] in Amharic (Tesfamicael & Farsani, 2024, p. 11). Each player owns one row of homes. Forty‑eight counters (traditionally seeds, beads, or pebble stones) are evenly distributed into the twelve homes, with four counters in each home. In the original game, a group of four counters is a “complete home” (Tesfamicael & Farsani, 2024, p. 12), but I call it a “family” (Thiel et al., 2024) to distinguish between holes and groups of counters.

## Rules

Players pick up the counters from any of their homes and sow them in an anticlockwise direction (directionality rule). In this context, “sowing” means distributing one counter at a time to adjacent homes. If the last counter lands in a home that is occupied, the player picks up the contents of this home and continues to sow. When the last counter lands in an empty home, the turn ends. When the last counter lands in a home that has three counters, it creates a family. The player captures the family by removing it and setting it aside. The turn ends. If, during sowing, a family is formed elsewhere, the owner of that home captures it. The goal is to capture most families. The game ends when a player cannot move because there are no counters left in the player's homes. The other player captures all remaining counters. The player with the most captured families wins the match.

## This JavaScript Version

You can play my version of Gebeta on my [website barnehagematematikk.no](https://www.barnehagematematikk.no/spill/gebeta.html).

### How to play

1. When you open the link, you must choose your language: English, German, or Norwegian
2. Then you must choose whether you want to play against a human player (on the same machine) or an AI. The AI uses Monte Carlo Tree Search.
3. On the third page, you can read the rules. Click anywhere to start the game.
4. You start by clicking on a home. You can only choose your own homes. All counters from the chosen home will be moved to the "hand".
5. You must sow the counters from your hand to the correct homes according to the rules. It is not possible to sow counters in the wrong homes.
6. Families will be captured automatically.
7. When your turn is finished, the game switches to the other player.
8. The app notices when the game is finished, determines the winner, and shows the final scores.

### What is special about this app?

Most Mancala, Kalaha, or Gebeta apps sow the counters automatically. I decided that the players must do the sowing manually, because this has a high learning value for children who play the game (see Thiel, 2025).

## Literature

* Tesfamicael, S. A., & Farsani, D. (2024). Creating a Culturally Responsive Mathematics Education: The Case of Gebeta Game in Ethiopia. In M. A. Ashraf & S. M. Tsegay (Eds.), STEM Education - Recent Trends and New Advances. IntechOpen. https://doi.org/10.5772/intechopen.114007
* Thiel, O., Nakken, A. H., & Tesfamicael, S. A. (2024, 7th-14th July). Affordances of Gebeta Game in Early Childhood Mathematics Education [Paper presentation]. 15th International Congress on Mathematics Education (ICME-15), Sydney, Australia. https://www.researchgate.net/publication/384597488_Affordances_of_Gebeta_Game_in_Early_Childhood_Mathematics_Education
* Thiel, O. (2025). Playing Gebeta in Preschool: Informal Pathways to Early Numeracy Through Directionality and Bundling. Education Sciences, 15(10), 1365. https://doi.org/10.3390/educsci15101365
