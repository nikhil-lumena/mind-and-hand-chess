'use client';

import React, { useEffect } from 'react';
import styles from './PromotionDialog.module.css';

const PROMOTION_PIECES = [
  { key: 'q', white: '\u2655', black: '\u265B', label: 'Queen' },
  { key: 'r', white: '\u2656', black: '\u265C', label: 'Rook' },
  { key: 'b', white: '\u2657', black: '\u265D', label: 'Bishop' },
  { key: 'n', white: '\u2658', black: '\u265E', label: 'Knight' },
];

interface PromotionDialogProps {
  color: 'white' | 'black';
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
      >
        <h3 id="promotion-title" className={styles.title}>
          Promote pawn
        </h3>
        <p className={styles.hint}>Choose the piece your pawn becomes</p>
        <div className={styles.options}>
          {PROMOTION_PIECES.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={styles.option}
              onClick={() => onSelect(p.key)}
              aria-label={p.label}
              autoFocus={i === 0}
            >
              <span className={`${styles.pieceIcon} ${color === 'white' ? styles.whitePiece : styles.blackPiece}`}>
                {color === 'white' ? p.white : p.black}
              </span>
              <span className={styles.pieceLabel}>{p.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
