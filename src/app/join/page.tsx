"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, ArrowRight } from 'lucide-react';
import { addPlayerToRoom } from '@/lib/db';

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!roomCode || roomCode.length !== 4) {
      setError('Please enter a valid 4-letter room code.');
      return;
    }
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const formattedRoom = roomCode.toUpperCase();
      const playerId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await addPlayerToRoom(formattedRoom, {
        id: playerId,
        name: playerName.trim(),
        isAlive: true,
        team: 'Town'
      });

      // Save credentials locally so if they refresh, they stay connected
      localStorage.setItem(`mafia_player_${formattedRoom}`, JSON.stringify({ id: playerId, name: playerName.trim() }));
      
      router.push(`/play/${formattedRoom}?id=${playerId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join room. Check the code.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100svh] p-6 bg-[#16181A]">
      <Card className="w-full max-w-sm bg-secondary/20 border-primary/20 backdrop-blur-sm">
        <CardContent className="pt-6 pb-8 px-6 space-y-6">
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="p-3 bg-primary/10 rounded-full mb-2">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-headline italic">Join Game</h1>
            <p className="text-sm text-muted-foreground text-center">Look at the TV for the code</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4" suppressHydrationWarning>
            <div className="space-y-2" suppressHydrationWarning>
              <label className="text-xs uppercase tracking-widest text-primary">Room Code</label>
              <Input 
                suppressHydrationWarning
                placeholder="ABCD" 
                maxLength={4}
                className="h-14 text-center text-2xl tracking-[0.5em] uppercase font-bold"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2" suppressHydrationWarning>
              <label className="text-xs uppercase tracking-widest text-primary">Your Name</label>
              <Input 
                suppressHydrationWarning
                placeholder="Enter your name" 
                className="h-14 text-lg"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-14 mt-4 text-lg"
              disabled={loading || !roomCode || !playerName}
            >
              {loading ? 'Joining...' : 'Enter Game'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
