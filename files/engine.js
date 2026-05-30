"use strict";
/* ==========================================================================
   PRISMBREAK ENGINE — AUTO-EXTRACTED from script_a.js + script_b.js.
   Pure, deterministic, DOM-free. Shared by the browser client and the Node
   server. Do NOT edit by hand — regenerate with build-engine.js.
   ========================================================================== */

/* ---- uid + seeded RNG (from script_a.js) ---- */
let UID=1; const uid=()=>UID++;

/* ====================== RNG (seeded, deterministic) ====================== */
function hashSeed(str){ let h=2166136261>>>0; str=String(str); for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function makeRng(seed){ let s=hashSeed(seed); return ()=>{ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function shuffle(arr,rng){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ---- faction hue map (from script_a.js) ---- */
const H = {
  ember:14, dawn:44, flux:128, null:268, sky:202, prism:320
};

/* ---- card data, heroes, deck builder (from script_a.js) ---- */
const RARITY=['Common','Rare','Epic','Legendary'];
const CARDS = {};
function C(c){ CARDS[c.id]=c; return c; }

// --- Prism (neutral) ---
C({id:'p_mote',name:'Prism Mote',fac:'prism',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'star',text:'A glimmer of the rift.'});
C({id:'p_acolyte',name:'Prism Acolyte',fac:'prism',cost:2,type:'unit',rar:'Common',atk:2,hp:3,shape:'hero',text:'A steady presence.'});
C({id:'p_sentinel',name:'Rift Sentinel',fac:'prism',cost:4,type:'unit',rar:'Rare',atk:3,hp:6,shape:'block',text:'A sturdy wall.'});
C({id:'p_weaver',name:'Lightweaver',fac:'prism',cost:3,type:'unit',rar:'Rare',atk:2,hp:3,shape:'star',text:'Battlecry: Heal your Hero 3.',eff:{kind:'healHero',amt:3,placement:'global'}});
C({id:'p_surge',name:'Energy Surge',fac:'prism',cost:0,type:'spell',rar:'Common',shape:'star',text:'Gain +1 energy this turn.',eff:{kind:'gainEnergy',amt:1,placement:'global'}});
C({id:'p_insight',name:'Insight',fac:'prism',cost:2,type:'spell',rar:'Common',shape:'star',text:'Draw 2 cards.',eff:{kind:'draw',amt:2,placement:'global'}});
C({id:'p_colossus',name:'Prism Colossus',fac:'prism',cost:6,type:'unit',rar:'Legendary',atk:6,hp:6,kw:['Frenzy'],shape:'bulky',text:'Frenzy.'});

// --- Emberwake (aggro / burn) ---
C({id:'e_imp',name:'Cinder Imp',fac:'ember',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'imp',text:'Eager to burn.'});
C({id:'e_hounds',name:'Ember Hounds',fac:'ember',cost:2,type:'unit',rar:'Common',atk:3,hp:2,kw:['Frenzy'],shape:'imp',text:'Frenzy.'});
C({id:'e_brute',name:'Magma Brute',fac:'ember',cost:4,type:'unit',rar:'Rare',atk:5,hp:4,shape:'bulky',text:'Smolders with fury.'});
C({id:'e_meteor',name:'Meteor Note',fac:'ember',cost:2,type:'spell',rar:'Common',shape:'star',text:'Deal 2 to a lane and apply Burn 1.',eff:{kind:'laneDamage',amt:2,burn:1,placement:'lane'}});
C({id:'e_wildfire',name:'Wildfire',fac:'ember',cost:3,type:'spell',rar:'Epic',shape:'star',text:'Deal 1 to all enemy units and the enemy Hero.',eff:{kind:'wildfire',amt:1,placement:'global'}});
C({id:'e_drake',name:'Pyre Drake',fac:'ember',cost:5,type:'unit',rar:'Epic',atk:5,hp:4,shape:'winged',text:'A searing diver.'});
C({id:'e_blaze',name:'Blazeheart',fac:'ember',cost:3,type:'unit',rar:'Rare',atk:4,hp:3,shape:'imp',text:'Burns with fury.'});

// --- Dawnsteel (armor / defense / midrange) ---
C({id:'d_recruit',name:'Shield Recruit',fac:'dawn',cost:1,type:'unit',rar:'Common',atk:1,hp:3,shape:'helm',text:'Eager to serve.'});
C({id:'d_golem',name:'Parapet Golem',fac:'dawn',cost:3,type:'unit',rar:'Rare',atk:1,hp:6,kw:['Armored'],armor:1,shape:'block',text:'Armored 1.'});
C({id:'d_banner',name:'Banner Knight',fac:'dawn',cost:3,type:'unit',rar:'Rare',atk:3,hp:3,shape:'helm',text:'Battlecry: Your other units gain +0/+1.',eff:{kind:'rally',hp:1,placement:'global'}});
C({id:'d_aegis',name:'Aegis Charge',fac:'dawn',cost:2,type:'spell',rar:'Common',shape:'helm',text:'Give a friendly unit +0/+3 and a Shield.',eff:{kind:'aegis',placement:'lane',ally:true}});
C({id:'d_vanguard',name:'Dawn Vanguard',fac:'dawn',cost:4,type:'unit',rar:'Rare',atk:4,hp:6,shape:'helm',text:'Holds the line.'});
C({id:'d_titan',name:'Lightforged Titan',fac:'dawn',cost:6,type:'unit',rar:'Legendary',atk:6,hp:7,kw:['Armored'],armor:2,shape:'block',text:'Armored 2.'});
C({id:'d_decree',name:'Radiant Decree',fac:'dawn',cost:4,type:'spell',rar:'Epic',shape:'star',text:'Deal 3 to an enemy unit.',eff:{kind:'laneDamage',amt:3,unitOnly:true,placement:'lane'}});

// --- Fluxwild (swarm / ramp / tokens) ---
C({id:'f_sapling',name:'Sapling',fac:'flux',cost:1,type:'unit',rar:'Common',atk:1,hp:1,shape:'leaf',text:'A tiny sprout.'});
C({id:'f_thorn',name:'Thornling',fac:'flux',cost:1,type:'unit',rar:'Common',atk:1,hp:2,kw:['Deadly'],shape:'leaf',text:'Deadly.'});
C({id:'f_pack',name:'Bramble Pack',fac:'flux',cost:3,type:'spell',rar:'Rare',shape:'leaf',text:'Summon two 1/1 Saplings to a lane and an adjacent lane.',eff:{kind:'summonSpread',token:'f_sapling',placement:'lane',ally:true}});
C({id:'f_tender',name:'Grove Tender',fac:'flux',cost:3,type:'unit',rar:'Epic',atk:2,hp:3,shape:'leaf',text:'Battlecry: Your units gain +1/+1.',eff:{kind:'rally',atk:1,hp:1,placement:'global'}});
C({id:'f_growth',name:'Wildgrowth',fac:'flux',cost:2,type:'spell',rar:'Common',shape:'leaf',text:'Permanently gain +1 max energy.',eff:{kind:'gainMaxEnergy',amt:1,placement:'global'}});
C({id:'f_hydra',name:'Verdant Hydra',fac:'flux',cost:5,type:'unit',rar:'Epic',atk:4,hp:6,shape:'serpent',text:'A many-headed bloom.'});
C({id:'f_root',name:'Root Colossus',fac:'flux',cost:6,type:'unit',rar:'Legendary',atk:6,hp:9,shape:'bulky',text:'An immovable titan.'});

// --- Nullcourt (control / freeze / silence) ---
C({id:'n_frost',name:'Frost Imp',fac:'null',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'imp',text:'Battlecry: Freeze the enemy unit in this lane.',eff:{kind:'freezeLane',placement:'lane'}});
C({id:'n_static',name:'Mind Static',fac:'null',cost:1,type:'spell',rar:'Common',shape:'cloak',text:'Silence an enemy unit (remove its abilities).',eff:{kind:'silence',placement:'lane',unitOnly:true}});
C({id:'n_wall',name:'Glacier Wall',fac:'null',cost:3,type:'unit',rar:'Rare',atk:0,hp:8,shape:'block',text:'A frozen bulwark. Does not attack.'});
C({id:'n_hex',name:'Hexbolt',fac:'null',cost:3,type:'spell',rar:'Rare',shape:'cloak',text:'Deal 2 to an enemy unit and Freeze it.',eff:{kind:'laneDamage',amt:2,freeze:true,unitOnly:true,placement:'lane'}});
C({id:'n_warden',name:'Null Warden',fac:'null',cost:4,type:'unit',rar:'Epic',atk:3,hp:5,shape:'cloak',text:'Battlecry: Freeze the enemy unit in this lane.',eff:{kind:'freezeLane',placement:'lane'}});
C({id:'n_oblivion',name:'Oblivion',fac:'null',cost:5,type:'spell',rar:'Legendary',shape:'cloak',text:'Destroy an enemy unit.',eff:{kind:'destroy',placement:'lane',unitOnly:true}});
C({id:'n_duelist',name:'Spectral Duelist',fac:'null',cost:4,type:'unit',rar:'Epic',atk:4,hp:4,shape:'cloak',text:'A phantom blade.'});

// --- Skyborne (tempo / aggression) ---
C({id:'s_sprite',name:'Gale Sprite',fac:'sky',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'winged',text:'Quick and fragile.'});
C({id:'s_lancer',name:'Sky Lancer',fac:'sky',cost:3,type:'unit',rar:'Epic',atk:2,hp:3,kw:['Double Strike'],shape:'winged',text:'Double Strike.'});
C({id:'s_updraft',name:'Updraft',fac:'sky',cost:1,type:'spell',rar:'Common',shape:'winged',text:'Give a friendly unit +2/+1.',eff:{kind:'updraft',placement:'lane',ally:true}});
C({id:'s_roc',name:'Storm Roc',fac:'sky',cost:5,type:'unit',rar:'Epic',atk:5,hp:4,kw:['Frenzy'],shape:'winged',text:'Frenzy.'});
C({id:'s_diver',name:'Cloud Diver',fac:'sky',cost:2,type:'unit',rar:'Common',atk:3,hp:2,shape:'winged',text:'A swift striker.'});
C({id:'s_tempest',name:'Tempest Call',fac:'sky',cost:3,type:'spell',rar:'Rare',shape:'star',text:'Deal 1 to all enemy units, then draw a card.',eff:{kind:'tempest',amt:1,placement:'global'}});
C({id:'s_titan',name:'Zephyr Titan',fac:'sky',cost:6,type:'unit',rar:'Legendary',atk:6,hp:6,shape:'winged',text:'A sky-borne colossus.'});

// --- EXPANSION POOL (deckbuilding depth: ~12 cards per faction) ---
// Prism (neutral)
C({id:'p_scout',name:'Rift Scout',fac:'prism',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'star',text:'Quick and curious.'});
C({id:'p_guardian',name:'Prism Guard',fac:'prism',cost:2,type:'unit',rar:'Common',atk:2,hp:4,shape:'block',text:'A dependable blocker.'});
C({id:'p_duelist',name:'Rift Duelist',fac:'prism',cost:4,type:'unit',rar:'Common',atk:4,hp:4,shape:'helm',text:'Evenly matched.'});
C({id:'p_oracle',name:'Prism Oracle',fac:'prism',cost:5,type:'unit',rar:'Epic',atk:4,hp:5,shape:'hero',text:'Battlecry: Draw a card.',eff:{kind:'draw',amt:1,placement:'global'}});
C({id:'p_shatter',name:'Shatterlight',fac:'prism',cost:3,type:'spell',rar:'Rare',shape:'star',text:'Deal 3 to a lane (unit or Hero).',eff:{kind:'laneDamage',amt:3,placement:'lane'}});
// Ember (aggro / burn)
C({id:'e_raider',name:'Ash Raider',fac:'ember',cost:2,type:'unit',rar:'Common',atk:3,hp:2,shape:'imp',text:'Eager for embers.'});
C({id:'e_cinderspit',name:'Cinderspit',fac:'ember',cost:1,type:'spell',rar:'Common',shape:'star',text:'Deal 1 to a lane and apply Burn 1.',eff:{kind:'laneDamage',amt:1,burn:1,placement:'lane'}});
C({id:'e_flamevow',name:'Flamevow Zealot',fac:'ember',cost:3,type:'unit',rar:'Epic',atk:2,hp:3,kw:['Double Strike'],shape:'winged',text:'Double Strike.'});
C({id:'e_emberlord',name:'Emberlord',fac:'ember',cost:5,type:'unit',rar:'Rare',atk:5,hp:4,kw:['Strikethrough'],shape:'bulky',text:'Strikethrough.'});
C({id:'e_eruption',name:'Eruption',fac:'ember',cost:4,type:'spell',rar:'Epic',shape:'star',text:'Deal 2 to all enemy units and the enemy Hero.',eff:{kind:'wildfire',amt:2,placement:'global'}});
// Dawn (armor / defense / buff)
C({id:'d_squire',name:'Dawn Squire',fac:'dawn',cost:1,type:'unit',rar:'Common',atk:2,hp:2,shape:'helm',text:'A keen recruit.'});
C({id:'d_legionnaire',name:'Dawn Legionnaire',fac:'dawn',cost:4,type:'unit',rar:'Common',atk:4,hp:5,shape:'helm',text:'Holds the line.'});
C({id:'d_bastion',name:'Sunsteel Bastion',fac:'dawn',cost:5,type:'unit',rar:'Rare',atk:3,hp:8,kw:['Armored'],armor:1,shape:'block',text:'Armored 1.'});
C({id:'d_cleric',name:'Dawn Cleric',fac:'dawn',cost:3,type:'unit',rar:'Rare',atk:2,hp:4,shape:'hero',text:'Battlecry: Heal your Hero 3.',eff:{kind:'healHero',amt:3,placement:'global'}});
C({id:'d_rally',name:'Rally the Dawn',fac:'dawn',cost:3,type:'spell',rar:'Epic',shape:'star',text:'Your other units gain +1/+1.',eff:{kind:'rally',atk:1,hp:1,placement:'global'}});
// Flux (swarm / nature)
C({id:'f_seedling',name:'Seedling',fac:'flux',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'leaf',text:'It grows.'});
C({id:'f_bramble',name:'Bramble Wall',fac:'flux',cost:2,type:'unit',rar:'Common',atk:1,hp:5,shape:'leaf',text:'Thorny and stubborn.'});
C({id:'f_grovekeeper',name:'Grovekeeper',fac:'flux',cost:3,type:'unit',rar:'Rare',atk:2,hp:3,shape:'leaf',text:'Battlecry: Summon a 1/1 Sapling to an adjacent lane.',eff:{kind:'summonSpread',token:'f_sapling',placement:'lane'}});
C({id:'f_thornbeast',name:'Thornbeast',fac:'flux',cost:5,type:'unit',rar:'Epic',atk:4,hp:6,kw:['Rage'],shape:'bulky',text:'Rage.'});
C({id:'f_bloomburst',name:'Bloomburst',fac:'flux',cost:4,type:'spell',rar:'Epic',shape:'leaf',text:'Summon a 1/1 Sapling to every empty friendly lane.',eff:{kind:'summonAll',token:'f_sapling',placement:'global'}});
// Null (control / freeze / void)
C({id:'n_wisp',name:'Void Wisp',fac:'null',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'cloak',text:'A flicker of void.'});
C({id:'n_shade',name:'Nullshade',fac:'null',cost:2,type:'unit',rar:'Common',atk:2,hp:2,shape:'serpent',text:'Slips through the dark.'});
C({id:'n_voidsentry',name:'Void Sentry',fac:'null',cost:4,type:'unit',rar:'Rare',atk:3,hp:6,shape:'block',text:'Guards the rift.'});
C({id:'n_banish',name:'Banish',fac:'null',cost:4,type:'spell',rar:'Epic',shape:'cloak',text:'Destroy an enemy unit.',eff:{kind:'destroy',placement:'lane',unitOnly:true}});
C({id:'n_chill',name:'Deepchill',fac:'null',cost:2,type:'spell',rar:'Common',shape:'cloak',text:'Freeze an enemy unit.',eff:{kind:'freezeLane',placement:'lane',unitOnly:true}});
// Sky (tempo / aggression)
C({id:'s_glider',name:'Sky Glider',fac:'sky',cost:2,type:'unit',rar:'Common',atk:3,hp:2,shape:'winged',text:'Rides the wind.'});
C({id:'s_scout',name:'Wind Scout',fac:'sky',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'winged',text:'Swift.'});
C({id:'s_falcon',name:'Storm Falcon',fac:'sky',cost:3,type:'unit',rar:'Rare',atk:4,hp:2,shape:'winged',text:'A diving raptor.'});
C({id:'s_thunderroc',name:'Thunder Roc',fac:'sky',cost:6,type:'unit',rar:'Epic',atk:7,hp:5,shape:'winged',text:'Thunder on wings.'});
C({id:'s_gale',name:'Gale Surge',fac:'sky',cost:2,type:'spell',rar:'Rare',shape:'star',text:'A friendly unit gains +2/+1.',eff:{kind:'updraft',placement:'lane',ally:true}});

// --- KEYWORD MECHANIC CARDS (depth & variety) ---
C({id:'e_berserker',name:'Ember Berserker',fac:'ember',cost:3,type:'unit',rar:'Rare',atk:2,hp:4,kw:['Rage'],shape:'imp',text:'Rage. (Grows the first time it survives damage.)'});
C({id:'e_lancer',name:'Cinder Lancer',fac:'ember',cost:4,type:'unit',rar:'Epic',atk:3,hp:3,kw:['Strikethrough'],shape:'winged',text:'Strikethrough.'});
C({id:'e_reaver',name:'Soul Reaver',fac:'ember',cost:5,type:'unit',rar:'Epic',atk:4,hp:3,kw:['Lifesteal'],shape:'serpent',text:'Lifesteal.'});
C({id:'d_sentinel',name:'Dawn Sentinel',fac:'dawn',cost:4,type:'unit',rar:'Rare',atk:2,hp:6,kw:['Armored'],armor:1,shape:'block',text:'Armored 1.'});
C({id:'d_martyr',name:'Lightsworn Martyr',fac:'dawn',cost:3,type:'unit',rar:'Epic',atk:2,hp:3,kw:['Last Breath'],lastBreath:{kind:'healHero',amt:4,placement:'global'},shape:'hero',text:'Last Breath: Heal your Hero 4.'});
C({id:'d_paladin',name:'Sunsworn Paladin',fac:'dawn',cost:5,type:'unit',rar:'Epic',atk:3,hp:5,kw:['Lifesteal'],shape:'helm',text:'Lifesteal.'});
C({id:'f_huntress',name:'Grove Huntress',fac:'flux',cost:3,type:'unit',rar:'Rare',atk:4,hp:3,shape:'leaf',text:'A relentless stalker.'});
C({id:'f_spore',name:'Sporeback',fac:'flux',cost:2,type:'unit',rar:'Common',atk:1,hp:3,kw:['Last Breath'],lastBreath:{kind:'summonToken',token:'f_sapling',placement:'lane'},shape:'leaf',text:'Last Breath: Summon a 1/1 Sapling here.'});
C({id:'f_thornking',name:'Thorn King',fac:'flux',cost:6,type:'unit',rar:'Legendary',atk:5,hp:7,kw:['Rage'],shape:'bulky',text:'Rage.'});
C({id:'n_assassin',name:'Null Assassin',fac:'null',cost:3,type:'unit',rar:'Epic',atk:2,hp:2,kw:['Deadly'],shape:'serpent',text:'Deadly.'});
C({id:'n_reaper',name:'Void Reaper',fac:'null',cost:5,type:'unit',rar:'Epic',atk:3,hp:4,kw:['Deadly'],shape:'cloak',text:'Deadly.'});
C({id:'n_jolt',name:'Stasis Jolt',fac:'null',cost:2,type:'spell',rar:'Rare',shape:'cloak',text:'Stun an enemy unit (skips its next attack).',eff:{kind:'stun',placement:'lane',unitOnly:true}});
C({id:'s_raptor',name:'Gale Raptor',fac:'sky',cost:4,type:'unit',rar:'Rare',atk:4,hp:3,kw:['Strikethrough'],shape:'winged',text:'Strikethrough.'});
C({id:'s_skydiver',name:'Sky Diver',fac:'sky',cost:3,type:'unit',rar:'Epic',atk:3,hp:3,shape:'winged',text:'A daring raider.'});
C({id:'s_squall',name:'Squall',fac:'sky',cost:3,type:'spell',rar:'Rare',shape:'star',text:'Deal 3 to an enemy unit.',eff:{kind:'laneDamage',amt:3,placement:'lane',unitOnly:true}});
C({id:'p_warden',name:'Prism Warden',fac:'prism',cost:4,type:'unit',rar:'Epic',atk:4,hp:5,shape:'block',text:'A radiant bruiser.'});

// --- EXPANSION SET 2 (30 cards) ---
// Prism (neutral)
C({id:'p2_runner',name:'Rift Runner',fac:'prism',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'star',text:'Fast and fragile.'});
C({id:'p2_warden',name:'Prism Bulwark',fac:'prism',cost:3,type:'unit',rar:'Common',atk:2,hp:5,shape:'block',text:'A steadfast wall.'});
C({id:'p2_blade',name:'Shardblade Adept',fac:'prism',cost:3,type:'unit',rar:'Rare',atk:3,hp:3,kw:['Deadly'],shape:'helm',text:'Deadly.'});
C({id:'p2_seer',name:'Rift Seer',fac:'prism',cost:4,type:'unit',rar:'Epic',atk:3,hp:4,shape:'hero',text:'Battlecry: Draw a card.',eff:{kind:'draw',amt:1,placement:'global'}});
C({id:'p2_focus',name:'Refraction',fac:'prism',cost:2,type:'spell',rar:'Common',shape:'star',text:'Draw 2 cards.',eff:{kind:'draw',amt:2,placement:'global'}});
// Ember (aggro / burn)
C({id:'e2_imp',name:'Spark Imp',fac:'ember',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'imp',text:'Itching for a fight.'});
C({id:'e2_zealot',name:'Ash Zealot',fac:'ember',cost:2,type:'unit',rar:'Common',atk:3,hp:2,kw:['Frenzy'],shape:'imp',text:'Frenzy.'});
C({id:'e2_marauder',name:'Cinder Marauder',fac:'ember',cost:4,type:'unit',rar:'Rare',atk:4,hp:3,kw:['Strikethrough'],shape:'bulky',text:'Strikethrough.'});
C({id:'e2_vortex',name:'Flame Vortex',fac:'ember',cost:3,type:'spell',rar:'Rare',shape:'star',text:'Deal 1 to all enemy units and the enemy Hero.',eff:{kind:'wildfire',amt:1,placement:'global'}});
C({id:'e2_bolt',name:'Ember Bolt',fac:'ember',cost:1,type:'spell',rar:'Common',shape:'star',text:'Deal 2 to a lane (unit or Hero).',eff:{kind:'laneDamage',amt:2,placement:'lane'}});
// Dawn (armor / defense / lifesteal)
C({id:'d2_shieldmaid',name:'Shieldmaiden',fac:'dawn',cost:2,type:'unit',rar:'Common',atk:2,hp:3,kw:['Armored'],armor:1,shape:'helm',text:'Armored 1.'});
C({id:'d2_warden',name:'Sunsteel Warden',fac:'dawn',cost:4,type:'unit',rar:'Rare',atk:3,hp:5,kw:['Lifesteal'],shape:'helm',text:'Lifesteal.'});
C({id:'d2_aegis',name:'Aegisbearer',fac:'dawn',cost:3,type:'unit',rar:'Rare',atk:2,hp:4,shape:'block',text:'Battlecry: Gain a Shield.',eff:{kind:'aegis',placement:'global'}});
C({id:'d2_blessing',name:'Dawnlight',fac:'dawn',cost:2,type:'spell',rar:'Common',shape:'star',text:'Heal your Hero 5.',eff:{kind:'healHero',amt:5,placement:'global'}});
C({id:'d2_champion',name:'Radiant Champion',fac:'dawn',cost:6,type:'unit',rar:'Legendary',atk:5,hp:7,kw:['Lifesteal'],shape:'bulky',text:'Lifesteal.'});
// Flux (swarm / nature / rage)
C({id:'f2_sprout',name:'Quickvine',fac:'flux',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'leaf',text:'Spreads fast.'});
C({id:'f2_warden',name:'Thornward',fac:'flux',cost:3,type:'unit',rar:'Common',atk:2,hp:5,shape:'leaf',text:'A living barricade.'});
C({id:'f2_beast',name:'Wild Mauler',fac:'flux',cost:4,type:'unit',rar:'Rare',atk:3,hp:4,kw:['Rage'],shape:'bulky',text:'Rage.'});
C({id:'f2_bloom',name:'Wildbloom',fac:'flux',cost:5,type:'spell',rar:'Epic',shape:'leaf',text:'Your units gain +1/+1.',eff:{kind:'rally',atk:1,hp:1,placement:'global'}});
C({id:'f2_sapling',name:'Saplings',fac:'flux',cost:3,type:'spell',rar:'Common',shape:'leaf',text:'Summon a 1/1 Sapling to every empty friendly lane.',eff:{kind:'summonAll',token:'f_sapling',placement:'global'}});
// Null (control / freeze / deadly)
C({id:'n2_shade',name:'Dusk Shade',fac:'null',cost:1,type:'unit',rar:'Common',atk:1,hp:2,shape:'cloak',text:'Lurks in shadow.'});
C({id:'n2_phantom',name:'Phantom Stalker',fac:'null',cost:3,type:'unit',rar:'Rare',atk:3,hp:3,kw:['Deadly'],shape:'serpent',text:'Deadly.'});
C({id:'n2_warden',name:'Frost Warden',fac:'null',cost:4,type:'unit',rar:'Rare',atk:2,hp:6,shape:'block',text:'A patient guardian.'});
C({id:'n2_rift',name:'Riftcollapse',fac:'null',cost:5,type:'spell',rar:'Epic',shape:'serpent',text:'Destroy the strongest enemy unit.',eff:{kind:'destroyStrongest',placement:'global'}});
C({id:'n2_chill',name:'Hoarfrost',fac:'null',cost:3,type:'spell',rar:'Rare',shape:'cloak',text:'Freeze every enemy unit.',eff:{kind:'freezeAll',placement:'global'}});
// Sky (tempo / strikethrough)
C({id:'s2_scout',name:'Wind Darter',fac:'sky',cost:1,type:'unit',rar:'Common',atk:2,hp:1,shape:'winged',text:'Darts in fast.'});
C({id:'s2_skirmisher',name:'Gust Skirmisher',fac:'sky',cost:2,type:'unit',rar:'Common',atk:3,hp:2,shape:'winged',text:'Hit-and-run.'});
C({id:'s2_striker',name:'Tempest Striker',fac:'sky',cost:4,type:'unit',rar:'Rare',atk:4,hp:3,kw:['Strikethrough'],shape:'winged',text:'Strikethrough.'});
C({id:'s2_double',name:'Twin Cyclone',fac:'sky',cost:5,type:'unit',rar:'Epic',atk:3,hp:4,kw:['Double Strike'],shape:'winged',text:'Double Strike.'});
C({id:'s2_surge',name:'Tailwind',fac:'sky',cost:1,type:'spell',rar:'Common',shape:'star',text:'Give a friendly unit +2/+1.',eff:{kind:'updraft',placement:'lane',ally:true}});

// --- HIGH-COST FINISHERS (7–10 energy: payoffs for reaching late game) ---
// Prism (neutral)
C({id:'hi_p_avatar',name:'Prism Avatar',fac:'prism',cost:7,type:'unit',rar:'Legendary',atk:7,hp:7,shape:'bulky',text:'A towering construct of pure light.'});
C({id:'hi_p_arbiter',name:'Rift Arbiter',fac:'prism',cost:9,type:'unit',rar:'Legendary',atk:8,hp:8,kw:['Armored'],armor:2,shape:'bulky',text:'Armored 2.'});
// Ember (aggro / burn)
C({id:'hi_e_warlord',name:'Ember Warlord',fac:'ember',cost:7,type:'unit',rar:'Epic',atk:7,hp:5,kw:['Frenzy'],shape:'bulky',text:'Frenzy.'});
C({id:'hi_e_meteor',name:'Meteor Fall',fac:'ember',cost:8,type:'spell',rar:'Legendary',shape:'star',text:'Deal 4 to all enemy units and the enemy Hero.',eff:{kind:'wildfire',amt:4,placement:'global'}});
C({id:'hi_e_titan',name:'Magma Titan',fac:'ember',cost:10,type:'unit',rar:'Legendary',atk:10,hp:8,kw:['Strikethrough'],shape:'bulky',text:'Strikethrough.'});
// Dawn (armor / lifesteal / defense)
C({id:'hi_d_seraph',name:'Dawn Seraph',fac:'dawn',cost:7,type:'unit',rar:'Epic',atk:5,hp:7,kw:['Lifesteal'],shape:'winged',text:'Lifesteal.'});
C({id:'hi_d_colossus',name:'Sunsteel Colossus',fac:'dawn',cost:8,type:'unit',rar:'Legendary',atk:6,hp:10,kw:['Armored'],armor:2,shape:'bulky',text:'Armored 2.'});
C({id:'hi_d_judgment',name:'Radiant Judgment',fac:'dawn',cost:9,type:'spell',rar:'Legendary',shape:'star',text:'Your units gain +2/+2. Heal your Hero 6.',eff:{kind:'massBuff',atk:2,hp:2,heal:6,placement:'global'}});
// Flux (swarm / nature / rage)
C({id:'hi_f_behemoth',name:'Grove Behemoth',fac:'flux',cost:7,type:'unit',rar:'Epic',atk:6,hp:8,kw:['Rage'],shape:'bulky',text:'Rage.'});
C({id:'hi_f_worldtree',name:'Worldtree',fac:'flux',cost:9,type:'unit',rar:'Legendary',atk:6,hp:12,shape:'bulky',text:'An ancient, unyielding giant.'});
C({id:'hi_f_overrun',name:'Verdant Overrun',fac:'flux',cost:8,type:'spell',rar:'Legendary',shape:'leaf',text:'Summon a 2/2 Bloom to every empty friendly lane, then give your units +1/+1.',eff:{kind:'overrun',token:'tok_bloom',atk:1,hp:1,placement:'global'}});
// Null (control / deadly / void)
C({id:'hi_n_devourer',name:'Void Devourer',fac:'null',cost:7,type:'unit',rar:'Epic',atk:6,hp:6,kw:['Deadly'],shape:'serpent',text:'Deadly.'});
C({id:'hi_n_oblivion',name:'Total Oblivion',fac:'null',cost:9,type:'spell',rar:'Legendary',shape:'serpent',text:'Destroy all enemy units.',eff:{kind:'destroyAll',placement:'global'}});
C({id:'hi_n_eternity',name:'Eternity Warden',fac:'null',cost:10,type:'unit',rar:'Legendary',atk:8,hp:9,kw:['Deadly','Armored'],armor:1,shape:'bulky',text:'Deadly. Armored 1.'});
// Sky (tempo / strikethrough)
C({id:'hi_s_tempest',name:'Tempest Sovereign',fac:'sky',cost:7,type:'unit',rar:'Epic',atk:6,hp:5,kw:['Double Strike'],shape:'winged',text:'Double Strike.'});
C({id:'hi_s_leviathan',name:'Storm Leviathan',fac:'sky',cost:8,type:'unit',rar:'Legendary',atk:8,hp:6,kw:['Strikethrough'],shape:'winged',text:'Strikethrough.'});
C({id:'hi_s_maelstrom',name:'Maelstrom',fac:'sky',cost:10,type:'spell',rar:'Legendary',shape:'star',text:'Deal 3 to all enemy units, then draw 3.',eff:{kind:'tempest',amt:3,draw:3,placement:'global'}});

// --- SUPERPOWERS (granted by the Block Meter; fac 'super' keeps them out of decks) ---
C({id:'tok_bloom',name:'Bloom',fac:'super',cost:0,type:'unit',rar:'Common',atk:2,hp:2,shape:'leaf',text:'A burst of life.'});
C({id:'sp_nova',name:'Sunflare Nova',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'star',text:'Deal 2 to all enemy units and the enemy Hero.',eff:{kind:'wildfire',amt:2,placement:'global'}});
C({id:'sp_aegisdawn',name:'Dawnward Aegis',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'helm',text:'Your units gain +0/+2 and a Shield.',eff:{kind:'massBuff',hp:2,shield:true,placement:'global'}});
C({id:'sp_phoenix',name:'Phoenix Heart',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'star',text:'Heal your Hero 4. Your units gain +1/+0.',eff:{kind:'massBuff',atk:1,heal:4,placement:'global'}});
C({id:'sp_freeze',name:'Glacial Hush',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'cloak',text:'Freeze every enemy unit.',eff:{kind:'freezeAll',placement:'global'}});
C({id:'sp_nullstorm',name:'Null Storm',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'cloak',text:'Deal 1 to all enemy units, then draw 2.',eff:{kind:'tempest',amt:1,draw:2,placement:'global'}});
C({id:'sp_voidcall',name:'Voidcaller',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'serpent',text:'Destroy the strongest enemy unit.',eff:{kind:'destroyStrongest',placement:'global'}});
C({id:'sp_overgrowth',name:'Overgrowth',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'leaf',text:'Summon a 2/2 Bloom to every empty friendly lane.',eff:{kind:'summonAll',token:'tok_bloom',placement:'global'}});
C({id:'sp_grovewall',name:'Heart of the Grove',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'leaf',text:'Your units gain +1/+3.',eff:{kind:'massBuff',atk:1,hp:3,placement:'global'}});
C({id:'sp_skyassault',name:'Sky Assault',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'winged',text:'Your units gain +2/+1.',eff:{kind:'massBuff',atk:2,hp:1,placement:'global'}});
C({id:'sp_firewing',name:'Firewing Barrage',fac:'super',cost:0,type:'spell',rar:'Legendary',super:true,shape:'winged',text:'Deal 1 to all enemies and the enemy Hero, then draw.',eff:{kind:'wildfire',amt:1,draw:1,placement:'global'}});

const getCard=id=>CARDS[id];

/* ====================== DATA: HEROES ====================== */
const HEROES = [
  {id:'solara', name:'Solara Vek', title:'The Kindled Dawn', facs:['ember','dawn'], hue:H.dawn,
    power:{name:'Sunflare', cost:2, text:'Deal 1 damage to a lane (unit or Hero).', placement:'lane', kind:'laneDamage', amt:1},
    difficulty:'Easy', playstyle:'Aggressive burn — trade efficiently and chip the rival down with direct damage.',
    supers:['sp_nova','sp_aegisdawn','sp_phoenix']},
  {id:'vesper', name:'Vesper Quill', title:'Whisper of the Null', facs:['null','sky'], hue:H.null,
    power:{name:'Hush', cost:2, text:'Freeze the enemy unit in a lane.', placement:'lane', kind:'freezeLane'},
    difficulty:'Hard', playstyle:'Control — freeze threats, stall the board, and grind out the late game.',
    supers:['sp_freeze','sp_nullstorm','sp_voidcall']},
  {id:'bram',  name:'Bram Mossfist', title:'Warden of the Grove', facs:['flux','dawn'], hue:H.flux,
    power:{name:'Sprout', cost:2, text:'Summon a 1/1 Sapling to a lane.', placement:'lane', kind:'summonToken', token:'f_sapling', ally:true},
    difficulty:'Medium', playstyle:'Go-wide swarm — flood the lanes with bodies and buff them all at once.',
    supers:['sp_overgrowth','sp_grovewall','sp_phoenix']},
  {id:'kestrel',name:'Kestrel Vane', title:'Edge of the Sky', facs:['sky','ember'], hue:H.sky,
    power:{name:'Updraft', cost:1, text:'Give a friendly unit +1/+1.', placement:'lane', kind:'buffUnit', atk:1, hp:1, ally:true},
    difficulty:'Medium', playstyle:'Tempo — cheap fliers and a 1-cost buff to snowball early pressure.',
    supers:['sp_skyassault','sp_firewing','sp_nova']},
];
const getHero=id=>HEROES.find(h=>h.id===id)||HEROES[0];

/* ====================== DECK BUILDING ====================== */
function deckForHero(heroId, rng){
  const hero=getHero(heroId);
  const facs=new Set([...hero.facs,'prism']);
  const pool=Object.values(CARDS).filter(c=>facs.has(c.fac));
  const copies={Common:4,Rare:4,Epic:3,Legendary:2};
  let list=[];
  for(const c of pool){ for(let i=0;i<copies[c.rar];i++) list.push(c.id); }
  list=shuffle(list,rng);
  list=list.slice(0,40);
  return shuffle(list,rng);
}


/* ---- engine: state, combat, effects, draws, turn flow (from script_b.js) ---- */
/* ====================== ENGINE ====================== */
let state=null;

// Centralized game RNG. ALL randomness that affects game state (shuffles, draws,
// block-meter rolls, superpower grants, AI tiebreaks, opponent selection) must go
// through this — never Math.random. This is what lets a server reproduce a match
// deterministically from a seed and stay authoritative. (Cosmetic FX/audio jitter
// may still use Math.random; it never touches game state.)
function rngRoll(){ return state && state.rng ? state.rng() : Math.random(); }
function rngInt(n){ return Math.floor(rngRoll()*n); }
function rngPick(arr){ return arr[rngInt(arr.length)]; }

function makeUnit(cardId, side, lane){
  const c=getCard(cardId);
  const u={
    uid:uid(), cardId, side, lane, name:c.name, shape:c.shape, hue:H[c.fac],
    attack:c.atk||0, health:c.hp||1, maxHealth:c.hp||1,
    armor:c.armor||0, keywords:(c.kw||[]).slice(),
    frozen:false, stunned:0, burn:0, shield:false, alive:true, justSummoned:true,
    raged:false
  };
  if(c.lastBreath){ if(!u.keywords.includes('Last Breath')) u.keywords.push('Last Breath'); u._lastBreath=c.lastBreath; }
  return u;
}
function hasKw(u,k){ return u && u.keywords && u.keywords.includes(k); }

function createMatch({seed, players, humanSide=0, vanguardSide}){
  const rng=makeRng(seed);
  const board=[]; for(let i=0;i<5;i++) board.push({env:null, units:[null,null]});
  const ps=players.map((p,side)=>{
    const hero=getHero(p.heroId);
    return { side, name:p.name, heroId:p.heroId, hue:hero.hue, bot:!!p.bot,
      hp:20, energy:0, hand:[], deck:(p.deck&&p.deck.length)?shuffle(p.deck.slice(),rng):deckForHero(p.heroId,rng), discard:[], heroPowerUsed:false,
      block:0, blockCap:8, supersUsed:0 };
  });
  return { seed, rng, round:0, maxEnergy:0, firstPlayer:0, vanguard:(typeof vanguardSide==='number'?vanguardSide:humanSide), phase:'play', active:0, winner:null, humanSide, board, players:ps, log:[] };
}
function logLine(t){ state.log.push(t); if(state.log.length>40) state.log.shift(); }

function drawCard(side,n=1,fx){
  const p=state.players[side];
  for(let i=0;i<n;i++){
    if(!p.deck.length) continue;            // no fatigue, just stop
    if(p.hand.length>=8){ p.deck.pop(); continue; } // burn over-draw
    const id=p.deck.pop();
    p.hand.push({iid:uid(), cardId:id});
    fx&&fx.push({type:'draw',side});
  }
}

function allUnits(){ const a=[]; for(const l of state.board) for(const u of l.units) if(u && u.alive) a.push(u); return a; }
function enemyUnit(side,lane){ const u=state.board[lane].units[1-side]; return (u && u.alive)?u:null; }
function allyUnit(side,lane){ const u=state.board[lane].units[side]; return (u && u.alive)?u:null; }

// Single source of truth for clearing the dead. Nulls out any slot whose unit is
// not alive, firing Last Breath effects exactly once. Returns the uids reaped so
// the view can animate their removal. ALL gameplay systems read occupancy through
// the alive-aware helpers above, so once reaped a unit is gone everywhere at once.
function reapDead(fx){
  const reaped=[];
  for(let lane=0; lane<5; lane++){
    for(let side=0; side<2; side++){
      const u=state.board[lane].units[side];
      if(u && !u.alive && !u._reaped){
        u._reaped=true;
        reaped.push(u.uid);
        state.board[lane].units[side]=null;            // remove from board state immediately
        state.players[side].discard.push(u.cardId);
        if(hasKw(u,'Last Breath') && u._lastBreath && !u._lbFired){
          u._lbFired=true;
          applyEffect(side, u._lastBreath, lane, fx, u.uid);
        }
        fx&&fx.push({type:'death', uid:u.uid, side, lane});
      }
    }
  }
  // Last Breath can kill more units (e.g. a damage burst) — reap again.
  if(reaped.length){ for(let lane=0;lane<5;lane++) for(let side=0;side<2;side++){ const u=state.board[lane].units[side]; if(u && !u.alive){ reapDead(fx); return reaped; } } }
  return reaped;
}

function placeUnit(side,lane,cardId){
  const u=makeUnit(cardId,side,lane);
  state.board[lane].units[side]=u;
  return u;
}

function targetLanes(side, spec){
  const lanes=[];
  for(let i=0;i<5;i++){
    const enemy=enemyUnit(side,i), ally=allyUnit(side,i);
    if(spec.kind==='place'){ if(!ally) lanes.push(i); continue; }
    if(spec.ally){
      if(spec.kind==='summonSpread'||spec.kind==='summonToken'){ if(!ally) lanes.push(i); }
      else { if(ally) lanes.push(i); }            // buff/aegis/updraft need a friendly unit
    } else {
      if(spec.unitOnly){ if(enemy) lanes.push(i); }   // damage/destroy/silence/freeze on a unit
      else lanes.push(i);                             // can hit hero too
    }
  }
  return lanes;
}

function dealUnitDamage(u, amt, opts={}, fx){
  if(!u || !u.alive) return 0;
  if(amt<=0 && !opts.deadly) return 0;
  if(u.shield && !opts.deadly){ u.shield=false; fx&&fx.push({type:'shieldBreak',uid:u.uid}); return 0; }
  let dmg=amt;
  if(!opts.ignoreArmor) dmg=Math.max(0, dmg-(u.armor||0));
  if(opts.deadly || opts.attackerDeadly){ u.health=0; }
  else u.health-=dmg;
  if(u.health<=0){ u.health=0; u.alive=false; }
  else if(opts.fromAttack && hasKw(u,'Rage') && !u.raged){
    // Rage: the first time it survives combat damage, it grows.
    u.raged=true; u.attack+=2; u.health+=1; u.maxHealth+=1; fx&&fx.push({type:'buff',uid:u.uid});
  }
  fx&&fx.push({type:'unitDmg',uid:u.uid,amt:Math.max(dmg,(opts.deadly||opts.attackerDeadly)?u.maxHealth:0)});
  return dmg;
}
function dealHeroDamage(side, amt, fx){
  if(amt<=0) return;
  const p=state.players[side];
  p.hp=Math.max(0,p.hp-amt);
  fx&&fx.push({type:'heroDmg',side,amt});
  // Block meter: 8 segments. Each hit charges it a random 1–3 segments.
  const gain=1+rngInt(3);
  p.block=(p.block||0)+gain;
  if(p.hp>0 && p.block>=p.blockCap){
    p.block-=p.blockCap;                         // carry the overflow
    const sid=grantSuper(side,fx);
    fx&&fx.push({type:'superpower',side,cardId:sid});
  }
  checkWin();
}
function grantSuper(side, fx){
  const p=state.players[side], hero=getHero(p.heroId);
  const pool=hero.supers||[];
  if(!pool.length) return null;
  const id=rngPick(pool);
  p.hand.push({iid:uid(), cardId:id, super:true});
  if(p.hand.length>9) p.hand.shift();
  p.supersUsed++;
  logLine(`${p.name} channels ${getCard(id).name}!`);
  return id;
}
function healHero(side, amt, fx){
  const p=state.players[side]; const before=p.hp; p.hp=Math.min(20,p.hp+amt);
  fx&&fx.push({type:'heroHeal',side,amt:p.hp-before});
}

function applyEffect(side, eff, lane, fx, sourceUid){
  const opp=1-side;
  switch(eff.kind){
    case 'healHero': healHero(side, eff.amt, fx); break;
    case 'draw': drawCard(side, eff.amt, fx); break;
    case 'gainEnergy': state.players[side].energy+=eff.amt; fx&&fx.push({type:'energy',side}); break;
    case 'gainMaxEnergy': state.maxEnergy+=eff.amt; state.players[side].energy+=eff.amt; fx&&fx.push({type:'energy',side}); break;
    case 'laneDamage':{
      const u=enemyUnit(side,lane);
      if(u){ dealUnitDamage(u, eff.amt, {}, fx); if(eff.burn) u.burn=Math.max(u.burn,eff.burn); if(eff.freeze) u.frozen=true; }
      else if(!eff.unitOnly){ dealHeroDamage(opp, eff.amt, fx); }
      break; }
    case 'wildfire':{ for(const u of allUnits()) if(u.side===opp) dealUnitDamage(u,eff.amt,{},fx); dealHeroDamage(opp,eff.amt,fx); if(eff.draw) drawCard(side,eff.draw,fx); break; }
    case 'tempest':{ for(const u of allUnits()) if(u.side===opp) dealUnitDamage(u,eff.amt,{},fx); drawCard(side,eff.draw||1,fx); break; }
    case 'massBuff':{
      for(const u of allUnits()) if(u.side===side){
        u.attack+=eff.atk||0;
        if(eff.hp){ u.health+=eff.hp; u.maxHealth+=eff.hp; }
        if(eff.shield) u.shield=true;
        fx&&fx.push({type:'buff',uid:u.uid});
      }
      if(eff.heal) healHero(side,eff.heal,fx);
      break; }
    case 'freezeAll':{ for(const u of allUnits()) if(u.side===opp){ u.frozen=true; fx&&fx.push({type:'freeze',uid:u.uid}); } break; }
    case 'summonAll':{ for(let i=0;i<5;i++) if(!allyUnit(side,i)){ const t=placeUnit(side,i,eff.token); fx&&fx.push({type:'summon',uid:t.uid}); } break; }
    case 'overrun':{
      for(let i=0;i<5;i++) if(!allyUnit(side,i)){ const t=placeUnit(side,i,eff.token); fx&&fx.push({type:'summon',uid:t.uid}); }
      for(const u of allUnits()) if(u.side===side){ u.attack+=eff.atk||0; if(eff.hp){ u.health+=eff.hp; u.maxHealth+=eff.hp; } fx&&fx.push({type:'buff',uid:u.uid}); }
      break; }
    case 'destroyAll':{ for(const u of allUnits()) if(u.side===opp) dealUnitDamage(u,9999,{deadly:true,ignoreArmor:true},fx); break; }
    case 'destroyStrongest':{ let best=null; for(const u of allUnits()) if(u.side===opp){ if(!best||(u.attack+u.health)>(best.attack+best.health)) best=u; } if(best) dealUnitDamage(best,9999,{deadly:true,ignoreArmor:true},fx); break; }
    case 'destroy':{ const u=enemyUnit(side,lane); if(u){ dealUnitDamage(u,9999,{deadly:true,ignoreArmor:true},fx); } break; }
    case 'silence':{ const u=enemyUnit(side,lane); if(u){ u.keywords=[]; u.armor=0; u.frozen=false; u.burn=0; fx&&fx.push({type:'silence',uid:u.uid}); } break; }
    case 'freezeLane':{ const u=enemyUnit(side,lane); if(u){ u.frozen=true; fx&&fx.push({type:'freeze',uid:u.uid}); } break; }
    case 'stun':{ const u=enemyUnit(side,lane); if(u){ u.stunned=Math.max(u.stunned||0,1); fx&&fx.push({type:'freeze',uid:u.uid}); } break; }
    case 'aegis':{ const u=allyUnit(side,lane); if(u){ u.health+=3; u.maxHealth+=3; u.shield=true; fx&&fx.push({type:'buff',uid:u.uid}); } break; }
    case 'updraft':{ const u=allyUnit(side,lane); if(u){ u.attack+=2; u.health+=1; u.maxHealth+=1; fx&&fx.push({type:'buff',uid:u.uid}); } break; }
    case 'buffUnit':{ const u=allyUnit(side,lane); if(u){ u.attack+=eff.atk||0; u.health+=eff.hp||0; u.maxHealth+=eff.hp||0; fx&&fx.push({type:'buff',uid:u.uid}); } break; }
    case 'rally':{ for(const u of allUnits()) if(u.side===side && u.uid!==sourceUid){ u.attack+=eff.atk||0; u.health+=eff.hp||0; u.maxHealth+=eff.hp||0; fx&&fx.push({type:'buff',uid:u.uid}); } break; }
    case 'summonToken':{ if(!allyUnit(side,lane)){ const t=placeUnit(side,lane,eff.token); fx&&fx.push({type:'summon',uid:t.uid}); } break; }
    case 'summonSpread':{
      if(!allyUnit(side,lane)){ const t=placeUnit(side,lane,eff.token); fx&&fx.push({type:'summon',uid:t.uid}); }
      const adj=[lane+1,lane-1].find(j=>j>=0&&j<5&&!allyUnit(side,j));
      if(adj!=null){ const t2=placeUnit(side,adj,eff.token); fx&&fx.push({type:'summon',uid:t2.uid}); }
      break; }
  }
  reapDead(fx);
  checkWin();
}

/* ---- COMBAT LOGIC (pure, deterministic — no DOM; safe to run server-side) ---- */
// Will `u` survive the incoming strike `incoming` (its blocker's blow)?
function unitSurvives(u, incoming){
  if(!u || !u.alive) return false;
  if(!incoming || incoming.target!=='unit' || incoming.defender!==u) return true;
  if(incoming.deadly) return false;
  if(u.shield) return true;
  const dmg=Math.max(0, incoming.amt-(u.armor||0));
  return u.health > dmg;
}
function computeStrike(attacker, defender){
  if(!attacker || !attacker.alive || attacker.frozen || attacker.stunned>0 || attacker.attack<=0) return null;
  const liveDef = (defender && defender.alive) ? defender : null;
  const target = liveDef ? 'unit' : 'hero';
  return { attacker, defender:liveDef, target,
    amt:attacker.attack,
    deadly:hasKw(attacker,'Deadly'),
    strikethrough:hasKw(attacker,'Strikethrough'),
    lifesteal:hasKw(attacker,'Lifesteal'),
    frenzy:hasKw(attacker,'Frenzy'),
    double:hasKw(attacker,'Double Strike') };
}
function applyStrike(strike, side, fxArr){
  const opp=1-side;
  const atkr=strike.attacker;
  const swings=strike.double?2:1;
  for(let s=0;s<swings;s++){
    if(s>0 && !atkr.alive) break;
    let tgtUnit = (strike.target==='unit' && strike.defender && strike.defender.alive) ? strike.defender : null;
    if(tgtUnit){
      const hp0=tgtUnit.health, shield0=tgtUnit.shield;
      dealUnitDamage(tgtUnit, strike.amt, {deadly:strike.deadly, fromAttack:true}, fxArr);
      const killed = !tgtUnit.alive;
      const applied = shield0 ? 0 : Math.min(strike.amt, hp0);
      if(strike.lifesteal && applied>0) healHero(side, applied, fxArr);
      if(strike.strikethrough && !shield0){ const over=strike.amt-hp0; if(over>0) dealHeroDamage(opp, over, fxArr); }
      if(killed){
        fxArr.push({type:'kill', side});
        if(strike.frenzy && strike.attackerSurvives) dealHeroDamage(opp, strike.amt, fxArr);
      }
    } else if(strike.target==='hero' || !strike.defender){
      dealHeroDamage(opp, strike.amt, fxArr);
      if(strike.lifesteal) healHero(side, strike.amt, fxArr);
    }
  }
}
// Resolve one lane fully and return the fx events (pure; the view animates from these).
function resolveLaneStrikes(laneIndex){
  const V=state.vanguard, R=1-V;
  const aV=state.board[laneIndex].units[V], aR=state.board[laneIndex].units[R];
  const sV=computeStrike(aV,aR), sR=computeStrike(aR,aV);
  if(sV) sV.attackerSurvives=unitSurvives(aV,sR);
  if(sR) sR.attackerSurvives=unitSurvives(aR,sV);
  return {sV, sR, V, R};
}

// returns {ok, fx, summonedUid} — mutates state
function playCard(side, iid, lane){
  const p=state.players[side];
  const idx=p.hand.findIndex(h=>h.iid===iid);
  if(idx<0) return {ok:false,error:'Card not in hand.'};
  const inst=p.hand[idx]; const card=getCard(inst.cardId);
  if(card.cost>p.energy) return {ok:false,error:'Not enough energy.'};
  const fx=[];

  if(card.type==='unit'){
    if(lane==null || allyUnit(side,lane)) return {ok:false,error:'Choose an empty lane.'};
    p.energy-=card.cost; p.hand.splice(idx,1);
    const u=placeUnit(side,lane,card.id);
    fx.push({type:'energy',side});
    if(card.eff) applyEffect(side, card.eff, lane, fx, u.uid);
    logLine(`${p.name} played ${card.name}.`);
    checkWin();
    return {ok:true,fx,summonedUid:u.uid};
  } else { // spell
    const spec=card.eff;
    if(spec.placement==='lane'){
      if(lane==null) return {ok:false,error:'Choose a lane.'};
      const valid=targetLanes(side, spec);
      if(!valid.includes(lane)) return {ok:false,error:'Invalid target.'};
    }
    p.energy-=card.cost; p.hand.splice(idx,1); p.discard.push(inst.cardId);
    fx.push({type:'cast',side,lane,card:card.id});
    if(spec) applyEffect(side, spec, lane, fx);
    logLine(`${p.name} cast ${card.name}.`);
    checkWin();
    return {ok:true,fx};
  }
}

function useHeroPower(side, lane){
  const p=state.players[side]; const hero=getHero(p.heroId); const pw=hero.power;
  if(p.heroPowerUsed) return {ok:false,error:'Hero power already used.'};
  if(pw.cost>p.energy) return {ok:false,error:'Not enough energy.'};
  if(pw.placement==='lane'){
    const valid=targetLanes(side, pw);
    if(lane==null || !valid.includes(lane)) return {ok:false,error:'Invalid target.'};
  }
  const fx=[]; p.energy-=pw.cost; p.heroPowerUsed=true;
  fx.push({type:'energy',side},{type:'power',side});
  applyEffect(side, pw, lane, fx);
  logLine(`${p.name} used ${pw.name}.`);
  checkWin();
  return {ok:true,fx};
}

function checkWin(){
  if(state.winner!=null) return state.winner;
  const d0=state.players[0].hp<=0, d1=state.players[1].hp<=0;
  if(d0&&d1) state.winner='draw';
  else if(d1) state.winner=0;
  else if(d0) state.winner=1;
  return state.winner;
}

function roundUpkeep(fx){
  state.round++;
  if(state.round===1){ state.maxEnergy=1; drawCard(0,4,fx); drawCard(1,4,fx); }
  else { state.maxEnergy=Math.min(10,state.maxEnergy+1); drawCard(0,1,fx); drawCard(1,1,fx); }
  for(const p of state.players){ p.energy=state.maxEnergy; p.heroPowerUsed=false; }
  // burn ticks
  for(const u of allUnits()){
    if(u.burn>0){ dealUnitDamage(u,1,{ignoreArmor:true},fx); u.burn--; }
    u.justSummoned=false;
  }
  reapDead(fx);
  checkWin();
}

/* ---- action dispatcher (from script_b.js) ---- */
function coreDispatch(log, action){
  let res;
  switch(action.type){
    case 'playCard':    res = playCard(action.side, action.iid, action.lane); break;
    case 'heroPower':   res = useHeroPower(action.side, action.lane); break;
    case 'selectTarget':res = {ok:true, fx:[], lane:action.lane}; break; // targeting is resolved client-side then sent with the move; this is the network seam
    case 'endPhase':    res = {ok:true, fx:[]}; break;                    // phase flow is driven by the controller loop; logged for replay/order
    case 'concede':     { const w=1-action.side; state.winner=w; res={ok:true, fx:[{type:'concede',side:action.side}]}; break; }
    case 'upkeep':      { const fx=[]; roundUpkeep(fx); res={ok:true, fx}; break; }
    case 'resolveLane': res = {ok:true, fx:[], strikes:resolveLaneStrikes(action.laneIndex)}; break;
    case 'applyStrike': { const fx=[]; applyStrike(action.strike, action.side, fx); res={ok:true, fx}; break; }
    case 'reap':        { const fx=[]; reapDead(fx); res={ok:true, fx}; break; }
    case 'endCombat':   { for(const u of allUnits()){ if(u.frozen) u.frozen=false; if(u.stunned>0) u.stunned--; } reapDead([]); res={ok:true, fx:[]}; break; }
    default:            res = {ok:false, error:'Unknown action '+action.type};
  }
  // Record successful, state-affecting actions for replay/reconnect reconstruction.
  // (Transient resolution steps like applyStrike/reap are deterministic consequences
  // of resolveLane, so we log intent-level actions, not every micro-step.)
  if(res.ok && log && ['playCard','heroPower','selectTarget','endPhase','concede','upkeep'].includes(action.type)){
    log.push({t:action.type, side:action.side, iid:action.iid, lane:action.lane});
  }
  return res;
}

/* ---- instance scoping + exports (server runs many matches, one state each) ---- */
function setActiveState(s){ state = s; }
function getActiveState(){ return state; }
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createMatch, setActiveState, getActiveState, coreDispatch,
    roundUpkeep, checkWin, resolveLaneStrikes, applyStrike, reapDead, drawCard,
    allUnits, CARDS, HEROES, getCard, getHero, deckForHero, makeRng
  };
}
