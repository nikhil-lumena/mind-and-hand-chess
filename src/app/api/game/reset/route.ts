import { NextResponse } from 'next/server';
import { updateAndBroadcast, clearMindIntent } from '@/lib/gameStore';
import { createInitialState } from '@/shared/gameEngine';

/**
 * Hard reset: wipes the board, empties every seat and returns the room to the
 * lobby. Anyone may call this (including someone waiting in the lobby) so a
 * room can never get stuck when players vanish mid-game.
 */
export async function POST() {
  try {
    await clearMindIntent();
    await updateAndBroadcast(createInitialState());
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
