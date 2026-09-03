import Pusher from 'pusher';
import { isUsableEnv } from './redis';

let pusher: Pusher | null = null;

export function hasPusherConfig(): boolean {
  return (
    isUsableEnv(process.env.PUSHER_APP_ID) &&
    isUsableEnv(process.env.NEXT_PUBLIC_PUSHER_KEY) &&
    isUsableEnv(process.env.PUSHER_SECRET) &&
    isUsableEnv(process.env.NEXT_PUBLIC_PUSHER_CLUSTER)
  );
}

export function getPusher(): Pusher | null {
  if (!hasPusherConfig()) return null;
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusher;
}

export const GAME_CHANNEL = 'presence-game-room';
