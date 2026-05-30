"use strict";
/* ==========================================================================
   PRISMBREAK — OnlineSession (client)
   Implements the SAME Session interface as LocalAISession, but backed by the
   authoritative server over WebSocket. Drop this into the game's <script> (or
   load it before script_c.js) and create it in startMatch when playing online.

   The server is the source of truth: dispatch() sends an action and the
   authoritative result arrives asynchronously as 'fx' + snapshot messages, which
   you feed into the existing playFx()/syncBoard() animation path. Only YOUR side
   is yours to drive; the opponent's moves arrive as fx to animate.

   Usage sketch (see README "Client integration"):

     const sess = OnlineSession({
       url: 'wss://your-host',           // your deployed server
       id : localPlayerId(),              // stable per-device id (see below)
       name: 'Alice',
       on: {
         lobby:      (view) => renderLobby(view),
         lobbyCode:  (code) => showRoomCode(code),
         joinError:  (err)  => toast(err),
         matchStart: (p)    => enterMatch(p),     // {side, snapshot, resumed?}
         round:      (p)    => { playFx(p.fx); syncBoard(); banner('Round '+p.round); },
         phase:      (p)    => setActivePhase(p), // {label, activeSide, allow, yourTurn, snapshot}
         fx:         (p)    => { playFx(p.fx); applySnapshot(p.snapshot); },
         combat:     (p)    => animateCombat(p.fx, p.snapshot),
         matchEnd:   (p)    => showResult(p),
         connection: (s)    => setConnStatus(s),  // 'connecting'|'online'|'opponent-gone'|...
       }
     });
     sess.createLobby();           // or sess.joinLobby('PRISM-4827')
*/
function OnlineSession(opts) {
  const on = opts.on || {};
  const fire = (k, v) => { if (on[k]) on[k](v); };

  let ws = null, mySide = 0, snap = null, code = opts.code || null;
  let manualClose = false, retries = 0;

  function connect() {
    fire('connection', 'connecting');
    ws = new WebSocket(opts.url);
    ws.onopen = () => {
      retries = 0;
      fire('connection', 'online');
      // If we already had a room (reconnect after a drop), re-attach.
      if (code && snap) ws.send(J('reconnect', { id: opts.id, code }));
    };
    ws.onclose = () => {
      if (manualClose) return;
      fire('connection', 'reconnecting');
      // exponential-ish backoff, capped
      const wait = Math.min(1000 * Math.pow(2, retries++), 8000);
      setTimeout(connect, wait);
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      const p = m.payload || {};
      if (p.snapshot) snap = p.snapshot;
      switch (m.type) {
        case 'lobbyCreated': code = p.code; fire('lobbyCode', p.code); break;
        case 'lobbyJoined':  code = p.code; fire('lobbyCode', p.code); break;
        case 'lobbyState':   fire('lobby', p); break;
        case 'joinError':    fire('joinError', p.error); break;
        case 'reconnectError': fire('joinError', p.error); break;
        case 'matchStart':   mySide = p.side; fire('matchStart', p); break;
        case 'roundStart':   fire('round', p); break;
        case 'phase':        fire('phase', p); break;
        case 'fx':           fire('fx', p); break;
        case 'combat':       fire('combat', p); break;
        case 'matchEnd':     fire('matchEnd', p); break;
        case 'error':        fire('error', p.error); break;
        case 'opponentDisconnected': fire('connection', 'opponent-gone'); break;
        case 'opponentReconnected':  fire('connection', 'opponent-back'); break;
        case 'opponentLeft': fire('connection', 'opponent-left'); break;
      }
    };
  }
  const J = (type, payload) => JSON.stringify({ type, payload });
  const sendMsg = (type, payload) => { if (ws && ws.readyState === 1) ws.send(J(type, payload)); };

  connect();

  return {
    kind: 'online',
    // --- Session interface (mirrors LocalAISession) ---
    get state() { return snap; },
    snapshot() { return snap; },
    isBotTurn() { return false; },                 // no AI online
    isHuman(side) { return side === mySide; },     // only your side is yours to act on
    mySide() { return mySide; },
    // Fire-and-forget: the authoritative fx arrives via on.fx / on.combat.
    dispatch(action) { sendMsg('action', action); return { ok: true, fx: [], pending: true }; },

    // --- lobby / lifecycle ---
    createLobby() { sendMsg('createLobby', { id: opts.id, name: opts.name }); },
    joinLobby(c) { code = (c || '').toUpperCase().trim(); sendMsg('joinLobby', { id: opts.id, name: opts.name, code }); },
    setLoadout(heroId, deck) { sendMsg('setLoadout', { heroId, deck }); },
    ready(v) { sendMsg('ready', { ready: v !== false }); },
    endPhase() { sendMsg('action', { type: 'endPhase' }); },
    concede() { sendMsg('action', { type: 'concede' }); },
    roomCode() { return code; },
    close() { manualClose = true; if (ws) ws.close(); }
  };
}

// A stable per-device id so reconnect can re-attach. No accounts needed.
function localPlayerId() {
  try {
    let id = sessionStorage.getItem('prismbreak-pid');
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random()); sessionStorage.setItem('prismbreak-pid', id); }
    return id;
  } catch { return 'p' + Date.now() + '-' + Math.floor(Math.random() * 1e6); }
}

if (typeof window !== 'undefined') { window.OnlineSession = OnlineSession; window.localPlayerId = localPlayerId; }
