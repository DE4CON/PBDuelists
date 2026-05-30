"use strict";
/* ==========================================================================
   PRISMBREAK — friend-match multiplayer server (MVP)
   Authoritative Node server: rooms, room codes, lobby, ready-gating,
   server-driven phase flow, authoritative action dispatch, fog of war,
   and reconnect with a grace window. Reuses the shared engine verbatim.
   ========================================================================== */
const http = require('http');
const { WebSocketServer } = require('ws');
const e = require('./engine.js');

const PORT = process.env.PORT || 8080;
const GRACE_MS = Number(process.env.GRACE_MS || 90000);
const rooms = new Map();   // code -> room

const mkCode = () => 'PRISM-' + Math.floor(1000 + Math.random() * 9000);
const send = (ws, type, payload) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, payload })); };

/* ---- the asymmetric round: Vanguard setup -> Responder full -> Vanguard tricks -> combat ---- */
// allow: which action kinds are legal for the active side this phase
function phaseTable(V, R) {
  return [
    { actor: V, label: 'v-setup',  allow: { unit: true,  spell: false, power: true  } },
    { actor: R, label: 'r-full',   allow: { unit: true,  spell: true,  power: true  } },
    { actor: V, label: 'v-tricks', allow: { unit: false, spell: true,  power: false } }
  ];
}

function makeRoom() {
  let c; do { c = mkCode(); } while (rooms.has(c));
  const room = {
    code: c, players: [], state: null, log: [],
    phase: 'lobby',          // 'lobby' | 'active' | 'ended'
    phaseIdx: 0, phases: null,
    graceTimer: null
  };
  rooms.set(c, room);
  return room;
}

function lobbyView(room) {
  return {
    code: room.code, phase: room.phase,
    players: room.players.map(p => ({
      name: p.name, heroId: p.heroId, hasDeck: !!(p.deck && p.deck.length),
      ready: p.ready, connected: p.connected, side: p.side
    }))
  };
}
const broadcastLobby = room => room.players.forEach(p => send(p.ws, 'lobbyState', lobbyView(room)));

// Per-player snapshot: hide opponent hand contents + deck list, strip the RNG.
function fog(state, side) {
  const s = JSON.parse(JSON.stringify(state));
  const opp = 1 - side;
  s.players[opp].hand = s.players[opp].hand.map(() => ({ hidden: true }));
  s.players[opp].deck = s.players[opp].deck.length;
  s.players[side].deck = s.players[side].deck.length;
  delete s.rng;
  return s;
}
function pushState(room, extra) {
  room.players.forEach(p => send(p.ws, 'stateSnapshot',
    Object.assign({ snapshot: fog(room.state, p.side) }, extra || {})));
}

function startMatch(room) {
  const seed = 'rift-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  room.players[0].side = 0; room.players[1].side = 1;
  // Lobby creator (side 0) is the Vanguard for the match.
  room.state = e.createMatch({
    seed, humanSide: 0, vanguardSide: 0,
    players: room.players.map(p => ({ heroId: p.heroId, name: p.name, deck: p.deck }))
  });
  room.log = room.state.actionLog = [];
  room.phase = 'active';
  room.phases = phaseTable(0, 1);
  e.setActiveState(room.state);
  room.players.forEach(p => send(p.ws, 'matchStart', { side: p.side, seed, snapshot: fog(room.state, p.side) }));
  beginRound(room);
}

function beginRound(room) {
  e.setActiveState(room.state);
  const fx = [];
  e.roundUpkeep(fx);
  room.phaseIdx = 0;
  if (e.checkWin() != null) return endMatch(room);
  room.players.forEach(p => send(p.ws, 'roundStart', { round: room.state.round, fx, snapshot: fog(room.state, p.side) }));
  announcePhase(room);
}

function announcePhase(room) {
  const ph = room.phases[room.phaseIdx];
  room.players.forEach(p => send(p.ws, 'phase', {
    round: room.state.round, phaseIdx: room.phaseIdx, label: ph.label,
    activeSide: ph.actor, allow: ph.allow, yourTurn: p.side === ph.actor,
    snapshot: fog(room.state, p.side)
  }));
}

function advancePhase(room) {
  room.phaseIdx++;
  if (room.phaseIdx < room.phases.length) { announcePhase(room); return; }
  runCombat(room);
}

// Server-authoritative combat: mirrors the client's resolveCombat math exactly
// (both strikes snapshotted per lane, Vanguard applied first, then Responder).
function runCombat(room) {
  e.setActiveState(room.state);
  const fxAll = [];
  for (let i = 0; i < 5; i++) {
    const { sV, sR, V, R } = e.resolveLaneStrikes(i);
    if (sV) { const fx = []; e.applyStrike(sV, V, fx); e.reapDead(fx); fxAll.push(...fx); }
    if (e.checkWin() != null) break;
    if (sR) { const fx = []; e.applyStrike(sR, R, fx); e.reapDead(fx); fxAll.push(...fx); }
    if (e.checkWin() != null) break;
  }
  e.coreDispatch(room.log, { type: 'endCombat' });
  room.players.forEach(p => send(p.ws, 'combat', { fx: fxAll, snapshot: fog(room.state, p.side) }));
  if (e.checkWin() != null) return endMatch(room);
  beginRound(room);
}

function endMatch(room) {
  room.phase = 'ended';
  const w = e.checkWin();
  room.players.forEach(p => send(p.ws, 'matchEnd', {
    winner: w, youWon: w === p.side, draw: w === 'draw', snapshot: fog(room.state, p.side)
  }));
}

// Validate + apply one gameplay action from a player.
function handleAction(room, player, action) {
  if (room.phase !== 'active') return send(player.ws, 'error', { error: 'No active match.' });
  const ph = room.phases[room.phaseIdx];
  if (player.side !== ph.actor) return send(player.ws, 'error', { error: 'Not your turn.' });

  if (action.type === 'endPhase') { advancePhase(room); return; }
  if (action.type === 'concede') {
    e.setActiveState(room.state); room.state.winner = 1 - player.side; return endMatch(room);
  }

  // phase legality for plays/powers
  if (action.type === 'playCard') {
    const inst = room.state.players[player.side].hand.find(h => h.iid === action.iid);
    if (!inst) return send(player.ws, 'error', { error: 'Card not in hand.' });
    const card = e.getCard(inst.cardId);
    if (card.type === 'unit' && !ph.allow.unit) return send(player.ws, 'error', { error: 'No units this phase.' });
    if (card.type === 'spell' && !ph.allow.spell) return send(player.ws, 'error', { error: 'No tricks this phase.' });
  } else if (action.type === 'heroPower' && !ph.allow.power) {
    return send(player.ws, 'error', { error: 'No hero power this phase.' });
  }

  e.setActiveState(room.state);
  action.side = player.side;                       // trust server's side, not the client's
  const res = e.coreDispatch(room.log, action);
  if (!res.ok) return send(player.ws, 'error', { error: res.error });
  room.players.forEach(p => send(p.ws, 'fx', { fx: res.fx, snapshot: fog(room.state, p.side) }));
  if (e.checkWin() != null) endMatch(room);
}

const fs = require('fs');
const path = require('path');
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json' };
// Serves the game page + assets from ./public (optional convenience: one origin for page + socket).
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let room = null, player = null;

  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const { type, payload = {} } = msg;

    if (type === 'createLobby') {
      room = makeRoom();
      player = { id: payload.id, ws, name: payload.name || 'Player 1', heroId: null, deck: null, ready: false, connected: true, side: 0 };
      room.players.push(player);
      send(ws, 'lobbyCreated', { code: room.code });
      broadcastLobby(room);
    }

    else if (type === 'joinLobby') {
      const r = rooms.get((payload.code || '').toUpperCase().trim());
      if (!r) return send(ws, 'joinError', { error: "That code doesn't exist." });
      if (r.phase !== 'lobby') return send(ws, 'joinError', { error: 'That match has already started.' });
      if (r.players.length >= 2) return send(ws, 'joinError', { error: 'That lobby is full.' });
      room = r;
      player = { id: payload.id, ws, name: payload.name || 'Player 2', heroId: null, deck: null, ready: false, connected: true, side: 1 };
      room.players.push(player);
      send(ws, 'lobbyJoined', { code: room.code });
      broadcastLobby(room);
    }

    else if (type === 'setLoadout' && room && player) {
      player.heroId = payload.heroId; player.deck = payload.deck; player.ready = false;
      broadcastLobby(room);
    }

    else if (type === 'ready' && room && player) {
      player.ready = !!payload.ready;
      broadcastLobby(room);
      if (room.phase === 'lobby' && room.players.length === 2 &&
          room.players.every(p => p.ready && p.heroId && p.deck && p.deck.length)) {
        startMatch(room);
      }
    }

    else if (type === 'action' && room && player) {
      handleAction(room, player, payload);
    }

    else if (type === 'reconnect') {
      const r = rooms.get((payload.code || '').toUpperCase().trim());
      if (!r) return send(ws, 'reconnectError', { error: 'Match no longer exists.' });
      const slot = r.players.find(p => p.id === payload.id);
      if (!slot) return send(ws, 'reconnectError', { error: 'You are not in this match.' });
      room = r; player = slot; player.ws = ws; player.connected = true;
      if (r.graceTimer) { clearTimeout(r.graceTimer); r.graceTimer = null; }
      if (r.phase === 'active') {
        e.setActiveState(r.state);
        const ph = r.phases[r.phaseIdx];
        send(ws, 'matchStart', { side: player.side, snapshot: fog(r.state, player.side), resumed: true });
        send(ws, 'phase', { round: r.state.round, phaseIdx: r.phaseIdx, label: ph.label,
          activeSide: ph.actor, allow: ph.allow, yourTurn: player.side === ph.actor, snapshot: fog(r.state, player.side) });
      } else {
        send(ws, 'lobbyState', lobbyView(r));
      }
      r.players.forEach(p => p !== player && send(p.ws, 'opponentReconnected', {}));
      broadcastLobby(r);
    }
  });

  ws.on('close', () => {
    if (!room || !player) return;
    player.connected = false;
    if (room.phase === 'lobby') {
      room.players = room.players.filter(p => p !== player);
      if (!room.players.length) rooms.delete(room.code); else broadcastLobby(room);
      return;
    }
    broadcastLobby(room);
    room.players.forEach(p => p !== player && p.connected && send(p.ws, 'opponentDisconnected', { graceMs: GRACE_MS }));
    if (room.phase === 'active' && !room.graceTimer) {
      room.graceTimer = setTimeout(() => {
        room.players.forEach(p => p.connected && send(p.ws, 'opponentLeft', {}));
        rooms.delete(room.code);
      }, GRACE_MS);
    }
  });
});

server.listen(PORT, () => console.log('Prismbreak multiplayer server listening on :' + PORT));
