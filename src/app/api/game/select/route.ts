import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast } from '@/lib/gameStore';
import { trySelectPiece } from '@/shared/gameEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { square, clientId } = body as { square: string; clientId: string };

    if (!clientId || !square) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const state = await getGameState();
    const result = trySelectPiece(state, square, clientId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await updateAndBroadcast(result.newState!);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
