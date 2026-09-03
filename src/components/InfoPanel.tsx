'use client';

import React, { useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { MoveRecord, SEAT_IDS, seatTeam, seatRole, SyncTally, TeamColor } from '@/shared/types';
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

function Section({ title, icon, children, accent }: { title: string; icon?: string; children: React.ReactNode; accent?: string }) {
  return (
    <section className={`${styles.section} ${accent ?? ''}`}>
      <h3 className={styles.sectionTitle}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlayersSection() {
  const { gameState, mySeatId } = useGame();
  const teams: TeamColor[] = ['white', 'black'];

  return (
    <Section title="Players">
      {teams.map((team) => (
        <div key={team} className={`${styles.teamGroup} ${team === 'white' ? styles.whiteGroup : styles.blackGroup}`}>
          <div className={styles.teamHeader}>
            <span aria-hidden="true">{team === 'white' ? '♔' : '♚'}</span> {team.charAt(0).toUpperCase() + team.slice(1)}
          </div>
          {SEAT_IDS.filter((s) => seatTeam(s) === team).map((seatId) => {
            const seat = gameState.seats[seatId];
            const role = seatRole(seatId);
            const isActive =
              gameState.status === 'playing' &&
              gameState.turn === team &&
              (((gameState.phase === 'mind-selecting' || gameState.phase === 'mind-intent') && role === 'mind') ||
                (gameState.phase === 'hand-moving' && role === 'hand'));
            const isMe = seatId === mySeatId;

            return (
              <div key={seatId} className={`${styles.playerRow} ${isActive ? styles.activePlayer : ''}`}>
                <span className={styles.roleEmoji} aria-hidden="true">
                  {role === 'mind' ? '🧠' : '🤚'}
                </span>
                <span className={styles.playerLabel} title={seat.playerName ?? undefined}>
                  {seat.playerName || <span className={styles.empty}>Empty</span>}
                </span>
                {isMe && <span className={styles.meTag}>you</span>}
                {isActive && <span className={styles.activeDot} aria-label="active" />}
              </div>
            );
          })}
        </div>
      ))}
    </Section>
  );
}

function SyncBar({ team, tally }: { team: TeamColor; tally: SyncTally }) {
  const pct = tally.total === 0 ? 0 : Math.round((tally.synced / tally.total) * 100);
  return (
    <div className={styles.syncRow}>
      <div className={styles.syncMeta}>
        <span className={styles.syncLabel}>
          <span aria-hidden="true">{team === 'white' ? '♔' : '♚'}</span> {team === 'white' ? 'White' : 'Black'}
        </span>
        <span className={styles.syncValue}>
          {tally.total === 0 ? '—' : `${tally.synced}/${tally.total}`}
          {tally.total > 0 && <span className={styles.syncPct}>{pct}%</span>}
        </span>
      </div>
      <div className={styles.syncTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.syncFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SyncTallySection() {
  const { gameState } = useGame();
  const { white, black } = gameState.syncTally;
  const reveal = gameState.lastSyncReveal;

  return (
    <Section title="Mind ↔ Hand sync" icon="🔗" accent={styles.syncSection}>
      <SyncBar team="white" tally={white} />
      <SyncBar team="black" tally={black} />
      {reveal && (
        <div className={`${styles.syncRevealBadge} ${reveal.inSync ? styles.syncBadgeGreen : styles.syncBadgeRed}`}>
          <span aria-hidden="true">{reveal.inSync ? '✓' : '✕'}</span>
          {reveal.inSync ? 'Last move in sync' : `Mind wanted ${reveal.mindTo}`}
        </div>
      )}
    </Section>
  );
}

function CapturedPieces() {
  const { gameState } = useGame();

  const whiteCaptures = gameState.capturedPieces.white;
  const blackCaptures = gameState.capturedPieces.black;

  const whiteScore = whiteCaptures.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0);
  const blackScore = blackCaptures.reduce((s, p) => s + (PIECE_VALUE[p] || 0), 0);

  const rows: Array<{ label: string; pieces: string[]; advantage: number }> = [
    { label: 'White took', pieces: whiteCaptures, advantage: whiteScore - blackScore },
    { label: 'Black took', pieces: blackCaptures, advantage: blackScore - whiteScore },
  ];

  return (
    <Section title="Captured">
      {rows.map((row) => (
        <div key={row.label} className={styles.capturedRow}>
          <span className={styles.capturedLabel}>{row.label}</span>
          <span className={styles.capturedPieces}>
            {row.pieces.length > 0 ? row.pieces.map((p, i) => <span key={i}>{PIECE_UNICODE[p] || p}</span>) : <span className={styles.empty}>—</span>}
          </span>
          {row.advantage > 0 && <span className={styles.advantage}>+{row.advantage}</span>}
        </div>
      ))}
    </Section>
  );
}

function MoveList() {
  const { gameState } = useGame();
  const listRef = useRef<HTMLDivElement>(null);

  const pairs: { white?: MoveRecord; black?: MoveRecord }[] = [];
  for (const move of gameState.moves) {
    if (move.team === 'white') {
      pairs.push({ white: move });
    } else if (pairs.length > 0 && !pairs[pairs.length - 1].black) {
      pairs[pairs.length - 1].black = move;
    } else {
      pairs.push({ black: move });
    }
  }

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [gameState.moves.length]);

  const lastMove = gameState.moves[gameState.moves.length - 1];

  return (
    <Section title={`Moves${gameState.moves.length ? ` · ${gameState.moves.length}` : ''}`}>
      <div className={styles.moveList} ref={listRef}>
        {pairs.length === 0 && <span className={styles.empty}>No moves yet</span>}
        {pairs.map((pair, i) => (
          <div key={i} className={styles.moveRow}>
            <span className={styles.moveNum}>{i + 1}.</span>
            <span className={`${styles.moveEntry} ${pair.white === lastMove ? styles.moveLatest : ''}`}>{pair.white?.san || '…'}</span>
            <span className={`${styles.moveEntry} ${pair.black && pair.black === lastMove ? styles.moveLatest : ''}`}>{pair.black?.san || ''}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
