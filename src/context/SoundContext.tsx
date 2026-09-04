'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext';
import { useFx } from './FxContext';
import { SEAT_IDS, seatTeam, type GameState, type SeatId, type SyncReveal, type TeamColor } from '@/shared/types';
import {
  playCapture,
  playCheck,
  playClick,
  playDefeat,
  playDraw,
  playFanfare,
  playFullHouse,
  playJoin,
  playMove,
  playStreak,
  playSyncFail,
  playYourTurn,
  unlockAudio,
} from '@/lib/sounds';
import { HAPTIC, vibrate } from '@/lib/haptics';

const MUTE_STORAGE_KEY = 'chess-sound-muted';

export interface SyncEvent {
  id: number;
  reveal: SyncReveal;
}

export interface StartEvent {
  id: number;
  /** Epoch ms when the game flipped to `playing`. */
  at: number;
}

export type Streaks = Record<TeamColor, number>;

interface SoundContextValue {
  muted: boolean;
  toggleMuted: () => void;
  /** The most recent sync reveal that happened live (not one loaded with initial state). */
  syncEvent: SyncEvent | null;
  /** Fires when a game starts while this client is watching. */
  startEvent: StartEvent | null;
  /** Consecutive in-sync moves per team (client-side, resets on new game). */
  streaks: Streaks;
}

const SoundContext = createContext<SoundContextValue>({
  muted: false,
  toggleMuted: () => {},
  syncEvent: null,
  startEvent: null,
  streaks: { white: 0, black: 0 },
});

export function useSound() {
  return useContext(SoundContext);
}

function revealKey(movesCount: number, reveal: SyncReveal | null): string | null {
  if (!reveal) return null;
  return `${movesCount}:${reveal.team}:${reveal.mindFrom}${reveal.mindTo}>${reveal.handTo}`;
}

function filledSeats(s: GameState): number {
  return SEAT_IDS.filter((id) => s.seats[id].playerName !== null).length;
}

function activeSeat(s: GameState): SeatId | null {
  if (s.status !== 'playing') return null;
  return `${s.turn}-${s.phase === 'hand-moving' ? 'hand' : 'mind'}`;
}

const TEAM_CONFETTI: Record<TeamColor, string[]> = {
  white: ['#fff1cf', '#ffc53d', '#ffffff', '#ffe08a'],
  black: ['#8e97ff', '#b48cff', '#4cc9f0', '#ffffff'],
};

/**
 * Watches the game state stream and turns every meaningful change into
 * sound, haptics and screen effects. Also owns the mute toggle.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { gameState, mySeatId, hydrated } = useGame();
  const fx = useFx();
  const [muted, setMuted] = useState(false);
  const [syncEvent, setSyncEvent] = useState<SyncEvent | null>(null);
  const [startEvent, setStartEvent] = useState<StartEvent | null>(null);
  const [streaks, setStreaks] = useState<Streaks>({ white: 0, black: 0 });

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const seatRef = useRef(mySeatId);
  seatRef.current = mySeatId;
  const streaksRef = useRef(streaks);
  streaksRef.current = streaks;
  const prevRef = useRef<GameState | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Autoplay policy: warm up the AudioContext on the first user gesture, and
  // give every button a satisfying click.
  useEffect(() => {
    const unlock = () => unlockAudio();
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('button');
      if (!btn || btn.disabled) return;
      if (!mutedRef.current) playClick();
      vibrate(HAPTIC.tap);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const prev = prevRef.current;
    prevRef.current = gameState;
    const key = revealKey(gameState.moves.length, gameState.lastSyncReveal);

    // The first hydrated state may already contain history; arm without playing.
    if (!prev) {
      lastKeyRef.current = key;
      return;
    }

    const sound = !mutedRef.current;
    const me = seatRef.current;
    const myTeam = me ? seatTeam(me) : null;

    /* ---- Seats ---- */
    const prevFilled = filledSeats(prev);
    const filled = filledSeats(gameState);
    if (filled > prevFilled) {
      if (filled === 4) {
        if (sound) playFullHouse();
        fx.popup({ text: 'Full house!', sub: 'Everyone is in', variant: 'green', size: 'xl' });
        fx.burst({ count: 140, spread: 120, angle: -90, y: 0.7, power: 1.2 });
      } else if (sound) {
        playJoin();
      }
    }

    /* ---- Game start ---- */
    const justStarted = prev.status !== 'playing' && gameState.status === 'playing';
    if (justStarted) {
      setStartEvent({ id: ++idRef.current, at: Date.now() });
      setStreaks({ white: 0, black: 0 });
    }

    /* ---- New game (board reset) ---- */
    if (gameState.moves.length < prev.moves.length) {
      setStreaks({ white: 0, black: 0 });
    }

    /* ---- Move / capture / check / mate ---- */
    if (gameState.moves.length > prev.moves.length) {
      const last = gameState.moves[gameState.moves.length - 1];
      const capture = last.san.includes('x');
      if (gameState.status === 'checkmate') {
        fx.popup({ text: 'Checkmate!', variant: 'red', size: 'xl' });
        fx.shake('heavy');
      } else if (gameState.isCheck) {
        if (sound) playCheck();
        fx.popup({ text: 'Check!', variant: 'red', size: 'lg' });
        fx.shake('light');
        vibrate(HAPTIC.check);
      } else if (capture) {
        if (sound) playCapture();
        fx.popup({ text: 'Capture!', variant: 'gold', size: 'md' });
        fx.shake('light');
        fx.burst({ count: 28, spread: 360, power: 0.5, colors: ['#ffc53d', '#fff1cf', '#ff5d6c'] });
        vibrate(HAPTIC.capture);
      } else {
        if (sound) playMove();
        vibrate(HAPTIC.move);
      }
    }

    /* ---- Sync reveal + combo streaks ---- */
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      const reveal = gameState.lastSyncReveal;
      if (key && reveal) {
        setSyncEvent({ id: ++idRef.current, reveal });
        const cur = streaksRef.current[reveal.team];
        if (reveal.inSync) {
          const streak = cur + 1;
          setStreaks((s) => ({ ...s, [reveal.team]: streak }));
          if (sound) playStreak(streak);
          fx.burst({ count: 90 + streak * 30, spread: 360, power: 0.9 + streak * 0.1, colors: TEAM_CONFETTI[reveal.team] });
          if (streak >= 3) {
            fx.popup({ text: `🔥 Combo x${streak}`, sub: 'On fire!', variant: 'gold', size: 'xl' });
          } else if (streak === 2) {
            fx.popup({ text: 'Combo x2', sub: 'Perfect sync', variant: 'green', size: 'xl' });
          } else {
            fx.popup({ text: 'Perfect sync!', sub: `Both picked ${reveal.mindTo}`, variant: 'green', size: 'xl' });
          }
          vibrate(HAPTIC.syncIn);
        } else {
          setStreaks((s) => ({ ...s, [reveal.team]: 0 }));
          if (sound) playSyncFail();
          fx.shake('heavy');
          fx.popup({
            text: cur >= 2 ? 'Combo lost' : 'Out of sync',
            sub: `Mind wanted ${reveal.mindTo}, Hand played ${reveal.handTo}`,
            variant: 'red',
            size: 'lg',
          });
          vibrate(HAPTIC.syncOut);
        }
      }
    }

    /* ---- Game over ---- */
    const over = ['checkmate', 'stalemate', 'draw'].includes(gameState.status);
    if (prev.status === 'playing' && over) {
      if (gameState.status === 'checkmate' && gameState.winner) {
        const iWon = myTeam === gameState.winner;
        if (iWon || !myTeam) {
          if (sound) playFanfare();
          fx.rain(4500, TEAM_CONFETTI[gameState.winner]);
          vibrate(HAPTIC.win);
        } else {
          if (sound) playDefeat();
          vibrate(HAPTIC.lose);
        }
      } else if (sound) {
        playDraw();
      }
    }

    /* ---- Your turn ---- */
    if (me && activeSeat(gameState) === me && activeSeat(prev) !== me) {
      const fire = () => {
        if (seatRef.current !== me) return;
        if (!mutedRef.current) playYourTurn();
        fx.popup({ text: 'Your turn!', kind: 'sweep', variant: 'gold' });
        vibrate(HAPTIC.yourTurn);
      };
      // Let the countdown finish before the first sweep of a new game.
      if (justStarted) window.setTimeout(fire, 3200);
      else fire();
    }
  }, [hydrated, gameState, fx]);

  const toggleMuted = useCallback(() => {
    unlockAudio();
    setMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ muted, toggleMuted, syncEvent, startEvent, streaks }}>
      {children}
    </SoundContext.Provider>
  );
}
