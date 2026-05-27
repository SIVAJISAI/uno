# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run once from root)
npm install

# Run both frontend and server in parallel (development)
npm run dev

# Run only the backend
npm run dev:server

# Run only the frontend
npm run dev:frontend

# Build frontend for production
npm run build

# Run production build (builds frontend then serves via Node)
npm start
```

- Frontend runs on **http://localhost:5173**
- Backend runs on **http://localhost:3000**
- The Vite dev server proxies `/ws` → `ws://localhost:3000` and `/api` → `http://localhost:3000`, so the frontend connects to WebSocket at `window.location.host/ws` regardless of environment.

There is no test suite and no linter configured.

## Architecture

This is a real-time multiplayer UNO game. The repo is a monorepo with a Node.js WebSocket backend and a React frontend sharing the same `package.json`.

### Backend — `server/src/`

All game logic is authoritative on the server. The frontend never manipulates game state directly.

- **`app.js`** — Entry point. Creates the Hono HTTP server + `ws` WebSocket server. Each incoming WS connection gets a `clientId` (`client_<random>`). All game actions are handled in a single `switch` on `message.type` using `CLIENT_EVENTS`. Broadcasts room/game updates to connected clients via `broadcastToRoom()` and `broadcastGameStateToRoom()`.

- **`game/roomManager.js`** — The core stateful class. Holds two `Map`s: `rooms` (keyed by `roomId`) and `clients` (keyed by `clientId`). Owns all game logic methods: `createRoom`, `addPlayerToRoom`, `joinRoom`, `startGame`, `playCard`, `playPowerCard`, `selectColor`, `drawCard`, `removePlayer`. Game state (deck, discardPile, turn index, direction, pendingDrawCount, etc.) lives in the room object.

- **`game/deck.js`** — Pure functions: card generation, shuffle, draw, replenish deck from discard.

- **`game/rules.js`** — `isPlayable(card, topCard, activeColor)` — the single rule validation function.

- **`game/events.js`** — Shared event name constants: `CLIENT_EVENTS`, `ROOM_EVENTS`, `POWER_EVENTS`.

- **`utils/id.js`** — `createRoomId()` (4 uppercase letters + 1 digit, e.g. `XKQM7`) and `createClientId()`.

### Frontend — `frontend/src/`

- **`App.jsx`** — Root component. Holds all shared state (user, room, gameState) and the single `useWebSocket` instance. Routes between `LoginPage`, `LobbyPage`, and `GamePage` based on state. All WebSocket message handling lives in the `handleMessage` callback here.

- **`hooks/useWebSocket.js`** — Manages a single WebSocket connection. Exposes `{ socketReady, sendMessage }`. Connects to `/ws` relative to `window.location.host`.

- **`components/`**
  - `LoginPage.jsx` — Username input; sends `LOGIN` event.
  - `LobbyPage.jsx` — Create/join room UI; sends `CREATE_ROOM` / `JOIN_ROOM` / `START_GAME`.
  - `GamePage.jsx` — Main game table. Circular player layout, center draw/discard piles, game status panel.
  - `CardHand.jsx` — Renders the current player's hand in a fan layout with hover/select animations (framer-motion).
  - `PlayerCircle.jsx` — Renders opponents around the table with card-back counts.
  - `WinnerOverlay.jsx` — Victory modal shown to all players on `GAME_FINISHED`.

### WebSocket Message Protocol

All messages are JSON `{ type, payload }`.

**Client → Server** (`CLIENT_EVENTS`): `LOGIN`, `CREATE_ROOM`, `JOIN_ROOM`, `START_GAME`, `PLAY_CARD`, `PLAY_POWER_CARD`, `SELECT_COLOR`, `DRAW_CARD`

**Server → Client** (`ROOM_EVENTS`): `ROOM_CREATED`, `ROOM_UPDATED`, `GAME_STARTED`, `GAME_STATE_UPDATED`, `INVALID_MOVE`, `PLAYER_LEFT`, `GAME_FINISHED`

**Server → Client** (`POWER_EVENTS`): `POWER_CARD_PLAYED`, `DRAW_PENALTY_UPDATED`, `DIRECTION_CHANGED`, `PLAYER_SKIPPED`, `COLOR_SELECTED`

### Key Design Constraints

- The server sanitizes game state before sending to each client: other players' actual card values are hidden, only card counts are sent.
- Room IDs are case-insensitive on join (`roomId.toUpperCase()` is applied server-side).
- Power cards (Skip, Reverse, +2) and Wild cards (+4, color change) are implemented beyond the original v1 spec.
- No database — all state is in-memory. Server restart clears all rooms.
