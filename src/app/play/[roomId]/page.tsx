"use client"

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMultiplayerGame } from '@/hooks/use-multiplayer-game';
import { NightStep, RoleType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Eye, Shield, Skull, Search, User, Users, Crosshair, Lock } from 'lucide-react';
import { PlayerList } from '@/components/game/PlayerList';
import { cn } from '@/lib/utils';

function PlayerViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerId = searchParams.get('id');

  const { state, loading, recordNightAction } = useMultiplayerGame(roomId, false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasActed, setHasActed] = useState(false);

  useEffect(() => {
    setHasActed(false);
    setSelectedTarget(null);
  }, [state?.currentPhase, state?.nightActionStep]);

  if (loading || !state) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">Connecting to game...</div>;
  }

  const me = state.players.find(p => p.id === playerId);
  
  if (!me) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-center text-destructive">You are not in this game.</div>;
  }

  if (!me.isAlive && state.currentPhase !== 'GAME_OVER') {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center p-8 bg-[#16181A] text-center space-y-6">
        <Skull className="w-24 h-24 text-destructive mx-auto" />
        <h2 className="text-4xl font-headline italic text-destructive">You Died</h2>
        <p className="text-muted-foreground">You can no longer participate. Keep your eyes open but do not speak!</p>
      </div>
    );
  }

  const getRoleIcon = (role?: RoleType) => {
    switch (role) {
      case 'Mafia': case 'Godfather': return <Skull className="w-16 h-16 text-destructive" />;
      case 'Doctor': case 'Bodyguard': return <Shield className="w-16 h-16 text-primary" />;
      case 'Vigilante': return <Crosshair className="w-16 h-16 text-green-500" />;
      case 'Detective': return <Search className="w-16 h-16 text-yellow-500" />;
      case 'Mason': return <Users className="w-16 h-16 text-blue-500" />;
      default: return <User className="w-16 h-16 text-muted-foreground" />;
    }
  };

  // Render based on Phase
  if (state.currentPhase === 'PLAYERS') {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center p-8 bg-[#16181A] text-center space-y-6">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <User className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-headline italic">You are in!</h2>
        <p className="text-xl font-bold">{me.name}</p>
        <p className="text-sm text-muted-foreground mt-8">Look at the TV. Waiting for Host to start the game.</p>
      </div>
    );
  }

  if (state.currentPhase === 'REVEAL') {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center p-6 bg-[#16181A]">
        <Card className="w-full max-w-sm bg-card border-primary cinematic-glow text-center">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="p-4 rounded-full bg-primary/10">
              {getRoleIcon(me.role)}
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-headline italic">You are the {me.role}</h3>
              <p className="text-primary font-medium tracking-widest uppercase text-xs">Team: {me.team}</p>
            </div>
            <p className="text-sm text-muted-foreground italic min-h-[40px]">
              {me.role === 'Mafia' && "Eliminate the townspeople one by one."}
              {me.role === 'Godfather' && "Lead the Mafia. You appear innocent to the Detective."}
              {me.role === 'Doctor' && "Each night, choose one player to protect from death."}
              {me.role === 'Bodyguard' && "Protect a player. If attacked, you die and kill their attacker."}
              {me.role === 'Vigilante' && "You may shoot one suspicious person at night."}
              {me.role === 'Detective' && "Each night, investigate a player's true alignment."}
              {me.role === 'Mason' && "You know who the other Masons are. Work together."}
              {me.role === 'Villager' && "Find the Mafia and vote them out during the day."}
            </p>
            <p className="text-xs text-muted-foreground mt-4">Look back at the TV when you are ready.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.currentPhase === 'NIGHT_START') {
    return (
      <div className="flex flex-col min-h-[100svh] items-center justify-center p-8 bg-black text-center space-y-6">
        <Moon className="w-24 h-24 text-muted-foreground mx-auto" />
        <h2 className="text-3xl font-headline italic text-muted-foreground">Go to sleep</h2>
        <p className="text-sm text-muted-foreground/50">Close your eyes. Listen to the TV for instructions.</p>
      </div>
    );
  }

  if (state.currentPhase === 'NIGHT_ACTIONS') {
    const isMyTurn = state.nightActionStep !== 'DONE' && (
      (state.nightActionStep === 'Mafia' && (me.role === 'Mafia' || me.role === 'Godfather')) ||
      (state.nightActionStep === me.role)
    );

    if (!isMyTurn || hasActed) {
      return (
        <div className="flex flex-col min-h-[100svh] items-center justify-center p-8 bg-black text-center space-y-6">
          <Lock className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <h2 className="text-2xl font-headline italic text-muted-foreground/50">Waiting...</h2>
          <p className="text-xs text-muted-foreground/30">Keep your eyes closed.</p>
        </div>
      );
    }

    // It is my turn!
    const isDetectiveResult = state.nightActionStep === 'Detective' && state.detectiveResult && state.detectiveInvestigatedPlayerId === selectedTarget;

    return (
      <div className="flex flex-col min-h-[100svh] p-6 bg-[#16181A]">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-headline italic text-primary">Wake up, {me.role}</h2>
          <p className="text-sm text-muted-foreground">
            {state.nightActionStep === 'Mason' && "Acknowledge the other Masons silently."}
            {state.nightActionStep === 'Mafia' && "Choose who to eliminate."}
            {state.nightActionStep === 'Doctor' && "Choose who to protect."}
            {state.nightActionStep === 'Bodyguard' && "Choose who to protect."}
            {state.nightActionStep === 'Vigilante' && "Choose who to shoot."}
            {state.nightActionStep === 'Detective' && "Choose who to investigate."}
          </p>
        </div>

        {isDetectiveResult ? (
          <Card className="bg-card cinematic-glow p-8 flex flex-col items-center gap-6 mt-8">
            <Search className="w-16 h-16 text-yellow-500" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Investigation Result</p>
              <h3 className={cn("text-2xl font-headline italic mt-2", state.detectiveResult === 'Suspicious' ? 'text-destructive' : 'text-green-500')}>
                {state.detectiveResult}
              </h3>
            </div>
            <Button className="w-full mt-4 h-14 text-lg" onClick={() => setHasActed(true)}>
              Go back to sleep
            </Button>
          </Card>
        ) : state.nightActionStep === 'Mason' ? (
          <div className="flex flex-col flex-1 items-center justify-center gap-6">
            <Users className="w-24 h-24 text-primary opacity-50" />
            <p className="text-muted-foreground">Look around for the others.</p>
            <Button 
              size="lg" 
              className="mt-auto h-16 w-full text-lg" 
              onClick={() => setHasActed(true)}
            >
              Done. Go to sleep.
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto bg-black/20 rounded-xl p-2 border border-white/5">
              <PlayerList 
                players={state.players.filter(p => p.isAlive && p.id !== (me.role === 'Doctor' ? '' : ''))} // Maybe doctors can self-heal? 
                selectedId={selectedTarget}
                onSelect={setSelectedTarget}
              />
            </div>
            <Button 
              size="lg" 
              className="mt-6 h-16 text-lg" 
              disabled={state.nightActionStep !== 'Vigilante' && !selectedTarget}
              onClick={() => {
                if (selectedTarget) {
                  recordNightAction(state.nightActionStep as RoleType, selectedTarget);
                  if (state.nightActionStep === 'Detective') {
                    return; // stay on screen to show investigation result
                  }
                }
                setHasActed(true);
              }}
            >
              {state.nightActionStep === 'Vigilante' && !selectedTarget ? "Skip Shooting" : "Confirm Choice"}
            </Button>
          </>
        )}
      </div>
    );
  }

  // All other daylight phases
  return (
    <div className="flex flex-col min-h-[100svh] items-center justify-center p-8 bg-[#16181A] text-center space-y-6">
      <div className="p-4 rounded-full bg-primary/10">
        <Eye className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-3xl font-headline italic">Look at the TV</h2>
      <p className="text-muted-foreground">Public discussions and voting happen on the main screen.</p>
    </div>
  );
}

export default function PlayerView() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">Loading game interface...</div>}>
      <PlayerViewContent />
    </Suspense>
  );
}
