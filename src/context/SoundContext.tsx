'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext';
import type { SyncReveal } from '@/shared/types';
import { playSyncFail, playSyncSuccess, unlockAudio } from '@/lib/sounds';

const MUTE_STORAGE_KEY = 'chess-sound-muted';

export interface SyncEvent {
  /** Monotonic id so consumers can re-trigger animations for identical reveals. */
  id: number;
  reveal: SyncReveal;
}

interface SoundContextValue {
  muted: boolean;
  toggleMuted: () => void;
  /** The most recent sync reveal that happened live (not one loaded with initial state). */
  syncEvent: SyncEvent | null;
}

const SoundContext = createContext<SoundContextValue>({
  muted: false,
  toggleMuted: () => {},
  syncEvent: null,
});

export function useSound() {
  return useContext(SoundContext);
}

function revealKey(movesCount: number, reveal: SyncReveal | null): string | null {
  if (!reveal) return null;
  return `${movesCount}:${reveal.team}:${reveal.mindFrom}${reveal.mindTo}>${reveal.handTo}`;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { gameState, mySeatId, hydrated } = useGame();
  const [muted, setMuted] = useState(false);
  const [syncEvent, setSyncEvent] = useState<SyncEvent | null>(null);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const seatedRef = useRef(mySeatId);
  seatedRef.current = mySeatId;
  const armedRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  const eventIdRef = useRef(0);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Autoplay policy: warm up the AudioContext on the first user gesture so that
  // network-triggered playback later on is allowed.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const key = revealKey(gameState.moves.length, gameState.lastSyncReveal);

    // The first hydrated state may already contain a reveal from before we
    // loaded the page; record it without playing anything.
    if (!armedRef.current) {
      armedRef.current = true;
      lastKeyRef.current = key;
      return;
    }

    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (!key || !gameState.lastSyncReveal) return;

    const reveal = gameState.lastSyncReveal;
    eventIdRef.current += 1;
    setSyncEvent({ id: eventIdRef.current, reveal });

    if (mutedRef.current || !seatedRef.current) return;
    if (reveal.inSync) {
      playSyncSuccess();
    } else {
      playSyncFail();
    }
  }, [hydrated, gameState.moves.length, gameState.lastSyncReveal]);

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
    <SoundContext.Provider value={{ muted, toggleMuted, syncEvent }}>
      {children}
    </SoundContext.Provider>
  );
}
