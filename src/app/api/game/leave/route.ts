import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast, clearMindIntent } from '@/lib/gameStore';
import { SEAT_IDS } from '@/shared/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId } = body as { clientId: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const state = await getGameState();
    let found = false;

    for (const id of SEAT_IDS) {
      if (state.seats[id].playerId === clientId) {
        state.seats[id].playerName = null;
        state.seats[id].playerId = null;
        state.seats[id].connected = false;
        found = true;
      }
    }

    if (!found) {
      return NextResponse.json({ ok: true });
    }

    if (state.status === 'playing') {
      state.status = 'waiting';
      state.selectedSquare = null;
      state.phase = 'mind-selecting';
      await clearMindIntent();
    }

    await updateAndBroadcast(state);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
