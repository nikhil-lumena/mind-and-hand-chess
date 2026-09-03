import { Chess, Square, Move } from 'chess.js';
import {
  GameState,
  GameStatus,
  TeamColor,
  GamePhase,
  MoveRecord,
  MindIntent,
  SyncReveal,
  Seat,
  SeatId,
  SEAT_IDS,
} from './types';

function createEmptySeats(): Record<SeatId, Seat> {
  const seats = {} as Record<SeatId, Seat>;
  for (const id of SEAT_IDS) {
    seats[id] = {
      id,
      team: id.startsWith('white') ? 'white' : 'black',
      role: id.endsWith('mind') ? 'mind' : 'hand',
      playerName: null,
      playerId: null,
      connected: false,
    };
  }
  return seats;
}

export function createInitialState(): GameState {
  const chess = new Chess();
  return {
    fen: chess.fen(),
    turn: 'white',
    phase: 'mind-selecting',
    selectedSquare: null,
    status: 'waiting',
    winner: null,
    drawReason: null,
    isCheck: false,
    moves: [],
    capturedPieces: { white: [], black: [] },
    seats: createEmptySeats(),
    syncMode: false,
    syncTally: {
      white: { synced: 0, total: 0 },
      black: { synced: 0, total: 0 },
    },
    lastSyncReveal: null,
  };
}

export function allSeatsOccupied(state: GameState): boolean {
  return SEAT_IDS.every((id) => state.seats[id].playerName !== null);
}

export function getSelectablePieces(fen: string, turn: TeamColor): string[] {
  const chess = new Chess(fen);
  const color = turn === 'white' ? 'w' : 'b';
  const selectableSquares: string[] = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const sq = (String.fromCharCode(97 + c) + (8 - r)) as Square;
        const moves = chess.moves({ square: sq, verbose: true });
        if (moves.length > 0) {
          selectableSquares.push(sq);
        }
      }
    }
  }
  return selectableSquares;
}

export function getLegalMovesForSquare(fen: string, square: string): Move[] {
  const chess = new Chess(fen);
  return chess.moves({ square: square as Square, verbose: true });
}

export function trySelectPiece(
  state: GameState,
  square: string,
  playerId: string
): { success: boolean; error?: string; newState?: GameState } {
  if (state.status !== 'playing') {
    return { success: false, error: 'Game is not in progress.' };
  }
  if (state.phase !== 'mind-selecting' && state.phase !== 'mind-intent') {
    return { success: false, error: 'Not the Mind selection phase.' };
  }

  const mindSeatId: SeatId = `${state.turn}-mind`;
  const mindSeat = state.seats[mindSeatId];
  if (mindSeat.playerId !== playerId) {
    return { success: false, error: 'It is not your turn to select.' };
  }

  const chess = new Chess(state.fen);
  const piece = chess.get(square as Square);
  if (!piece) {
    return { success: false, error: 'No piece on that square.' };
  }

  const expectedColor = state.turn === 'white' ? 'w' : 'b';
  if (piece.color !== expectedColor) {
    return { success: false, error: 'That piece belongs to the other team.' };
  }

  const moves = chess.moves({ square: square as Square, verbose: true });
  if (moves.length === 0) {
    return { success: false, error: 'That piece has no legal moves.' };
  }

  const nextPhase: GamePhase = state.syncMode ? 'mind-intent' : 'hand-moving';

  return {
    success: true,
    newState: {
      ...state,
      selectedSquare: square,
      phase: nextPhase,
    },
  };
}

export function trySetMindIntent(
  state: GameState,
  to: string,
  playerId: string
): { success: boolean; error?: string; newState?: GameState; mindIntent?: MindIntent } {
  if (state.status !== 'playing') {
    return { success: false, error: 'Game is not in progress.' };
  }
  if (state.phase !== 'mind-intent') {
    return { success: false, error: 'Not the Mind intent phase.' };
  }
  if (!state.selectedSquare) {
    return { success: false, error: 'No piece selected.' };
  }

  const mindSeatId: SeatId = `${state.turn}-mind`;
  const mindSeat = state.seats[mindSeatId];
  if (mindSeat.playerId !== playerId) {
    return { success: false, error: 'It is not your turn to set intent.' };
  }

  const chess = new Chess(state.fen);
  const legalMoves = chess.moves({ square: state.selectedSquare as Square, verbose: true });
  const isLegal = legalMoves.some((m) => m.to === to);
  if (!isLegal) {
    return { success: false, error: 'That is not a legal destination for the selected piece.' };
  }

  return {
    success: true,
    newState: {
      ...state,
      phase: 'hand-moving',
    },
    mindIntent: { from: state.selectedSquare, to },
  };
}

export function trySelectMindMove(
  state: GameState,
  from: string,
  to: string,
  playerId: string
): { success: boolean; error?: string; newState?: GameState; mindIntent?: MindIntent } {
  const selected = trySelectPiece(state, from, playerId);
  if (!selected.success || !selected.newState) {
    return selected;
  }
  if (!state.syncMode) {
    return selected;
  }
  return trySetMindIntent(selected.newState, to, playerId);
}

export function tryMakeMove(
  state: GameState,
  from: string,
  to: string,
  promotion: string | undefined,
  playerId: string,
  mindIntent?: MindIntent | null
): { success: boolean; error?: string; newState?: GameState } {
  if (state.status !== 'playing') {
    return { success: false, error: 'Game is not in progress.' };
  }
  if (state.phase !== 'hand-moving') {
    return { success: false, error: 'Not the Hand moving phase.' };
  }

  const handSeatId: SeatId = `${state.turn}-hand`;
  const handSeat = state.seats[handSeatId];
  if (handSeat.playerId !== playerId) {
    return { success: false, error: 'It is not your turn to move.' };
  }

  if (state.selectedSquare !== from) {
    return { success: false, error: 'You must move the piece selected by Mind.' };
  }

  const chess = new Chess(state.fen);

  const legalMoves = chess.moves({ square: from as Square, verbose: true });
  const targetMove = legalMoves.find((m) => m.to === to && (!m.promotion || m.promotion === promotion));
  if (!targetMove) {
    return { success: false, error: 'That is not a legal move for the selected piece.' };
  }

  const moveResult = chess.move({
    from: from as Square,
    to: to as Square,
    promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
  });

  if (!moveResult) {
    return { success: false, error: 'Illegal move.' };
  }

  const capturedPieces = {
    white: [...state.capturedPieces.white],
    black: [...state.capturedPieces.black],
  };
  if (moveResult.captured) {
    const capturedBy = state.turn;
    const capturedPieceChar =
      state.turn === 'white'
        ? moveResult.captured.toLowerCase()
        : moveResult.captured.toUpperCase();
    capturedPieces[capturedBy].push(capturedPieceChar);
  }

  const mindSeatId: SeatId = `${state.turn}-mind`;
  const mindSeat = state.seats[mindSeatId];

  const moveRecord: MoveRecord = {
    moveNumber: state.moves.length + 1,
    from,
    to,
    san: moveResult.san,
    piece: moveResult.piece,
    selectedBy: mindSeat.playerName || 'Mind',
    movedBy: handSeat.playerName || 'Hand',
    team: state.turn,
  };

  const newTurn: TeamColor = state.turn === 'white' ? 'black' : 'white';
  let newStatus: GameStatus = 'playing';
  let winner: TeamColor | null = null;
  let drawReason: string | null = null;

  if (chess.isCheckmate()) {
    newStatus = 'checkmate';
    winner = state.turn;
  } else if (chess.isStalemate()) {
    newStatus = 'stalemate';
    drawReason = 'Stalemate';
  } else if (chess.isDraw()) {
    newStatus = 'draw';
    if (chess.isThreefoldRepetition()) {
      drawReason = 'Threefold repetition';
    } else if (chess.isInsufficientMaterial()) {
      drawReason = 'Insufficient material';
    } else {
      drawReason = '50-move rule';
    }
  }

  let lastSyncReveal: SyncReveal | null = null;
  const syncTally = {
    white: { ...state.syncTally.white },
    black: { ...state.syncTally.black },
  };

  if (state.syncMode && mindIntent) {
    const inSync = mindIntent.to === to;
    lastSyncReveal = {
      team: state.turn,
      mindFrom: mindIntent.from,
      mindTo: mindIntent.to,
      handTo: to,
      inSync,
    };
    syncTally[state.turn].total += 1;
    if (inSync) {
      syncTally[state.turn].synced += 1;
    }
  }

  return {
    success: true,
    newState: {
      ...state,
      fen: chess.fen(),
      turn: newTurn,
      phase: 'mind-selecting',
      selectedSquare: null,
      status: newStatus,
      winner,
      drawReason,
      isCheck: chess.isCheck(),
      moves: [...state.moves, moveRecord],
      capturedPieces,
      syncTally,
      lastSyncReveal,
    },
  };
}

export function needsPromotion(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const moves = chess.moves({ square: from as Square, verbose: true });
  return moves.some((m) => m.to === to && m.promotion);
}
