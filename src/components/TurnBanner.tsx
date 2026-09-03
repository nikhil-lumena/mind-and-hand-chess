'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { GamePhase, seatLabel, SeatId, SEAT_IDS } from '@/shared/types';
import styles from './TurnBanner.module.css';

interface Step {
  phase: GamePhase;
  icon: string;
  label: string;
}

export function TurnBanner() {
  const { gameState, mySeatId } = useGame();

  if (gameState.status === 'waiting') {
    const filled = SEAT_IDS.filter((s) => gameState.seats[s].playerName !== null).length;
    return (
      <div className={`${styles.banner} ${styles.waiting}`} role="status">
        <span className={styles.waitingDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Waiting for players</span>
        <span className={styles.waitingCount}>{filled} / 4 seated</span>
      </div>
    );
  }

  if (['checkmate', 'stalemate', 'draw'].includes(gameState.status)) {
    return null;
  }

  const activeSeatId: SeatId = gameState.phase === 'hand-moving' ? `${gameState.turn}-hand` : `${gameState.turn}-mind`;
  const activeSeat = gameState.seats[activeSeatId];
  const isMyTurn = mySeatId === activeSeatId;

  const steps: Step[] = [
    { phase: 'mind-selecting', icon: '🧠', label: gameState.syncMode ? 'Mind chooses a move' : 'Mind picks a piece' },
    ...(gameState.syncMode ? [{ phase: 'mind-intent' as GamePhase, icon: '🎯', label: 'Mind sets intent' }] : []),
    { phase: 'hand-moving', icon: '🤚', label: 'Hand moves' },
  ];
  const activeIndex = steps.findIndex((s) => s.phase === gameState.phase);

  const turnTeamClass = gameState.turn === 'white' ? styles.whiteTurn : styles.blackTurn;

  return (
    <div className={`${styles.banner} ${turnTeamClass} ${isMyTurn ? styles.myTurn : ''}`} role="status">
      <span className={styles.teamBadge}>
        <span className={styles.teamGlyph} aria-hidden="true">
          {gameState.turn === 'white' ? '♔' : '♚'}
        </span>
        {gameState.turn}
      </span>

      <ol className={styles.steps} aria-label="Turn phase">
        {steps.map((step, i) => {
          const state = i < activeIndex ? styles.stepDone : i === activeIndex ? styles.stepActive : '';
          return (
            <li key={step.phase} className={`${styles.step} ${state}`} aria-current={i === activeIndex ? 'step' : undefined}>
              <span className={styles.stepIcon} aria-hidden="true">
                {i < activeIndex ? '✓' : step.icon}
              </span>
              <span className={styles.stepLabel}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      <span className={styles.playerText}>
        <span className={styles.playerName}>{activeSeat.playerName || seatLabel(activeSeatId)}</span>
        {isMyTurn && <span className={styles.youTag}>Your turn</span>}
        {gameState.isCheck && <span className={styles.checkBadge}>Check</span>}
      </span>
    </div>
  );
}
