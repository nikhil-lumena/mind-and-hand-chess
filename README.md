# Mind & Hand Chess

A **2v2 online chess variant** built with Next.js, TypeScript, and Socket.IO.

## The Game

Two teams — **White** and **Black** — each have two players:

| Role | What they do |
|------|-------------|
| **Mind** 🧠 | Selects which piece to move. Only pieces with legal moves can be selected. |
| **Hand** 🤚 | Moves the selected piece to a legal square. Cannot choose a different piece. |

Standard chess rules apply (piece movement, captures, castling, en passant, promotion, check, checkmate, stalemate, 50-move rule, threefold repetition, insufficient material).

**Turn flow:** White Mind selects → White Hand moves → Black Mind selects → Black Hand moves → repeat.

## How to Play

### Setup

```bash
npm install
npm run dev
```

The server starts at **http://localhost:3000**.

### Joining a Game

1. Open **four browser windows** (or share the URL with three friends).
2. Each player enters a display name and sits in one of the four seats:
   - White Mind, White Hand, Black Mind, Black Hand
3. The game starts automatically when all four seats are filled.

### During the Game

- **Mind's turn:** Selectable pieces are highlighted with a gold border. Click one.
- **Hand's turn:** The selected piece is highlighted. Legal destination squares show dots (empty) or rings (captures). Click a target square.
- **Promotion:** When a pawn reaches the last rank, the Hand picks Q / R / B / N.
- **Check** is shown as a red highlight on the king and a pulsing CHECK badge.
- **Game over** (checkmate, stalemate, draw) shows a result overlay with a New Game button.

### Spectating

If you haven't taken a seat, you can watch the board update in real time from the lobby.

## Project Structure

```
├── server/
│   ├── index.ts              # Express + Next.js + Socket.IO server
│   └── socketHandlers.ts     # WebSocket event handlers
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Entry point
│   │   └── globals.css       # Global styles
│   ├── shared/
│   │   ├── types.ts          # Shared types & constants
│   │   └── gameEngine.ts     # Game logic (chess.js wrapper)
│   ├── context/
│   │   ├── SocketContext.tsx  # Socket.IO connection
│   │   └── GameContext.tsx    # Game state management
│   └── components/
│       ├── GameContainer.tsx  # Top-level container
│       ├── Lobby.tsx          # Seat selection UI
│       ├── GameView.tsx       # In-game layout
│       ├── ChessBoard.tsx     # Interactive board
│       ├── TurnBanner.tsx     # Turn / phase indicator
│       ├── InfoPanel.tsx      # Players, captures, move list
│       ├── PromotionDialog.tsx
│       └── GameOverOverlay.tsx
```

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Socket.IO** for real-time multiplayer
- **chess.js** for move generation, validation, and game-state management
- **Express** as the HTTP/WebSocket server
- **CSS Modules** for styling

## Architecture Notes

- **Server-authoritative:** All game logic (move legality, turn order, role enforcement) is validated server-side. Clients send intents; the server accepts or rejects them.
- **Single game room:** One shared in-memory game state. No database required.
- **chess.js as source of truth:** FEN, legal moves, check/checkmate/stalemate detection all come from chess.js — no hand-rolled move generation.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (with hot reload) |
| `npm run build` | Build Next.js for production |
| `npm start` | Start production server |

## License

MIT
