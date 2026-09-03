import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast } from '@/lib/gameStore';
import { allSeatsOccupied } from '@/shared/gameEngine';
import { SEAT_IDS, SeatId } from '@/shared/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seatId, playerName, clientId } = body as {
      seatId: SeatId;
      playerName: string;
      clientId: string;
    };

    if (!clientId || !playerName || !seatId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!SEAT_IDS.includes(seatId)) {
      return NextResponse.json({ error: 'Invalid seat.' }, { status: 400 });
    }

    const state = await getGameState();

    for (const id of SEAT_IDS) {
      if (state.seats[id].playerId === clientId) {
        state.seats[id].playerName = null;
        state.seats[id].playerId = null;
        state.seats[id].connected = false;
      }
    }

    const seat = state.seats[seatId];
    if (seat.playerName !== null && seat.playerId !== clientId) {
      return NextResponse.json({ error: 'That seat is already taken.' }, { status: 409 });
    }

    seat.playerName = playerName.trim().slice(0, 20) || 'Player';
    seat.playerId = clientId;
    seat.connected = true;

    if (state.status === 'waiting' && allSeatsOccupied(state)) {
      state.status = 'playing';
    }

    await updateAndBroadcast(state);
    return NextResponse.json({ ok: true, seatId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
