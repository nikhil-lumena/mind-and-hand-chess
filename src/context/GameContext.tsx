'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRealtime } from './RealtimeContext';
import type { GameState, Reaction, ReactionEmoji, SeatId } from '@/shared/types';
import { createInitialState, tryMakeMove } from '@/shared/gameEngine';

interface GameContextValue {
  gameState: GameState;
  mySeatId: SeatId | null;
  myPlayerName: string;
  setMyPlayerName: (name: string) => void;
  joinSeat: (seatId: SeatId, playerName?: string) => void;
  leaveSeat: () => void;
  selectPiece: (square: string) => void;
  selectMindMove: (from: string, to: string) => void;
  setMindIntent: (to: string) => void;
  makeMove: (from: string, to: string, promotion?: string) => void;
  newGame: () => void;
  /** Wipes the board and empties every seat, sending everyone back to the lobby. */
  resetGame: () => Promise<void>;
  toggleSyncMode: (enabled: boolean) => void;
  error: string | null;
  clearError: () => void;
  /** True once the first server state has been received (or the fetch failed). */
  hydrated: boolean;
  /** Live emoji reactions from everyone in the room (only ones seen after load). */
  reactions: Reaction[];
  sendReaction: (emoji: ReactionEmoji) => void;
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
  const [hydrated, setHydrated] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const seenReactionsRef = useRef<Set<string>>(new Set());
  const reactionsArmedRef = useRef(false);
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const chunksRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    const loadState = () =>
      apiCall('/api/game/state')
        .then((state) => {
          setGameState(state);
          syncMySeat(state, clientIdRef.current);
        })
        .catch(() => {});

    loadState().finally(() => setHydrated(true));
    if (channel) return;

    const interval = setInterval(loadState, 400);
    const reactionPoll = setInterval(() => {
      apiCall('/api/game/reactions')
        .then((list: Reaction[]) => list.forEach(ingestReaction))
        .catch(() => {});
    }, 700);
    return () => {
      clearInterval(interval);
      clearInterval(reactionPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

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

    const onReaction = (r: Reaction) => ingestReaction(r);

    channel.bind('game-state', onState);
    channel.bind('game-state-chunk', onStateChunk);
    channel.bind('pusher:member_removed', onMemberRemoved);
    channel.bind('reaction', onReaction);

    return () => {
      channel.unbind('game-state', onState);
      channel.unbind('game-state-chunk', onStateChunk);
      channel.unbind('pusher:member_removed', onMemberRemoved);
      channel.unbind('reaction', onReaction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  /**
   * Dedupes by id and ignores the backlog that exists when we first load, so
   * a page refresh doesn't replay ten seconds of emoji.
   */
  function ingestReaction(r: Reaction) {
    const seen = seenReactionsRef.current;
    if (seen.has(r.id)) return;
    seen.add(r.id);
    if (seen.size > 200) {
      seen.delete(seen.values().next().value as string);
    }
    if (!reactionsArmedRef.current) return;
    if (Date.now() - r.at > 8000) return;
    setReactions((prev) => [...prev.slice(-29), r]);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((x) => x.id !== r.id));
    }, 3000);
  }

  // Arm reactions shortly after the first load so the initial backlog is skipped.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      reactionsArmedRef.current = true;
    }, 1000);
    return () => window.clearTimeout(t);
  }, [hydrated]);

  function syncMySeat(state: GameState, cid: string) {
    setMySeatId(() => {
      for (const id of Object.keys(state.seats) as SeatId[]) {
        if (state.seats[id].playerId === cid) return id;
      }
      return null;
    });
  }

  const joinSeat = useCallback(
    (seatId: SeatId, playerName?: string) => {
      const name = (playerName ?? myPlayerName).trim();
      setMyPlayerName(name);
      setError(null);
      apiCall('/api/game/join', { seatId, playerName: name, clientId })
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

  const selectMindMove = useCallback(
    (from: string, to: string) => {
      setGameState((prev) => {
        if (!prev.syncMode || (prev.phase !== 'mind-selecting' && prev.phase !== 'mind-intent')) {
          return prev;
        }
        return { ...prev, selectedSquare: from, phase: 'hand-moving' };
      });
      apiCall('/api/game/select', { square: from, to, clientId }).catch((err) => {
        setError(err.message);
        apiCall('/api/game/state')
          .then((state) => {
            setGameState(state);
            syncMySeat(state, clientIdRef.current);
          })
          .catch(() => {});
      });
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
      setGameState((prev) => {
        const result = tryMakeMove(prev, from, to, promotion, clientIdRef.current, null);
        return result.success && result.newState ? result.newState : prev;
      });
      apiCall('/api/game/move', { from, to, promotion, clientId }).catch((err) => {
        setError(err.message);
        apiCall('/api/game/state')
          .then((state) => {
            setGameState(state);
            syncMySeat(state, clientIdRef.current);
          })
          .catch(() => {});
      });
    },
    [clientId],
  );

  const newGame = useCallback(() => {
    apiCall('/api/game/new', {}).catch((err) => setError(err.message));
  }, []);

  const resetGame = useCallback(async () => {
    setError(null);
    try {
      await apiCall('/api/game/reset', {});
      setMySeatId(null);
      const state = await apiCall('/api/game/state');
      setGameState(state);
      syncMySeat(state, clientIdRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  }, []);

  const toggleSyncMode = useCallback((enabled: boolean) => {
    apiCall('/api/game/sync-mode', { syncMode: enabled }).catch((err) => setError(err.message));
  }, []);

  const sendReaction = useCallback(
    (emoji: ReactionEmoji) => {
      apiCall('/api/game/react', { emoji, clientId, name: myPlayerName })
        .then((res: { reaction?: Reaction }) => {
          // Show our own reaction immediately; the broadcast is deduped by id.
          if (res.reaction) ingestReaction(res.reaction);
        })
        .catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, myPlayerName],
  );

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
        selectMindMove,
        setMindIntent: setMindIntentAction,
        makeMove,
        newGame,
        resetGame,
        toggleSyncMode,
        error,
        clearError,
        hydrated,
        reactions,
        sendReaction,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
