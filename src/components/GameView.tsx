'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { ChessBoard } from './ChessBoard';
import { InfoPanel } from './InfoPanel';
import { TurnBanner } from './TurnBanner';
import { GameOverOverlay } from './GameOverOverlay';
import { seatLabel } from '@/shared/types';
import styles from './GameView.module.css';

export function GameView() {
  const { gameState, mySeatId, leaveSeat, error, clearError } = useGame();
  const isGameOver = ['checkmate', 'stalemate', 'draw'].includes(gameState.status);

  return (
    <div className={styles.gameView}>
      <TurnBanner />

      {error && (
        <div className={styles.error} onClick={clearError}>
          {error}
        </div>
      )}

      <div className={styles.gameLayout}>
        <InfoPanel side="left" />
        <div className={styles.boardWrapper}>
          <ChessBoard />
        </div>
        <InfoPanel side="right" />
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.myRole}>
          {mySeatId && (
            <>
              <span className={styles.roleBadge}>{seatLabel(mySeatId)}</span>
              <button className={styles.leaveBtn} onClick={leaveSeat}>
                Leave Seat
              </button>
            </>
          )}
        </div>
      </div>

      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
