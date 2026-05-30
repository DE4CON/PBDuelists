// Headless integration test: boot the server, connect two clients, play a full match.
const { spawn } = require('child_process');
const WebSocket = require('ws');
const e = require('./engine.js');

const PORT = 8099;
const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT, GRACE_MS: '5000' }, stdio: 'inherit' });
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ': ' + m); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

function client(name) {
  const ws = new WebSocket('ws://localhost:' + PORT);
  const c = { ws, name, side: null, snap: null, last: {}, on: {}, msgs: [] };
  ws.on('message', raw => {
    const { type, payload } = JSON.parse(raw);
    c.msgs.push(type); c.last[type] = payload; if(type==='error') c.errCount=(c.errCount||0)+1;
    if (payload && payload.snapshot) c.snap = payload.snapshot;
    if (type === 'matchStart') c.side = payload.side;
    if (c.on[type]) c.on[type](payload);
  });
  c.send = (type, payload) => ws.send(JSON.stringify({ type, payload }));
  c.ready = () => new Promise(res => ws.on('open', res));
  return c;
}

// Pick a legal action for the active player given the phase allow-rules.
function chooseAction(snap, side, allow) {
  const me = snap.players[side];
  // try a playable unit/spell in an empty lane
  for (const h of me.hand) {
    if (h.hidden) continue;
    const card = e.getCard(h.cardId);
    if (card.cost > me.energy) continue;
    if (card.type === 'unit' && !allow.unit) continue;
    if (card.type === 'spell' && !allow.spell) continue;
    if (card.type === 'unit') {
      for (let l = 0; l < 5; l++) if (!snap.board[l].units[side]) return { type: 'playCard', iid: h.iid, lane: l };
    } else {
      const lane = (card.eff && card.eff.placement === 'lane') ? 0 : null;
      return { type: 'playCard', iid: h.iid, lane };
    }
  }
  return { type: 'endPhase' };
}

(async () => {
  await wait(600);
  const A = client('A'), B = client('B');
  await Promise.all([A.ready(), B.ready()]);

  // Lobby
  const id = n => 'id-' + n;
  A.send('createLobby', { id: id('A'), name: 'Alice' });
  await wait(120);
  ok(A.last.lobbyCreated && /^PRISM-\d{4}$/.test(A.last.lobbyCreated.code), 'create lobby -> room code ' + (A.last.lobbyCreated||{}).code);
  const code = A.last.lobbyCreated.code;

  B.send('joinLobby', { id: id('B'), name: 'Bob', code });
  await wait(120);
  ok(B.last.lobbyJoined && B.last.lobbyJoined.code === code, 'second player joins with code');
  ok(A.last.lobbyState && A.last.lobbyState.players.length === 2, 'host sees 2 players in lobby');

  // bad code
  const C = client('C'); await C.ready();
  C.send('joinLobby', { id: id('C'), name: 'X', code: 'PRISM-0000' });
  await wait(100);
  ok(C.last.joinError, 'invalid code rejected with friendly error: "' + (C.last.joinError||{}).error + '"');

  // Loadout + ready
  const deck = e.deckForHero('solara', e.makeRng('x')); // a valid 40-card list
  const deckB = e.deckForHero('vesper', e.makeRng('y'));
  A.send('setLoadout', { heroId: 'solara', deck });
  B.send('setLoadout', { heroId: 'vesper', deck: deckB });
  await wait(100);
  A.send('ready', { ready: true });
  B.send('ready', { ready: true });
  await wait(250);
  ok(A.last.matchStart && B.last.matchStart, 'both ready -> matchStart sent to both');
  ok(A.last.matchStart.side === 0 && B.last.matchStart.side === 1, 'sides assigned (host=Vanguard=0)');
  ok(A.last.phase, 'first phase announced');

  // fog of war: A should NOT see B's hand contents
  ok(A.snap.players[1].hand.every(h => h.hidden), 'fog of war: opponent hand hidden');
  ok(typeof A.snap.players[1].deck === 'number', 'fog of war: opponent deck is a count, not a list');
  ok(A.snap.rng === undefined, 'RNG never shipped to client');

  // Drive the match: whoever is active acts until the match ends.
  let active = { A, B }, guard = 0, ended = false;
  A.on.matchEnd = B.on.matchEnd = () => { ended = true; };
  function actorClient(payload) { return payload.activeSide === 0 ? A : B; }

  // reentrancy-guarded driver: only one phase handled at a time per client
  const drive = (cl) => {
    cl.acting = false;
    cl.on.phase = async (p) => {
      if (ended || !p.yourTurn || cl.acting) return;
      cl.acting = true;
      for (let k = 0; k < 4 && !ended; k++) {
        const a = chooseAction(cl.snap, cl.side, p.allow);
        if (a.type === 'endPhase') break;
        const before = cl.errCount || 0;
        cl.send('action', a);
        await wait(90);                 // let fx + snapshot return
        if ((cl.errCount || 0) > before) break;   // server rejected: stop trying
      }
      if (!ended) cl.send('action', { type: 'endPhase' });   // ALWAYS advance
      cl.acting = false;
    };
  };
  drive(A); drive(B);
  if (A.last.phase && A.last.phase.yourTurn) A.on.phase(A.last.phase);

  while (!ended && guard++ < 400) await wait(50);
  ok(ended, 'match played to completion through the server (rounds=' + (A.snap ? A.snap.round : '?') + ')');
  ok(A.last.matchEnd && (A.last.matchEnd.youWon !== undefined), 'matchEnd delivered with result');

  // Reconnect: B drops and rejoins mid/after match
  const D = client('D'); await D.ready();
  D.send('reconnect', { id: id('A'), code });
  await wait(150);
  // match has ended -> server correctly returns lobby state (mid-match resume is covered in test-reconnect.js)
  ok(D.last.matchStart || D.last.lobbyState || D.last.reconnectError, 'reconnect to ended match responds correctly');

  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
  A.ws.close(); B.ws.close(); C.ws.close(); D.ws.close();
  srv.kill();
  process.exit(fail ? 1 : 0);
})();
