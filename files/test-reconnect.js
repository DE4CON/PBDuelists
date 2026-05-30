const { spawn } = require('child_process');
const WebSocket = require('ws');
const e = require('./engine.js');
const PORT = 8097;
const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT, GRACE_MS: '8000' }, stdio: 'inherit' });
let pass=0, fail=0; const ok=(c,m)=>{console.log((c?'PASS':'FAIL')+': '+m); c?pass++:fail++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function client(){ const ws=new WebSocket('ws://localhost:'+PORT); const c={ws,last:{},snap:null};
  ws.on('message',raw=>{const{type,payload}=JSON.parse(raw); c.last[type]=payload; if(payload&&payload.snapshot)c.snap=payload.snapshot;});
  c.send=(t,p)=>ws.send(JSON.stringify({type:t,payload:p})); c.ready=()=>new Promise(r=>ws.on('open',r)); return c; }
(async()=>{
  await wait(500);
  const A=client(), B=client(); await Promise.all([A.ready(),B.ready()]);
  A.send('createLobby',{id:'A',name:'Alice'}); await wait(100);
  const code=A.last.lobbyCreated.code;
  B.send('joinLobby',{id:'B',name:'Bob',code}); await wait(100);
  A.send('setLoadout',{heroId:'solara',deck:e.deckForHero('solara',e.makeRng('a'))});
  B.send('setLoadout',{heroId:'vesper',deck:e.deckForHero('vesper',e.makeRng('b'))});
  await wait(80);
  A.send('ready',{ready:true}); B.send('ready',{ready:true}); await wait(250);
  ok(A.last.matchStart && B.last.matchStart, 'match started');
  const roundBefore = A.snap.round;

  // B drops mid-match
  B.ws.close(); await wait(200);
  ok(A.last.opponentDisconnected && A.last.opponentDisconnected.graceMs>0, 'opponent notified of disconnect + grace window');

  // B reconnects with same id+code before grace expires
  const B2=client(); await B2.ready();
  B2.send('reconnect',{id:'B',code}); await wait(200);
  ok(B2.last.matchStart && B2.last.matchStart.resumed===true, 'reconnect resumes the match (resumed:true)');
  ok(B2.snap && B2.snap.round===roundBefore, 'reconnect restores correct round/state ('+roundBefore+')');
  ok(B2.last.phase, 'reconnect re-announces current phase');
  ok(A.last.opponentReconnected!==undefined, 'opponent notified of reconnection');

  // reconnect with wrong id rejected
  const X=client(); await X.ready();
  X.send('reconnect',{id:'NOPE',code}); await wait(120);
  ok(X.last.reconnectError, 'reconnect with unknown id rejected: "'+(X.last.reconnectError||{}).error+'"');

  console.log('\n=== '+pass+' passed, '+fail+' failed ===');
  A.ws.close(); B2.ws.close(); X.ws.close(); srv.kill(); process.exit(fail?1:0);
})();
