export type TeamColor = 'white' | 'black';
export type Role = 'mind' | 'hand';
export type SeatId = 'white-mind' | 'white-hand' | 'black-mind' | 'black-hand';

export interface Seat {
  id: SeatId;
  team: TeamColor;
  role: Role;
  playerName: string | null;
  playerId: string | null;
  connected: boolean;
}

export type GamePhase = 'mind-selecting' | 'hand-moving';

export type GameStatus = 'waiting' | 'playing' | 'checkmate' | 'stalemate' | 'draw';

export interface MoveRecord {
  moveNumber: number;
  from: string;
  to: string;
  san: string;
  piece: string;
  selectedBy: string;
  movedBy: string;
  team: TeamColor;
}

export interface GameState {
  fen: string;
  turn: TeamColor;
  phase: GamePhase;
  selectedSquare: string | null;
  status: GameStatus;
  winner: TeamColor | null;
  drawReason: string | null;
  isCheck: boolean;
  moves: MoveRecord[];
  capturedPieces: { white: string[]; black: string[] };
  seats: Record<SeatId, Seat>;
}

export interface ServerToClientEvents {
  'game-state': (state: GameState) => void;
  'seat-error': (msg: string) => void;
  'move-error': (msg: string) => void;
  'player-joined': (data: { seatId: SeatId; playerName: string }) => void;
  'player-left': (data: { seatId: SeatId; playerName: string }) => void;
}

export interface ClientToServerEvents {
  'join-seat': (data: { seatId: SeatId; playerName: string }) => void;
  'leave-seat': () => void;
  'select-piece': (data: { square: string }) => void;
  'make-move': (data: { from: string; to: string; promotion?: string }) => void;
  'new-game': () => void;
}

export const SEAT_IDS: SeatId[] = ['white-mind', 'white-hand', 'black-mind', 'black-hand'];

export function seatLabel(seatId: SeatId): string {
  const parts = seatId.split('-');
  return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)}`;
}

export function seatTeam(seatId: SeatId): TeamColor {
  return seatId.startsWith('white') ? 'white' : 'black';
}

export function seatRole(seatId: SeatId): Role {
  return seatId.endsWith('mind') ? 'mind' : 'hand';
}
