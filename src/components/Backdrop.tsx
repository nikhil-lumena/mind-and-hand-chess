'use client';

import React from 'react';
import styles from './Backdrop.module.css';

/* Static so server and client render identically. */
const PIECES: Array<{ glyph: string; left: number; size: number; delay: number; duration: number }> = [
  { glyph: '♞', left: 4, size: 64, delay: 0, duration: 26 },
  { glyph: '♛', left: 14, size: 96, delay: 6, duration: 34 },
  { glyph: '♜', left: 24, size: 52, delay: 12, duration: 22 },
  { glyph: '♝', left: 36, size: 72, delay: 3, duration: 30 },
  { glyph: '♟', left: 47, size: 44, delay: 9, duration: 20 },
  { glyph: '♚', left: 58, size: 110, delay: 15, duration: 38 },
  { glyph: '♞', left: 68, size: 58, delay: 1, duration: 24 },
  { glyph: '♜', left: 78, size: 80, delay: 11, duration: 32 },
  { glyph: '♟', left: 87, size: 48, delay: 5, duration: 21 },
  { glyph: '♝', left: 94, size: 66, delay: 17, duration: 28 },
];

export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={styles.piece}
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
