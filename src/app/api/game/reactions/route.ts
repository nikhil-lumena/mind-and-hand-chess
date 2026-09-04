import { NextResponse } from 'next/server';
import { getReactions } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

/** Polling fallback for clients without a realtime channel. */
export async function GET() {
  try {
    return NextResponse.json(await getReactions());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
