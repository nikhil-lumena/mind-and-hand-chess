'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
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
  makeMove: (from: string, to: string, promotion?: string) => void;
  newGame: () => void;
  error: string | null;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [mySeatId, setMySeatId] = useState<SeatId | null>(null);
  const [myPlayerName, setMyPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleState = (state: GameState) => {
      setGameState(state);
      setMySeatId((prev) => {
        if (!prev) return null;
        const seat = state.seats[prev];
        if (!seat || seat.playerId !== socket.id) return null;
        return prev;
      });
    };
    const handleSeatError = (msg: string) => {
      setError(msg);
      setMySeatId(null);
    };
    const handleMoveError = (msg: string) => setError(msg);

    socket.on('game-state', handleState);
    socket.on('seat-error', handleSeatError);
    socket.on('move-error', handleMoveError);

    return () => {
      socket.off('game-state', handleState);
      socket.off('seat-error', handleSeatError);
      socket.off('move-error', handleMoveError);
    };
  }, [socket]);

  const joinSeat = useCallback(
    (seatId: SeatId) => {
      if (!socket) return;
      socket.emit('join-seat', { seatId, playerName: myPlayerName });
      setMySeatId(seatId);
      setError(null);
    },
    [socket, myPlayerName]
  );

  const leaveSeat = useCallback(() => {
    if (!socket) return;
    socket.emit('leave-seat');
    setMySeatId(null);
    setError(null);
  }, [socket]);

  const selectPiece = useCallback(
    (square: string) => {
      if (!socket) return;
      socket.emit('select-piece', { square });
    },
    [socket]
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!socket) return;
      socket.emit('make-move', { from, to, promotion });
    },
    [socket]
  );

  const newGame = useCallback(() => {
    if (!socket) return;
    socket.emit('new-game');
  }, [socket]);

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
        makeMove,
        newGame,
        error,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
