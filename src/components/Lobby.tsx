'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { GameState, SeatId, SEAT_IDS, seatTeam, seatRole, TeamColor } from '@/shared/types';
import { ResetGameButton } from './ResetGameButton';
import styles from './Lobby.module.css';

const ROLE_META = {
  mind: { icon: '🧠', name: 'Mind', blurb: 'Picks the piece' },
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
  const anyoneSeated = filled > 0;

  return (
    <div className={styles.lobby}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.heading}>Pick your seat!</h2>
          <p className={styles.description}>
            Type a name, grab a role. The match starts the moment all four seats are taken.
          </p>
        </div>

        <div className={styles.nameRow}>
          <label className={styles.nameLabel} htmlFor="display-name">
            Your name
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
          <div className={styles.seatPips}>
            {SEAT_IDS.map((s) => (
              <span
                key={s}
                className={`${styles.seatPip} ${gameState.seats[s].playerName ? styles.seatPipFilled : ''}`}
              />
            ))}
          </div>
          <span className={styles.seatProgressText}>
            {filled === 4 ? 'Full house!' : `${filled} / 4 seated`}
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
              The Mind secretly drags a full move too. After the Hand moves, see if you were thinking alike.
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

        {(inProgress || anyoneSeated) && (
          <div className={styles.footer}>
            <p className={styles.statusNote}>
              {inProgress ? (
                <>
                  <span aria-hidden="true">♟</span> A match is in progress. Grab an open seat to jump in.
                </>
              ) : (
                <>
                  <span aria-hidden="true">👋</span> Waiting on more players. Stuck with ghosts? Reset the room.
                </>
              )}
            </p>
            <ResetGameButton className="btn-sm" label="Reset room" />
          </div>
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
                {occupied ? seat.playerName : <span className={styles.openSeat}>{role.blurb}</span>}
              </div>
            </div>
            {occupied ? (
              <span className={styles.takenBadge} title="Seat taken">
                ✓
              </span>
            ) : (
              <button
                type="button"
                className={`btn btn-primary btn-sm ${styles.joinBtn}`}
                disabled={disabled}
                onClick={() => onJoin(seatId)}
                title={disabled ? 'Enter a name first' : `Sit as ${team} ${role.name}`}
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
