'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { SEAT_IDS, seatLabel, seatTeam, seatRole, TeamColor } from '@/shared/types';
import styles from './InfoPanel.module.css';

const PIECE_UNICODE: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, P: 1, N: 3, B: 3, R: 5, Q: 9 };

interface InfoPanelProps {
  side: 'left' | 'right';
}

export function InfoPanel({ side }: InfoPanelProps) {
  const { gameState } = useGame();

  if (side === 'left') {
    return (
      <div className={styles.panel}>
        <PlayersSection />
        {gameState.syncMode && <SyncTallySection />}
        <CapturedPieces />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <MoveList />
    </div>
  );
}

function PlayersSection() {
  const { gameState } = useGame();
  const teams: TeamColor[] = ['white', 'black'];

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Players</h3>
      {teams.map((team) => (
        <div key={team} className={styles.teamGroup}>
          <div className={`${styles.teamHeader} ${team === 'white' ? styles.whiteHeader : styles.blackHeader}`}>
            {team === 'white' ? '♔' : '♚'} {team.charAt(0).toUpperCase() + team.slice(1)}
          </div>
          {SEAT_IDS.filter((s) => seatTeam(s) === team).map((seatId) => {
            const seat = gameState.seats[seatId];
            const role = seatRole(seatId);
            const isActive =
              gameState.status === 'playing' &&
              gameState.turn === team &&
              (((gameState.phase === 'mind-selecting' || gameState.phase === 'mind-intent') && role === 'mind') ||
                (gameState.phase === 'hand-moving' && role === 'hand'));

            return (
              <div key={seatId} className={`${styles.playerRow} ${isActive ? styles.activePlayer : ''}`}>
                <span className={styles.roleEmoji}>{role === 'mind' ? '🧠' : '🤚'}</span>
                <span className={styles.playerLabel}>
                  {seat.playerName || <span className={styles.empty}>Empty</span>}
                </span>
                {isActive && <span className={styles.activeDot} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SyncTallySection() {
  const { gameState } = useGame();
  const { white, black } = gameState.syncTally;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>🔗 Mind↔Hand Sync</h3>
      <div className={styles.syncRow}>
        <span className={styles.syncLabel}>♔ White:</span>
        <span className={styles.syncValue}>
          {white.total === 0 ? '—' : `${white.synced}/${white.total}`}
        </span>
        {white.total > 0 && (
          <span className={styles.syncPct}>
            {Math.round((white.synced / white.total) * 100)}%
          </span>
        )}
      </div>
      <div className={styles.syncRow}>
        <span className={styles.syncLabel}>♚ Black:</span>
        <span className={styles.syncValue}>
          {black.total === 0 ? '—' : `${black.synced}/${black.total}`}
        </span>
        {black.total > 0 && (
          <span className={styles.syncPct}>
            {Math.round((black.synced / black.total) * 100)}%
          </span>
        )}
      </div>
      {gameState.lastSyncReveal && (
        <div className={`${styles.syncRevealBadge} ${gameState.lastSyncReveal.inSync ? styles.syncBadgeGreen : styles.syncBadgeRed}`}>
          {gameState.lastSyncReveal.inSync ? '✓ In Sync!' : '✗ Out of Sync'}
        </div>
      )}
    </div>
  );
}

function CapturedPieces() {
  const { gameState } = useGame();

  const whiteCaptures = gameState.capturedPieces.white;
  const blackCaptures = gameState.capturedPieces.black;

  const whiteScore = whiteCaptures.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0);
  const blackScore = blackCaptures.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Captured</h3>
      <div className={styles.capturedRow}>
        <span className={styles.capturedLabel}>White took:</span>
        <span className={styles.capturedPieces}>
          {whiteCaptures.length > 0
            ? whiteCaptures.map((p, i) => <span key={i}>{PIECE_UNICODE[p] || p}</span>)
            : '—'}
        </span>
        {whiteScore > blackScore && <span className={styles.advantage}>+{whiteScore - blackScore}</span>}
      </div>
      <div className={styles.capturedRow}>
        <span className={styles.capturedLabel}>Black took:</span>
        <span className={styles.capturedPieces}>
          {blackCaptures.length > 0
            ? blackCaptures.map((p, i) => <span key={i}>{PIECE_UNICODE[p] || p}</span>)
            : '—'}
        </span>
        {blackScore > whiteScore && <span className={styles.advantage}>+{blackScore - whiteScore}</span>}
      </div>
    </div>
  );
}

function MoveList() {
  const { gameState } = useGame();

  const pairs: { num: number; white?: typeof gameState.moves[0]; black?: typeof gameState.moves[0] }[] = [];
  for (const move of gameState.moves) {
    if (move.team === 'white') {
      pairs.push({ num: Math.ceil(pairs.length + 1), white: move });
    } else {
      if (pairs.length > 0 && !pairs[pairs.length - 1].black) {
        pairs[pairs.length - 1].black = move;
      } else {
        pairs.push({ num: pairs.length + 1, black: move });
      }
    }
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Moves</h3>
      <div className={styles.moveList}>
        {pairs.length === 0 && <span className={styles.empty}>No moves yet</span>}
        {pairs.map((pair, i) => (
          <div key={i} className={styles.moveRow}>
            <span className={styles.moveNum}>{i + 1}.</span>
            <span className={styles.moveEntry}>{pair.white?.san || '…'}</span>
            <span className={styles.moveEntry}>{pair.black?.san || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
