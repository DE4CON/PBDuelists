// Extracts the pure engine from the game's source files into a Node-compatible
// engine.js. Run from the build/ dir context. Keeps engine.js guaranteed in sync
// with the real game logic instead of hand-copying.
const fs = require('fs');
const A = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const B = fs.readFileSync(process.argv[3], 'utf8').split('\n');
const slice = (arr, a, b) => arr.slice(a - 1, b).join('\n'); // 1-indexed inclusive

const out = [
  '"use strict";',
  '/* ==========================================================================',
  '   PRISMBREAK ENGINE — AUTO-EXTRACTED from script_a.js + script_b.js.',
  '   Pure, deterministic, DOM-free. Shared by the browser client and the Node',
  '   server. Do NOT edit by hand — regenerate with build-engine.js.',
  '   ========================================================================== */',
  '',
  '/* ---- uid + seeded RNG (from script_a.js) ---- */',
  slice(A, 16, 21),
  '',
  '/* ---- faction hue map (from script_a.js) ---- */',
  slice(A, 24, 26),
  '',
  '/* ---- card data, heroes, deck builder (from script_a.js) ---- */',
  slice(A, 68, A.length),
  '',
  '/* ---- engine: state, combat, effects, draws, turn flow (from script_b.js) ---- */',
  slice(B, 2, 329),
  '',
  '/* ---- action dispatcher (from script_b.js) ---- */',
  slice(B, 369, 391),
  '',
  '/* ---- instance scoping + exports (server runs many matches, one state each) ---- */',
  'function setActiveState(s){ state = s; }',
  'function getActiveState(){ return state; }',
  'if (typeof module !== "undefined" && module.exports) {',
  '  module.exports = {',
  '    createMatch, setActiveState, getActiveState, coreDispatch,',
  '    roundUpkeep, checkWin, resolveLaneStrikes, applyStrike, reapDead, drawCard,',
  '    allUnits, CARDS, HEROES, getCard, getHero, deckForHero, makeRng',
  '  };',
  '}',
  ''
].join('\n');

fs.writeFileSync('engine.js', out);
console.log('engine.js written:', out.split('\n').length, 'lines');
