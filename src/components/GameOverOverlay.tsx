'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import styles from './GameOverOverlay.module.css';

export function GameOverOverlay() {
  const { gameState, newGame } = useGame();

  let title = '';
  let subtitle = '';

  if (gameState.status === 'checkmate') {
    const winner = gameState.winner!;
    title = `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!`;
    subtitle = 'Checkmate';
  } else if (gameState.status === 'stalemate') {
    title = 'Draw';
    subtitle = 'Stalemate — no legal moves';
  } else if (gameState.status === 'draw') {
    title = 'Draw';
    subtitle = gameState.drawReason || 'Game drawn';
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.icon}>
          {gameState.status === 'checkmate' ? (gameState.winner === 'white' ? '♔' : '♚') : '½'}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <button className={styles.newGameBtn} onClick={newGame}>
          New Game
        </button>
      </div>
    </div>
  );
}
