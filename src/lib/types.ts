export type RoleType = 'Mafia' | 'Doctor' | 'Detective' | 'Villager';

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
  | 'SETUP' 
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
  nightKilledPlayerId: string | null;
  doctorProtectedPlayerId: string | null;
  detectiveInvestigatedPlayerId: string | null;
  detectiveResult: 'Suspicious' | 'Not Suspicious' | null;
  lastEliminatedPlayer: Player | null;
  winner: 'Mafia' | 'Town' | null;
  narrationText: string;
}