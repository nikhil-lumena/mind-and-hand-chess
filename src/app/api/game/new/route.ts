import { NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast, clearMindIntent } from '@/lib/gameStore';
import { createInitialState, allSeatsOccupied } from '@/shared/gameEngine';
import { SEAT_IDS } from '@/shared/types';

export async function POST() {
  try {
    const oldState = await getGameState();
    const newState = createInitialState();

    for (const id of SEAT_IDS) {
      newState.seats[id] = oldState.seats[id];
    }

    newState.syncMode = oldState.syncMode;

    if (allSeatsOccupied(newState)) {
      newState.status = 'playing';
    }

    await clearMindIntent();
    await updateAndBroadcast(newState);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
