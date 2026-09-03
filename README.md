# Mind & Hand Chess

A **2v2 online chess variant** built with Next.js, TypeScript, Pusher Channels, and Upstash Redis.
Deploys to **Vercel** as a standard Next.js app — no custom server required.

## The Game

Two teams — **White** and **Black** — each have two players:

| Role | What they do |
|------|-------------|
| **Mind** 🧠 | Selects which piece to move. Only pieces with legal moves can be selected. |
| **Hand** 🤚 | Moves the selected piece to a legal square. Cannot choose a different piece. |

Standard chess rules apply (piece movement, captures, castling, en passant, promotion, check, checkmate, stalemate, 50-move rule, threefold repetition, insufficient material).

**Turn flow:** White Mind selects → White Hand moves → Black Mind selects → Black Hand moves → repeat.

### Sync Mode (optional)

An optional **Sync Mode** can be toggled on in the lobby before the game starts. When enabled, the Mind gets an extra step after selecting a piece: they secretly choose an **intended destination** (where they want the Hand to move). The Hand never sees this intent while making their move.

After the Hand moves, the Mind's intended destination is revealed to everyone:

- **Green arrow** — Mind and Hand chose the same square (in sync!)
- **Red arrow** — Mind wanted a different square (out of sync); a blue arrow also shows where the Hand actually moved

A running tally tracks each team's sync rate: e.g. "White: 3/5 (60%)". The tally resets with each new game. When Sync Mode is off, gameplay is identical to classic Mind & Hand Chess.

---

## Prerequisites

| Service | Free tier | What it provides |
|---------|-----------|------------------|
| [Pusher Channels](https://pusher.com) | 200 K messages/day, 100 connections | Realtime pub/sub so all four players see moves instantly |
| [Upstash Redis](https://upstash.com) | 10 K commands/day | Durable game state that survives across serverless invocations |

You need API keys from both — see **Setup** below.

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/nikhil-lumena/mind-and-hand-chess.git
cd mind-and-hand-chess
npm install
```

### 2. Create service accounts

**Pusher Channels**
1. Sign up at [pusher.com](https://pusher.com).
2. Create a new **Channels** app (default settings are fine).
3. Go to the app → **App Keys** tab → copy `app_id`, `key`, `secret`, and `cluster`.

**Upstash Redis**
1. Sign up at [console.upstash.com](https://console.upstash.com).
2. Create a new Redis database (any region).
3. Under **REST API**, copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 3. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

### 4. Run locally

```bash
npm run dev
```

Open **http://localhost:3000** in four browser windows (or share the URL with friends).

---

## Deploy on Vercel

1. Push this repo to GitHub (or fork it).
2. Import the project in [Vercel](https://vercel.com/new).
3. In **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy — Vercel runs `next build` automatically.

> **Tip:** Upstash is available as a [Vercel Integration](https://vercel.com/integrations/upstash). Installing it auto-provisions the Redis database and injects the env vars.

---

## How to Play

### Joining a Game

1. Open the app in **four browser windows** (or share the URL).
2. Each player enters a display name and sits in one of the four seats:
   - White Mind, White Hand, Black Mind, Black Hand
3. The game starts automatically when all four seats are filled.

### During the Game

- **Mind's turn:** Selectable pieces are highlighted with a gold border. Click one.
- **Hand's turn:** The selected piece is highlighted. Legal destination squares show dots (empty) or rings (captures). Click a target square.
- **Promotion:** When a pawn reaches the last rank, the Hand picks Q / R / B / N.
- **Check** is shown as a red highlight on the king and a pulsing CHECK badge.
- **Sync Mode** (if enabled): After Mind selects a piece, purple dots show legal destinations — Mind clicks one as their secret intent. After Hand moves, green/red arrows reveal whether they matched. A sync tally in the side panel tracks each team's sync rate.
- **Game over** (checkmate, stalemate, draw) shows a result overlay with a New Game button.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── pusher/auth/route.ts   # Pusher presence channel auth
│   │   │   └── game/
│   │   │       ├── state/route.ts    # GET current game state
│   │   │       ├── join/route.ts     # POST join a seat
│   │   │       ├── leave/route.ts    # POST leave a seat
│   │   │       ├── select/route.ts   # POST Mind selects a piece
│   │   │       ├── intent/route.ts  # POST Mind sets secret intent (Sync Mode)
│   │   │       ├── move/route.ts     # POST Hand makes a move
│   │   │       ├── new/route.ts      # POST start a new game
│   │   │       ├── sync-mode/route.ts # POST toggle Sync Mode
│   │   │       └── cleanup/route.ts  # POST release disconnected seats
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── pusher-server.ts          # Pusher server-side client
│   │   ├── redis.ts                  # Upstash Redis client
│   │   └── gameStore.ts              # Game state CRUD + broadcast
│   ├── shared/
│   │   ├── types.ts                  # Shared types & constants
│   │   └── gameEngine.ts             # chess.js wrapper & validation
│   ├── context/
│   │   ├── RealtimeContext.tsx        # Pusher Channels connection
│   │   └── GameContext.tsx            # Game state + API actions
│   └── components/
│       ├── GameContainer.tsx
│       ├── Lobby.tsx
│       ├── GameView.tsx
│       ├── ChessBoard.tsx
│       ├── TurnBanner.tsx
│       ├── InfoPanel.tsx
│       ├── PromotionDialog.tsx
│       └── GameOverOverlay.tsx
```

## Architecture

```
 Browser (×4)                         Vercel
 ┌──────────────────┐  Pusher sub    ┌────────────────────────────┐
 │ React + Pusher   ◄────────────────┤ Pusher Channels (managed)  │
 │                  │                │                            │
 │ fetch() intents  ├───► API Route ─┤  1. Read state from Redis  │
 │                  │                │  2. Validate (chess.js)     │
 │                  │                │  3. Write state to Redis    │
 └──────────────────┘                │  4. Trigger via Pusher SDK  │
                                     └────────────────────────────┘
```

- **Server-authoritative:** All game logic runs in API routes. Clients send intents; the server accepts or rejects.
- **Durable state:** Game state lives in Upstash Redis and survives serverless cold starts.
- **Realtime sync:** Pusher Channels pushes state updates to all connected clients instantly.
- **chess.js as source of truth:** FEN, legal moves, check/checkmate/stalemate detection all come from chess.js.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Pusher Channels** for managed WebSocket pub/sub
- **Upstash Redis** for serverless-friendly durable state
- **chess.js** for move generation, validation, and game-state management
- **react-chessboard** for the interactive board UI
- **CSS Modules** for styling

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm start` | Start production server locally |
| `npm run lint` | Run ESLint |

## License

MIT
