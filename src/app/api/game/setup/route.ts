import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { getGameState, updateAndBroadcast, clearMindIntent } from '@/lib/gameStore';
import { createInitialState, allSeatsOccupied } from '@/shared/gameEngine';
import { SEAT_IDS } from '@/shared/types';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const fen = typeof body.fen === 'string' ? body.fen : null;
    if (!fen) {
      return NextResponse.json({ error: 'fen is required' }, { status: 400 });
    }

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return NextResponse.json({ error: 'Invalid FEN' }, { status: 400 });
    }

    const oldState = await getGameState();
    const newState = createInitialState();
    for (const id of SEAT_IDS) {
      newState.seats[id] = oldState.seats[id];
    }
    newState.fen = chess.fen();
    newState.turn = chess.turn() === 'w' ? 'white' : 'black';
    newState.syncMode = typeof body.syncMode === 'boolean' ? body.syncMode : oldState.syncMode;
    newState.status = allSeatsOccupied(newState) ? 'playing' : 'waiting';
    newState.phase = 'mind-selecting';

    await clearMindIntent();
    await updateAndBroadcast(newState);
    return NextResponse.json({ ok: true, fen: newState.fen, turn: newState.turn });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
