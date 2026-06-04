'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating dramatic announcements
 * for the start of the Day Phase in a Mafia game.
 *
 * - dayPhaseAndEliminationAnnouncement - A function that generates the day phase announcement.
 * - DayPhaseAndEliminationAnnouncementInput - The input type for the function.
 * - DayPhaseAndEliminationAnnouncementOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const DayPhaseAndEliminationAnnouncementInputSchema = z.object({
  eliminatedPlayerName: z.string().nullable().describe('The name of the player eliminated during the night, or null if no one was eliminated.'),
  reason: z.string().nullable().describe('The reason for the elimination (e.g., "attacked by the Mafia", "saved by the Doctor"), or null if no one was eliminated.'),
  alivePlayersCount: z.number().describe('The current number of players still alive in the game.'),
  dayNumber: z.number().describe('The current day number in the game.'),
});
export type DayPhaseAndEliminationAnnouncementInput = z.infer<typeof DayPhaseAndEliminationAnnouncementInputSchema>;

// Output Schema
const DayPhaseAndEliminationAnnouncementOutputSchema = z.string().describe('A dramatic announcement for the start of the Day Phase, detailing night events.');
export type DayPhaseAndEliminationAnnouncementOutput = z.infer<typeof DayPhaseAndEliminationAnnouncementOutputSchema>;

// Prompt Definition
const dayPhaseAnnouncementPrompt = ai.definePrompt({
  name: 'dayPhaseAnnouncementPrompt',
  input: { schema: DayPhaseAndEliminationAnnouncementInputSchema },
  output: { schema: DayPhaseAndEliminationAnnouncementOutputSchema },
  prompt: `You are the mysterious and dramatic narrator for a game of Mafia. Your task is to announce the start of a new day phase, including any eliminations that occurred during the night.

Current Day: Day {{{dayNumber}}}
Alive Players: {{{alivePlayersCount}}}

{{#if eliminatedPlayerName}}
  Night has passed, and a new day dawns upon the unsuspecting town. The shadows whisper tales of tragedy, for during the cloak of darkness, {{{eliminatedPlayerName}}} met a grim and final fate, {{{reason}}}. A chilling silence falls upon the town as one less soul remains. There are now only {{{alivePlayersCount}}} players left to uncover the truth. Who among you will break the silence, and whose accusations will echo through the streets?
{{else}}
  Night has passed, and the first rays of dawn pierce through the veil of darkness. Miraculously, the night was quiet, and no one has been eliminated. A collective sigh of relief, perhaps, but the tension remains palpable. The town is still alive with {{{alivePlayersCount}}} souls, each harboring secrets. The day of discussion begins anew. What will this new day bring?
{{/if}}

Ensure the tone is suspenseful, dramatic, and sets the stage for the day's events.`
});

// Flow Definition
const dayPhaseAndEliminationAnnouncementFlow = ai.defineFlow(
  {
    name: 'dayPhaseAndEliminationAnnouncementFlow',
    inputSchema: DayPhaseAndEliminationAnnouncementInputSchema,
    outputSchema: DayPhaseAndEliminationAnnouncementOutputSchema,
  },
  async (input) => {
    const { output } = await dayPhaseAnnouncementPrompt(input);
    return output!;
  }
);

// Wrapper function
export async function dayPhaseAndEliminationAnnouncement(
  input: DayPhaseAndEliminationAnnouncementInput
):
  Promise<DayPhaseAndEliminationAnnouncementOutput>
{
  return dayPhaseAndEliminationAnnouncementFlow(input);
}
