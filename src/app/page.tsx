"use client"

import React, { useState } from 'react';
import { useGame } from '@/hooks/use-game';
import { PhaseWrapper } from '@/components/game/PhaseWrapper';
import { PlayerList } from '@/components/game/PlayerList';
import { RevealCard } from '@/components/game/RevealCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Plus, Moon, Gavel, Skull, Eye, Info, Shield, 
  Search, Users, ArrowRight, Play, RefreshCw
} from 'lucide-react';
import { RoleType } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function MafiaGame() {
  const { 
    state, setPhase, addPlayer, removePlayer, assignRoles, 
    nextReveal, startNight, recordNightAction, resolveNight, 
    eliminatePlayer, resetGame 
  } = useGame();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [nightActionStep, setNightActionStep] = useState<RoleType>('Mafia');

  // --- RENDERING HELPERS ---

  if (state.currentPhase === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100svh] p-6 text-center space-y-12 bg-[#16181A]">
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
          <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Moon className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-6xl font-headline italic tracking-tight text-white">Mafia<br/>Moderator</h1>
          <p className="text-muted-foreground tracking-[0.2em] uppercase text-xs">Run the perfect in-person game</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-4">
          <Button size="lg" className="h-16 text-lg font-bold" onClick={() => setPhase('SETUP')}>
            Start New Game
          </Button>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 border-primary/20 hover:bg-primary/5">Role Guide</Button>
            <Button variant="outline" className="h-12 border-primary/20 hover:bg-primary/5">Settings</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentPhase === 'SETUP') {
    return (
      <PhaseWrapper title="Game Setup" subtitle="Phase 1 of 4">
        <div className="space-y-6">
          <Card className="bg-secondary/30">
            <CardContent className="p-6 space-y-4">
              <Label className="text-xs uppercase tracking-widest text-primary">Narration Mode</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="secondary" className="justify-start gap-3 h-14 bg-primary/10 border-primary/30 border">
                  <Info className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-bold">App Narrates</p>
                    <p className="text-[10px] text-muted-foreground">Full cinematic voice & text</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-6 space-y-4">
              <Label className="text-xs uppercase tracking-widest text-primary">Role Reveal</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="secondary" className="justify-start gap-3 h-14 bg-primary/10 border-primary/30 border">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Pass-the-phone</p>
                    <p className="text-[10px] text-muted-foreground">Privacy-focused rotation</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button size="lg" className="mt-auto h-16 text-lg" onClick={() => setPhase('PLAYERS')}>
          Continue
        </Button>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'PLAYERS') {
    return (
      <PhaseWrapper title="Add Players" subtitle={`${state.players.length} Players Registered`}>
        <div className="flex gap-2">
          <Input 
            placeholder="Enter player name..." 
            className="h-14 bg-secondary/50 text-lg" 
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newPlayerName.trim()) {
                addPlayer(newPlayerName.trim());
                setNewPlayerName('');
              }
            }}
          />
          <Button 
            className="h-14 w-14" 
            size="icon"
            onClick={() => {
              if (newPlayerName.trim()) {
                addPlayer(newPlayerName.trim());
                setNewPlayerName('');
              }
            }}
          >
            <Plus />
          </Button>
        </div>

        <div className="flex-1 overflow-auto max-h-[50svh]">
          <PlayerList players={state.players} onRemove={removePlayer} />
        </div>

        <div className="mt-auto space-y-4">
          <p className="text-center text-xs text-muted-foreground">
            {state.players.length < 5 ? `Need ${5 - state.players.length} more players to start` : "Minimum players reached"}
          </p>
          <Button 
            size="lg" 
            className="w-full h-16 text-lg" 
            disabled={state.players.length < 5}
            onClick={() => setPhase('ROLES')}
          >
            Confirm Players
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'ROLES') {
    const defaultRoles: Record<RoleType, number> = {
      'Mafia': Math.max(1, Math.floor(state.players.length / 3)),
      'Doctor': 1,
      'Detective': 1,
      'Villager': 0
    };
    defaultRoles.Villager = state.players.length - (defaultRoles.Mafia + defaultRoles.Doctor + defaultRoles.Detective);

    return (
      <PhaseWrapper title="Role Config" subtitle="Custom Mode">
        <div className="space-y-4">
          {Object.entries(defaultRoles).map(([role, count]) => (
            <Card key={role} className="bg-secondary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{role}</h3>
                  <p className="text-xs text-muted-foreground">
                    {role === 'Mafia' ? 'Antagonists' : 'Town Team'}
                  </p>
                </div>
                <div className="text-2xl font-bold text-primary">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-auto">
          <Button size="lg" className="w-full h-16 text-lg" onClick={() => assignRoles(defaultRoles)}>
            Assign & Reveal
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'REVEAL') {
    const currentPlayer = state.players[state.revealingPlayerIndex];
    return (
      <PhaseWrapper title="Role Reveal" subtitle={`Player ${state.revealingPlayerIndex + 1} of ${state.players.length}`}>
        <RevealCard player={currentPlayer} onContinue={nextReveal} />
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'NIGHT_START') {
    return (
      <div className="flex flex-col min-h-screen bg-black text-center p-8 space-y-12 items-center justify-center">
        <div className="space-y-6 max-w-md">
          <Moon className="w-20 h-20 text-primary mx-auto opacity-80 animate-pulse" />
          <h2 className="text-4xl font-headline italic">Night Falls</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {state.narrationText || "The shadows lengthen, and secrets stir in the quiet corners. Everyone, close your eyes."}
          </p>
        </div>
        <Button 
          size="lg" 
          className="w-full max-w-xs h-16 text-lg animate-in fade-in slide-in-from-bottom-4 duration-1000"
          onClick={() => {
            setNightActionStep('Mafia');
            setPhase('NIGHT_ACTIONS');
          }}
        >
          Wake Up Mafia
        </Button>
      </div>
    );
  }

  if (state.currentPhase === 'NIGHT_ACTIONS') {
    const isDetectiveResult = nightActionStep === 'Detective' && state.detectiveResult;
    
    return (
      <PhaseWrapper title={`${nightActionStep}, Wake Up`} subtitle="Night Phase Actions">
        <p className="text-muted-foreground mb-4">
          {nightActionStep === 'Mafia' && "Choose one player to eliminate tonight."}
          {nightActionStep === 'Doctor' && "Choose one player to protect tonight."}
          {nightActionStep === 'Detective' && "Choose one player to investigate."}
        </p>

        {isDetectiveResult ? (
          <Card className="bg-card cinematic-glow p-10 flex flex-col items-center gap-6">
            <Search className="w-16 h-16 text-yellow-500" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Investigation Result</p>
              <h3 className={cn("text-3xl font-headline italic mt-2", state.detectiveResult === 'Suspicious' ? 'text-destructive' : 'text-green-500')}>
                {state.detectiveResult}
              </h3>
            </div>
            <Button className="w-full mt-4" onClick={() => resolveNight()}>
              End Night
            </Button>
          </Card>
        ) : (
          <>
            <PlayerList 
              players={state.players.filter(p => p.isAlive)} 
              selectedId={selectedTarget}
              onSelect={setSelectedTarget}
              showStatus
            />
            <Button 
              size="lg" 
              className="mt-auto h-16" 
              disabled={!selectedTarget}
              onClick={() => {
                recordNightAction(nightActionStep, selectedTarget!);
                setSelectedTarget(null);
                if (nightActionStep === 'Mafia') setNightActionStep('Doctor');
                else if (nightActionStep === 'Doctor') setNightActionStep('Detective');
                else if (nightActionStep === 'Detective') {
                  // Wait for the result screen to show above if step is Detective
                }
              }}
            >
              Confirm Choice
            </Button>
          </>
        )}
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'DAY_ANNOUNCE') {
    return (
      <PhaseWrapper title="Dawn Breaks" subtitle={`Day ${state.dayNumber}`}>
        <Card className="bg-secondary/10 border-primary/20 p-8 space-y-6 text-center cinematic-glow">
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
            <Eye className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-4">
            <p className="text-lg leading-relaxed italic text-muted-foreground">
              {state.narrationText}
            </p>
          </div>
        </Card>
        <div className="mt-auto space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="text-center">
              <p className="text-2xl font-bold">{state.players.filter(p => p.isAlive).length}</p>
              <p className="text-[10px] uppercase text-muted-foreground">Alive</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{state.players.filter(p => !p.isAlive).length}</p>
              <p className="text-[10px] uppercase text-muted-foreground">Dead</p>
            </div>
          </div>
          <Button size="lg" className="w-full h-16 text-lg" onClick={() => setPhase('DISCUSSION')}>
            Start Discussion
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'DISCUSSION') {
    return (
      <PhaseWrapper title="Discussion" subtitle={`Day ${state.dayNumber}`}>
        <Card className="bg-black/40 p-8 flex flex-col items-center justify-center space-y-4 border-dashed border-primary/30">
          <Users className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Town Assembly</h3>
            <p className="text-sm text-muted-foreground">Discuss the night events and form your suspicions.</p>
          </div>
        </Card>

        <div className="flex-1">
          <Label className="text-xs uppercase text-primary mb-2 block">Remaining Souls</Label>
          <PlayerList players={state.players} showStatus />
        </div>

        <Button size="lg" className="h-16 text-lg gap-3" onClick={() => setPhase('VOTING')}>
          <Gavel className="w-6 h-6" />
          Go to Voting
        </Button>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'VOTING') {
    return (
      <PhaseWrapper title="Town Vote" subtitle="Majority Rules">
        <p className="text-sm text-muted-foreground text-center">Select the player the town has decided to eliminate.</p>
        
        <PlayerList 
          players={state.players.filter(p => p.isAlive)} 
          selectedId={selectedTarget}
          onSelect={setSelectedTarget}
        />

        <div className="mt-auto">
          <Button 
            size="lg" 
            className="w-full h-16 text-lg bg-destructive hover:bg-destructive/90" 
            disabled={!selectedTarget}
            onClick={() => {
              if (selectedTarget) {
                eliminatePlayer(selectedTarget);
                setSelectedTarget(null);
                setPhase('ELIMINATION');
              }
            }}
          >
            Confirm Elimination
          </Button>
        </div>
      </PhaseWrapper>
    );
  }

  if (state.currentPhase === 'ELIMINATION') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-8 bg-[#16181A] text-center space-y-12">
        <div className="space-y-4">
          <Skull className="w-24 h-24 text-destructive mx-auto animate-bounce" />
          <h2 className="text-5xl font-headline italic">{state.lastEliminatedPlayer?.name}</h2>
          <p className="text-xl text-muted-foreground">Has been removed from the town.</p>
        </div>

        <Card className="w-full max-w-sm bg-destructive/5 border-destructive/20 p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Their true identity was</p>
          <h3 className="text-3xl font-headline italic text-destructive">{state.lastEliminatedPlayer?.role}</h3>
        </Card>

        <Button size="lg" className="w-full max-w-xs h-16 text-lg" onClick={() => startNight()}>
          Next Night Begins
        </Button>
      </div>
    );
  }

  if (state.currentPhase === 'GAME_OVER') {
    return (
      <PhaseWrapper title="Game Over" subtitle="The End of the Story">
        <div className="space-y-8 text-center">
          <div className="space-y-2">
            <h2 className={cn("text-6xl font-headline italic", state.winner === 'Mafia' ? 'text-destructive' : 'text-primary')}>
              {state.winner} Wins
            </h2>
            <p className="text-muted-foreground uppercase tracking-[0.3em] text-xs">
              {state.winner === 'Mafia' ? 'The shadows have prevailed' : 'The town is safe once more'}
            </p>
          </div>

          <div className="space-y-4 text-left">
            <Label className="text-xs uppercase text-primary">Final Rosters</Label>
            <div className="grid grid-cols-1 gap-2">
              {state.players.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-md bg-secondary/20 border border-white/5">
                  <div className="flex gap-3 items-center">
                    {p.isAlive ? <Users className="w-4 h-4 text-primary" /> : <Skull className="w-4 h-4 text-destructive" />}
                    <span className={cn(p.isAlive ? "font-bold" : "text-muted-foreground line-through")}>{p.name}</span>
                  </div>
                  <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-4">
          <Button size="lg" className="h-16 text-lg" onClick={resetGame}>
            Play Again
          </Button>
          <Button variant="ghost" onClick={resetGame}>Return Home</Button>
        </div>
      </PhaseWrapper>
    );
  }

  return null;
}