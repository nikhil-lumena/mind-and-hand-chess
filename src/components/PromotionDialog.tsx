'use client';

import React from 'react';
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
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Promote Pawn</h3>
        <div className={styles.options}>
          {PROMOTION_PIECES.map((p) => (
            <button key={p.key} className={styles.option} onClick={() => onSelect(p.key)} title={p.label}>
              <span className={styles.pieceIcon}>
                {color === 'white' ? p.white : p.black}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
