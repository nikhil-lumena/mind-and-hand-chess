'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useSound } from '@/context/SoundContext';
import { Lobby } from './Lobby';
import { GameView } from './GameView';
import { Backdrop } from './Backdrop';
import styles from './GameContainer.module.css';

export function GameContainer() {
  const { mySeatId, gameState } = useGame();
  const { connected } = useRealtime();
  const { muted, toggleMuted } = useSound();

  const showLobby = !mySeatId;

  return (
    <div className={styles.container}>
      <Backdrop />
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoMark} aria-hidden="true">
            <span className={styles.logoGlyph}>♞</span>
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Mind &amp; Hand</h1>
            <span className={styles.subtitle}>2v2 chess · one picks, one moves</span>
          </div>
        </div>

        <div className={styles.actions}>
          {gameState.syncMode && (
            <span className={styles.modeChip} title="Sync Mode is on">
              <span aria-hidden="true">🔗</span> Sync
            </span>
          )}

          <button
            type="button"
            className={`${styles.iconBtn} ${muted ? styles.iconBtnMuted : ''}`}
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            title={muted ? 'Sound off' : 'Sound on'}
          >
            <SpeakerIcon muted={muted} />
          </button>

          <div className={`${styles.statusChip} ${connected ? styles.statusLive : styles.statusOffline}`} role="status">
            <span className={styles.dot} />
            <span className={styles.statusText}>{connected ? 'Live' : 'Connecting'}</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>{showLobby ? <Lobby /> : <GameView />}</main>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}
