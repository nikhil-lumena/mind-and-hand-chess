import { getRedis, hasRedisConfig } from './redis';
import { getPusher, GAME_CHANNEL } from './pusher-server';
import type { GameState, MindIntent } from '@/shared/types';
import { createInitialState } from '@/shared/gameEngine';

const STATE_KEY = 'game:state';
const MIND_INTENT_KEY = 'game:mind-intent';

type MemoryStore = {
  state: GameState;
  intent: MindIntent | null;
};

const globalForStore = globalThis as typeof globalThis & {
  __mindHandStore?: MemoryStore;
};

function memory(): MemoryStore {
  if (!globalForStore.__mindHandStore) {
    globalForStore.__mindHandStore = {
      state: createInitialState(),
      intent: null,
    };
  }
  return globalForStore.__mindHandStore;
}

export async function getGameState(): Promise<GameState> {
  if (!hasRedisConfig()) {
    return memory().state;
  }
  const redis = getRedis();
  const raw = await redis.get<GameState>(STATE_KEY);
  if (!raw) {
    const initial = createInitialState();
    await redis.set(STATE_KEY, initial);
    return initial;
  }
  return raw;
}

export async function setGameState(state: GameState): Promise<void> {
  if (!hasRedisConfig()) {
    memory().state = state;
    return;
  }
  const redis = getRedis();
  await redis.set(STATE_KEY, state);
}

export async function getMindIntent(): Promise<MindIntent | null> {
  if (!hasRedisConfig()) {
    return memory().intent;
  }
  const redis = getRedis();
  return await redis.get<MindIntent>(MIND_INTENT_KEY);
}

export async function setMindIntent(intent: MindIntent | null): Promise<void> {
  if (!hasRedisConfig()) {
    memory().intent = intent;
    return;
  }
  const redis = getRedis();
  if (intent) {
    await redis.set(MIND_INTENT_KEY, intent);
  } else {
    await redis.del(MIND_INTENT_KEY);
  }
}

export async function clearMindIntent(): Promise<void> {
  if (!hasRedisConfig()) {
    memory().intent = null;
    return;
  }
  const redis = getRedis();
  await redis.del(MIND_INTENT_KEY);
}

export async function updateAndBroadcast(state: GameState): Promise<void> {
  await setGameState(state);
  const pusher = getPusher();
  if (!pusher) return;
  const payload = JSON.stringify(state);

  if (payload.length <= 10240) {
    await pusher.trigger(GAME_CHANNEL, 'game-state', state);
  } else {
    const chunks = chunkString(payload, 9000);
    const batchId = Date.now().toString(36);
    for (let i = 0; i < chunks.length; i++) {
      await pusher.trigger(GAME_CHANNEL, 'game-state-chunk', {
        batchId,
        index: i,
        total: chunks.length,
        data: chunks[i],
      });
    }
  }
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}
