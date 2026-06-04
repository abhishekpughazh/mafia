import React from 'react';
import { cn } from '@/lib/utils';

interface PhaseWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function PhaseWrapper({ children, className, title, subtitle }: PhaseWrapperProps) {
  return (
    <div className={cn("flex flex-col min-h-[100svh] p-6 animate-fade-in", className)}>
      <header className="mb-8 text-center space-y-2">
        {title && <h1 className="text-4xl font-headline italic text-primary">{title}</h1>}
        {subtitle && <p className="text-sm text-muted-foreground uppercase tracking-widest">{subtitle}</p>}
      </header>
      <main className="flex-1 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}