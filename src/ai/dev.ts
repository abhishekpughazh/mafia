import { config } from 'dotenv';
config();

import '@/ai/flows/night-phase-narration.ts';
import '@/ai/flows/day-phase-elimination-announcement.ts';
import '@/ai/flows/game-outcome-summary-narration.ts';