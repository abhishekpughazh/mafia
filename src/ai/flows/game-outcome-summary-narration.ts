'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate a narrative summary of a Mafia game's outcome.
 *
 * - generateGameOutcomeSummary - A function that orchestrates the generation of a game outcome summary.
 * - GameOutcomeSummaryNarrationInput - The input type for the generateGameOutcomeSummary function.
 * - GameOutcomeSummaryNarrationOutput - The return type for the generateGameOutcomeSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameOutcomeSummaryNarrationInputSchema = z.object({
  winningTeam: z.string().describe('The team that won the game (e.g., "Town", "Mafia").'),
  playerRoles: z.array(z.object({
    name: z.string().describe('The name of the player.'),
    role: z.string().describe('The role assigned to the player.'),
  })).describe('A list of all players and their assigned roles.'),
  eliminatedPlayers: z.array(z.object({
    name: z.string().describe('The name of the eliminated player.'),
    role: z.string().describe('The role of the eliminated player.'),
    dayEliminated: z.number().describe('The day number on which the player was eliminated.'),
    cause: z.string().describe('The cause of elimination (e.g., "killed by Mafia", "voted out by Town").'),
  })).describe('A chronological list of players eliminated during the game, including their role, day of elimination, and cause.'),
});
export type GameOutcomeSummaryNarrationInput = z.infer<typeof GameOutcomeSummaryNarrationInputSchema>;

const GameOutcomeSummaryNarrationOutputSchema = z.object({
  summary: z.string().describe('A compelling narrative summary of how the winning team achieved victory, tailored to the specific events of the game.'),
});
export type GameOutcomeSummaryNarrationOutput = z.infer<typeof GameOutcomeSummaryNarrationOutputSchema>;

const gameOutcomeSummaryPrompt = ai.definePrompt({
  name: 'gameOutcomeSummaryPrompt',
  input: { schema: GameOutcomeSummaryNarationInputSchema },
  output: { schema: GameOutcomeSummaryNarrationOutputSchema },
  prompt: `You are a dramatic and engaging game moderator for a game of Mafia. Your task is to provide a compelling narrative summary of how the {{winningTeam}} team achieved victory, tailored to the specific events of the game.

Here are the key details of the game:

Winning Team: {{winningTeam}}

Player Roles:
{{#each playerRoles}}
- {{this.name}} was the {{this.role}}
{{/each}}

Elimination Events:
{{#if eliminatedPlayers}}
{{#each eliminatedPlayers}}
- On Day {{this.dayEliminated}}, {{this.name}} (the {{this.role}}) was {{this.cause}}.
{{/each}}
{{else}}
No players were eliminated. The game concluded swiftly with a clear victory.
{{/if}}

Craft a detailed and suspenseful narrative that brings the game's conclusion to life, highlighting crucial moments and decisions that led to the {{winningTeam}}'s triumph. Start with a dramatic opening sentence related to the winning team.
`,
});

const gameOutcomeSummaryNarrationFlow = ai.defineFlow(
  {
    name: 'gameOutcomeSummaryNarrationFlow',
    inputSchema: GameOutcomeSummaryNarrationInputSchema,
    outputSchema: GameOutcomeSummaryNarrationOutputSchema,
  },
  async (input) => {
    const { output } = await gameOutcomeSummaryPrompt(input);
    return output!;
  }
);

export async function generateGameOutcomeSummary(
  input: GameOutcomeSummaryNarrationInput
): Promise<GameOutcomeSummaryNarrationOutput> {
  return gameOutcomeSummaryNarrationFlow(input);
}
