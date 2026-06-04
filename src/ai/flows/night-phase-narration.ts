'use server';
/**
 * @fileOverview This file defines the Genkit flow for generating a suspenseful night phase narration.
 *
 * - generateNightPhaseNarration - A function that generates the night phase narration.
 * - NightPhaseNarrationInput - The input type for the generateNightPhaseNarration function.
 * - NightPhaseNarrationOutput - The return type for the generateNightPhaseNarration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NightPhaseNarrationInputSchema = z
  .object({
    currentDay: z
      .number()
      .optional()
      .describe('The current day number in the game.'),
  })
  .optional();
export type NightPhaseNarrationInput = z.infer<
  typeof NightPhaseNarrationInputSchema
>;

const NightPhaseNarrationOutputSchema = z
  .string()
  .describe('The suspenseful night phase narration.');
export type NightPhaseNarrationOutput = z.infer<
  typeof NightPhaseNarrationOutputSchema
>;

const nightPhaseNarrationPrompt = ai.definePrompt({
  name: 'nightPhaseNarrationPrompt',
  input: {schema: NightPhaseNarrationInputSchema},
  output: {schema: NightPhaseNarrationOutputSchema},
  prompt: `You are the mysterious and dramatic narrator for an in-person Mafia game. Your task is to set a suspenseful mood and instruct players to close their eyes as night falls.

Generate a short, evocative narration for the beginning of the night phase. Make it atmospheric and slightly eerie, suitable for a dim room. The narration should clearly tell everyone to close their eyes. The narration should end by explicitly saying "Everyone, close your eyes."

Example style:
"As twilight deepens, a chilling hush falls over the town. The shadows lengthen, and secrets stir in the quiet corners. Everyone, close your eyes."

${
    '{{#if currentDay}}'
  } It is the start of Night {{currentDay}}.
${
    '{{/if}}'
  }

Begin the narration now:`,
});

const nightPhaseNarrationFlow = ai.defineFlow(
  {
    name: 'nightPhaseNarrationFlow',
    inputSchema: NightPhaseNarrationInputSchema,
    outputSchema: NightPhaseNarrationOutputSchema,
  },
  async input => {
    const {text} = await nightPhaseNarrationPrompt(input || {});
    return text!;
  }
);

export async function generateNightPhaseNarration(
  input?: NightPhaseNarrationInput
): Promise<NightPhaseNarrationOutput> {
  return nightPhaseNarrationFlow(input);
}
