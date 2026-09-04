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

export type GamePhase = 'mind-selecting' | 'mind-intent' | 'hand-moving';

export type GameStatus = 'waiting' | 'playing' | 'checkmate' | 'stalemate' | 'draw';

export interface MindIntent {
  from: string;
  to: string;
}

export interface SyncTally {
  synced: number;
  total: number;
}

export interface SyncReveal {
  team: TeamColor;
  mindFrom: string;
  mindTo: string;
  handTo: string;
  inSync: boolean;
}

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
  syncMode: boolean;
  syncTally: { white: SyncTally; black: SyncTally };
  lastSyncReveal: SyncReveal | null;
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

/* ---- Emoji reactions ---- */

export const REACTION_EMOJIS = ['🔥', '😂', '😱', '👏', '🤯', '💀', '🧠', '🤚'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface Reaction {
  id: string;
  emoji: ReactionEmoji;
  name: string;
  team: TeamColor | null;
  /** Epoch ms. */
  at: number;
}
