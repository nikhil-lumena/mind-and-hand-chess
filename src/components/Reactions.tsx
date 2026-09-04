'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { useSound } from '@/context/SoundContext';
import { playReact } from '@/lib/sounds';
import { HAPTIC, vibrate } from '@/lib/haptics';
import { REACTION_EMOJIS, type Reaction, type ReactionEmoji } from '@/shared/types';
import styles from './Reactions.module.css';

const COOLDOWN_MS = 350;

/** Row of chunky emoji buttons players tap to react. */
export function ReactionTray() {
  const { sendReaction } = useGame();
  const lastRef = useRef(0);
  const [pressed, setPressed] = useState<ReactionEmoji | null>(null);

  const tap = (emoji: ReactionEmoji) => {
    const now = Date.now();
    if (now - lastRef.current < COOLDOWN_MS) return;
    lastRef.current = now;
    setPressed(emoji);
    window.setTimeout(() => setPressed((p) => (p === emoji ? null : p)), 220);
    sendReaction(emoji);
  };

  return (
    <div className={styles.tray} role="toolbar" aria-label="Send a reaction">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`${styles.trayBtn} ${pressed === emoji ? styles.trayBtnPressed : ''}`}
          onClick={() => tap(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Floating layer of incoming reactions; render inside a `position: relative` box. */
export function ReactionFloats() {
  const { reactions } = useGame();
  const { muted } = useSound();
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const r of reactions) {
      if (playedRef.current.has(r.id)) continue;
      playedRef.current.add(r.id);
      if (!muted) playReact(r.emoji.codePointAt(0) ?? 0);
      vibrate(HAPTIC.tap);
    }
  }, [reactions, muted]);

  return (
    <div className={styles.floats} aria-live="polite">
      {reactions.map((r) => (
        <FloatingReaction key={r.id} reaction={r} />
      ))}
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function FloatingReaction({ reaction }: { reaction: Reaction }) {
  const style = useMemo(() => {
    const h = hash(reaction.id);
    return {
      left: `${12 + (h % 76)}%`,
      animationDuration: `${2.4 + ((h >> 8) % 6) / 10}s`,
      '--drift': `${((h >> 4) % 80) - 40}px`,
      '--tilt': `${((h >> 12) % 30) - 15}deg`,
    } as React.CSSProperties;
  }, [reaction.id]);

  const teamClass = reaction.team === 'white' ? styles.tagWhite : reaction.team === 'black' ? styles.tagBlack : '';

  return (
    <div className={styles.float} style={style}>
      <span className={styles.emoji}>{reaction.emoji}</span>
      <span className={`${styles.tag} ${teamClass}`}>{reaction.name}</span>
    </div>
  );
}
