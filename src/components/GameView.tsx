'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { ChessBoard } from './ChessBoard';
import { InfoPanel } from './InfoPanel';
import { TurnBanner } from './TurnBanner';
import { GameOverOverlay } from './GameOverOverlay';
import { ResetGameButton } from './ResetGameButton';
import { Countdown } from './Countdown';
import { ReactionFloats, ReactionTray } from './Reactions';
import { seatLabel, seatRole } from '@/shared/types';
import styles from './GameView.module.css';

export function GameView() {
  const { gameState, mySeatId, leaveSeat, error, clearError } = useGame();
  const isGameOver = ['checkmate', 'stalemate', 'draw'].includes(gameState.status);
  const myRole = mySeatId ? seatRole(mySeatId) : null;

  return (
    <div className={styles.gameView}>
      <TurnBanner />

      {error && (
        <button type="button" className={styles.error} onClick={clearError}>
          <span aria-hidden="true">⚠</span> {error}
          <span className={styles.errorDismiss}>dismiss</span>
        </button>
      )}

      <div className={styles.gameLayout}>
        <div className={styles.leftPanel}>
          <InfoPanel side="left" />
        </div>
        <div className={styles.boardWrapper}>
          <ChessBoard />
          <ReactionFloats />
        </div>
        <div className={styles.rightPanel}>
          <InfoPanel side="right" />
        </div>
      </div>

      <ReactionTray />

      <div className={styles.bottomBar}>
        {mySeatId && (
          <span className={styles.roleBadge}>
            <span className={styles.roleBadgeIcon} aria-hidden="true">
              {myRole === 'mind' ? '🧠' : '🤚'}
            </span>
            You&apos;re {seatLabel(mySeatId)}
          </span>
        )}
        <div className={styles.bottomActions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={leaveSeat}>
            Leave seat
          </button>
          <ResetGameButton className="btn-sm" />
        </div>
      </div>

      <Countdown />
      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
