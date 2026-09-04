'use client';

import React, { useEffect } from 'react';
import styles from './PromotionDialog.module.css';

const PROMOTION_PIECES = [
  { key: 'q', white: '♕', black: '♛', label: 'Queen' },
  { key: 'r', white: '♖', black: '♜', label: 'Rook' },
  { key: 'b', white: '♗', black: '♝', label: 'Bishop' },
  { key: 'n', white: '♘', black: '♞', label: 'Knight' },
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
          Level up!
        </h3>
        <p className={styles.hint}>Pick what your pawn becomes</p>
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
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
