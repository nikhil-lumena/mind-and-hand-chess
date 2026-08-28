'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/context/SocketContext';
import { Lobby } from './Lobby';
import { GameView } from './GameView';
import styles from './GameContainer.module.css';

export function GameContainer() {
  const { gameState, mySeatId } = useGame();
  const { connected } = useSocket();

  const showLobby = !mySeatId;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Mind &amp; Hand Chess</h1>
          <span className={styles.subtitle}>2v2 Chess Variant</span>
        </div>
        <div className={styles.connectionBadge}>
          <span
            className={`${styles.dot} ${connected ? styles.dotConnected : styles.dotDisconnected}`}
          />
          {connected ? 'Connected' : 'Connecting…'}
        </div>
      </header>
      <main className={styles.main}>
        {showLobby ? <Lobby /> : <GameView />}
      </main>
    </div>
  );
}
