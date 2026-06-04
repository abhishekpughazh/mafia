import React from 'react';
import { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Trash2, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerListProps {
  players: Player[];
  onRemove?: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  disabledIds?: string[];
  showStatus?: boolean;
}

export function PlayerList({ players, onRemove, onSelect, selectedId, disabledIds = [], showStatus = false }: PlayerListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 w-full">
      {players.map((player) => {
        const isDead = !player.isAlive;
        const isDisabled = disabledIds.includes(player.id) || (isDead && showStatus);
        const isSelected = selectedId === player.id;

        return (
          <Card 
            key={player.id}
            onClick={() => !isDisabled && onSelect?.(player.id)}
            className={cn(
              "p-4 flex items-center justify-between transition-all",
              isSelected && "ring-2 ring-primary bg-primary/5",
              isDisabled && "opacity-40 grayscale pointer-events-none",
              !isDisabled && onSelect && "cursor-pointer hover:bg-secondary/50 active:scale-[0.98]"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", isDead ? "bg-destructive/10" : "bg-primary/10")}>
                {isDead ? <Skull className="w-4 h-4 text-destructive" /> : <User className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <p className={cn("font-medium", isDead && "line-through text-muted-foreground")}>{player.name}</p>
                {showStatus && isDead && <p className="text-[10px] uppercase text-destructive font-bold">Eliminated</p>}
              </div>
            </div>
            
            {onRemove && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onRemove(player.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </Card>
        );
      })}
      {players.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>No players added yet.</p>
        </div>
      )}
    </div>
  );
}