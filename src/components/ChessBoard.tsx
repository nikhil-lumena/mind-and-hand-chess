'use client';

import React, { useMemo, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { getSelectablePieces, getLegalMovesForSquare, needsPromotion } from '@/shared/gameEngine';
import { seatRole, seatTeam } from '@/shared/types';
import { PromotionDialog } from './PromotionDialog';
import styles from './ChessBoard.module.css';

const PIECE_UNICODE: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

function fenToBoard(fen: string): (string | null)[][] {
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function squareName(row: number, col: number): string {
  return String.fromCharCode(97 + col) + (8 - row);
}

export function ChessBoard() {
  const { gameState, mySeatId, selectPiece, makeMove } = useGame();
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  const board = useMemo(() => fenToBoard(gameState.fen), [gameState.fen]);

  const myRole = mySeatId ? seatRole(mySeatId) : null;
  const myTeam = mySeatId ? seatTeam(mySeatId) : null;

  const isMindTurn =
    gameState.status === 'playing' &&
    gameState.phase === 'mind-selecting' &&
    myRole === 'mind' &&
    myTeam === gameState.turn;

  const isHandTurn =
    gameState.status === 'playing' &&
    gameState.phase === 'hand-moving' &&
    myRole === 'hand' &&
    myTeam === gameState.turn;

  const selectableSquares = useMemo(() => {
    if (!isMindTurn) return new Set<string>();
    return new Set(getSelectablePieces(gameState.fen, gameState.turn));
  }, [isMindTurn, gameState.fen, gameState.turn]);

  const legalTargets = useMemo(() => {
    if (!isHandTurn || !gameState.selectedSquare) return new Set<string>();
    const moves = getLegalMovesForSquare(gameState.fen, gameState.selectedSquare);
    return new Set(moves.map((m) => m.to));
  }, [isHandTurn, gameState.fen, gameState.selectedSquare]);

  const kingInCheckSquare = useMemo(() => {
    if (!gameState.isCheck) return null;
    const turnColor = gameState.turn === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === turnColor) return squareName(r, c);
      }
    }
    return null;
  }, [gameState.isCheck, gameState.turn, board]);

  const handleSquareClick = (row: number, col: number) => {
    const sq = squareName(row, col);

    if (isMindTurn && selectableSquares.has(sq)) {
      selectPiece(sq);
      return;
    }

    if (isHandTurn && gameState.selectedSquare && legalTargets.has(sq)) {
      if (needsPromotion(gameState.fen, gameState.selectedSquare, sq)) {
        setPromotionPending({ from: gameState.selectedSquare, to: sq });
      } else {
        makeMove(gameState.selectedSquare, sq);
      }
      return;
    }
  };

  const handlePromotion = (piece: string) => {
    if (promotionPending) {
      makeMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    }
  };

  const flipBoard = myTeam === 'black';

  const renderBoard = () => {
    const rows = [];
    for (let displayRow = 0; displayRow < 8; displayRow++) {
      const actualRow = flipBoard ? 7 - displayRow : displayRow;
      const cells = [];
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const actualCol = flipBoard ? 7 - displayCol : displayCol;
        const sq = squareName(actualRow, actualCol);
        const piece = board[actualRow][actualCol];
        const isLight = (actualRow + actualCol) % 2 === 0;
        const isSelected = gameState.selectedSquare === sq;
        const isSelectable = selectableSquares.has(sq);
        const isLegalTarget = legalTargets.has(sq);
        const isCheckSquare = kingInCheckSquare === sq;

        let cellClass = `${styles.cell} ${isLight ? styles.light : styles.dark}`;
        if (isSelected) cellClass += ` ${styles.selected}`;
        if (isCheckSquare) cellClass += ` ${styles.check}`;
        if (isSelectable) cellClass += ` ${styles.selectable}`;
        if (isLegalTarget) cellClass += ` ${styles.legalTarget}`;

        const clickable = isSelectable || isLegalTarget;

        cells.push(
          <div
            key={sq}
            className={cellClass}
            onClick={() => handleSquareClick(actualRow, actualCol)}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            {displayCol === 0 && (
              <span className={styles.rankLabel}>{8 - actualRow}</span>
            )}
            {displayRow === 7 && (
              <span className={styles.fileLabel}>
                {String.fromCharCode(97 + actualCol)}
              </span>
            )}
            {isLegalTarget && !piece && <span className={styles.legalDot} />}
            {isLegalTarget && piece && <span className={styles.captureRing} />}
            {piece && (
              <span
                className={`${styles.piece} ${
                  piece === piece.toUpperCase() ? styles.whitePiece : styles.blackPiece
                }`}
              >
                {PIECE_UNICODE[piece]}
              </span>
            )}
          </div>
        );
      }
      rows.push(
        <div key={displayRow} className={styles.row}>
          {cells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className={styles.boardContainer}>
      <div className={styles.board}>{renderBoard()}</div>
      {promotionPending && (
        <PromotionDialog
          color={gameState.turn}
          onSelect={handlePromotion}
          onCancel={() => setPromotionPending(null)}
        />
      )}
    </div>
  );
}
