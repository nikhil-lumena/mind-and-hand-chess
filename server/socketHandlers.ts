import { Server, Socket } from 'socket.io';
import {
  GameState,
  SeatId,
  SEAT_IDS,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../src/shared/types';
import {
  createInitialState,
  allSeatsOccupied,
  trySelectPiece,
  tryMakeMove,
} from '../src/shared/gameEngine';

let gameState: GameState = createInitialState();
const playerSockets: Map<string, SeatId> = new Map();

function broadcastState(io: Server) {
  io.emit('game-state', gameState);
}

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.emit('game-state', gameState);

    socket.on('join-seat', ({ seatId, playerName }) => {
      if (!SEAT_IDS.includes(seatId)) {
        socket.emit('seat-error', 'Invalid seat.');
        return;
      }

      const currentSeatId = playerSockets.get(socket.id);
      if (currentSeatId) {
        gameState.seats[currentSeatId].playerName = null;
        gameState.seats[currentSeatId].playerId = null;
        gameState.seats[currentSeatId].connected = false;
        playerSockets.delete(socket.id);
      }

      const seat = gameState.seats[seatId];
      if (seat.playerName !== null && seat.playerId !== socket.id) {
        socket.emit('seat-error', 'That seat is already taken.');
        return;
      }

      seat.playerName = playerName.trim().slice(0, 20) || 'Player';
      seat.playerId = socket.id;
      seat.connected = true;
      playerSockets.set(socket.id, seatId);

      if (gameState.status === 'waiting' && allSeatsOccupied(gameState)) {
        gameState.status = 'playing';
      }

      io.emit('player-joined', { seatId, playerName: seat.playerName });
      broadcastState(io);
    });

    socket.on('leave-seat', () => {
      const seatId = playerSockets.get(socket.id);
      if (!seatId) return;

      const playerName = gameState.seats[seatId].playerName || 'Player';
      gameState.seats[seatId].playerName = null;
      gameState.seats[seatId].playerId = null;
      gameState.seats[seatId].connected = false;
      playerSockets.delete(socket.id);

      if (gameState.status === 'playing') {
        gameState.status = 'waiting';
        gameState.selectedSquare = null;
        gameState.phase = 'mind-selecting';
      }

      io.emit('player-left', { seatId, playerName });
      broadcastState(io);
    });

    socket.on('select-piece', ({ square }) => {
      const result = trySelectPiece(gameState, square, socket.id);
      if (!result.success) {
        socket.emit('move-error', result.error || 'Cannot select that piece.');
        return;
      }
      gameState = result.newState!;
      broadcastState(io);
    });

    socket.on('make-move', ({ from, to, promotion }) => {
      const result = tryMakeMove(gameState, from, to, promotion, socket.id);
      if (!result.success) {
        socket.emit('move-error', result.error || 'Invalid move.');
        return;
      }
      gameState = result.newState!;
      broadcastState(io);
    });

    socket.on('new-game', () => {
      const oldSeats = gameState.seats;
      gameState = createInitialState();
      for (const id of SEAT_IDS) {
        gameState.seats[id] = oldSeats[id];
      }
      if (allSeatsOccupied(gameState)) {
        gameState.status = 'playing';
      }
      broadcastState(io);
    });

    socket.on('disconnect', () => {
      const seatId = playerSockets.get(socket.id);
      if (seatId) {
        const playerName = gameState.seats[seatId].playerName || 'Player';
        gameState.seats[seatId].playerName = null;
        gameState.seats[seatId].playerId = null;
        gameState.seats[seatId].connected = false;
        playerSockets.delete(socket.id);

        if (gameState.status === 'playing') {
          gameState.status = 'waiting';
          gameState.selectedSquare = null;
          gameState.phase = 'mind-selecting';
        }

        io.emit('player-left', { seatId, playerName });
        broadcastState(io);
      }
    });
  });
}
