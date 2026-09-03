import { NextResponse } from 'next/server';
import { getGameState } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await getGameState();
    return NextResponse.json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
