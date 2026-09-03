'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import type { SyncTally, TeamColor } from '@/shared/types';
import styles from './GameOverOverlay.module.css';

function pct(t: SyncTally): string {
  return t.total === 0 ? '—' : `${Math.round((t.synced / t.total) * 100)}%`;
}

export function GameOverOverlay() {
  const { gameState, newGame, leaveSeat } = useGame();

  let title = '';
  let subtitle = '';
  let icon = '½';
  let winner: TeamColor | null = null;

  if (gameState.status === 'checkmate') {
    winner = gameState.winner!;
    title = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins`;
    subtitle = 'Checkmate';
    icon = winner === 'white' ? '♔' : '♚';
  } else if (gameState.status === 'stalemate') {
    title = 'Draw';
    subtitle = 'Stalemate — no legal moves';
  } else if (gameState.status === 'draw') {
    title = 'Draw';
    subtitle = gameState.drawReason || 'Game drawn';
  }

  const { white, black } = gameState.syncTally;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div className={`${styles.dialog} ${winner ? styles.dialogWin : ''}`}>
        <div className={`${styles.icon} ${winner ? styles.iconWin : ''}`} aria-hidden="true">
          {icon}
        </div>
        <h2 id="game-over-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {gameState.syncMode && (
          <div className={styles.syncSummary}>
            <div className={styles.syncSummaryTitle}>
              <span aria-hidden="true">🔗</span> Mind ↔ Hand sync
            </div>
            <div className={styles.syncStats}>
              <div className={styles.syncStat}>
                <span className={styles.syncStatTeam}>♔ White</span>
                <span className={styles.syncStatValue}>{pct(white)}</span>
                <span className={styles.syncStatDetail}>
                  {white.synced}/{white.total} moves
                </span>
              </div>
              <div className={styles.syncStat}>
                <span className={styles.syncStatTeam}>♚ Black</span>
                <span className={styles.syncStatValue}>{pct(black)}</span>
                <span className={styles.syncStatDetail}>
                  {black.synced}/{black.total} moves
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.newGameBtn} onClick={newGame}>
            Play again
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={leaveSeat}>
            Leave seat
          </button>
        </div>
      </div>
    </div>
  );
}
