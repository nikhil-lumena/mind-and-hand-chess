import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateAndBroadcast, setMindIntent } from '@/lib/gameStore';
import { trySetMindIntent } from '@/shared/gameEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, clientId } = body as { to: string; clientId: string };

    if (!clientId || !to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const state = await getGameState();
    const result = trySetMindIntent(state, to, clientId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await setMindIntent(result.mindIntent!);
    await updateAndBroadcast(result.newState!);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
