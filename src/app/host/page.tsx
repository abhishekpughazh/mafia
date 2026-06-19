"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMultiplayerGame } from '@/hooks/use-multiplayer-game';
import { useNarration } from '@/hooks/use-narration';
import { useAlarm } from '@/hooks/use-alarm';
import { PhaseWrapper } from '@/components/game/PhaseWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Moon, Tv, Users, Eye, Skull, Gavel, Volume2, VolumeX, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleType, NightStep, GamePhase } from '@/lib/types';
import { getLocalIp } from '@/app/actions';

const DISCUSSION_SECONDS = 120; // 2 minutes

export default function HostView() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string>('Loading IP...');
  const [votingSelectedId, setVotingSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [discussionSecondsLeft, setDiscussionSecondsLeft] = useState(DISCUSSION_SECONDS);
  const [discussionAlarmFired, setDiscussionAlarmFired] = useState(false);

  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevNarrationRef = useRef<string>('');
  const discussionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nightStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { speak, stop: stopSpeech } = useNarration();
  const { playAlarm, playChime, playElimination } = useAlarm();

  const narrate = useCallback((text: string, options?: Parameters<typeof speak>[1]) => {
    if (!muted) speak(text, options);
  }, [muted, speak]);

  const { 
    state, loading, initRoom, setPhase, assignRoles, startNight, 
    setNightActionStep, startNightActions, resolveNight, eliminatePlayer, cleanup 
  } = useMultiplayerGame(roomId, true);

  // Init room + local IP
  useEffect(() => {
    const setup = async () => {
      const newRoomId = await initRoom();
      setRoomId(newRoomId);
      const ip = await getLocalIp();
      const port = window.location.port ? `:${window.location.port}` : '';
      setLocalUrl(`${ip}${port}`);
    };
    setup();
    return () => { cleanup(); };
  }, []);

  // ── Narration trigger on phase / narrationText changes ──────────────────────
  useEffect(() => {
    if (!state) return;
    const phase = state.currentPhase;
    const prevPhase = prevPhaseRef.current;
    const prevNarration = prevNarrationRef.current;

    // Phase changed
    if (phase !== prevPhase) {
      prevPhaseRef.current = phase;

      if (phase === 'REVEAL') {
        narrate("Roles have been assigned. Check your phone to see your role. Keep it secret.", { rate: 0.90 });
        playChime();
      }

      if (phase === 'NIGHT_START') {
        // narrationText will arrive shortly via Firebase; let the narrationText watcher handle it
      }

      if (phase === 'NIGHT_ACTIONS') {
        // Per-step narration is handled by the nightActionStep useEffect below
      }

      if (phase === 'DAY_ANNOUNCE') {
        // narrationText will arrive via Firebase; let the narrationText watcher handle it
        playChime();
      }

      if (phase === 'DISCUSSION') {
        narrate(`Day ${state.dayNumber}. Discuss and find the Mafia. You have two minutes.`, { rate: 0.90 });
        // Start 2-minute countdown
        setDiscussionSecondsLeft(DISCUSSION_SECONDS);
        setDiscussionAlarmFired(false);
      }

      if (phase === 'VOTING') {
        narrate("Time to vote. Who is the Mafia?", { rate: 0.90 });
        stopDiscussionTimer();
      }

      if (phase === 'GAME_OVER') {
        const winner = state.winner;
        if (winner === 'Mafia') {
          narrate("Mafia wins. Game over.", { rate: 0.90 });
          playElimination();
        } else {
          narrate("Town wins. All Mafia have been eliminated.", { rate: 0.90 });
          playChime();
        }
      }
    }

    // narrationText changed (NIGHT_START or DAY_ANNOUNCE)
    if (state.narrationText && state.narrationText !== prevNarration) {
      prevNarrationRef.current = state.narrationText;
      narrate(state.narrationText, { rate: 0.80, pitch: 0.85 });
    }

  }, [state?.currentPhase, state?.narrationText]);

  // ── Auto-resolve night when all players have acted ─────────────────────────
  useEffect(() => {
    if (state?.currentPhase === 'NIGHT_ACTIONS' && state?.nightActionStep === 'DONE') {
      resolveNight();
    }
  }, [state?.nightActionStep, state?.currentPhase]);

  // ── Night step advance helper ───────────────────────────────────────────────
  const advanceNightStep = useCallback(() => {
    if (!state) return;
    const NIGHT_ORDER: NightStep[] = ['Mason', 'Mafia', 'Bodyguard', 'Doctor', 'Vigilante', 'Detective'];
    const activeRoles = NIGHT_ORDER.filter(step =>
      step === 'Mafia'
        ? state.players.some(p => (p.role === 'Mafia' || p.role === 'Godfather') && p.isAlive)
        : state.players.some(p => p.role === step && p.isAlive)
    );
    const idx = activeRoles.indexOf(state.nightActionStep as NightStep);
    if (idx >= 0 && idx < activeRoles.length - 1) {
      setNightActionStep(activeRoles[idx + 1]);
    } else {
      setNightActionStep('DONE');
    }
  }, [state, setNightActionStep]);

  // ── Per-step narration + 15-second auto-advance during night actions ────────
  useEffect(() => {
    if (nightStepTimerRef.current) {
      clearTimeout(nightStepTimerRef.current);
      nightStepTimerRef.current = null;
    }

    if (state?.currentPhase !== 'NIGHT_ACTIONS') return;
    if (!state?.nightActionStep || state.nightActionStep === 'DONE') return;

    const COUNTDOWN = 'Ten. Nine. Eight. Seven. Six. Five. Four. Three. Two. One.';
    const STEP_LINES: Partial<Record<NightStep, string>> = {
      Mason:     `Masons, open your eyes. ${COUNTDOWN} Close your eyes.`,
      Mafia:     `Mafia, open your eyes. ${COUNTDOWN} Close your eyes.`,
      Bodyguard: `Bodyguard, open your eyes. ${COUNTDOWN} Close your eyes.`,
      Doctor:    `Doctor, open your eyes. ${COUNTDOWN} Close your eyes.`,
      Vigilante: `Vigilante, open your eyes. ${COUNTDOWN} Close your eyes.`,
      Detective: `Detective, open your eyes. ${COUNTDOWN} Close your eyes.`,
    };

    const line = STEP_LINES[state.nightActionStep];
    if (line) narrate(line, { rate: 0.82, pitch: 0.88 });

    nightStepTimerRef.current = setTimeout(() => {
      advanceNightStep();
    }, 15000);

    return () => {
      if (nightStepTimerRef.current) {
        clearTimeout(nightStepTimerRef.current);
        nightStepTimerRef.current = null;
      }
    };
  }, [state?.nightActionStep, state?.currentPhase]);

  // ── Discussion countdown timer ──────────────────────────────────────────────
  const stopDiscussionTimer = () => {
    if (discussionTimerRef.current) {
      clearInterval(discussionTimerRef.current);
      discussionTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (state?.currentPhase === 'DISCUSSION') {
      stopDiscussionTimer();
      discussionTimerRef.current = setInterval(() => {
        setDiscussionSecondsLeft(prev => {
          if (prev <= 1) {
            stopDiscussionTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopDiscussionTimer();
    }
    return () => stopDiscussionTimer();
  }, [state?.currentPhase]);

  // Alarm when timer hits 0
  useEffect(() => {
    if (discussionSecondsLeft === 0 && !discussionAlarmFired && state?.currentPhase === 'DISCUSSION') {
      setDiscussionAlarmFired(true);
      playAlarm();
      narrate("Time is up. Vote now.", { rate: 0.90 });
    }
  }, [discussionSecondsLeft]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const MuteButton = () => (
    <button
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-secondary/60 border border-white/10 hover:bg-secondary text-muted-foreground hover:text-white transition-all"
      onClick={() => { setMuted(m => !m); if (!muted) stopSpeech(); }}
      title={muted ? "Unmute narration" : "Mute narration"}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181A]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Tv className="w-12 h-12 text-primary" />
          <p className="text-xl font-headline italic text-white">Initializing TV...</p>
        </div>
      </div>
    );
  }

  // PLAYERS Phase (Waiting Room)
  if (state.currentPhase === 'PLAYERS') {
    return (
      <div className="flex flex-col min-h-screen p-8 bg-[#16181A] text-center">
        <MuteButton />
        <div className="space-y-4 pt-12 animate-in slide-in-from-top-10 duration-700">
          <h1 className="text-4xl font-headline italic text-muted-foreground">Join the Game</h1>
          <div className="inline-block bg-primary/20 border-2 border-primary rounded-xl px-12 py-6">
            <p className="text-sm uppercase tracking-widest text-primary mb-2">Room Code</p>
            <p className="text-8xl font-black tracking-widest text-white">{roomId}</p>
          </div>
          <p className="text-xl text-muted-foreground mt-4">Go to <span className="text-white font-bold">{localUrl}</span> on your phone</p>
        </div>

        <div className="flex-1 mt-12 overflow-auto max-h-[40svh] w-full max-w-2xl mx-auto">
          <p className="text-sm uppercase text-muted-foreground mb-4">{state.players.length} Players Joined</p>
          <div className="flex flex-wrap justify-center gap-4">
            {state.players.map(p => (
              <div key={p.id} className="bg-secondary/40 px-6 py-3 rounded-full border border-white/10 text-xl font-bold animate-in zoom-in">
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-4 max-w-md mx-auto w-full">
          <p className="text-xs text-muted-foreground">
            {state.players.length < 5 ? `Need ${5 - state.players.length} more players` : "Ready to start"}
          </p>
          <Button
            size="lg"
            className="w-full h-20 text-2xl"
            disabled={state.players.length < 5}
            onClick={() => {
              const pCount = state.players.length;
              const mafiaCount = pCount >= 10 ? 3 : pCount >= 6 ? 2 : 1;
              const docCount = 1;
              const detCount = 1;
              const villagerCount = Math.max(0, pCount - mafiaCount - docCount - detCount);
              assignRoles({
                Mafia: mafiaCount, Godfather: 0, Doctor: docCount, Detective: detCount,
                Vigilante: 0, Bodyguard: 0, Mason: 0, Villager: villagerCount
              });
            }}
          >
            Start Game
          </Button>
        </div>
      </div>
    );
  }

  // REVEAL Phase
  if (state.currentPhase === 'REVEAL') {
    return (
      <PhaseWrapper title="Check Your Phones" subtitle="Secret Roles Distributed">
        <MuteButton />
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <Users className="w-32 h-32 text-primary opacity-50" />
          <p className="text-2xl text-muted-foreground text-center max-w-lg">
            Look at your phone to see your secret identity. Keep it hidden from others!
          </p>
        </div>
        <Button size="lg" className="h-20 text-2xl w-full max-w-md mx-auto" onClick={() => startNight()}>
          Everyone is ready
        </Button>
      </PhaseWrapper>
    );
  }

  // NIGHT_START
  if (state.currentPhase === 'NIGHT_START') {
    return (
      <div className="flex flex-col min-h-screen bg-black text-center p-8 space-y-12 items-center justify-center">
        <MuteButton />
        <div className="space-y-6 max-w-2xl">
          <Moon className="w-32 h-32 text-primary mx-auto opacity-80 animate-pulse" />
          <h2 className="text-7xl font-headline italic">Night Falls</h2>
          <p className="text-3xl text-muted-foreground leading-relaxed mt-8">
            {state.narrationText || "The shadows lengthen. Everyone, close your eyes."}
          </p>
        </div>
        <Button
          size="lg"
          className="w-full max-w-md h-20 text-2xl mt-12"
          onClick={() => {
            const NIGHT_ORDER: NightStep[] = ['Mason', 'Mafia', 'Bodyguard', 'Doctor', 'Vigilante', 'Detective'];
            const activeNightRoles = NIGHT_ORDER.filter(step =>
              step === 'Mafia'
                ? state.players.some(p => (p.role === 'Mafia' || p.role === 'Godfather') && p.isAlive)
                : state.players.some(p => p.role === step && p.isAlive)
            );
            if (activeNightRoles.length > 0) {
              startNightActions(activeNightRoles[0]);
            } else {
              resolveNight();
            }
          }}
        >
          Begin Night Actions
        </Button>
      </div>
    );
  }

  // NIGHT_ACTIONS
  if (state.currentPhase === 'NIGHT_ACTIONS') {
    return (
      <div className="flex flex-col min-h-screen bg-black text-center p-8 space-y-12 items-center justify-center">
        <MuteButton />
        <Moon className="w-24 h-24 text-muted-foreground mx-auto animate-pulse" />
        <h2 className="text-5xl font-headline italic text-muted-foreground">Night Actions in Progress</h2>
        <p className="text-xl text-muted-foreground/50">Check your phones if it is your turn to wake up.</p>
        <Button size="lg" variant="outline" className="mt-12 h-16" onClick={() => resolveNight()}>
          End Night
        </Button>
      </div>
    );
  }

  // DAY_ANNOUNCE
  if (state.currentPhase === 'DAY_ANNOUNCE') {
    return (
      <PhaseWrapper title="Dawn Breaks" subtitle={`Day ${state.dayNumber}`}>
        <MuteButton />
        <Card className="bg-secondary/10 border-primary/20 p-12 space-y-8 text-center cinematic-glow max-w-3xl mx-auto w-full">
          <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto">
            <Eye className="w-20 h-20 text-primary" />
          </div>
          <p className="text-3xl leading-relaxed italic text-white">
            {state.narrationText}
          </p>
        </Card>
        <div className="mt-auto space-y-8 max-w-2xl mx-auto w-full">
          <div className="flex justify-around items-center px-4">
            <div className="text-center">
              <p className="text-6xl font-bold text-primary">{state.players.filter(p => p.isAlive).length}</p>
              <p className="text-sm uppercase text-muted-foreground mt-2">Alive</p>
            </div>
            <div className="text-center">
              <p className="text-6xl font-bold text-destructive">{state.players.filter(p => !p.isAlive).length}</p>
              <p className="text-sm uppercase text-muted-foreground mt-2">Dead</p>
            </div>
          </div>
          <Button size="lg" className="w-full h-20 text-2xl" onClick={() => setPhase('DISCUSSION')}>
            Start Discussion
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  // DISCUSSION
  if (state.currentPhase === 'DISCUSSION') {
    const pct = (discussionSecondsLeft / DISCUSSION_SECONDS) * 100;
    const isUrgent = discussionSecondsLeft <= 30;
    const isExpired = discussionSecondsLeft === 0;

    return (
      <PhaseWrapper title="Town Assembly" subtitle={`Day ${state.dayNumber}`}>
        <MuteButton />

        {/* Big countdown timer */}
        <div className={cn(
          "flex flex-col items-center justify-center gap-4 py-6",
        )}>
          <div className={cn(
            "relative flex items-center justify-center w-48 h-48 rounded-full border-8 transition-colors duration-500",
            isExpired ? "border-destructive bg-destructive/10 animate-pulse" :
            isUrgent  ? "border-orange-500 bg-orange-500/10" :
                        "border-primary/40 bg-primary/5"
          )}>
            <Timer className={cn(
              "absolute top-4 w-6 h-6",
              isExpired ? "text-destructive" : isUrgent ? "text-orange-400" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-6xl font-black tabular-nums",
              isExpired ? "text-destructive" : isUrgent ? "text-orange-400" : "text-white"
            )}>
              {formatTime(discussionSecondsLeft)}
            </span>
          </div>
          {isExpired && (
            <p className="text-destructive font-bold text-xl animate-pulse">Time's up — Vote now!</p>
          )}
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <Label className="text-sm uppercase text-primary mb-4 block text-center">Remaining Souls</Label>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {state.players.map(p => (
              <span key={p.id} className={cn(
                "px-4 py-2 rounded-full border",
                p.isAlive ? "bg-secondary border-white/20" : "bg-black border-destructive/30 text-destructive line-through opacity-50"
              )}>
                {p.name}
              </span>
            ))}
          </div>

          <Button size="lg" className="w-full h-20 text-2xl gap-3" onClick={() => setPhase('VOTING')}>
            <Gavel className="w-8 h-8" />
            Begin Voting
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  // VOTING
  if (state.currentPhase === 'VOTING') {
    const selectedPlayer = state.players.find(p => p.id === votingSelectedId);
    const alivePlayers = state.players.filter(p => p.isAlive);

    return (
      <PhaseWrapper title="Town Vote" subtitle="Majority Rules">
        <MuteButton />
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 flex-1">
          <div className="text-center space-y-2">
            <Gavel className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-4xl font-bold">Cast your votes out loud</h2>
            <p className="text-muted-foreground">Debate who to eliminate, then the Host selects the player below.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            {alivePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setVotingSelectedId(prev => prev === p.id ? null : p.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all text-center cursor-pointer",
                  votingSelectedId === p.id
                    ? "border-destructive bg-destructive/10 scale-105 shadow-lg shadow-destructive/20"
                    : "border-white/10 bg-secondary/20 hover:border-white/30 hover:bg-secondary/40"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold",
                  votingSelectedId === p.id ? "bg-destructive/30 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl font-bold">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3 pb-4">
            {selectedPlayer ? (
              <Button
                size="lg"
                className="w-full h-20 text-2xl bg-destructive hover:bg-destructive/80 text-white gap-3"
                onClick={() => {
                  eliminatePlayer(selectedPlayer.id);
                  playElimination();
                  narrate(`${selectedPlayer.name} has been eliminated.`, { rate: 0.90 });
                  setVotingSelectedId(null);
                }}
              >
                <Skull className="w-7 h-7" />
                Eliminate {selectedPlayer.name}
              </Button>
            ) : (
              <Button size="lg" variant="outline" className="w-full h-20 text-2xl" disabled>
                Select a player to eliminate
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              className="w-full h-12 text-muted-foreground"
              onClick={() => {
                setVotingSelectedId(null);
                setPhase('DISCUSSION');
              }}
            >
              Cancel — Back to Discussion
            </Button>
          </div>
        </div>
      </PhaseWrapper>
    );
  }

  // GAME_OVER
  if (state.currentPhase === 'GAME_OVER') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-8 bg-[#16181A] text-center space-y-10">
        <MuteButton />
        <div className={cn("p-8 rounded-full", state.winner === 'Mafia' ? "bg-destructive/10" : "bg-primary/10")}>
          {state.winner === 'Mafia'
            ? <Skull className="w-32 h-32 text-destructive" />
            : <Users className="w-32 h-32 text-primary" />
          }
        </div>
        <div className="space-y-4">
          <h1 className={cn("text-8xl font-headline italic", state.winner === 'Mafia' ? "text-destructive" : "text-primary")}>
            {state.winner} Wins!
          </h1>
          <p className="text-2xl text-muted-foreground">
            {state.winner === 'Mafia'
              ? "The Mafia has seized control of the town."
              : "The town has rooted out all evil. Justice prevails!"}
          </p>
        </div>
        <div className="w-full max-w-lg space-y-3">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Final Roles Revealed</p>
          <div className="grid grid-cols-2 gap-3">
            {state.players.map(p => (
              <div key={p.id} className={cn(
                "flex items-center justify-between p-4 rounded-xl border",
                p.team === 'Mafia' ? "border-destructive/30 bg-destructive/5" : "border-white/10 bg-secondary/20"
              )}>
                <span className={cn("font-bold", !p.isAlive && "line-through text-muted-foreground")}>{p.name}</span>
                <span className={cn("text-xs font-bold uppercase tracking-wider", p.team === 'Mafia' ? "text-destructive" : "text-primary")}>{p.role}</span>
              </div>
            ))}
          </div>
          <Button size="lg" className="w-full h-16 text-xl mt-6" onClick={() => window.location.href = '/host'}>
            Play Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen text-2xl">
      Phase: {state.currentPhase}
    </div>
  );
}
