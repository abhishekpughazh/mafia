import { db } from './firebase';
import { ref, set, onValue, update, get, remove } from 'firebase/database';
import { GameState, Player, RoleType, NightStep } from './types';

// Generate a random 4-letter room code
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom(initialState: GameState): Promise<string> {
  const roomId = generateRoomCode();
  await set(ref(db, `rooms/${roomId}`), initialState);
  return roomId;
}

export function subscribeToRoom(roomId: string, callback: (state: GameState | null) => void) {
  const roomRef = ref(db, `rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    // Default players array if missing in Firebase (arrays can be omitted if empty)
    if (data && !data.players) {
      data.players = [];
    }
    callback(data as GameState | null);
  });
}

export async function updateRoomState(roomId: string, partialState: Partial<GameState>) {
  await update(ref(db, `rooms/${roomId}`), partialState);
}

export async function addPlayerToRoom(roomId: string, player: Player) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (snapshot.exists()) {
    const data = snapshot.val() as GameState;
    const players = data.players || [];
    
    // Prevent duplicate names case-insensitive
    if (players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
      throw new Error('Player name already taken in this room.');
    }
    
    players.push(player);
    await update(roomRef, { players });
  } else {
    throw new Error('Room not found');
  }
}

export async function removePlayerFromRoom(roomId: string, playerId: string) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (snapshot.exists()) {
    const data = snapshot.val() as GameState;
    const players = (data.players || []).filter(p => p.id !== playerId);
    await update(roomRef, { players });
  }
}

// Ensure cleanup on disconnect
export async function deleteRoom(roomId: string) {
  await remove(ref(db, `rooms/${roomId}`));
}
