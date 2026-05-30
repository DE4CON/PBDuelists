# Prismbreak — Friend Multiplayer Server (MVP)

A real, runnable Node.js server that lets two friends play Prismbreak against each
other: create a lobby, share a room code, pick hero + deck, ready up, play an
authoritative match, and reconnect if someone drops. No accounts, ranked,
matchmaking, chat, spectator, or replay — exactly the MVP scope.

The server reuses the game's **actual engine** (extracted into `engine.js`), so the
rules, combat math, and RNG are identical to single-player. The server is
authoritative: it owns game state and the RNG; clients only send actions and animate
the results.

---

## What's in here

| File | What it is |
|---|---|
| `engine.js` | The game engine, auto-extracted from `script_a.js` + `script_b.js`. Pure, deterministic, DOM-free. Shared by client and server. |
| `server.js` | The authoritative WebSocket server: rooms, room codes, lobby, ready-gating, server-driven phase flow, action validation, fog of war, reconnect. Also statically serves `./public`. |
| `client-online.js` | `OnlineSession` — the client class that implements the same Session interface as `LocalAISession`, backed by the server. Drop into the game build. |
| `build-engine.js` | Regenerates `engine.js` from the game source whenever the game changes. |
| `test-engine.js` / `test-match.js` / `test-reconnect.js` | Headless proof: engine runs under Node; two simulated clients play a full match; mid-match reconnect works. |
| `public/` | Put your networked game build (`index.html`) here. |

---

## Run it locally (fastest path)

```bash
cd prismbreak-server
npm install          # installs ws
npm test             # optional: proves engine + match + reconnect (all green)
npm start            # serves game on http://localhost:8080 and the socket on the same origin
```

Two people on the same machine/LAN: open `http://localhost:8080` (or
`http://<your-LAN-ip>:8080`) in two browsers, one creates a lobby, the other joins
with the code.

> Until you drop a networked `index.html` into `public/`, `npm start` still runs the
> socket server — you just won't have a page to open. The match/reconnect tests prove
> the server works without any page.

---

## Regenerating the engine

`engine.js` is generated from the game source, so it never drifts from the real rules.
After changing the game:

```bash
npm run build-engine     # reads ../build/script_a.js + ../build/script_b.js
```

(Adjust the paths in `package.json` to wherever your game source lives.)

---

## Client integration (the remaining work)

The server is complete and tested. The client side is where you wire `OnlineSession`
into the existing game. Three hook points:

**1. Include the module.** Add before the game's closing script:
```html
<script src="client-online.js"></script>
```

**2. Add a "Play Friend" flow.** In the menu, instead of `LocalAISession`, create an
`OnlineSession` (see the usage sketch at the top of `client-online.js`). Wire its
callbacks:
- `lobbyCode` -> show the room code with a Copy button
- `lobby` -> render opponent name / ready / connection
- `joinError` -> toast the friendly message
- `matchStart` -> build the match DOM from `payload.snapshot` (your existing
  `buildMatchDOM` + `syncBoard` already render from a state object)
- `round` / `phase` / `fx` / `combat` -> call your existing `playFx(...)` then
  `syncBoard()`; enable input only when `phase.yourTurn` is true
- `matchEnd` -> your existing result screen
- `connection` -> a small status indicator

**3. Drive the match from server messages, not the local loop.** Single-player runs
`runGame()` which orchestrates phases and calls the AI. Online, the **server** drives
phases; the client just:
- renders the snapshot it receives,
- lets the local player act **only during their phase** (`phase.yourTurn`),
- sends each move via `session.dispatch(action)` (fire-and-forget),
- animates the `fx` that comes back (yours and the opponent's) through `playFx`.

Concretely, your `doPlay(iid, lane)` / `doPower(lane)` already build an action and
call `session.dispatch(...)`. For online, that dispatch sends to the server and the
authoritative `fx` returns via the `fx` callback — so route `playFx` through the
callback instead of the synchronous return. An "End Phase" button sends
`session.endPhase()`.

This is the one genuinely new bit of client code; everything it calls
(`playFx`, `syncBoard`, `buildMatchDOM`, the setup screen) already exists.

---

## Deploying (so friends can play over the internet)

Any host that allows long-lived WebSocket connections works. Smallest path:

1. Push this folder to a host (Fly.io, Railway, Render, a VPS, etc.).
2. Ensure it serves over TLS so the socket is `wss://` (browsers block `ws://` from
   an `https://` page).
3. Set the client's `OnlineSession({ url: 'wss://your-host', ... })`.
4. `npm install && npm start` on the host (most PaaS run this automatically).

For an MVP, a single always-on process is enough. Rooms live in memory, so a server
restart drops active matches — fine for friend testing.

`PORT` and `GRACE_MS` (reconnect window, default 90s) are configurable via env vars.

---

## What's deliberately not included (MVP scope)

No database (rooms are in memory), no accounts (a per-device id handles reconnect),
no ranked/matchmaking/chat/spectator/replay, and no client-side prediction (the
client waits for the server's `fx` — simplest and always correct). Each of these is
additive later; none requires reworking what's here.

---

## Protocol reference (client <-> server)

**Client -> server:** `createLobby{id,name}`, `joinLobby{id,name,code}`,
`setLoadout{heroId,deck}`, `ready{ready}`, `action{...}`, `reconnect{id,code}`.

**Server -> client:** `lobbyCreated{code}`, `lobbyJoined{code}`, `joinError{error}`,
`lobbyState{players}`, `matchStart{side,snapshot,resumed?}`,
`roundStart{round,fx,snapshot}`, `phase{label,activeSide,allow,yourTurn,snapshot}`,
`fx{fx,snapshot}`, `combat{fx,snapshot}`, `matchEnd{winner,youWon,draw}`,
`opponentDisconnected{graceMs}`, `opponentReconnected`, `opponentLeft`,
`reconnectError{error}`, `error{error}`.

**Action types** (in an `action` message): `playCard{iid,lane}`, `heroPower{lane}`,
`endPhase`, `concede`. The server stamps the correct `side` and validates phase
legality before applying — clients are never trusted.
