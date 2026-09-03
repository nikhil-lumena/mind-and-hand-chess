'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import PusherClient from 'pusher-js';
import type { Channel, PresenceChannel } from 'pusher-js';

interface RealtimeContextValue {
  channel: PresenceChannel | null;
  clientId: string;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  channel: null,
  clientId: '',
  connected: false,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('chess-client-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('chess-client-id', id);
  }
  return id;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [channel, setChannel] = useState<PresenceChannel | null>(null);
  const [clientId] = useState(getOrCreateClientId);
  const pusherRef = useRef<PusherClient | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const usable =
      !!key &&
      !!cluster &&
      key !== '[SENSITIVE]' &&
      !key.startsWith('your-') &&
      cluster !== '[SENSITIVE]';

    if (!usable) {
      console.warn('Pusher is not configured; falling back to state polling');
      return;
    }

    const pusher = new PusherClient(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: { client_id: clientId },
      },
    });

    pusherRef.current = pusher;

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error', () => setConnected(false));

    const ch = pusher.subscribe('presence-game-room') as PresenceChannel;
    setChannel(ch);

    return () => {
      pusher.unsubscribe('presence-game-room');
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [clientId]);

  return (
    <RealtimeContext.Provider value={{ channel, clientId, connected }}>
      {children}
    </RealtimeContext.Provider>
  );
}
