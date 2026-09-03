import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast } from '@/lib/gameStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { syncMode } = body as { syncMode: boolean };

    if (typeof syncMode !== 'boolean') {
      return NextResponse.json({ error: 'syncMode must be a boolean' }, { status: 400 });
    }

    const state = await getGameState();

    if (state.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Sync mode can only be changed before the game starts.' },
        { status: 400 },
      );
    }

    state.syncMode = syncMode;
    await updateAndBroadcast(state);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
