const NIGHT_NARRATIONS = [
  "The shadows lengthen, and secrets stir in the quiet corners. Everyone, close your eyes.",
  "Darkness descends upon the town once more. All eyes shut as the night claims its own.",
  "Another restless night falls. The wind whispers through empty streets. Close your eyes.",
  "The moon hides behind clouds. Evil stirs while the town sleeps. Everyone, close your eyes.",
  "Night falls again, heavy with dread. Trust no one. Everyone, close your eyes.",
];

export async function generateNightPhaseNarration(
  input: { currentDay: number }
): Promise<string> {
  const index = Math.max(0, input.currentDay) % NIGHT_NARRATIONS.length;
  return NIGHT_NARRATIONS[index];
}
