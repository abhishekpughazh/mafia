export async function dayPhaseAndEliminationAnnouncement(input: {
  eliminatedPlayerName: string | null;
  reason: string | null;
  alivePlayersCount: number;
  dayNumber: number;
}): Promise<string> {
  const { eliminatedPlayerName, alivePlayersCount, dayNumber } = input;

  if (eliminatedPlayerName) {
    return `Everyone open your eyes. ${eliminatedPlayerName} was killed last night. ${alivePlayersCount} players remain.`;
  }

  return `Everyone open your eyes. Nobody was killed last night. ${alivePlayersCount} players remain.`;
}
