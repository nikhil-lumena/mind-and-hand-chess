'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { ConfirmDialog } from './ConfirmDialog';

interface ResetGameButtonProps {
  className?: string;
  label?: string;
}

/**
 * "Reset game" with a confirmation step. Anyone can use it, seated or not, so
 * a room can always be unstuck when players vanish mid-game.
 */
export function ResetGameButton({ className = '', label = 'Reset game' }: ResetGameButtonProps) {
  const { resetGame } = useGame();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await resetGame();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button type="button" className={`btn btn-danger ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden="true">↺</span> {label}
      </button>
      {open && (
        <ConfirmDialog
          icon="↺"
          danger
          busy={busy}
          title="Reset the game?"
          message="This clears the board and empties all four seats. Everyone gets sent back to the lobby."
          confirmLabel="Yes, reset it"
          cancelLabel="Keep playing"
          onConfirm={handleConfirm}
          onCancel={() => !busy && setOpen(false)}
        />
      )}
    </>
  );
}
