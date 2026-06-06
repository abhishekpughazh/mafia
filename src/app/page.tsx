import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Moon, Tv, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100svh] p-6 text-center space-y-12 bg-[#16181A]">
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Moon className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-6xl font-headline italic tracking-tight text-white">Mafia<br/>Live</h1>
        <p className="text-muted-foreground tracking-[0.2em] uppercase text-xs">A Jackbox-style Mafia Experience</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <Button asChild size="lg" className="w-full h-20 text-xl font-bold flex items-center justify-center gap-3">
          <Link href="/host">
            <Tv className="w-6 h-6" />
            Host on TV
          </Link>
        </Button>
        
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="h-px bg-border/50 flex-1"></div>
          <span className="text-xs uppercase tracking-widest">OR</span>
          <div className="h-px bg-border/50 flex-1"></div>
        </div>

        <Button asChild variant="outline" size="lg" className="w-full h-20 text-xl font-bold flex items-center justify-center gap-3 border-primary/30 hover:bg-primary/5">
          <Link href="/join">
            <Smartphone className="w-6 h-6" />
            Join on Phone
          </Link>
        </Button>
      </div>
    </div>
  );
}