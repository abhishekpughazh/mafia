export type RoleType = 'Mafia' | 'Godfather' | 'Doctor' | 'Detective' | 'Vigilante' | 'Bodyguard' | 'Mason' | 'Villager';
export type NightStep = 'Mason' | 'Mafia' | 'Bodyguard' | 'Doctor' | 'Vigilante' | 'Detective' | 'DONE';

export interface Player {
  id: string;
  name: string;
  role?: RoleType;
  isAlive: boolean;
  team: 'Mafia' | 'Town';
  revealedRole?: boolean;
}

export type GamePhase = 
  | 'HOME' 
  | 'PLAYERS' 
  | 'ROLES' 
  | 'REVEAL' 
  | 'NIGHT_START' 
  | 'NIGHT_ACTIONS' 
  | 'DAY_ANNOUNCE' 
  | 'DISCUSSION' 
  | 'VOTING' 
  | 'ELIMINATION' 
  | 'GAME_OVER';

export interface GameState {
  players: Player[];
  dayNumber: number;
  currentPhase: GamePhase;
  revealingPlayerIndex: number;
  activeNightRoleIndex: number;
  nightActionStep: NightStep | null;
  nightKilledPlayerId: string | null;
  doctorProtectedPlayerId: string | null;
  bodyguardProtectedPlayerId: string | null;
  vigilanteKilledPlayerId: string | null;
  detectiveInvestigatedPlayerId: string | null;
  detectiveResult: 'Suspicious' | 'Not Suspicious' | null;
  lastEliminatedPlayer: Player | null;
  winner: 'Mafia' | 'Town' | null;
  narrationText: string;
}