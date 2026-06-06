export async function dayPhaseAndEliminationAnnouncement(input: {
  eliminatedPlayerName: string | null;
  reason: string | null;
  alivePlayersCount: number;
  dayNumber: number;
}): Promise<string> {
  const { eliminatedPlayerName, alivePlayersCount, dayNumber } = input;

  if (eliminatedPlayerName) {
    return `As dawn breaks on Day ${dayNumber}, the town discovers that ${eliminatedPlayerName} was taken in the night. ${alivePlayersCount} souls remain. Gather your courage and find the truth.`;
  }

  return `Day ${dayNumber} begins with a strange peace — the doctor's intervention saved a life last night. ${alivePlayersCount} players remain. The Mafia is still among you.`;
}
