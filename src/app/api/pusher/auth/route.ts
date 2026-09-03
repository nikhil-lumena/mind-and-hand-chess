import { NextRequest, NextResponse } from 'next/server';
import { getPusher } from '@/lib/pusher-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');
    const clientId = params.get('client_id') || 'anonymous';

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    const pusher = getPusher();
    if (!pusher) {
      return NextResponse.json({ error: 'Pusher is not configured' }, { status: 503 });
    }

    const presenceData = {
      user_id: clientId,
      user_info: { clientId },
    };

    const auth = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(auth);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
