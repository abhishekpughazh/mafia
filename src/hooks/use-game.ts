import { useState, useCallback } from 'react';
import { Player, GameState, GamePhase, RoleType } from '@/lib/types';
import { generateNightPhaseNarration } from '@/ai/flows/night-phase-narration';
import { dayPhaseAndEliminationAnnouncement } from '@/ai/flows/day-phase-elimination-announcement';

const INITIAL_STATE: GameState = {
  players: [],
  dayNumber: 0,
  currentPhase: 'HOME',
  revealingPlayerIndex: 0,
  activeNightRoleIndex: 0,
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

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const setPhase = useCallback((phase: GamePhase) => {
    setState((prev) => ({ ...prev, currentPhase: phase }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    setState((prev) => {
      // Prevent duplicate names (case-insensitive)
      if (prev.players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        players: [
          ...prev.players,
          {
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            name: name.trim(),
            isAlive: true,
            team: 'Town', // Default
          },
        ],
      };
    });
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
        team: (roles[i] === 'Mafia' || roles[i] === 'Godfather') ? 'Mafia' : 'Town',
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
      bodyguardProtectedPlayerId: null,
      vigilanteKilledPlayerId: null,
      detectiveInvestigatedPlayerId: null,
      detectiveResult: null,
    }));
  }, [state.dayNumber]);

  const recordNightAction = useCallback((role: RoleType, targetId: string) => {
    setState(prev => {
      const newState = { ...prev };
      if (role === 'Mafia' || role === 'Godfather') newState.nightKilledPlayerId = targetId;
      if (role === 'Doctor') newState.doctorProtectedPlayerId = targetId;
      if (role === 'Bodyguard') newState.bodyguardProtectedPlayerId = targetId;
      if (role === 'Vigilante') newState.vigilanteKilledPlayerId = targetId;
      if (role === 'Detective') {
        const target = prev.players.find(p => p.id === targetId);
        newState.detectiveInvestigatedPlayerId = targetId;
        // Godfather appears innocent to Detective
        if (target?.role === 'Godfather') {
          newState.detectiveResult = 'Not Suspicious';
        } else {
          newState.detectiveResult = target?.team === 'Mafia' ? 'Suspicious' : 'Not Suspicious';
        }
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
    let killedNames: string[] = [];
    let reasons: string[] = [];
    
    setState(prev => {
      let updatedPlayers = [...prev.players];
      const newlyDeadIds = new Set<string>();

      // Resolve Mafia attack
      let mafiaAttackTarget = prev.nightKilledPlayerId;
      if (mafiaAttackTarget) {
        if (mafiaAttackTarget === prev.doctorProtectedPlayerId) {
          // Doctor saved them
          mafiaAttackTarget = null;
        } else if (mafiaAttackTarget === prev.bodyguardProtectedPlayerId) {
          // Bodyguard saves them, but Bodyguard dies, and a random Mafia dies
          mafiaAttackTarget = null;
          
          const bodyguard = updatedPlayers.find(p => p.role === 'Bodyguard' && p.isAlive);
          if (bodyguard) {
            newlyDeadIds.add(bodyguard.id);
            killedNames.push(bodyguard.name);
            reasons.push('died protecting someone as the Bodyguard');
          }

          const aliveMafia = updatedPlayers.filter(p => p.team === 'Mafia' && p.isAlive);
          if (aliveMafia.length > 0) {
            // Kill random mafia
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

      // Resolve Vigilante attack
      let vigAttackTarget = prev.vigilanteKilledPlayerId;
      if (vigAttackTarget) {
        if (vigAttackTarget === prev.doctorProtectedPlayerId || vigAttackTarget === prev.bodyguardProtectedPlayerId) {
          // Protected
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

      const winner = checkWinCondition(updatedPlayers);

      // We'll generate narration next, outside setState
      // Since we need to use async, we'll return state here and rely on the effect below, 
      // but to keep it simple we just do it in the closure.
      setTimeout(async () => {
        if (!winner) {
          const aliveCount = updatedPlayers.filter(p => p.isAlive).length;
          const text = await dayPhaseAndEliminationAnnouncement({
            eliminatedPlayerName: killedNames.length > 0 ? killedNames.join(' and ') : null,
            reason: reasons.length > 0 ? reasons.join(' and ') : null,
            alivePlayersCount: aliveCount,
            dayNumber: prev.dayNumber
          });
          setState(s => ({ ...s, narrationText: text }));
        }
      }, 0);

      return {
        ...prev,
        players: updatedPlayers,
        winner,
        currentPhase: winner ? 'GAME_OVER' : 'DAY_ANNOUNCE'
      };
    });
  }, []);

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