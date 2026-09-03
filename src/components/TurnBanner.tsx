'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { seatLabel, SeatId } from '@/shared/types';
import styles from './TurnBanner.module.css';

export function TurnBanner() {
  const { gameState, mySeatId } = useGame();

  if (gameState.status === 'waiting') {
    return (
      <div className={`${styles.banner} ${styles.waiting}`}>
        Waiting for all players to join…
      </div>
    );
  }

  if (['checkmate', 'stalemate', 'draw'].includes(gameState.status)) {
    return null;
  }

  const activeSeatId: SeatId =
    gameState.phase === 'hand-moving'
      ? `${gameState.turn}-hand`
      : `${gameState.turn}-mind`;

  const activeSeat = gameState.seats[activeSeatId];
  const isMyTurn = mySeatId === activeSeatId;

  let phaseLabel: string;
  if (gameState.phase === 'mind-selecting') {
    phaseLabel = gameState.syncMode ? 'Mind chooses a move' : 'Mind selects a piece';
  } else if (gameState.phase === 'mind-intent') {
    phaseLabel = 'Mind picks intended destination';
  } else {
    phaseLabel = 'Hand makes a move';
  }

  const turnTeamClass = gameState.turn === 'white' ? styles.whiteTurn : styles.blackTurn;

  return (
    <div className={`${styles.banner} ${turnTeamClass} ${isMyTurn ? styles.myTurn : ''}`}>
      <span className={styles.teamBadge}>
        {gameState.turn === 'white' ? '♔' : '♚'} {gameState.turn.toUpperCase()}
      </span>
      <span className={styles.phaseText}>{phaseLabel}</span>
      <span className={styles.playerText}>
        {activeSeat.playerName || seatLabel(activeSeatId)}
        {isMyTurn && <span className={styles.youTag}>YOUR TURN</span>}
      </span>
      {gameState.isCheck && <span className={styles.checkBadge}>CHECK</span>}
    </div>
  );
}
