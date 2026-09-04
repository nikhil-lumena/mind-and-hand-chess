import { NextRequest, NextResponse } from 'next/server';
import { getGameState, pushReaction } from '@/lib/gameStore';
import { REACTION_EMOJIS, SEAT_IDS, seatTeam, type Reaction, type ReactionEmoji } from '@/shared/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emoji, clientId, name } = body as { emoji: string; clientId: string; name?: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }
    if (!REACTION_EMOJIS.includes(emoji as ReactionEmoji)) {
      return NextResponse.json({ error: 'Unknown reaction.' }, { status: 400 });
    }

    // Prefer the seated identity so names and teams can't be spoofed mid-game.
    const state = await getGameState();
    const seatId = SEAT_IDS.find((id) => state.seats[id].playerId === clientId) ?? null;
    const seat = seatId ? state.seats[seatId] : null;

    const reaction: Reaction = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      emoji: emoji as ReactionEmoji,
      name: (seat?.playerName ?? name ?? 'Spectator').toString().trim().slice(0, 20) || 'Spectator',
      team: seatId ? seatTeam(seatId) : null,
      at: Date.now(),
    };

    await pushReaction(reaction);
    return NextResponse.json({ ok: true, reaction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
