'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useSound } from '@/context/SoundContext';
import { ChessBoard } from './ChessBoard';
import { InfoPanel } from './InfoPanel';
import { TurnBanner } from './TurnBanner';
import { GameOverOverlay } from './GameOverOverlay';
import { ResetGameButton } from './ResetGameButton';
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
          <SyncToast />
        </div>
        <div className={styles.rightPanel}>
          <InfoPanel side="right" />
        </div>
      </div>

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

      {isGameOver && <GameOverOverlay />}
    </div>
  );
}

const TOAST_DURATION_MS = 2400;

function SyncToast() {
  const { syncEvent } = useSound();
  const [visibleId, setVisibleId] = useState<number | null>(null);

  useEffect(() => {
    if (!syncEvent) return;
    setVisibleId(syncEvent.id);
    const timer = window.setTimeout(() => setVisibleId(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [syncEvent]);

  if (!syncEvent || visibleId !== syncEvent.id) return null;

  const { reveal } = syncEvent;
  const team = reveal.team === 'white' ? 'White' : 'Black';

  return (
    <div
      key={syncEvent.id}
      className={`${styles.toast} ${reveal.inSync ? styles.toastSuccess : styles.toastFail}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.toastIcon} aria-hidden="true">
        {reveal.inSync ? '✓' : '✕'}
      </span>
      <div className={styles.toastBody}>
        <strong>{reveal.inSync ? 'In sync!' : 'Out of sync'}</strong>
        <span className={styles.toastDetail}>
          {reveal.inSync
            ? `${team} Mind and Hand both chose ${reveal.mindTo}`
            : `${team} Mind wanted ${reveal.mindTo}, Hand played ${reveal.handTo}`}
        </span>
      </div>
    </div>
  );
}
