import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, RoleType, GamePhase, NightStep } from '@/lib/types';
import { subscribeToRoom, updateRoomState, addPlayerToRoom, removePlayerFromRoom, createRoom, deleteRoom } from '@/lib/db';
import { generateNightPhaseNarration } from '@/ai/flows/night-phase-narration';
import { dayPhaseAndEliminationAnnouncement } from '@/ai/flows/day-phase-elimination-announcement';

const INITIAL_STATE: GameState = {
  players: [],
  dayNumber: 0,
  currentPhase: 'PLAYERS',
  revealingPlayerIndex: 0,
  activeNightRoleIndex: 0,
  nightActionStep: null,
  nightKilledPlayerId: null,
  doctorProtectedPlayerId: null,
  bodyguardProtectedPlayerId: null,
  vigilanteKilledPlayerId: null,
  detectiveInvestigatedPlayerId: null,
  detectiveResult: null,
  lastEliminatedPlayer: null,
  winner: null,
  narrationText: '',
};

export function useMultiplayerGame(roomId: string | null, isHost: boolean = false) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to room
  useEffect(() => {
    if (!roomId) return;
    
    setLoading(true);
    const unsubscribe = subscribeToRoom(roomId, (newState) => {
      setState(newState);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  const initRoom = useCallback(async () => {
    return await createRoom(INITIAL_STATE);
  }, []);

  const setPhase = useCallback(async (phase: GamePhase) => {
    if (!roomId) return;
    await updateRoomState(roomId, { currentPhase: phase });
  }, [roomId]);

  const addPlayer = useCallback(async (name: string) => {
    if (!roomId) return;
    const player: Player = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      name: name.trim(),
      isAlive: true,
      team: 'Town'
    };
    await addPlayerToRoom(roomId, player);
    return player; // Return for local storage
  }, [roomId]);

  const removePlayer = useCallback(async (id: string) => {
    if (!roomId) return;
    await removePlayerFromRoom(roomId, id);
  }, [roomId]);

  const assignRoles = useCallback(async (roleConfig: Record<RoleType, number>) => {
    if (!roomId || !state) return;
    
    const playerList = [...(state.players || [])];
    const roles: RoleType[] = [];
    
    Object.entries(roleConfig).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        roles.push(role as RoleType);
      }
    });

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const updatedPlayers = playerList.map((p, i) => ({
      ...p,
      role: roles[i],
      team: (roles[i] === 'Mafia' || roles[i] === 'Godfather') ? 'Mafia' : 'Town',
    }));

    await updateRoomState(roomId, {
      players: updatedPlayers,
      currentPhase: 'REVEAL',
    });
  }, [roomId, state]);

  // Rest of the game logic adapted for Firebase
  const startNight = useCallback(async () => {
    if (!roomId || !state) return;
    // Host generates narration
    if (isHost) {
      const text = await generateNightPhaseNarration({ currentDay: state.dayNumber });
      await updateRoomState(roomId, {
        narrationText: text,
        currentPhase: 'NIGHT_START',
        nightKilledPlayerId: null,
        doctorProtectedPlayerId: null,
        bodyguardProtectedPlayerId: null,
        vigilanteKilledPlayerId: null,
        detectiveInvestigatedPlayerId: null,
        detectiveResult: null,
      });
    }
  }, [roomId, state, isHost]);

  const recordNightAction = useCallback(async (role: RoleType, targetId: string) => {
    if (!roomId || !state) return;
    
    const partial: Partial<GameState> = {};
    if (role === 'Mafia' || role === 'Godfather') partial.nightKilledPlayerId = targetId;
    if (role === 'Doctor') partial.doctorProtectedPlayerId = targetId;
    if (role === 'Bodyguard') partial.bodyguardProtectedPlayerId = targetId;
    if (role === 'Vigilante') partial.vigilanteKilledPlayerId = targetId;
    if (role === 'Detective') {
      const target = state.players.find(p => p.id === targetId);
      partial.detectiveInvestigatedPlayerId = targetId;
      if (target?.role === 'Godfather') {
        partial.detectiveResult = 'Not Suspicious';
      } else {
        partial.detectiveResult = target?.team === 'Mafia' ? 'Suspicious' : 'Not Suspicious';
      }
    }
    
    await updateRoomState(roomId, partial);
  }, [roomId, state]);

  const resolveNight = useCallback(async () => {
    if (!roomId || !state || !isHost) return;
    
    let killedNames: string[] = [];
    let reasons: string[] = [];
    let updatedPlayers = [...(state.players || [])];
    const newlyDeadIds = new Set<string>();

    let mafiaAttackTarget = state.nightKilledPlayerId;
    if (mafiaAttackTarget) {
      if (mafiaAttackTarget === state.doctorProtectedPlayerId) {
        mafiaAttackTarget = null;
      } else if (mafiaAttackTarget === state.bodyguardProtectedPlayerId) {
        mafiaAttackTarget = null;
        const bodyguard = updatedPlayers.find(p => p.role === 'Bodyguard' && p.isAlive);
        if (bodyguard) {
          newlyDeadIds.add(bodyguard.id);
          killedNames.push(bodyguard.name);
          reasons.push('died protecting someone as the Bodyguard');
        }

        const aliveMafia = updatedPlayers.filter(p => p.team === 'Mafia' && p.isAlive);
        if (aliveMafia.length > 0) {
          const mafiaToKill = aliveMafia[Math.floor(Math.random() * aliveMafia.length)];
          newlyDeadIds.add(mafiaToKill.id);
          killedNames.push(mafiaToKill.name);
          reasons.push('was killed by the Bodyguard');
        }
      }
    }

    if (mafiaAttackTarget) {
      newlyDeadIds.add(mafiaAttackTarget);
      const p = updatedPlayers.find(x => x.id === mafiaAttackTarget);
      if (p) {
        killedNames.push(p.name);
        reasons.push('was attacked by the Mafia');
      }
    }

    let vigAttackTarget = state.vigilanteKilledPlayerId;
    if (vigAttackTarget) {
      if (vigAttackTarget === state.doctorProtectedPlayerId || vigAttackTarget === state.bodyguardProtectedPlayerId) {
        vigAttackTarget = null;
      }
    }

    if (vigAttackTarget && !newlyDeadIds.has(vigAttackTarget)) {
      newlyDeadIds.add(vigAttackTarget);
      const p = updatedPlayers.find(x => x.id === vigAttackTarget);
      if (p) {
        killedNames.push(p.name);
        reasons.push('was shot by the Vigilante');
      }
    }

    updatedPlayers = updatedPlayers.map(p => 
      newlyDeadIds.has(p.id) ? { ...p, isAlive: false } : p
    );

    const checkWinCondition = (players: Player[]) => {
      const alivePlayers = players.filter(p => p.isAlive);
      const mafiaCount = alivePlayers.filter(p => p.team === 'Mafia').length;
      const townCount = alivePlayers.length - mafiaCount;

      if (mafiaCount === 0) return 'Town';
      if (mafiaCount >= townCount) return 'Mafia';
      return null;
    };

    const winner = checkWinCondition(updatedPlayers);

    if (!winner) {
      const aliveCount = updatedPlayers.filter(p => p.isAlive).length;
      const text = await dayPhaseAndEliminationAnnouncement({
        eliminatedPlayerName: killedNames.length > 0 ? killedNames.join(' and ') : null,
        reason: reasons.length > 0 ? reasons.join(' and ') : null,
        alivePlayersCount: aliveCount,
        dayNumber: state.dayNumber
      });
      
      await updateRoomState(roomId, {
        players: updatedPlayers,
        winner,
        currentPhase: 'DAY_ANNOUNCE',
        narrationText: text
      });
    } else {
      await updateRoomState(roomId, {
        players: updatedPlayers,
        winner,
        currentPhase: 'GAME_OVER'
      });
    }
  }, [roomId, state, isHost]);

  const eliminatePlayer = useCallback(async (id: string) => {
    if (!roomId || !state) return;
    
    const updatedPlayers = (state.players || []).map(p => 
      p.id === id ? { ...p, isAlive: false } : p
    );
    const eliminated = updatedPlayers.find(p => p.id === id) || null;
    
    const alivePlayers = updatedPlayers.filter(p => p.isAlive);
    const mafiaCount = alivePlayers.filter(p => p.team === 'Mafia').length;
    const townCount = alivePlayers.length - mafiaCount;

    let winner: 'Town' | 'Mafia' | null = null;
    if (mafiaCount === 0) winner = 'Town';
    else if (mafiaCount >= townCount) winner = 'Mafia';

    if (winner) {
      await updateRoomState(roomId, {
        players: updatedPlayers,
        lastEliminatedPlayer: eliminated,
        winner,
        currentPhase: 'GAME_OVER',
      });
    } else {
      const nextDay = state.dayNumber + 1;
      // Host generates narration for the upcoming night
      const narrationText = isHost
        ? await generateNightPhaseNarration({ currentDay: nextDay })
        : state.narrationText;

      await updateRoomState(roomId, {
        players: updatedPlayers,
        lastEliminatedPlayer: eliminated,
        winner: null,
        currentPhase: 'NIGHT_START',
        dayNumber: nextDay,
        narrationText,
        // Reset all night action fields so the new night starts clean
        nightActionStep: null,
        nightKilledPlayerId: null,
        doctorProtectedPlayerId: null,
        bodyguardProtectedPlayerId: null,
        vigilanteKilledPlayerId: null,
        detectiveInvestigatedPlayerId: null,
        detectiveResult: null,
      });
    }
  }, [roomId, state, isHost]);

  const cleanup = useCallback(async () => {
    if (roomId && isHost) {
      await deleteRoom(roomId);
    }
  }, [roomId, isHost]);

  const setNightActionStep = useCallback(async (step: NightStep) => {
    if (!roomId) return;
    await updateRoomState(roomId, { nightActionStep: step });
  }, [roomId]);

  const startNightActions = useCallback(async (firstStep: NightStep) => {
    if (!roomId) return;
    await updateRoomState(roomId, { nightActionStep: firstStep, currentPhase: 'NIGHT_ACTIONS' });
  }, [roomId]);

  return {
    state,
    loading,
    initRoom,
    setPhase,
    addPlayer,
    removePlayer,
    assignRoles,
    startNight,
    setNightActionStep,
    startNightActions,
    recordNightAction,
    resolveNight,
    eliminatePlayer,
    cleanup
  };
}
