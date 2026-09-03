'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { GameState, SeatId, SEAT_IDS, seatTeam, seatRole, TeamColor } from '@/shared/types';
import styles from './Lobby.module.css';

const ROLE_META = {
  mind: { icon: '🧠', name: 'Mind', blurb: 'Chooses the piece' },
  hand: { icon: '🤚', name: 'Hand', blurb: 'Makes the move' },
} as const;

export function Lobby() {
  const { gameState, myPlayerName, joinSeat, toggleSyncMode, error, clearError } = useGame();
  const [nameInput, setNameInput] = useState(myPlayerName);

  const handleJoin = (seatId: SeatId) => {
    const name = nameInput.trim();
    if (!name) return;
    joinSeat(seatId, name);
  };

  const filled = SEAT_IDS.filter((s) => gameState.seats[s].playerName !== null).length;
  const canJoin = nameInput.trim().length > 0;
  const inProgress = gameState.status !== 'waiting';

  return (
    <div className={styles.lobby}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.eyebrow}>Lobby</span>
          <h2 className={styles.heading}>Take a seat</h2>
          <p className={styles.description}>
            Enter your name and claim a role. The game begins the moment all four seats are filled.
          </p>
        </div>

        <div className={styles.nameRow}>
          <label className={styles.nameLabel} htmlFor="display-name">
            Display name
          </label>
          <div className={styles.nameField}>
            <input
              id="display-name"
              className={styles.nameInput}
              type="text"
              placeholder="e.g. Magnus"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
            />
            <span className={styles.nameCount}>{nameInput.length}/20</span>
          </div>
        </div>

        {error && (
          <button type="button" className={styles.error} onClick={clearError}>
            <span aria-hidden="true">⚠</span> {error}
            <span className={styles.errorDismiss}>dismiss</span>
          </button>
        )}

        <div className={styles.seatProgress} aria-label={`${filled} of 4 seats filled`}>
          <div className={styles.seatDots}>
            {SEAT_IDS.map((s) => (
              <span
                key={s}
                className={`${styles.seatDot} ${gameState.seats[s].playerName ? styles.seatDotFilled : ''}`}
              />
            ))}
          </div>
          <span className={styles.seatProgressText}>
            {filled === 4 ? 'All seats filled' : `${filled} / 4 seats filled`}
          </span>
        </div>

        <div className={styles.teamsRow}>
          <TeamColumn team="white" gameState={gameState} disabled={!canJoin} onJoin={handleJoin} />
          <div className={styles.vs} aria-hidden="true">
            <span>VS</span>
          </div>
          <TeamColumn team="black" gameState={gameState} disabled={!canJoin} onJoin={handleJoin} />
        </div>

        <div className={styles.syncCard}>
          <div className={styles.syncIcon} aria-hidden="true">
            🔗
          </div>
          <div className={styles.syncText}>
            <strong>Sync Mode</strong>
            <span className={styles.syncDesc}>
              The Mind secretly drags a full move too. After the Hand moves, see whether you were thinking alike.
            </span>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${gameState.syncMode ? styles.toggleOn : ''}`}
            onClick={() => toggleSyncMode(!gameState.syncMode)}
            disabled={inProgress}
            role="switch"
            aria-checked={gameState.syncMode}
            aria-label="Toggle Sync Mode"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        {inProgress && (
          <p className={styles.statusNote}>
            <span aria-hidden="true">♟</span> A game is in progress — grab an open seat to jump in.
          </p>
        )}
      </div>
    </div>
  );
}

function TeamColumn({
  team,
  gameState,
  disabled,
  onJoin,
}: {
  team: TeamColor;
  gameState: GameState;
  disabled: boolean;
  onJoin: (seatId: SeatId) => void;
}) {
  const seats = SEAT_IDS.filter((s) => seatTeam(s) === team);
  const teamClass = team === 'white' ? styles.whiteTeam : styles.blackTeam;

  return (
    <div className={`${styles.teamColumn} ${teamClass}`}>
      <h3 className={styles.teamLabel}>
        <span className={styles.teamGlyph} aria-hidden="true">
          {team === 'white' ? '♔' : '♚'}
        </span>
        {team === 'white' ? 'White' : 'Black'}
      </h3>
      {seats.map((seatId) => {
        const seat = gameState.seats[seatId];
        const occupied = seat.playerName !== null;
        const role = ROLE_META[seatRole(seatId)];
        return (
          <div key={seatId} className={`${styles.seatCard} ${occupied ? styles.seatOccupied : ''}`}>
            <div className={styles.roleTile} aria-hidden="true">
              {role.icon}
            </div>
            <div className={styles.seatInfo}>
              <div className={styles.roleName}>{role.name}</div>
              <div className={styles.playerName}>
                {occupied ? (
                  seat.playerName
                ) : (
                  <span className={styles.openSeat}>{role.blurb}</span>
                )}
              </div>
            </div>
            {occupied ? (
              <span className={styles.takenBadge} title="Seat taken">
                ✓
              </span>
            ) : (
              <button
                type="button"
                className={styles.joinBtn}
                disabled={disabled}
                onClick={() => onJoin(seatId)}
                title={disabled ? 'Enter a display name first' : `Sit as ${team} ${role.name}`}
              >
                Sit
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
