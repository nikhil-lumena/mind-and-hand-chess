'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { SeatId, SEAT_IDS, seatLabel, seatTeam, seatRole } from '@/shared/types';
import styles from './Lobby.module.css';

const ROLE_ICONS: Record<string, string> = {
  mind: '🧠',
  hand: '🤚',
};

export function Lobby() {
  const { gameState, myPlayerName, setMyPlayerName, joinSeat, error, clearError } = useGame();
  const [nameInput, setNameInput] = useState(myPlayerName);

  const handleJoin = (seatId: SeatId) => {
    const name = nameInput.trim();
    if (!name) return;
    setMyPlayerName(name);
    joinSeat(seatId);
  };

  const whiteSeats = SEAT_IDS.filter((s) => seatTeam(s) === 'white');
  const blackSeats = SEAT_IDS.filter((s) => seatTeam(s) === 'black');

  return (
    <div className={styles.lobby}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Join a Game</h2>
        <p className={styles.description}>
          Enter your name and pick a seat. The game begins when all four seats are filled.
        </p>

        <div className={styles.nameRow}>
          <input
            className={styles.nameInput}
            type="text"
            placeholder="Your display name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={20}
          />
        </div>

        {error && (
          <div className={styles.error} onClick={clearError}>
            {error}
          </div>
        )}

        <div className={styles.teamsRow}>
          <TeamColumn
            teamLabel="White Team"
            seats={whiteSeats}
            gameState={gameState}
            disabled={!nameInput.trim()}
            onJoin={handleJoin}
            teamClass={styles.whiteTeam}
          />
          <div className={styles.vs}>VS</div>
          <TeamColumn
            teamLabel="Black Team"
            seats={blackSeats}
            gameState={gameState}
            disabled={!nameInput.trim()}
            onJoin={handleJoin}
            teamClass={styles.blackTeam}
          />
        </div>

        {gameState.status !== 'waiting' && (
          <p className={styles.statusNote}>A game is currently in progress. Join an open seat to participate.</p>
        )}
      </div>
    </div>
  );
}

function TeamColumn({
  teamLabel,
  seats,
  gameState,
  disabled,
  onJoin,
  teamClass,
}: {
  teamLabel: string;
  seats: SeatId[];
  gameState: any;
  disabled: boolean;
  onJoin: (seatId: SeatId) => void;
  teamClass: string;
}) {
  return (
    <div className={`${styles.teamColumn} ${teamClass}`}>
      <h3 className={styles.teamLabel}>{teamLabel}</h3>
      {seats.map((seatId) => {
        const seat = gameState.seats[seatId];
        const occupied = seat.playerName !== null;
        const role = seatRole(seatId);
        return (
          <div key={seatId} className={`${styles.seatCard} ${occupied ? styles.seatOccupied : ''}`}>
            <div className={styles.seatInfo}>
              <span className={styles.roleIcon}>{ROLE_ICONS[role]}</span>
              <div>
                <div className={styles.roleName}>{seatLabel(seatId)}</div>
                <div className={styles.playerName}>
                  {occupied ? seat.playerName : 'Open seat'}
                </div>
              </div>
            </div>
            {!occupied && (
              <button
                className={styles.joinBtn}
                disabled={disabled}
                onClick={() => onJoin(seatId)}
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
