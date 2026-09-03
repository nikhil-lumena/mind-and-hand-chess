import Pusher from 'pusher';

let pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (!pusher) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      throw new Error(
        'Missing Pusher env vars: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER',
      );
    }

    pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  }
  return pusher;
}

export const GAME_CHANNEL = 'presence-game-room';
