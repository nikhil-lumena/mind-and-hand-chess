import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast, setMindIntent } from '@/lib/gameStore';
import { trySelectMindMove, trySelectPiece } from '@/shared/gameEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { square, to, clientId } = body as { square: string; to?: string; clientId: string };

    if (!clientId || !square) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const state = await getGameState();

    if (to) {
      const result = trySelectMindMove(state, square, to, clientId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (result.mindIntent) {
        await setMindIntent(result.mindIntent);
      }
      await updateAndBroadcast(result.newState!);
      return NextResponse.json({ ok: true });
    }

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
