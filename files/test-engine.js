const e = require('./engine.js');
function assert(c,m){ console.log((c?'PASS':'FAIL')+': '+m); if(!c) process.exitCode=1; }

// 1) create a match (two human players, no bot)
const mk = (seed) => e.createMatch({ seed, humanSide:0, vanguardSide:0,
  players:[{heroId:'solara',name:'A'},{heroId:'vesper',name:'B'}] });
const m1 = mk('seed-1');
assert(m1 && m1.players.length===2, 'createMatch returns a 2-player state');
assert(m1.players[0].deck.length>0, 'player 0 has a deck');

// 2) instance scoping: activate m1, run upkeep via the SAME coreDispatch the server uses
e.setActiveState(m1);
const log1 = [];
let r = e.coreDispatch(log1, {type:'upkeep'});
assert(r.ok, 'upkeep dispatch ok');
assert(m1.players[0].hand.length===4, 'opening hand drawn (4)');
assert(m1.maxEnergy===1, 'round 1 energy = 1');

// 3) play a card through dispatch
const playable = m1.players[0].hand.find(h => e.getCard(h.cardId).type==='unit' && e.getCard(h.cardId).cost<=m1.players[0].energy);
if (playable){
  r = e.coreDispatch(log1, {type:'playCard', side:0, iid:playable.iid, lane:2});
  assert(r.ok, 'playCard dispatch ok');
  assert(m1.board[2].units[0], 'unit placed in lane 2');
}
assert(log1.some(a=>a.t==='upkeep'), 'action log records upkeep');

// 4) two matches are independent (no shared global state leak)
const m2 = mk('seed-2');
e.setActiveState(m2);
e.coreDispatch([], {type:'upkeep'});
assert(m2.players[0].hand.length===4, 'second match draws independently');
e.setActiveState(m1);
assert(m1.board[2].units[0] || !playable, 'first match state intact after second match ran');

// 5) determinism: same seed -> identical deck order
const da = mk('det').players[0].deck.join();
const db = mk('det').players[0].deck.join();
assert(da===db, 'same seed -> identical deck (deterministic, server-reproducible)');
assert(da!==mk('other').players[0].deck.join(), 'different seed -> different deck');

// 6) full combat resolves without throwing
e.setActiveState(m1);
const lane = e.resolveLaneStrikes(2);
assert(lane && typeof lane==='object', 'resolveLaneStrikes returns strike data');
if (lane.sV) { const fx=[]; e.applyStrike(lane.sV, lane.V, fx); e.reapDead(fx); assert(true,'applyStrike + reap run clean'); }

// 7) concede ends the match
const m3 = mk('c'); e.setActiveState(m3); e.coreDispatch([], {type:'upkeep'});
e.coreDispatch([], {type:'concede', side:0});
assert(m3.winner===1, 'concede sets opponent as winner');

console.log('\nEngine runs headless under Node:', process.exitCode? 'WITH FAILURES':'CLEAN');
