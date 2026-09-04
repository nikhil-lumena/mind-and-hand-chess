'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { useSound } from '@/context/SoundContext';
import { seatTeam, type SyncTally, type TeamColor } from '@/shared/types';
import styles from './GameOverOverlay.module.css';

function pct(t: SyncTally): string {
  return t.total === 0 ? '—' : `${Math.round((t.synced / t.total) * 100)}%`;
}

type Result = 'victory' | 'defeat' | 'win' | 'draw';

export function GameOverOverlay() {
  const { gameState, newGame, leaveSeat, mySeatId } = useGame();
  const { streaks } = useSound();
  const myTeam: TeamColor | null = mySeatId ? seatTeam(mySeatId) : null;

  let result: Result = 'draw';
  let title = "It's a draw";
  let subtitle = gameState.status === 'stalemate' ? 'Stalemate — no legal moves' : gameState.drawReason || 'Game drawn';
  let icon = '🤝';

  if (gameState.status === 'checkmate' && gameState.winner) {
    const winner = gameState.winner;
    const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
    if (myTeam === winner) {
      result = 'victory';
      title = 'Victory!';
      subtitle = `${winnerName} delivers checkmate`;
      icon = '🏆';
    } else if (myTeam) {
      result = 'defeat';
      title = 'Defeat';
      subtitle = `${winnerName} got you with checkmate`;
      icon = '💀';
    } else {
      result = 'win';
      title = `${winnerName} wins!`;
      subtitle = 'Checkmate';
      icon = '🏆';
    }
  }

  const { white, black } = gameState.syncTally;
  const bestStreak = Math.max(streaks.white, streaks.black);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div className={`${styles.dialog} ${styles[result]}`}>
        {(result === 'victory' || result === 'win') && (
          <div className={styles.stars} aria-hidden="true">
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
        )}
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
        <h2 id="game-over-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{gameState.moves.length}</span>
            <span className={styles.statLabel}>moves</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {gameState.capturedPieces.white.length + gameState.capturedPieces.black.length}
            </span>
            <span className={styles.statLabel}>captures</span>
          </div>
          {gameState.syncMode && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{bestStreak > 0 ? `🔥${bestStreak}` : '—'}</span>
              <span className={styles.statLabel}>best combo</span>
            </div>
          )}
        </div>

        {gameState.syncMode && (
          <div className={styles.syncSummary}>
            <div className={styles.syncSummaryTitle}>
              <span aria-hidden="true">🔗</span> Mind ↔ Hand sync
            </div>
            <div className={styles.syncStats}>
              <div className={`${styles.syncStat} ${styles.syncStatWhite}`}>
                <span className={styles.syncStatTeam}>♔ White</span>
                <span className={styles.syncStatValue}>{pct(white)}</span>
                <span className={styles.syncStatDetail}>
                  {white.synced}/{white.total} moves
                </span>
              </div>
              <div className={`${styles.syncStat} ${styles.syncStatBlack}`}>
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
          <button type="button" className={`btn btn-block ${result === 'defeat' ? 'btn-success' : 'btn-primary'}`} onClick={newGame}>
            {result === 'defeat' ? 'Rematch!' : 'Play again'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={leaveSeat}>
            Leave seat
          </button>
        </div>
      </div>
    </div>
  );
}
