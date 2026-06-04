"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Lock, Shield, Skull, Search, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RevealCardProps {
  player: Player;
  onContinue: () => void;
}

export function RevealCard({ player, onContinue }: RevealCardProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startReveal = () => {
    if (isRevealed) return;
    setIsRevealing(true);
    let progress = 0;
    timerRef.current = setInterval(() => {
      progress += 5;
      setRevealProgress(progress);
      if (progress >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRevealed(true);
        setIsRevealing(false);
      }
    }, 50);
  };

  const cancelReveal = () => {
    if (isRevealed) return;
    setIsRevealing(false);
    setRevealProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const getRoleIcon = () => {
    switch (player.role) {
      case 'Mafia': return <Skull className="w-16 h-16 text-destructive" />;
      case 'Doctor': return <Shield className="w-16 h-16 text-primary" />;
      case 'Detective': return <Search className="w-16 h-16 text-yellow-500" />;
      default: return <User className="w-16 h-16 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Pass to {player.name}</h2>
        <p className="text-sm text-muted-foreground">Make sure nobody else is looking.</p>
      </div>

      {!isRevealed ? (
        <Card 
          className="w-full h-64 flex flex-col items-center justify-center bg-secondary/50 border-dashed border-2 cursor-pointer select-none active:scale-95 transition-transform"
          onMouseDown={startReveal}
          onMouseUp={cancelReveal}
          onTouchStart={startReveal}
          onTouchEnd={cancelReveal}
        >
          <CardContent className="flex flex-col items-center gap-4 text-center p-6">
            <Lock className="w-12 h-12 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Tap and hold to reveal</p>
              {isRevealing && <Progress value={revealProgress} className="w-32 h-1" />}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full bg-card border-primary cinematic-glow animate-in zoom-in-95 duration-300">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              {getRoleIcon()}
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-headline italic">You are the {player.role}</h3>
              <p className="text-primary font-medium tracking-widest uppercase text-xs">Team: {player.team}</p>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {player.role === 'Mafia' && "Eliminate the townspeople one by one."}
              {player.role === 'Doctor' && "Each night, choose one player to protect."}
              {player.role === 'Detective' && "Each night, investigate a player's suspicious activity."}
              {player.role === 'Villager' && "Find the Mafia and vote them out."}
            </p>
            <button 
              onClick={onContinue}
              className="mt-4 w-full bg-primary py-3 rounded-md font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Hide and Continue
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}