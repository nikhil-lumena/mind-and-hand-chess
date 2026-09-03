'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs, PieceHandlerArgs, SquareHandlerArgs } from 'react-chessboard';
import { useGame } from '@/context/GameContext';
import { getSelectablePieces, getLegalMovesForSquare, needsPromotion } from '@/shared/gameEngine';
import { seatRole, seatTeam } from '@/shared/types';
import { PromotionDialog } from './PromotionDialog';
import styles from './ChessBoard.module.css';

const BOARD_WIDTH = 560;

export function ChessBoard() {
  const { gameState, mySeatId, selectPiece, setMindIntent, makeMove } = useGame();
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  const myRole = mySeatId ? seatRole(mySeatId) : null;
  const myTeam = mySeatId ? seatTeam(mySeatId) : null;

  const isMindTurn =
    gameState.status === 'playing' &&
    gameState.phase === 'mind-selecting' &&
    myRole === 'mind' &&
    myTeam === gameState.turn;

  const isMindIntentTurn =
    gameState.status === 'playing' &&
    gameState.phase === 'mind-intent' &&
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

  const intentTargets = useMemo(() => {
    if (!isMindIntentTurn || !gameState.selectedSquare) return new Set<string>();
    const moves = getLegalMovesForSquare(gameState.fen, gameState.selectedSquare);
    return new Set(moves.map((m) => m.to));
  }, [isMindIntentTurn, gameState.fen, gameState.selectedSquare]);

  const lastMove = useMemo(() => {
    if (gameState.moves.length === 0) return null;
    const last = gameState.moves[gameState.moves.length - 1];
    return { from: last.from, to: last.to };
  }, [gameState.moves]);

  const kingInCheckSquare = useMemo(() => {
    if (!gameState.isCheck) return null;
    const rows = gameState.fen.split(' ')[0].split('/');
    const kingChar = gameState.turn === 'white' ? 'K' : 'k';
    for (let r = 0; r < rows.length; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          c += parseInt(ch);
        } else {
          if (ch === kingChar) {
            return String.fromCharCode(97 + c) + (8 - r);
          }
          c++;
        }
      }
    }
    return null;
  }, [gameState.isCheck, gameState.turn, gameState.fen]);

  const syncArrows = useMemo(() => {
    const reveal = gameState.lastSyncReveal;
    if (!reveal) return [];
    const arrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];
    if (reveal.inSync) {
      arrows.push({
        startSquare: reveal.mindFrom,
        endSquare: reveal.mindTo,
        color: 'rgba(34, 197, 94, 0.85)',
      });
    } else {
      arrows.push({
        startSquare: reveal.mindFrom,
        endSquare: reveal.mindTo,
        color: 'rgba(239, 68, 68, 0.85)',
      });
      arrows.push({
        startSquare: reveal.mindFrom,
        endSquare: reveal.handTo,
        color: 'rgba(59, 130, 246, 0.7)',
      });
    }
    return arrows;
  }, [gameState.lastSyncReveal]);

  const squareStyles = useMemo(() => {
    const s: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      s[lastMove.from] = { background: 'rgba(255, 255, 0, 0.25)' };
      s[lastMove.to] = { background: 'rgba(255, 255, 0, 0.35)' };
    }

    if (kingInCheckSquare) {
      s[kingInCheckSquare] = {
        ...s[kingInCheckSquare],
        background: 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.6) 0%, rgba(200, 0, 0, 0.3) 50%, transparent 70%)',
      };
    }

    if (gameState.selectedSquare) {
      s[gameState.selectedSquare] = {
        ...s[gameState.selectedSquare],
        background: 'rgba(240, 192, 64, 0.65)',
      };
    }

    if (isMindTurn) {
      for (const sq of selectableSquares) {
        if (!s[sq]) {
          s[sq] = { boxShadow: 'inset 0 0 0 3px rgba(240, 192, 64, 0.6)' };
        } else {
          s[sq] = { ...s[sq], boxShadow: 'inset 0 0 0 3px rgba(240, 192, 64, 0.6)' };
        }
      }
    }

    if (isMindIntentTurn && gameState.selectedSquare) {
      for (const sq of intentTargets) {
        const existingStyle = s[sq] || {};
        const fenBoard = gameState.fen.split(' ')[0];
        const hasPiece = squareHasPiece(sq, fenBoard);
        if (hasPiece) {
          s[sq] = {
            ...existingStyle,
            background: existingStyle.background || undefined,
            boxShadow: 'inset 0 0 0 4px rgba(168, 85, 247, 0.7)',
            borderRadius: '50%',
          };
        } else {
          s[sq] = {
            ...existingStyle,
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.55) 24%, transparent 25%)',
          };
        }
      }
    }

    if (isHandTurn && gameState.selectedSquare) {
      for (const sq of legalTargets) {
        const existingStyle = s[sq] || {};
        const fenBoard = gameState.fen.split(' ')[0];
        const hasPiece = squareHasPiece(sq, fenBoard);
        if (hasPiece) {
          s[sq] = {
            ...existingStyle,
            background: existingStyle.background || undefined,
            boxShadow: 'inset 0 0 0 4px rgba(78, 140, 255, 0.6)',
            borderRadius: '50%',
          };
        } else {
          s[sq] = {
            ...existingStyle,
            background: 'radial-gradient(circle, rgba(78, 140, 255, 0.45) 24%, transparent 25%)',
          };
        }
      }
    }

    return s;
  }, [lastMove, kingInCheckSquare, gameState.selectedSquare, isMindTurn, isMindIntentTurn, isHandTurn, selectableSquares, intentTargets, legalTargets, gameState.fen]);

  const canDragPiece = useCallback(
    ({ square }: PieceHandlerArgs): boolean => {
      if (!square) return false;

      if (isMindTurn && selectableSquares.has(square)) {
        return true;
      }

      if (isMindIntentTurn && gameState.selectedSquare && square === gameState.selectedSquare) {
        return true;
      }

      if (isHandTurn && gameState.selectedSquare && square === gameState.selectedSquare) {
        return true;
      }

      return false;
    },
    [isMindTurn, isMindIntentTurn, isHandTurn, selectableSquares, gameState.selectedSquare]
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;

      if (isMindTurn) {
        if (sourceSquare === targetSquare && selectableSquares.has(sourceSquare)) {
          selectPiece(sourceSquare);
          return false;
        }
        if (selectableSquares.has(sourceSquare)) {
          selectPiece(sourceSquare);
        }
        return false;
      }

      if (isMindIntentTurn && gameState.selectedSquare) {
        if (sourceSquare !== gameState.selectedSquare) return false;
        if (!intentTargets.has(targetSquare)) return false;
        setMindIntent(targetSquare);
        return false;
      }

      if (isHandTurn && gameState.selectedSquare) {
        if (sourceSquare !== gameState.selectedSquare) return false;
        if (!legalTargets.has(targetSquare)) return false;

        if (needsPromotion(gameState.fen, sourceSquare, targetSquare)) {
          setPromotionPending({ from: sourceSquare, to: targetSquare });
          return false;
        }

        makeMove(sourceSquare, targetSquare);
        return true;
      }

      return false;
    },
    [isMindTurn, isMindIntentTurn, isHandTurn, selectableSquares, intentTargets, legalTargets, gameState.selectedSquare, gameState.fen, selectPiece, setMindIntent, makeMove]
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (isMindTurn && selectableSquares.has(square)) {
        selectPiece(square);
        return;
      }

      if (isMindIntentTurn && gameState.selectedSquare && intentTargets.has(square)) {
        setMindIntent(square);
        return;
      }

      if (isHandTurn && gameState.selectedSquare && legalTargets.has(square)) {
        if (needsPromotion(gameState.fen, gameState.selectedSquare, square)) {
          setPromotionPending({ from: gameState.selectedSquare, to: square });
        } else {
          makeMove(gameState.selectedSquare, square);
        }
        return;
      }
    },
    [isMindTurn, isMindIntentTurn, isHandTurn, selectableSquares, intentTargets, legalTargets, gameState.selectedSquare, gameState.fen, selectPiece, setMindIntent, makeMove]
  );

  const handlePieceClick = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (!square) return;
      if (isMindTurn && selectableSquares.has(square)) {
        selectPiece(square);
      }
    },
    [isMindTurn, selectableSquares, selectPiece]
  );

  const handlePieceDrag = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (!square) return;
      if (isMindTurn && selectableSquares.has(square)) {
        selectPiece(square);
      }
    },
    [isMindTurn, selectableSquares, selectPiece]
  );

  const handlePromotion = (piece: string) => {
    if (promotionPending) {
      makeMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    }
  };

  const flipBoard = myTeam === 'black';

  return (
    <div className={styles.boardContainer}>
      <Chessboard
        options={{
          id: 'mind-and-hand',
          position: gameState.fen,
          boardOrientation: flipBoard ? 'black' : 'white',
          allowDragging: true,
          showNotation: true,
          animationDurationInMs: 200,
          canDragPiece,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          onPieceClick: handlePieceClick,
          onPieceDrag: handlePieceDrag,
          squareStyles,
          arrows: syncArrows,
          allowDrawingArrows: false,
          boardStyle: {
            borderRadius: '4px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            width: `${BOARD_WIDTH}px`,
            height: `${BOARD_WIDTH}px`,
          },
          darkSquareStyle: { backgroundColor: '#b08968' },
          lightSquareStyle: { backgroundColor: '#ecd5b5' },
          dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(78, 140, 255, 0.5)' },
        }}
      />
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

function squareHasPiece(square: string, fenBoard: string): boolean {
  const col = square.charCodeAt(0) - 97;
  const row = 8 - parseInt(square[1]);
  const rows = fenBoard.split('/');
  if (row < 0 || row >= rows.length) return false;
  let c = 0;
  for (const ch of rows[row]) {
    if (ch >= '1' && ch <= '8') {
      c += parseInt(ch);
    } else {
      if (c === col) return true;
      c++;
    }
    if (c > col) break;
  }
  return false;
}
