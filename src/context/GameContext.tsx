'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRealtime } from './RealtimeContext';
import type { GameState, SeatId } from '@/shared/types';
import { createInitialState } from '@/shared/gameEngine';

interface GameContextValue {
  gameState: GameState;
  mySeatId: SeatId | null;
  myPlayerName: string;
  setMyPlayerName: (name: string) => void;
  joinSeat: (seatId: SeatId) => void;
  leaveSeat: () => void;
  selectPiece: (square: string) => void;
  setMindIntent: (to: string) => void;
  makeMove: (from: string, to: string, promotion?: string) => void;
  newGame: () => void;
  toggleSyncMode: (enabled: boolean) => void;
  error: string | null;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

async function apiCall(path: string, body?: Record<string, unknown>) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { channel, clientId } = useRealtime();
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [mySeatId, setMySeatId] = useState<SeatId | null>(null);
  const [myPlayerName, setMyPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const chunksRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    apiCall('/api/game/state')
      .then((state) => {
        setGameState(state);
        syncMySeat(state, clientIdRef.current);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!channel) return;

    const onState = (data: GameState) => {
      setGameState(data);
      syncMySeat(data, clientIdRef.current);
    };

    const onStateChunk = (msg: {
      batchId: string;
      index: number;
      total: number;
      data: string;
    }) => {
      const chunks = chunksRef.current;
      let arr = chunks.get(msg.batchId);
      if (!arr) {
        arr = new Array(msg.total).fill('');
        chunks.set(msg.batchId, arr);
      }
      arr[msg.index] = msg.data;
      if (arr.every((c) => c !== '')) {
        const full = JSON.parse(arr.join('')) as GameState;
        chunks.delete(msg.batchId);
        onState(full);
      }
    };

    const onMemberRemoved = (member: { id: string }) => {
      apiCall('/api/game/cleanup', { disconnectedClientId: member.id }).catch(() => {});
    };

    channel.bind('game-state', onState);
    channel.bind('game-state-chunk', onStateChunk);
    channel.bind('pusher:member_removed', onMemberRemoved);

    return () => {
      channel.unbind('game-state', onState);
      channel.unbind('game-state-chunk', onStateChunk);
      channel.unbind('pusher:member_removed', onMemberRemoved);
    };
  }, [channel]);

  function syncMySeat(state: GameState, cid: string) {
    setMySeatId(() => {
      for (const id of Object.keys(state.seats) as SeatId[]) {
        if (state.seats[id].playerId === cid) return id;
      }
      return null;
    });
  }

  const joinSeat = useCallback(
    (seatId: SeatId) => {
      setError(null);
      apiCall('/api/game/join', { seatId, playerName: myPlayerName, clientId })
        .then(() => setMySeatId(seatId))
        .catch((err) => {
          setError(err.message);
          setMySeatId(null);
        });
    },
    [clientId, myPlayerName],
  );

  const leaveSeat = useCallback(() => {
    setError(null);
    apiCall('/api/game/leave', { clientId })
      .then(() => setMySeatId(null))
      .catch((err) => setError(err.message));
  }, [clientId]);

  const selectPiece = useCallback(
    (square: string) => {
      apiCall('/api/game/select', { square, clientId }).catch((err) => setError(err.message));
    },
    [clientId],
  );

  const setMindIntentAction = useCallback(
    (to: string) => {
      apiCall('/api/game/intent', { to, clientId }).catch((err) => setError(err.message));
    },
    [clientId],
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      apiCall('/api/game/move', { from, to, promotion, clientId }).catch((err) =>
        setError(err.message),
      );
    },
    [clientId],
  );

  const newGame = useCallback(() => {
    apiCall('/api/game/new').catch((err) => setError(err.message));
  }, []);

  const toggleSyncMode = useCallback((enabled: boolean) => {
    apiCall('/api/game/sync-mode', { syncMode: enabled }).catch((err) => setError(err.message));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <GameContext.Provider
      value={{
        gameState,
        mySeatId,
        myPlayerName,
        setMyPlayerName,
        joinSeat,
        leaveSeat,
        selectPiece,
        setMindIntent: setMindIntentAction,
        makeMove,
        newGame,
        toggleSyncMode,
        error,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
