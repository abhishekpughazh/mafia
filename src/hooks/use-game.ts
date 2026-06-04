import { useState, useCallback } from 'react';
import { Player, GameState, GamePhase, RoleType } from '@/lib/types';
import { generateNightPhaseNarration } from '@/ai/flows/night-phase-narration';
import { dayPhaseAndEliminationAnnouncement } from '@/ai/flows/day-phase-elimination-announcement';
import { generateGameOutcomeSummary } from '@/ai/flows/game-outcome-summary-narration';

const INITIAL_STATE: GameState = {
  players: [],
  dayNumber: 0,
  currentPhase: 'HOME',
  revealingPlayerIndex: 0,
  activeNightRoleIndex: 0,
  nightKilledPlayerId: null,
  doctorProtectedPlayerId: null,
  detectiveInvestigatedPlayerId: null,
  detectiveResult: null,
  lastEliminatedPlayer: null,
  winner: null,
  narrationText: '',
};

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const setPhase = useCallback((phase: GamePhase) => {
    setState((prev) => ({ ...prev, currentPhase: phase }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      players: [
        ...prev.players,
        {
          id: crypto.randomUUID(),
          name,
          isAlive: true,
          team: 'Town', // Default
        },
      ],
    }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }));
  }, []);

  const assignRoles = useCallback((roleConfig: Record<RoleType, number>) => {
    setState((prev) => {
      const playerList = [...prev.players];
      const roles: RoleType[] = [];
      
      Object.entries(roleConfig).forEach(([role, count]) => {
        for (let i = 0; i < count; i++) {
          roles.push(role as RoleType);
        }
      });

      // Shuffle roles
      for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
      }

      const updatedPlayers = playerList.map((p, i) => ({
        ...p,
        role: roles[i],
        team: roles[i] === 'Mafia' ? 'Mafia' : 'Town',
      }));

      return {
        ...prev,
        players: updatedPlayers,
        currentPhase: 'REVEAL',
        revealingPlayerIndex: 0,
      };
    });
  }, []);

  const nextReveal = useCallback(() => {
    setState((prev) => {
      if (prev.revealingPlayerIndex < prev.players.length - 1) {
        return { ...prev, revealingPlayerIndex: prev.revealingPlayerIndex + 1 };
      } else {
        return { ...prev, currentPhase: 'NIGHT_START', dayNumber: 1 };
      }
    });
  }, []);

  const startNight = useCallback(async () => {
    const text = await generateNightPhaseNarration({ currentDay: state.dayNumber });
    setState(prev => ({
      ...prev,
      narrationText: text,
      currentPhase: 'NIGHT_START',
      nightKilledPlayerId: null,
      doctorProtectedPlayerId: null,
      detectiveInvestigatedPlayerId: null,
      detectiveResult: null,
    }));
  }, [state.dayNumber]);

  const recordNightAction = useCallback((role: RoleType, targetId: string) => {
    setState(prev => {
      const newState = { ...prev };
      if (role === 'Mafia') newState.nightKilledPlayerId = targetId;
      if (role === 'Doctor') newState.doctorProtectedPlayerId = targetId;
      if (role === 'Detective') {
        const target = prev.players.find(p => p.id === targetId);
        newState.detectiveInvestigatedPlayerId = targetId;
        newState.detectiveResult = target?.role === 'Mafia' ? 'Suspicious' : 'Not Suspicious';
      }
      return newState;
    });
  }, []);

  const checkWinCondition = (players: Player[]) => {
    const alivePlayers = players.filter(p => p.isAlive);
    const mafiaCount = alivePlayers.filter(p => p.team === 'Mafia').length;
    const townCount = alivePlayers.length - mafiaCount;

    if (mafiaCount === 0) return 'Town';
    if (mafiaCount >= townCount) return 'Mafia';
    return null;
  };

  const resolveNight = useCallback(async () => {
    let killedName: string | null = null;
    let reason: string | null = null;
    
    setState(prev => {
      const actualKilledId = prev.nightKilledPlayerId === prev.doctorProtectedPlayerId ? null : prev.nightKilledPlayerId;
      const updatedPlayers = prev.players.map(p => 
        p.id === actualKilledId ? { ...p, isAlive: false } : p
      );
      
      const killedPlayer = prev.players.find(p => p.id === actualKilledId);
      killedName = killedPlayer?.name || null;
      reason = killedPlayer ? 'attacked by the Mafia' : null;

      const winner = checkWinCondition(updatedPlayers);

      return {
        ...prev,
        players: updatedPlayers,
        winner,
        currentPhase: winner ? 'GAME_OVER' : 'DAY_ANNOUNCE'
      };
    });

    if (!state.winner) {
      const aliveCount = state.players.filter(p => p.isAlive).length;
      const text = await dayPhaseAndEliminationAnnouncement({
        eliminatedPlayerName: killedName,
        reason: reason,
        alivePlayersCount: aliveCount,
        dayNumber: state.dayNumber
      });
      setState(prev => ({ ...prev, narrationText: text }));
    }
  }, [state]);

  const eliminatePlayer = useCallback((id: string) => {
    setState(prev => {
      const updatedPlayers = prev.players.map(p => 
        p.id === id ? { ...p, isAlive: false } : p
      );
      const eliminated = prev.players.find(p => p.id === id) || null;
      const winner = checkWinCondition(updatedPlayers);

      return {
        ...prev,
        players: updatedPlayers,
        lastEliminatedPlayer: eliminated,
        winner,
        currentPhase: winner ? 'GAME_OVER' : 'NIGHT_START',
        dayNumber: winner ? prev.dayNumber : prev.dayNumber + 1
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    setPhase,
    addPlayer,
    removePlayer,
    assignRoles,
    nextReveal,
    startNight,
    recordNightAction,
    resolveNight,
    eliminatePlayer,
    resetGame,
  };
}