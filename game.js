/* NACHT DER VAMPIRE — original Gothic survivors clone. Canvas 2D, no external assets. */
'use strict';
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = 960, H = 540;

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const TAU = Math.PI * 2;
function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }

// ---------- CC0 sprites (Kenney Tiny Dungeon + Clint Bellanger Tiny Creatures) ----------
// Original-Prozedural-Grafik bleibt als Fallback, falls ein Sprite fehlt.
const SPR = {};
function loadSprite(key, file) {
  const img = new Image();
  const rec = SPR[key] = { img, ok: false, white: null };
  img.onload = () => {
    rec.ok = true;
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      rec.white = c;
    } catch (e) { rec.white = null; }
  };
  img.onerror = () => { rec.ok = false; };
  img.src = file;
}
[
  ['player_antonio', 'assets/player_antonio.png'], ['player_imelda', 'assets/player_imelda.png'], ['player_pasqua', 'assets/player_pasqua.png'],
  ['bat1', 'assets/enemy_bat1.png'], ['bat2', 'assets/enemy_bat2.png'],
  ['skel', 'assets/enemy_skel.png'], ['ghost', 'assets/enemy_ghost.png'], ['ghost2', 'assets/enemy_ghost_td.png'],
  ['zombie', 'assets/enemy_zombie.png'], ['slime', 'assets/enemy_slime.png'], ['eye', 'assets/enemy_eye.png'],
  ['brute', 'assets/enemy_brute.png'], ['demon', 'assets/enemy_demon.png'],
  ['vampire', 'assets/enemy_vampire.png'], ['reaper', 'assets/enemy_reaper.png'],
  ['flame', 'assets/mon_flame.png'], ['plant', 'assets/mon_plant.png'], ['mush', 'assets/mon_mush.png'],
  ['water', 'assets/mon_water.png'], ['knight', 'assets/mon_knight.png'],
  ['mino', 'assets/mon_mino.png'], ['owl', 'assets/mon_owl.png'],
  ['gem', 'assets/gem.png'], ['gold', 'assets/gold.png'], ['heart', 'assets/heart.png'],
  ['grave1', 'assets/grave1.png'], ['grave2', 'assets/grave2.png'],
].forEach(([k, f]) => loadSprite(k, f));

function drawSpr(key, x, y, scale, flip, alpha, flash) {
  const s = SPR[key];
  if (!s || !s.ok) return false;
  const img = (flash && s.white) ? s.white : s.img;
  const w = 16 * scale, h = 16 * scale;
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

// ---------- audio (procedural) ----------
let AC = null, muted = false;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function beep(f, d, type, vol, slide) {
  if (muted) return; const ac = audio(); if (!ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), ac.currentTime + d);
    g.gain.setValueAtTime(vol || .06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  } catch (e) {}
}
const sfx = {
  hit() { beep(rand(180, 240), .07, 'square', .04, -80); },
  kill() { beep(rand(300, 380), .09, 'sawtooth', .05, -200); },
  gem() { beep(rand(700, 900), .07, 'square', .035, 300); },
  level() { beep(440, .12, 'square', .07, 0); setTimeout(() => beep(660, .12, 'square', .07, 0), 110); setTimeout(() => beep(880, .2, 'square', .07, 0), 220); },
  whip() { beep(160, .1, 'sawtooth', .06, 120); },
  bolt() { beep(520, .08, 'square', .04, -260); },
  hurt() { beep(110, .18, 'sawtooth', .09, -40); },
  zap() { beep(rand(900, 1400), .12, 'sawtooth', .05, -700); },
  pick() { beep(660, .08, 'triangle', .06, 220); },
};

// ---------- game state ----------
const WIN_TIME = 600; // 10 min
const G = {
  state: 'title', time: 0, kills: 0, gold: 0,
  cam: { x: 0, y: 0 }, shake: 0, shakeX: 0, shakeY: 0,
  enemies: [], shots: [], gems: [], parts: [], floats: [], strikes: [], slashes: [],
  spawnT: 0, eliteT: 45, diffT: 0,
  keys: {}, facing: 1, aimAngle: 0,
  levelQueue: 0,
};
const P = {
  x: 0, y: 0, vx: 0, vy: 0, r: 11,
  hp: 100, maxhp: 100, speed: 165, armor: 0,
  level: 1, xp: 0, xpNext: 8,
  magnet: 90, damageMul: 1, cdr: 1, areaMul: 1,
  hurtT: 0, walkT: 0, moving: false,
  weapons: {}, // id -> {lvl, t}
};
let charIndex = 0;
// (Starter-Definitionen weiter unten bei STARTERS; CHARACTERS ist ein Alias darauf.)

const WEAPONS = {
  bolt:   { name: 'Code-Blaster', ico: '💠', max: 8, desc: 'Feuert Datenpakete auf den nächsten Virus.', cd: [1.1, 1.0, .9, .8, .7, .6, .5, .4], dmg: [12, 14, 18, 22, 28, 34, 42, 55], count: [1, 1, 2, 2, 3, 3, 4, 5] },
  whip:   { name: 'Daten-Peitsche', ico: '🌀', max: 8, desc: 'Energiepeitsche mit großer Fläche. Trifft alles vor dir.', cd: [1.3, 1.2, 1.1, 1.0, .9, .8, .65, .5], dmg: [16, 20, 26, 32, 40, 50, 62, 80], count: [1, 1, 1, 2, 2, 2, 3, 3] },
  knife:  { name: 'Splitter-Dolche', ico: '🔷', max: 8, desc: 'Wirft schnelle Datensplitter in Blickrichtung.', cd: [1.0, .95, .85, .75, .65, .55, .45, .35], dmg: [9, 11, 13, 16, 20, 25, 31, 40], count: [1, 2, 2, 3, 3, 4, 5, 6] },
  bible:  { name: 'Firewall', ico: '🧱', max: 8, desc: 'Schutzblöcke kreisen um dich und blocken alles.', cd: [0, 0, 0, 0, 0, 0, 0, 0], dmg: [10, 13, 16, 20, 26, 32, 40, 52], count: [1, 2, 2, 3, 3, 4, 5, 6] },
  garlic: { name: 'Antivirus', ico: '💊', max: 8, desc: 'Reinungsfeld: Viren in der Nähe nehmen Schaden + Rückstoß.', cd: [.5, .5, .45, .45, .4, .35, .3, .25], dmg: [6, 8, 10, 13, 17, 22, 28, 36], count: [0, 0, 0, 0, 0, 0, 0, 0] },
  zap:    { name: 'Blitz', ico: '🌩️', max: 8, desc: 'Systemblitz trifft zufällige Gegner.', cd: [2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0, .8], dmg: [22, 28, 34, 42, 52, 64, 80, 105], count: [1, 1, 2, 2, 3, 4, 5, 7] },
};
const PASSIVES = {
  dmg:    { name: 'Overclock', ico: '🚀', max: 5, desc: '+10% Schaden pro Stufe.' },
  boots:  { name: 'Turbo-Boots', ico: '🥾', max: 5, desc: '+8% Lauftempo pro Stufe.' },
  magnet: { name: 'Daten-Magnet', ico: '🧲', max: 5, desc: '+40% Sammelradius pro Stufe.' },
  heart:  { name: 'Repair-Kit', ico: '🔧', max: 5, desc: '+20 Max-HP + Reparatur.' },
  clock:  { name: 'Cooldown-Chip', ico: '⏱️', max: 5, desc: '-8% Abklingzeit pro Stufe.' },
  area:   { name: 'Signal-Boost', ico: '📡', max: 5, desc: '+10% Wirkungsfläche pro Stufe.' },
};
// Evolutions-Stufen (Hommage an Monster-Evolution Rookie -> Mega)
function evoStage(lvl) { return lvl <= 2 ? 'ROOKIE' : lvl <= 4 ? 'CHAMPION' : lvl <= 6 ? 'ULTIMATE' : 'MEGA'; }
// Signature-Moves der 8 Starter: nutzen die Mechanik einer Basis-Waffe (use), aber mit eigenem Namen/Farbe.
function sigWeapon(name, ico, use, col, desc) {
  const b = WEAPONS[use];
  return { name, ico, use, col, max: 8, desc, cd: b.cd.slice(), dmg: b.dmg.slice(), count: b.count.slice() };
}
WEAPONS.volt    = sigWeapon('Voltstoß', '⚡', 'bolt', '#ffe95e', 'Volmons Blitzbiss: Datenpakete auf den nächsten Virus.');
WEAPONS.feuer   = sigWeapon('Feuerball', '🔥', 'bolt', '#ff9a3b', 'Pyromons Feuerball: verbrennt den nächsten Virus.');
WEAPONS.aqua    = sigWeapon('Aqua-Strahl', '💧', 'bolt', '#5eb8ff', 'Aquamons Wasserstrahl auf den nächsten Virus.');
WEAPONS.sturm   = sigWeapon('Sturmklingen', '🌪️', 'knife', '#9fe8ff', 'Hootmons Sturmschwingen in Blickrichtung.');
WEAPONS.ranken  = sigWeapon('Rankenpeitsche', '🌿', 'whip', '#7dff5e', 'Thornmons Rankenhieb mit großer Fläche.');
WEAPONS.stein   = sigWeapon('Steinwall', '🧱', 'bible', '#c9b18a', 'Golemons Schutzblöcke kreisen um ihn.');
WEAPONS.sporen  = sigWeapon('Sporenwolke', '🍄', 'garlic', '#b8ff9e', 'Shroomons Sporenfeld verletzt nahe Viren.');
WEAPONS.schatten = sigWeapon('Schattenblitz', '🌑', 'zap', '#b44dff', 'Umbramons Schattenblitz trifft zufällige Gegner.');
// 8 Starter-Digimon (originale Kreationen): du SPIELST das Digimon.
const STARTERS = [
  { name: 'VOLMON', sub: 'Blitz-Welpe', spr: 'bat1', sprs: ['bat1', 'bat2'], sig: 'volt', move: 'Voltstoß' },
  { name: 'PYROMON', sub: 'Feuerdrache', spr: 'flame', sprs: ['flame'], sig: 'feuer', move: 'Feuerball' },
  { name: 'AQUAMON', sub: 'Wasserschildkröte', spr: 'water', sprs: ['water'], sig: 'aqua', move: 'Aqua-Strahl' },
  { name: 'HOOTMON', sub: 'Sturmeule', spr: 'owl', sprs: ['owl'], sig: 'sturm', move: 'Sturmklingen' },
  { name: 'THORNMON', sub: 'Rankenpflanze', spr: 'plant', sprs: ['plant'], sig: 'ranken', move: 'Rankenpeitsche' },
  { name: 'GOLEMON', sub: 'Steingolem', spr: 'brute', sprs: ['brute'], sig: 'stein', move: 'Steinwall' },
  { name: 'SHROOMON', sub: 'Sporenpilz', spr: 'mush', sprs: ['mush'], sig: 'sporen', move: 'Sporenwolke' },
  { name: 'UMBRAMON', sub: 'Schattenritter', spr: 'knight', sprs: ['knight'], sig: 'schatten', move: 'Schattenblitz' },
];
const CHARACTERS = STARTERS; // Auswahl-Index bleibt kompatibel
const STAGES = ['ROOKIE', 'CHAMPION', 'ULTIMATE', 'MEGA'];
let passives = {};

const ENEMIES = {
  bat:     { hp: 14, sp: 95, dmg: 7, xp: 1, r: 10, gold: 1, sprs: ['bat1', 'bat2'], sc: 2.2, neon: '#ff3bd4' },
  zombie:  { hp: 20, sp: 55, dmg: 9, xp: 1, r: 11, gold: 1, sprs: ['zombie'], sc: 2.4, neon: '#7dff5e' },
  skel:    { hp: 30, sp: 62, dmg: 12, xp: 2, r: 11, gold: 2, sprs: ['skel'], sc: 2.4, neon: '#ffd75e' },
  ghost:   { hp: 22, sp: 125, dmg: 9, xp: 2, r: 10, gold: 2, sprs: ['ghost'], sc: 2.4, alpha: .85, neon: '#9fe8ff' },
  brute:   { hp: 110, sp: 42, dmg: 20, xp: 6, r: 15, gold: 6, sprs: ['mino'], sc: 3.0, neon: '#ff9a3b' },
  demon:   { hp: 160, sp: 58, dmg: 24, xp: 10, r: 14, gold: 10, sprs: ['demon'], sc: 2.8, neon: '#ff3b5b' },
  vampire: { hp: 900, sp: 55, dmg: 30, xp: 40, r: 18, gold: 50, sprs: ['vampire'], sc: 3.0, neon: '#b44dff' },
  reaper:  { hp: 260, sp: 78, dmg: 25, xp: 12, r: 14, gold: 12, sprs: ['reaper'], sc: 2.6, neon: '#b44dff' },
};

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const hud = $('hud'), hpfill = $('hpfill'), hptext = $('hptext'), xpfill = $('xpfill');
const elTimer = $('timer'), elLevel = $('level'), elKills = $('kills'), elGold = $('gold'), elWeapons = $('weapons'), elStage = $('evostage'), elEggs = $('eggs');
const titleEl = $('title'), lvlEl = $('levelup'), cardsEl = $('cards'), pauseEl = $('pause'), overEl = $('gameover'), winEl = $('win'), toastEl = $('toast');
let toastT = null;
function toast(s) { toastEl.textContent = s; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => toastEl.style.opacity = 0, 2200); }

// Team-Menü: Auswahl + Upgrades (nur STARTERS[0] ist von Anfang an frei)
function isUnlocked(name) { return name === STARTERS[0].name || loadCollection().includes(name); }
const UPG_MAX = 5, UPG_COST = [30, 60, 120, 200, 350];
let UPG = {};
function loadUpg() { try { const o = JSON.parse(localStorage.getItem('dt_upg') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function saveUpg() { try { localStorage.setItem('dt_upg', JSON.stringify(UPG)); } catch (e) {} }
function upgLvl(name) { return UPG[name] || 0; }
UPG = loadUpg();
function loadBits() { try { return parseInt(localStorage.getItem('dt_bits') || '0', 10) || 0; } catch (e) { return 0; } }
function saveBits() { try { localStorage.setItem('dt_bits', String(G.gold || 0)); } catch (e) {} }
function sprSrc(key) { return (SPR[key] && SPR[key].img.src) || ''; }
function renderTeam() {
  const grid = $('teamGrid'); if (!grid) return;
  let h = '';
  STARTERS.forEach((s, i) => {
    const un = isUnlocked(s.name);
    h += `<div class="tcell${i === charIndex ? ' selected' : ''}${un ? '' : ' locked'}" data-i="${i}"><img src="${sprSrc(s.spr)}" alt="${s.name}"><b>${s.name}</b><small>${un ? s.move + ' · ★' + upgLvl(s.name) : '🔒 Gacha'}</small></div>`;
  });
  grid.innerHTML = h;
  grid.querySelectorAll('.tcell').forEach(el => el.addEventListener('click', () => selectMon(parseInt(el.dataset.i, 10))));
  renderTeamDetail();
  const c = CHARACTERS[charIndex] || STARTERS[0];
  $('prevImg').src = sprSrc(c.spr);
  $('prevName').textContent = c.name;
  $('prevMove').textContent = c.move + ' · ★' + upgLvl(c.name);
  $('teamBits').textContent = loadBits();
}
function renderTeamDetail() {
  const d = $('teamDetail'); if (!d) return;
  const s = STARTERS[charIndex] || STARTERS[0];
  if (!isUnlocked(s.name)) {
    d.innerHTML = `<img src="${sprSrc(s.spr)}" alt="${s.name}"><b>${s.name}</b><i>${s.sub}</i><p class="statrow">🔒 Noch gesperrt — im Gacha freischalten!</p><p class="statrow">Move: ${s.move}</p>`;
    return;
  }
  const up = upgLvl(s.name), maxed = up >= UPG_MAX, cost = maxed ? 0 : UPG_COST[up];
  d.innerHTML = `<img src="${sprSrc(s.spr)}" alt="${s.name}"><b>${s.name}</b><i>${s.sub} · ${s.move}</i>`
    + `<p class="statrow">Upgrade ★${up}/${UPG_MAX} · Schaden +${8 * up} % · HP +${10 * up}</p>`
    + `<p class="statrow">Nächste Stufe: Schaden +${8 * (up + 1)} % · HP +${10 * (up + 1)}</p>`
    + `<button id="upgBtn"${maxed ? ' disabled' : ''}>${maxed ? '★ MAX ★' : '⬆ UPGRADE · ' + cost + ' BITS'}</button>`;
  const b = $('upgBtn');
  if (b) b.addEventListener('click', upgradeMon);
}
function selectMon(i) {
  const s = STARTERS[i]; if (!s) return;
  if (!isUnlocked(s.name)) { toast(`🔒 ${s.name} ist gesperrt — im Gacha freischalten!`); sfx.hurt(); return; }
  charIndex = i; sfx.pick(); renderTeam();
}
function upgradeMon() {
  const s = STARTERS[charIndex] || STARTERS[0];
  if (!isUnlocked(s.name)) return;
  const up = upgLvl(s.name);
  if (up >= UPG_MAX) { toast('Bereits MAX!'); return; }
  const cost = UPG_COST[up], bal = loadBits();
  if (bal < cost) { toast(`Nicht genug Bits! (${bal}/${cost}) — weiter Viren jagen.`); sfx.hurt(); return; }
  try { localStorage.setItem('dt_bits', String(bal - cost)); } catch (e) {}
  G.gold = bal - cost;
  UPG[s.name] = up + 1; saveUpg();
  sfx.level(); toast(`⬆ ${s.name} → ★${up + 1}! (+${8 * (up + 1)} % Schaden, +${10 * (up + 1)} HP)`);
  renderTeam();
}
function openTeam() {
  if (G.state !== 'title') return;
  G.state = 'team';
  UPG = loadUpg();
  renderTeam();
  $('team').classList.remove('hidden');
  sfx.pick();
}
function closeTeam() {
  if (G.state !== 'team') return;
  $('team').classList.add('hidden');
  G.state = 'title';
}
function updateCharLocks() { renderTeam(); } // Kompatibilität: aktualisiert Auswahl + Menü
updateCharLocks();

function resetGame() {
  G.time = 0; G.kills = 0; G.gold = loadBits();
  G.enemies.length = 0; G.shots.length = 0; G.gems.length = 0; G.parts.length = 0; G.floats.length = 0; G.strikes.length = 0; G.slashes.length = 0;
  G.comps = []; G.evoPending = 0; G.eggs = loadEggs(); G.pulling = false;
  G.spawnT = 0; G.eliteT = 45; G.levelQueue = 0; G.shake = 0;
  const c = CHARACTERS[charIndex];
  Object.assign(P, { x: 0, y: 0, vx: 0, vy: 0, hp: 100, maxhp: 100, speed: 165, armor: 0, level: 1, xp: 0, xpNext: 8, magnet: 90, damageMul: 1, cdr: 1, areaMul: 1, hurtT: 0, walkT: 0, weapons: {}, stage: 0, evoMul: 1 });
  P.coat = c.coat || '#7a1f24'; P.skin = c.skin || '#f0c8a0'; P.spr = c.spr; P.sprs = c.sprs || [c.spr]; P.sig = c.sig;
  // Team-Menü-Upgrades (persistent): +8 % Schaden, +10 Max-HP je Stufe
  UPG = loadUpg();
  const up0 = upgLvl(c.name);
  P.monMul = 1 + .08 * up0; P.maxhp += 10 * up0; P.hp = P.maxhp;
  passives = {};
  P.weapons[c.sig] = { lvl: 1, t: rand(0, .5) };
  // Solo-Run: nur das gewählte Digimon + seine Waffen (keine Begleiter)
  G.comps = [];
  saveEggs();
  updateWeaponBar();
}
function startGame() {
  if (!isUnlocked((CHARACTERS[charIndex] || {}).name)) { charIndex = 0; updateCharLocks(); }
  resetGame();
  titleEl.classList.add('hidden'); overEl.classList.add('hidden'); winEl.classList.add('hidden'); lvlEl.classList.add('hidden'); pauseEl.classList.add('hidden');
  $('evolve').classList.add('hidden'); $('gacha').classList.add('hidden'); $('team').classList.add('hidden');
  hud.classList.remove('hidden');
  G.state = 'play';
  audio(); sfx.level();
  toast(CHARACTERS[charIndex].name + ' loggen sich ins Netz ein…');
}
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', () => { winEl.classList.add('hidden'); G.state = 'play'; });
$('resumeBtn').addEventListener('click', togglePause);
$('evoBtn').addEventListener('click', confirmEvolve);
$('menuBtn').addEventListener('click', toMenu);
$('menuBtn2').addEventListener('click', toMenu);
$('pullBtn').addEventListener('click', doPull);
$('freeEggsBtn').addEventListener('click', () => {
  if (G.state !== 'gacha') return;
  G.eggs = (G.eggs || 0) + 3;
  saveEggs(); updateEggHUD(); renderPool();
  toast('🎁 +3 Gratis-Eier!');
  sfx.gem();
});
$('gachaClose').addEventListener('click', closeGacha);
$('gachaBtn').addEventListener('click', () => { if (G.state === 'title') openGacha('title'); });
$('teamBtn').addEventListener('click', openTeam);
$('teamBack').addEventListener('click', closeTeam);
function toMenu() {
  overEl.classList.add('hidden'); winEl.classList.add('hidden'); pauseEl.classList.add('hidden');
  lvlEl.classList.add('hidden'); $('evolve').classList.add('hidden'); $('gacha').classList.add('hidden');
  hud.classList.add('hidden');
  G.levelQueue = 0; G.evoPending = 0;
  resetGame();
  saveEggs();
  updateCharLocks();
  for (let i = 0; i < 12; i++) spawnEnemy(); // Deko-Betrieb hinter dem Titel
  titleEl.classList.remove('hidden');
  G.state = 'title';
  sfx.pick();
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; $('pauseStats').innerHTML = statHTML(); pauseEl.classList.remove('hidden'); }
  else if (G.state === 'pause') { G.state = 'play'; pauseEl.classList.add('hidden'); }
}
function statHTML() {
  return `ZEIT ${fmtTime(G.time)} · ${STAGES[P.stage || 0]} LV ${P.level} · KILLS ${G.kills} · BITS ${G.gold}<br>` +
    Object.entries(P.weapons).map(([k, v]) => `${WEAPONS[k].ico} ${WEAPONS[k].name} ${v.lvl}`).join(' &nbsp; ');
}
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  G.keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'e') { if (G.state === 'gacha') closeGacha(); else if (G.state === 'play') toast('🥚 Gacha-Pulls nur im Hauptmenü!'); return; }
  if (k === 't') { if (G.state === 'title') openTeam(); else if (G.state === 'team') closeTeam(); return; }
  if (k === 'escape' && G.state === 'team') { closeTeam(); return; }
  if (k === 'escape' && G.state === 'gacha') { closeGacha(); return; }
  if (G.state === 'gacha' && k === 'enter') { doPull(); return; }
  if (k === 'enter') { if (!$('evolve').classList.contains('hidden')) confirmEvolve(); else if (!titleEl.classList.contains('hidden') || !overEl.classList.contains('hidden')) startGame(); else if (!winEl.classList.contains('hidden')) { winEl.classList.add('hidden'); G.state = 'play'; } }
  if (k === 'p' || k === 'escape') { if (G.state === 'play' || G.state === 'pause') togglePause(); }
  if (k === 'm') { muted = !muted; toast(muted ? 'Ton aus' : 'Ton an'); }
  if (k === 'f') { const f = document.getElementById('frame'); if (document.fullscreenElement) document.exitFullscreen(); else f.requestFullscreen && f.requestFullscreen(); }
  if (G.state === 'levelup' && ['1', '2', '3'].includes(k)) pickCard(parseInt(k, 10) - 1);
});
window.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });

// touch
let touch = { x: 0, y: 0, on: false };
cv.addEventListener('pointerdown', e => { touch.on = true; moveTouch(e); });
window.addEventListener('pointerup', () => touch.on = false);
window.addEventListener('pointermove', e => { if (touch.on) moveTouch(e); });
function moveTouch(e) {
  const r = cv.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  touch.x = e.clientX - cx; touch.y = e.clientY - cy;
}

// ---------- level up ----------
let choices = [];
function xpFor(lvl) { return Math.floor(8 + lvl * 5 + lvl * lvl * 0.9); }
function gainXp(v) {
  P.xp += v;
  while (P.xp >= P.xpNext) { P.xp -= P.xpNext; P.level++; P.xpNext = xpFor(P.level); G.levelQueue++; }
  // Evolution per XP: Level 4/7/11 -> CHAMPION/ULTIMATE/MEGA (hat Vorrang vor Karten)
  for (const [lv, st] of [[4, 1], [7, 2], [11, 3]]) {
    if (P.level >= lv && (P.stage || 0) < st && !G.evoPending) G.evoPending = st;
  }
  if (G.evoPending && G.state === 'play') openEvolve();
  else if (G.levelQueue > 0 && G.state === 'play') openLevelUp();
}
function openEvolve() {
  G.state = 'evolve';
  const st = CHARACTERS[charIndex];
  $('evoText').textContent = `${st.name}: ${STAGES[P.stage || 0]} → ${STAGES[G.evoPending]} · +Angriff, +HP, Signatur-Move +1!`;
  $('evolve').classList.remove('hidden');
  sfx.level();
}
function confirmEvolve() {
  if (G.state !== 'evolve' || !G.evoPending) return;
  const st = CHARACTERS[charIndex];
  P.stage = G.evoPending; G.evoPending = 0;
  P.evoMul = (P.evoMul || 1) * 1.28;
  P.maxhp += 25; P.hp = Math.min(P.maxhp, P.hp + 40);
  if (P.weapons[P.sig]) P.weapons[P.sig].lvl = Math.min(WEAPONS[P.sig].max, P.weapons[P.sig].lvl + 1);
  $('evolve').classList.add('hidden');
  updateWeaponBar();
  toast(`✦ ${st.name} digitiert zu ${STAGES[P.stage]}!`);
  burst(P.x, P.y, 24, '#7dffe8');
  G.shake = Math.min(8, G.shake + 4);
  sfx.level();
  if (G.levelQueue > 0) openLevelUp();
  else G.state = 'play';
}
// ---- Persistenz: Eier-Wallet + Sammlung (bleibt über Runs erhalten) ----
function loadEggs() { try { return parseInt(localStorage.getItem('dt_eggs') || '0', 10) || 0; } catch (e) { return 0; } }
function saveEggs() { try { localStorage.setItem('dt_eggs', String(G.eggs || 0)); } catch (e) {}
  const te = $('titleEggs'); if (te) te.textContent = G.eggs || 0; }
function loadCollection() { try { const a = JSON.parse(localStorage.getItem('dt_coll') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function saveCollection(a) { try { localStorage.setItem('dt_coll', JSON.stringify(a)); } catch (e) {} }
function collCount() { const coll = loadCollection(); return STARTERS.filter(s => coll.includes(s.name)).length; }
// ---- Eier & Gacha (Solo-Runs: Pulls schalten nur neue Kämpfer frei) ----
function updateEggHUD() {
  if (elEggs) elEggs.textContent = G.eggs || 0;
  $('gachaEggs').textContent = G.eggs || 0;
  const gc = $('gachaColl'); if (gc) gc.textContent = collCount();
  const gb = $('gachaBits'); if (gb) gb.textContent = G.gold || 0;
  const pb = $('pullBtn');
  if (pb) { pb.disabled = !(G.eggs > 0) || G.pulling; pb.style.opacity = (G.eggs > 0 && !G.pulling) ? 1 : .4; }
}
function collectEgg() {
  G.eggs = (G.eggs || 0) + 1;
  saveEggs();
  updateEggHUD();
  toast('🥚 +1 Digi-Ei fürs Gacha-Menü!');
  sfx.gem();
}
function renderPool() {
  // Zeigt alle möglichen Pulls (die 7 anderen Starter) + Besitz im Gacha-Menü
  const coll = loadCollection();
  const myName = (CHARACTERS[charIndex] || {}).name;
  let h = '';
  for (const s of STARTERS) {
    if (s.name === myName) continue;
    const owned = coll.includes(s.name);
    h += `<div class="poolcell rare${owned ? ' owned' : ''}"><img src="${SPR[s.spr] ? SPR[s.spr].img.src : ''}" alt="${s.name}"><b>${s.name}</b><small>✦ ~14 %${owned ? ' · ✓' : ''}</small></div>`;
  }
  $('gachaPool').innerHTML = h;
}
function openGacha(from) {
  if (G.state !== 'title') return; // Pulls nur im Hauptmenü
  G.gachaFrom = 'title';
  G.state = 'gacha';
  $('gachaResult').innerHTML = '<p class="sub2">Drücke PULLEN oder Enter…</p>';
  renderPool();
  updateEggHUD();
  $('gacha').classList.remove('hidden');
  sfx.pick();
}
function closeGacha() {
  if (G.state !== 'gacha') return;
  $('gacha').classList.add('hidden');
  updateCharLocks(); // frisch gezogene Starter werden wählbar
  G.state = 'title';
}
function doPull() {
  if (G.state !== 'gacha' || G.pulling || !(G.eggs > 0)) return;
  G.pulling = true;
  updateEggHUD();
  // --- Pull-Animation: Ei bebt, Licht blitzt, dann Reveal ---
  const egg = $('gachaEgg');
  $('gachaResult').innerHTML = '<p class="sub2">Etwas regt sich im Ei…</p>';
  egg.classList.add('hatching');
  $('gacha').classList.add('flashing');
  sfx.pick(); setTimeout(() => sfx.pick(), 350); setTimeout(() => sfx.pick(), 700);
  setTimeout(() => {
    egg.classList.remove('hatching');
    $('gacha').classList.remove('flashing');
    resolvePull();
    G.pulling = false;
    updateEggHUD();
    renderPool();
  }, 1400);
}
function resolvePull() {
  G.eggs--; saveEggs();
  const myName = CHARACTERS[charIndex].name;
  const coll = loadCollection();
  const pool = STARTERS.filter(s => s.name !== myName && !coll.includes(s.name));
  const gr = $('gachaResult');
  if (!pool.length) {
    // Sammlung komplett: Ei zurück
    G.eggs++; saveEggs();
    gr.innerHTML = `<div class="gcard"><b>Sammlung komplett!</b><small>Alle Starter frei → 1 🥚 zurück.</small></div>`;
    sfx.gem();
  } else {
    const s = pool[randi(0, pool.length - 1)];
    coll.push(s.name); saveCollection(coll);
    const imgSrc = (SPR[s.spr] && SPR[s.spr].img.src) || '';
    gr.innerHTML = `<div class="gcard reveal rare"><img src="${imgSrc}" alt="${s.name}"><b>${s.name}</b><small>✦ NEUER KÄMPFER! Im TEAM-Menü wählbar.</small></div>`;
    burst(P.x, P.y, 14, '#ffd75e');
    sfx.level();
    toast(`✦ ${s.name} freigeschaltet!`);
  }
  updateEggHUD();
}
function poolOptions() {
  const pool = [];
  for (const [id, w] of Object.entries(WEAPONS)) {
    const cur = P.weapons[id]?.lvl || 0;
    if (cur < w.max) pool.push({ kind: 'w', id, isNew: cur === 0, w: cur === 0 ? 3 : 5 });
  }
  for (const [id, p] of Object.entries(PASSIVES)) {
    const cur = passives[id] || 0;
    if (cur < p.max) pool.push({ kind: 'p', id, isNew: false, w: 4 });
  }
  // weighted draw 3
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    let tot = pool.reduce((s, o) => s + o.w, 0), r = Math.random() * tot, idx = 0;
    for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
function openLevelUp() {
  G.state = 'levelup';
  choices = poolOptions();
  cardsEl.innerHTML = '';
  choices.forEach((c, i) => {
    const d = c.kind === 'w' ? WEAPONS[c.id] : PASSIVES[c.id];
    const cur = c.kind === 'w' ? (P.weapons[c.id]?.lvl || 0) : (passives[c.id] || 0);
    const div = document.createElement('div');
    div.className = 'card' + (c.isNew ? ' new' : '');
    div.innerHTML = `<div class="ico">${d.ico}</div><b>${i + 1}. ${d.name}</b><small>${d.desc}</small><div class="lvl">${c.isNew ? '✦ NEU! · ' + evoStage(1) : evoStage(cur) + ' · Stufe ' + cur + ' → ' + (cur + 1) + ' ' + evoStage(cur + 1)}</div>`;
    div.addEventListener('click', () => pickCard(i));
    cardsEl.appendChild(div);
  });
  lvlEl.classList.remove('hidden');
  sfx.level();
}
function pickCard(i) {
  const c = choices[i]; if (!c) return;
  if (c.kind === 'w') {
    if (!P.weapons[c.id]) P.weapons[c.id] = { lvl: 1, t: 0 };
    else P.weapons[c.id].lvl = Math.min(WEAPONS[c.id].max, P.weapons[c.id].lvl + 1);
    const beh = WEAPONS[c.id].use || c.id;
    if (beh === 'bible' || beh === 'garlic') P.weapons[c.id].t = 0;
    toast(`${WEAPONS[c.id].ico} ${WEAPONS[c.id].name} → Stufe ${P.weapons[c.id].lvl}`);
  } else {
    passives[c.id] = (passives[c.id] || 0) + 1;
    applyPassive(c.id);
    toast(`${PASSIVES[c.id].ico} ${PASSIVES[c.id].name} → Stufe ${passives[c.id]}`);
  }
  sfx.pick();
  updateWeaponBar();
  lvlEl.classList.add('hidden');
  G.levelQueue--;
  if (G.levelQueue > 0) openLevelUp();
  else G.state = 'play';
}
function applyPassive(id) {
  const n = passives[id];
  if (id === 'dmg') P.damageMul = 1 + n * .10;
  if (id === 'boots') P.speed = 165 * (1 + n * .08);
  if (id === 'magnet') P.magnet = 90 * (1 + n * .40);
  if (id === 'clock') P.cdr = Math.max(.45, 1 - n * .08);
  if (id === 'area') P.areaMul = 1 + n * .10;
  if (id === 'heart') { P.maxhp += 20; P.hp = Math.min(P.maxhp, P.hp + 30); }
}
function updateWeaponBar() {
  elWeapons.innerHTML = '';
  for (const [id, w] of Object.entries(P.weapons)) {
    const d = document.createElement('div');
    d.className = 'wicon'; d.title = `${WEAPONS[id].name} ${w.lvl}`;
    d.textContent = WEAPONS[id].ico;
    elWeapons.appendChild(d);
  }
}

// ---------- spawning ----------
function spawnEnemy(force) {
  const t = G.time;
  // difficulty ramp
  const hpMul = 1 + t / 120, dmgMul = 1 + t / 240;
  let type = 'bat';
  const r = Math.random();
  if (t < 30) type = r < .45 ? 'bat' : r < .72 ? 'zombie' : 'skel';
  else if (t < 90) type = r < .3 ? 'bat' : r < .52 ? 'zombie' : r < .72 ? 'skel' : 'ghost';
  else if (t < 200) type = r < .22 ? 'bat' : r < .38 ? 'zombie' : r < .56 ? 'skel' : r < .74 ? 'ghost' : 'brute';
  else if (t < 400) type = r < .12 ? 'bat' : r < .25 ? 'skel' : r < .45 ? 'ghost' : r < .63 ? 'brute' : r < .85 ? 'demon' : 'reaper';
  else type = r < .1 ? 'bat' : r < .22 ? 'skel' : r < .4 ? 'ghost' : r < .58 ? 'brute' : r < .8 ? 'demon' : 'reaper';
  if (force) type = force;
  const E = ENEMIES[type];
  const ang = rand(0, TAU), R = Math.max(W, H) * .75;
  const e = {
    type, x: P.x + Math.cos(ang) * R, y: P.y + Math.sin(ang) * R,
    hp: E.hp * hpMul * (force === 'vampire' ? 1 + t / 300 : 1),
    maxhp: E.hp * hpMul, sp: E.sp * rand(.9, 1.1), dmg: E.dmg * dmgMul,
    xp: E.xp, r: E.r, gold: E.gold,
    t: rand(0, 9), flash: 0, kbx: 0, kby: 0, elite: force === 'vampire', _v: Math.random(),
  };
  G.enemies.push(e);
}
function spawnLogic(dt) {
  const t = G.time;
  const interval = clamp(.55 - t * .0011, .09, .55);
  const batch = 1 + Math.floor(t / 60);
  G.spawnT -= dt;
  if (G.spawnT <= 0) { G.spawnT = interval; for (let i = 0; i < batch; i++) { if (G.enemies.length < 220) spawnEnemy(); } }
  // swarm ring every ~25s
  G.diffT += dt;
  if (G.diffT > 25) {
    G.diffT = 0;
    const n = 10 + Math.floor(t / 20);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const e = spawnEnemyAt(a); if (e) G.enemies.push(e); }
    toast('⚠ Virus-Schwarm erkannt!');
  }
  G.eliteT -= dt;
  if (G.eliteT <= 0) { G.eliteT = 60; spawnEnemy('vampire'); toast('👾 Ein MEGA-VIRUS erscheint!'); }
}
function spawnEnemyAt(a) {
  const t = G.time, hpMul = 1 + t / 120, dmgMul = 1 + t / 240;
  const roll = Math.random();
  const type = t < 60 ? (roll < .4 ? 'bat' : roll < .7 ? 'zombie' : 'skel') : (roll < .35 ? 'ghost' : roll < .6 ? 'skel' : roll < .8 ? 'zombie' : 'brute');
  const E = ENEMIES[type], R = Math.max(W, H) * .7;
  return { type, x: P.x + Math.cos(a) * R, y: P.y + Math.sin(a) * R, hp: E.hp * hpMul, maxhp: E.hp * hpMul, sp: E.sp, dmg: E.dmg * dmgMul, xp: E.xp, r: E.r, gold: E.gold, t: rand(0, 9), flash: 0, kbx: 0, kby: 0, elite: false, _v: Math.random() };
}

// ---------- combat ----------
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) { const d = dist2(e, { x, y }); if (d < bd) { bd = d; best = e; } }
  return best;
}
function damageEnemy(e, dmg, kx, ky, crit) {
  dmg *= P.damageMul * (P.evoMul || 1) * (P.monMul || 1);
  if (crit === undefined) crit = Math.random() < .08;
  if (crit) dmg *= 2;
  e.hp -= dmg; e.flash = .09;
  e.kbx += kx || 0; e.kby += ky || 0;
  G.floats.push({ x: e.x + rand(-6, 6), y: e.y - e.r - 4, txt: Math.round(dmg) + '', t: .7, crit });
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; G.kills++;
    sfx.kill();
    const nc = (ENEMIES[e.type] || {}).neon || '#35f0ff';
    burst(e.x, e.y, e.type === 'brute' || e.elite ? 14 : 7, nc);
    burst(e.x, e.y, 5, '#0a1a2e');
    // drops
    const val = e.xp;
    if (val >= 20) G.gems.push({ x: e.x, y: e.y, v: val, t: 0, big: true, kind: 'red' });
    else { const n = e.elite ? 5 : (val > 4 ? 2 : 1); for (let i = 0; i < n; i++) G.gems.push({ x: e.x + rand(-12, 12), y: e.y + rand(-12, 12), v: Math.ceil(val / n), t: rand(0, 1), big: false, kind: val >= 5 ? 'green' : 'blue' }); }
    if (Math.random() < .06 || e.elite) G.gems.push({ x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), v: 0, t: 0, gold: e.gold * 3, kind: 'gold' });
    if (Math.random() < .02) G.gems.push({ x: e.x, y: e.y, v: 0, heal: 15, t: 0, kind: 'heart' });
    // Digi-Eier: Elite immer, große Viren selten, normale ganz selten
    if (e.elite) G.gems.push({ x: e.x, y: e.y, v: 0, t: 0, kind: 'egg' });
    else if ((e.type === 'brute' || e.type === 'demon' || e.type === 'reaper') && Math.random() < .06) G.gems.push({ x: e.x, y: e.y, v: 0, t: 0, kind: 'egg' });
    if (!e.elite && Math.random() < .015) G.gems.push({ x: e.x, y: e.y, v: 0, t: 0, kind: 'egg' });
    G.shake = Math.min(6, G.shake + (e.elite ? 6 : 1));
  } else sfx.hit();
}
function burst(x, y, n, c) {
  for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: rand(-160, 160), vy: rand(-160, 160), t: rand(.25, .6), c, s: randi(2, 4) });
}
function fireWeapons(dt) {
  for (const [id, w] of Object.entries(P.weapons)) {
    const def = WEAPONS[id];
    const beh = def.use || id; // Signature-Moves nutzen Basis-Verhalten
    w.t -= dt;
    if (beh === 'bible' || beh === 'garlic') { tickAura(id, w, def, dt); continue; }
    if (w.t > 0) continue;
    const cd = def.cd[w.lvl - 1] * P.cdr;
    if (beh === 'bolt') {
      const n = nearestEnemy(P.x, P.y, 520);
      if (!n) { w.t = .1; continue; }
      w.t = cd;
      const cnt = def.count[w.lvl - 1];
      for (let i = 0; i < cnt; i++) {
        const a = Math.atan2(n.y - P.y, n.x - P.x) + (i - (cnt - 1) / 2) * .12;
        G.shots.push({ kind: 'bolt', x: P.x, y: P.y - 6, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: def.dmg[w.lvl - 1], t: 1.4, r: 6, col: def.col });
      }
      sfx.bolt(); G.aimAngle = Math.atan2(n.y - P.y, n.x - P.x);
    } else if (beh === 'knife') {
      w.t = cd;
      const cnt = def.count[w.lvl - 1];
      const base = touch.on && (Math.abs(touch.x) + Math.abs(touch.y) > 8) ? Math.atan2(touch.y, touch.x) : (P.moving ? Math.atan2(P.vy, P.vx) : G.aimAngle);
      for (let i = 0; i < cnt; i++) {
        const a = base + (i - (cnt - 1) / 2) * .14;
        G.shots.push({ kind: 'knife', x: P.x, y: P.y - 4, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: def.dmg[w.lvl - 1], t: 1.1, r: 6, a, col: def.col });
      }
      sfx.bolt();
    } else if (beh === 'whip') {
      w.t = cd;
      const cnt = def.count[w.lvl - 1];
      P._whipSide = (P._whipSide || 1) * -1;
      for (let i = 0; i < cnt; i++) {
        setTimeout(() => {}, 0);
        G.slashes.push({ x: P.x, y: P.y, side: P._whipSide * (i % 2 === 0 ? 1 : -1), t: .22, max: .22, dmg: def.dmg[w.lvl - 1], range: (110 + w.lvl * 12) * P.areaMul, id: Math.random() });
      }
      sfx.whip(); G.shake = Math.min(5, G.shake + 1.5);
    } else if (beh === 'zap') {
      w.t = cd;
      const cnt = def.count[w.lvl - 1];
      for (let i = 0; i < cnt; i++) {
        const pool = G.enemies.filter(e => !e.dead);
        if (!pool.length) break;
        const e = pool[randi(0, pool.length - 1)];
        G.strikes.push({ x: e.x, y: e.y, t: .3, dmg: def.dmg[w.lvl - 1] });
        const R = 90 * P.areaMul;
        for (const o of G.enemies) { if (!o.dead && dist2(o, e) < R * R) damageEnemy(o, def.dmg[w.lvl - 1], (o.x - e.x) * 2, (o.y - e.y) * 2); }
      }
      sfx.zap(); G.shake = Math.min(6, G.shake + 2);
    }
  }
  // Orbit-Waffen (Firewall, Steinwall & Co.)
  let oi = 0;
  for (const [oid, ow] of Object.entries(P.weapons)) {
    const odef = WEAPONS[oid];
    if ((odef.use || oid) !== 'bible') continue;
    const n = odef.count[ow.lvl - 1];
    const R = (62 + oi * 26) * P.areaMul, rot = G.time * 2.2 * (oi % 2 ? -1 : 1) + oi * 1.3;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const bx = P.x + Math.cos(a) * R, by = P.y + Math.sin(a) * R;
      for (const e of G.enemies) {
        const hk = '_o' + oid;
        if (e.dead || (e[hk] && G.time - e[hk] < .35)) continue;
        const dx = e.x - bx, dy = e.y - by;
        if (dx * dx + dy * dy < (e.r + 14) * (e.r + 14)) { e[hk] = G.time; damageEnemy(e, odef.dmg[ow.lvl - 1], dx * 6, dy * 6); }
      }
    }
    oi++;
  }
}
let garlicT = 0;
function tickAura(id, w, def, dt) {
  if (id === 'garlic') {
    garlicT -= dt;
    if (garlicT <= 0) {
      garlicT = def.cd[w.lvl - 1];
      const R = (70 + w.lvl * 10) * P.areaMul;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.x - P.x, dy = e.y - P.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1; damageEnemy(e, def.dmg[w.lvl - 1], dx / d * 160, dy / d * 160); }
      }
    }
  }
}

// ---------- update ----------
function update(dt) {
  if (G.state !== 'play') return;
  G.time += dt;
  if (G.time >= WIN_TIME && !G.won) {
    G.won = true; G.state = 'win';
    $('winStats').textContent = `Zeit ${fmtTime(G.time)} · Level ${P.level} · Kills ${G.kills}`;
    winEl.classList.remove('hidden'); sfx.level(); return;
  }
  // movement
  let ix = 0, iy = 0;
  if (G.keys['w'] || G.keys['arrowup']) iy -= 1;
  if (G.keys['s'] || G.keys['arrowdown']) iy += 1;
  if (G.keys['a'] || G.keys['arrowleft']) ix -= 1;
  if (G.keys['d'] || G.keys['arrowright']) ix += 1;
  if (touch.on && Math.hypot(touch.x, touch.y) > 12) { ix = touch.x / 60; iy = touch.y / 60; const l = Math.hypot(ix, iy) || 1; ix = clamp(ix / l, -1, 1) * Math.min(1, l); iy = clamp(iy / l, -1, 1) * Math.min(1, l); }
  const l = Math.hypot(ix, iy);
  P.moving = l > .05;
  if (l > 0) { ix /= Math.max(1, l); iy /= Math.max(1, l); }
  P.vx = ix * P.speed; P.vy = iy * P.speed;
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (P.moving) { P.walkT += dt * 10; if (Math.abs(ix) > .1) P.facing = ix > 0 ? 1 : -1; G.aimAngle = Math.atan2(P.vy, P.vx); }
  P.hurtT = Math.max(0, P.hurtT - dt);

  spawnLogic(dt);
  fireWeapons(dt);

  // shots
  for (const s of G.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    if (s.t <= 0) { s.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - s.x, dy = e.y - s.y;
      if (dx * dx + dy * dy < (e.r + s.r) * (e.r + s.r)) {
        const d = Math.hypot(s.vx, s.vy) || 1;
        damageEnemy(e, s.dmg, s.vx / d * 120, s.vy / d * 120);
        burst(s.x, s.y, 3, '#ffe9a8');
        s.dead = true; break;
      }
    }
  }
  G.shots = G.shots.filter(s => !s.dead);

  // slashes (whip instant)
  for (const s of G.slashes) {
    s.t -= dt;
    if (s._hitDone) continue;
    s._hitDone = true;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - P.x, dy = e.y - P.y;
      const inRange = Math.hypot(dx, dy) < s.range + e.r;
      const sideOK = s.side > 0 ? dx > -30 : dx < 30;
      if (inRange && sideOK && Math.abs(dy) < 70 * P.areaMul + e.r) {
        damageEnemy(e, s.dmg, Math.sign(dx || s.side) * 220, -60);
      }
    }
  }
  G.slashes = G.slashes.filter(s => s.t > 0);
  G.strikes = G.strikes.filter(s => (s.t -= dt) > 0);

  // enemies
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt);
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    const sep = separation(e);
    let mx = dx / d * e.sp + sep.x + (e.kbx || 0), my = dy / d * e.sp + sep.y + (e.kby || 0);
    e.kbx = (e.kbx || 0) * (1 - Math.min(1, dt * 6)); e.kby = (e.kby || 0) * (1 - Math.min(1, dt * 6));
    // ghost sine
    if (e.type === 'ghost') { mx += Math.cos(e.t * 5) * 40; my += Math.sin(e.t * 4) * 40; }
    if (e.type === 'bat') { mx += Math.cos(e.t * 7) * 50; my += Math.sin(e.t * 6) * 50; }
    e.x += mx * dt; e.y += my * dt;
    // touch player
    if (d < e.r + P.r) {
      if (P.hurtT <= 0) {
        const raw = Math.max(1, e.dmg - P.armor);
        P.hp -= raw; P.hurtT = .45;
        G.shake = Math.min(8, G.shake + 3);
        G.floats.push({ x: P.x, y: P.y - 20, txt: '-' + Math.round(raw), t: .8, hurt: true });
        burst(P.x, P.y, 6, '#c1121f');
        sfx.hurt();
        // knock player slightly
        P.x -= dx / d * 6; P.y -= dy / d * 6;
        if (P.hp <= 0) { P.hp = 0; die(); return; }
      }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);

  // gems magnet
  for (const g of G.gems) {
    g.t += dt;
    const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1;
    const mr = g.kind === 'gold' || g.kind === 'heart' ? P.magnet * .8 : P.magnet;
    if (d < mr) { const pull = 520 * (1 - d / (mr + 1)) + 160; g.x += dx / d * pull * dt; g.y += dy / d * pull * dt; }
    if (d < P.r + 10) {
      g.dead = true;
      if (g.kind === 'egg') { collectEgg(); burst(P.x, P.y - 6, 4, '#ff9fe8'); }
      else if (g.kind === 'gold') { G.gold += g.gold || 5; saveBits(); G.floats.push({ x: P.x, y: P.y - 24, txt: '+' + (g.gold || 5) + ' Bits', t: .7, gold: true }); sfx.gem(); }
      else if (g.heal) { P.hp = Math.min(P.maxhp, P.hp + g.heal); G.floats.push({ x: P.x, y: P.y - 24, txt: '+' + g.heal + ' HP', t: .8, heal: true }); sfx.pick(); }
      else { gainXp(g.v); sfx.gem(); burst(P.x, P.y - 6, 2, '#5ec8ff'); }
    }
    if (G.time - 0 > 0 && d > 1400) g.dead = true;
  }
  G.gems = G.gems.filter(g => !g.dead);

  // ambient aufsteigende Daten-Funken
  G.ambT = (G.ambT || 0) - dt;
  if (G.ambT <= 0) { G.ambT = .22; G.parts.push({ x: P.x + rand(-420, 420), y: P.y + rand(-260, 260), vx: rand(-8, 8), vy: rand(-70, -30), t: rand(.8, 1.6), c: Math.random() < .5 ? '#35f0ff' : '#ff3bd4', s: 2 }); }
  // particles / floats
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; p.t -= dt; }
  G.parts = G.parts.filter(p => p.t > 0);
  for (const f of G.floats) { f.y -= 42 * dt; f.t -= dt; }
  G.floats = G.floats.filter(f => f.t > 0);

  // camera + shake
  G.shake = Math.max(0, G.shake - dt * 14);
  G.shakeX = rand(-1, 1) * G.shake; G.shakeY = rand(-1, 1) * G.shake;
  G.cam.x += ((P.x - W / 2) - G.cam.x) * Math.min(1, dt * 6);
  G.cam.y += ((P.y - H / 2) - G.cam.y) * Math.min(1, dt * 6);

  // HUD
  hpfill.style.width = (100 * P.hp / P.maxhp) + '%';
  hptext.textContent = `${Math.ceil(P.hp)}/${P.maxhp}`;
  xpfill.style.width = (100 * P.xp / P.xpNext) + '%';
  elTimer.textContent = fmtTime(G.time);
  elLevel.textContent = P.level; elKills.textContent = G.kills; elGold.textContent = G.gold;
  if (elStage) elStage.textContent = STAGES[P.stage || 0];
  if (elEggs) elEggs.textContent = G.eggs || 0;
}
const _sep = { x: 0, y: 0 };
function separation(e) {
  // cheap: sample few neighbours
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < G.enemies.length; i += 3) {
    const o = G.enemies[i];
    if (o === e || o.dead) continue;
    const dx = e.x - o.x, dy = e.y - o.y, d2 = dx * dx + dy * dy;
    if (d2 < 28 * 28 && d2 > 0.01) { const d = Math.sqrt(d2); sx += dx / d * 30; sy += dy / d * 30; if (++n > 4) break; }
  }
  _sep.x = sx; _sep.y = sy; return _sep;
}
function die() {
  G.state = 'over';
  burst(P.x, P.y, 30, '#35f0ff');
  $('finalStats').textContent = `Online ${fmtTime(G.time)} · Level ${P.level} · ${G.kills} Viren gelöscht · ${G.gold} Bits`;
  overEl.classList.remove('hidden');
}

// ---------- render ----------
function drawGround() {
  const T = 48;
  const ox = -(((G.cam.x + G.shakeX) % T) + T) % T, oy = -(((G.cam.y + G.shakeY) % T) + T) % T;
  for (let y = -1; y < H / T + 1; y++) for (let x = -1; x < W / T + 1; x++) {
    const even = ((Math.floor((G.cam.x + x * T) / T) + Math.floor((G.cam.y + y * T) / T)) & 1) === 0;
    ctx.fillStyle = even ? '#0e1830' : '#0b1326';
    ctx.fillRect(ox + x * T, oy + y * T, T, T);
  }
  // Netz-Linien
  ctx.strokeStyle = 'rgba(53,240,255,.10)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.round(ox); x < W; x += T) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
  for (let y = Math.round(oy); y < H; y += T) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
  ctx.stroke();
  // Daten-Partikel / Knoten deterministisch
  const cx = G.cam.x + G.shakeX, cy = G.cam.y + G.shakeY;
  const gx0 = Math.floor(cx / T) - 1, gy0 = Math.floor(cy / T) - 1;
  for (let gy = gy0; gy < gy0 + H / T + 3; gy++) for (let gx = gx0; gx < gx0 + W / T + 3; gx++) {
    let h = (gx * 73856093 ^ gy * 19349663) >>> 0;
    h = (h ^ (h >> 13)) >>> 0;
    const r = (h % 100) / 100;
    const sx = gx * T - cx + (h % T), sy = gy * T - cy + ((h >> 7) % T);
    if (r < .12) { // Daten-Funken
      ctx.fillStyle = (h >> 3) % 2 ? '#35f0ff' : '#ff3bd4';
      ctx.fillRect(sx, sy, 3, 3); ctx.fillRect(sx + 5, sy + 2, 2, 2);
    } else if (r > .975) { // Daten-Kristall (statt Grabstein)
      const c = (h >> 5) % 2 ? '#35f0ff' : '#b44dff';
      ctx.fillStyle = '#0008'; ctx.fillRect(sx - 6, sy + 8, 24, 5);
      ctx.fillStyle = c; ctx.fillRect(sx + 2, sy - 12, 8, 20);
      ctx.fillStyle = '#ffffff88'; ctx.fillRect(sx + 2, sy - 12, 8, 3);
      ctx.fillRect(sx + 2, sy - 12, 3, 20);
    } else if (r > .955) { // Leiterbahn-Knoten
      ctx.fillStyle = '#1f6d8a'; ctx.fillRect(sx, sy, 6, 2); ctx.fillRect(sx + 2, sy - 2, 2, 6);
      ctx.fillStyle = '#35f0ff'; ctx.fillRect(sx + 2, sy, 2, 2);
    }
  }
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function sx(x) { return x - G.cam.x - G.shakeX; }
function sy(y) { return y - G.cam.y - G.shakeY; }

function drawShadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y + r * .9, r * .9, r * .35, 0, 0, TAU); ctx.fill(); }

function drawPlayer() {
  const x = sx(P.x), y = sy(P.y);
  const bob = P.moving ? Math.sin(P.walkT) * 2 : Math.sin(G.time * 2) * 1;
  const flash = P.hurtT > .25;
  drawShadow(x, y, P.r);
  // Stage-Ring unter dem Digimon
  const ringCol = ['#35f0ff', '#ffd75e', '#ff3bd4', '#ff9a3b'][P.stage || 0] || '#35f0ff';
  ctx.strokeStyle = ringCol; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 13, 17, 6, 0, 0, TAU); ctx.stroke();
  // CC0 sprite (Fallback: prozedural). Volmon flattert mit 2 Frames.
  const psc = 2.5 + (P.stage || 0) * 0.3;
  const pframe = (P.sprs && P.sprs.length > 1) ? P.sprs[Math.floor(G.time * 7) % P.sprs.length] : P.spr;
  if (drawSpr(pframe, x, y + bob * .4, psc, P.facing < 0, 1, flash)) {
    // Mega-Krone
    if ((P.stage || 0) >= 3) { px(x - 8, y - 36, 16, 5, '#ffd75e'); px(x - 8, y - 40, 4, 5, '#ffd75e'); px(x - 2, y - 42, 4, 7, '#fff6c8'); px(x + 4, y - 40, 4, 5, '#ffd75e'); }
    // Aura-Feld (Antivirus / Sporenwolke)
    for (const [wid, ww] of Object.entries(P.weapons)) {
      const wd = WEAPONS[wid];
      if ((wd.use || wid) !== 'garlic') continue;
      const R = (70 + ww.lvl * 10) * P.areaMul * .5;
      ctx.globalAlpha = .14 + Math.sin(G.time * 4) * .04;
      ctx.fillStyle = '#35f0ff';
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
  ctx.save(); ctx.translate(x, y + bob * .4);
  if (flash && Math.floor(G.time * 20) % 2 === 0) ctx.globalAlpha = .5;
  const f = P.facing;
  // cloak
  px(-9, -14, 18, 26, '#0d0d12');
  px(-7, -12, 14, 22, P.coat);
  px(-7, -12, 5, 22, 'rgba(0,0,0,.3)');
  // belt
  px(-7, 2, 14, 3, '#c9a227');
  // head
  px(-6, -22, 12, 10, P.skin);
  px(-6, -22, 12, 3, '#2a1c10'); // hair
  px(f > 0 ? 1 : -4, -17, 3, 3, '#111'); // eye
  // whip arm
  const sw = G.slashes.length ? 1 : 0;
  px(f > 0 ? 6 : -11, -6 + (sw ? -4 : 0), 5, 10, P.skin);
  // legs
  const lp = P.moving ? Math.sin(P.walkT) * 4 : 0;
  px(-6, 12, 5, 8 + lp * .3, '#1a1a20');
  px(1, 12, 5, 8 - lp * .3, '#22222a');
  // garlic aura
  let hasAura = false, auraLvl = 1;
  for (const [wid, ww] of Object.entries(P.weapons)) {
    const wd = WEAPONS[wid];
    if ((wd.use || wid) === 'garlic') { hasAura = true; auraLvl = Math.max(auraLvl, ww.lvl); }
  }
  if (hasAura) {
    const R = (70 + auraLvl * 10) * P.areaMul * .5;
    ctx.globalAlpha = .14 + Math.sin(G.time * 4) * .04;
    ctx.fillStyle = '#35f0ff';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  } // end fallback
  // Orbit-Waffen (Firewall-Blöcke / Steinwall)
  let obi = 0;
  for (const [oid, ow] of Object.entries(P.weapons)) {
    const odef = WEAPONS[oid];
    if ((odef.use || oid) !== 'bible') continue;
    const n = odef.count[ow.lvl - 1], R = (62 + obi * 26) * P.areaMul, rot = G.time * 2.2 * (obi % 2 ? -1 : 1) + obi * 1.3;
    const stone = oid === 'stein';
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R + Math.sin(G.time * 5 + i) * 3;
      if (stone) {
        px(bx - 7, by - 7, 14, 14, '#0d0d12');
        px(bx - 5, by - 5, 10, 10, '#8a7a5a');
        px(bx - 5, by - 5, 10, 3, '#c9b18a');
      } else {
        px(bx - 7, by - 9, 14, 18, '#0d0d12');
        px(bx - 5, by - 7, 10, 14, '#e8dcc0');
        px(bx - 3, by - 7, 6, 14, '#7a1f24');
        px(bx - 5, by - 2, 10, 2, '#c9a227');
      }
    }
    obi++;
  }
}

function drawEnemy(e) {
  const x = sx(e.x), y = sy(e.y);
  if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
  const wob = Math.sin(e.t * 8) * 2;
  drawShadow(x, y, e.r);
  // CC0 sprite (Fallback: prozedural). Sprites blicken nach rechts -> spiegeln wenn Ziel links.
  const E0 = ENEMIES[e.type] || {};
  const sprs = E0.sprs || [];
  // Fledermaus: Flügelschlag-Animation; Geist: pro Gegner feste Variante (kein Flackern)
  const frame = e.type === 'bat' && sprs.length > 1 ? sprs[Math.floor(e.t * 7) % sprs.length]
    : sprs.length > 1 ? sprs[Math.floor((e._v || 0) * sprs.length) % sprs.length] : sprs[0];
  const flip = (P.x < e.x);
  let drew = false;
  if (frame) {
    // Neon-Aura unter Virus-Sprite
    if (E0.neon) { ctx.fillStyle = E0.neon + '2e'; ctx.beginPath(); ctx.arc(x, y + 4, e.r + 8, 0, TAU); ctx.fill(); }
    drew = drawSpr(frame, x, y + wob * .4, E0.sc || 2.4, flip, E0.alpha !== undefined ? E0.alpha : 1, e.flash > 0);
  }
  if (drew) {
    if (e.elite) { px(x - 11, y - e.r - 22, 22, 4, '#c9a227'); }
  } else {
  ctx.save(); ctx.translate(x, y + wob * .4);
  if (e.flash > 0) ctx.globalAlpha = .9;
  const F = e.flash > 0 ? '#ffffff' : null;
  if (e.type === 'bat') {
    const flap = Math.sin(e.t * 14) > 0 ? -6 : 4;
    px(-16, -6 + flap * .5, 12, 6, F || '#5a3a6b'); px(4, -6 - flap * .5, 12, 6, F || '#5a3a6b');
    px(-6, -8, 12, 12, F || '#3a2545'); px(-4, -4, 3, 3, '#ff3b3b'); px(1, -4, 3, 3, '#ff3b3b');
    px(-2, 0, 4, 3, '#fff');
  } else if (e.type === 'skel') {
    px(-7, -14, 14, 22, F || '#d8d0b8');
    px(-7, -14, 14, 4, F || '#c4b898');
    px(-9, -20, 18, 10, F || '#e8e0c8');
    px(-5, -17, 4, 4, '#0a0a0a'); px(1, -17, 4, 4, '#0a0a0a');
    px(-2, -12, 4, 2, '#0a0a0a');
    px(-9, -8, 4, 10, F || '#c4b898'); px(5, -8, 4, 10, F || '#c4b898');
    if (e.elite) { px(-11, -24, 22, 4, '#c9a227'); }
  } else if (e.type === 'ghost') {
    ctx.globalAlpha = e.flash > 0 ? .95 : .75;
    px(-9, -16, 18, 22, F || '#b8c8d8');
    px(-9, 2, 5, 6, F || '#b8c8d8'); px(-2, 2, 5, 9, F || '#b8c8d8'); px(5, 2, 5, 6, F || '#b8c8d8');
    px(-6, -12, 4, 6, '#0a0a1a'); px(2, -12, 4, 6, '#0a0a1a');
  } else if (e.type === 'brute') {
    px(-11, -18, 22, 30, F || '#4a5a3a');
    px(-11, -18, 22, 6, F || '#37452c');
    px(-8, -26, 16, 12, F || '#6b8a5a');
    px(-5, -22, 4, 4, '#ffdd33'); px(1, -22, 4, 4, '#ffdd33');
    px(-13, -10, 5, 14, F || '#37452c'); px(8, -10, 5, 14, F || '#37452c');
  } else if (e.type === 'reaper') {
    px(-8, -18, 16, 28, F || '#1a1a24');
    px(-10, -26, 20, 12, F || '#e8e0c8');
    px(-6, -23, 5, 5, '#0a0a0a'); px(1, -23, 5, 5, '#0a0a0a');
    px(8, -14, 10, 3, '#8a8a95'); // scythe
    px(14, -22, 3, 22, '#5a4a22');
  } else if (e.type === 'vampire') {
    px(-12, -20, 24, 34, F || '#2a0d16');
    px(-16, -18, 8, 20, F || '#4a0f1e'); px(8, -18, 8, 20, F || '#4a0f1e'); // cape
    px(-8, -28, 16, 12, F || '#f0d0b0');
    px(-8, -30, 16, 5, '#1a1a1a');
    px(-5, -24, 4, 3, '#c1121f'); px(1, -24, 4, 3, '#c1121f');
    px(-3, -19, 2, 3, '#fff'); px(1, -19, 2, 3, '#fff');
    // elite crown
    px(-9, -34, 18, 6, '#c9a227');
  }
  ctx.restore();
  } // end fallback
  // hp bar for elites/brutes
  if ((e.elite || e.type === 'brute' || e.type === 'vampire') && e.hp < e.maxhp) {
    const w = 30;
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, y - e.r - 14, w, 5);
    ctx.fillStyle = '#c1121f'; ctx.fillRect(x - w / 2, y - e.r - 14, w * clamp(e.hp / e.maxhp, 0, 1), 5);
  }
}

function drawGems() {
  for (const g of G.gems) {
    const x = sx(g.x), y = sy(g.y) + Math.sin(g.t * 5) * 2;
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    drawShadow(x, y + 6, 5);
    if (g.kind === 'egg') {
      // Digi-Ei (prozedural): pulsierendes Glühen + gepunktetes Ei
      const pulse = 6 + Math.sin(g.t * 6) * 2;
      ctx.fillStyle = 'rgba(255,159,232,.30)'; ctx.beginPath(); ctx.arc(x, y, 12 + pulse * .4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f4f6ff'; ctx.beginPath(); ctx.ellipse(x, y, 7, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff3bd4'; ctx.fillRect(x - 4, y - 5, 3, 3); ctx.fillRect(x + 1, y, 3, 3); ctx.fillRect(x - 3, y + 4, 3, 3);
      ctx.fillStyle = '#35f0ff'; ctx.fillRect(x + 1, y - 5, 2, 2); ctx.fillRect(x - 4, y + 1, 2, 2);
    } else if (g.kind === 'gold') {
      if (!drawSpr('gold', x, y, 2.0, false, 1, false)) {
      ctx.fillStyle = '#0008'; ctx.fillRect(x - 6, y - 6, 12, 12);
      px(x - 5, y - 5, 10, 10, '#ffd75e'); px(x - 3, y - 3, 4, 4, '#fff6c8');
      px(x - 5, y - 5, 10, 2, '#fff6c8');
      }
    } else if (g.heal) {
      if (!drawSpr('heart', x, y, 2.0, false, 1, false)) {
      px(x - 6, y - 5, 12, 10, '#c1121f'); px(x - 3, y - 8, 6, 16, '#c1121f');
      px(x - 4, y - 3, 8, 6, '#ff6b7a');
      }
    } else {
      const drew = drawSpr('gem', x, y, g.big ? 2.4 : 1.7, false, 1, false);
      const c = g.kind === 'red' ? '#ff3b5b' : g.kind === 'green' ? '#5eff7d' : '#5ec8ff';
      const s = g.big ? 8 : 5;
      if (!drew) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#0008'; ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = c; ctx.fillRect(-s + 1, -s + 1, s * 2 - 2, s * 2 - 2);
      ctx.fillStyle = '#ffffffaa'; ctx.fillRect(-s + 1, -s + 1, s * 2 - 2, 3);
      ctx.restore();
      }
      // glow
      ctx.fillStyle = c + '22'; ctx.beginPath(); ctx.arc(x, y, s + 6, 0, TAU); ctx.fill();
    }
  }
}
function drawShots() {
  for (const s of G.shots) {
    const x = sx(s.x), y = sy(s.y);
    if (s.kind === 'bolt') {
      ctx.fillStyle = s.col || '#9fe8ff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    } else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(s.vy, s.vx));
      px(-8, -2, 14, 4, s.col || '#d8d0b8'); px(4, -3, 5, 6, '#8a8a95'); px(-8, -2, 4, 4, '#c9a227');
      ctx.restore();
    }
  }
  // whip slashes
  for (const s of G.slashes) {
    const a = 1 - s.t / s.max;
    ctx.save(); ctx.translate(sx(P.x), sy(P.y)); ctx.scale(s.side, 1);
    ctx.globalAlpha = 1 - a;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(20, 0, s.range * (0.5 + a * 0.5), -.9, .9); ctx.stroke();
    ctx.strokeStyle = '#35f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(20, 0, s.range * (0.5 + a * 0.5), -.9, .9); ctx.stroke();
    ctx.strokeStyle = '#ff3bd4'; ctx.lineWidth = 5; ctx.globalAlpha = (1 - a) * .5;
    ctx.beginPath(); ctx.arc(20, 0, s.range * (0.5 + a * 0.5) - 5, -.9, .9); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // lightning
  for (const st of G.strikes) {
    const x = sx(st.x), y = sy(st.y);
    ctx.save();
    ctx.globalAlpha = clamp(st.t * 4, 0, 1);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
    let lx = x + rand(-4, 4), ly = y - 120;
    ctx.moveTo(lx, ly);
    for (let i = 0; i < 5; i++) { lx += rand(-14, 14); ly += 26; ctx.lineTo(lx, ly); }
    ctx.stroke();
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 7; ctx.globalAlpha *= .4; ctx.stroke();
    ctx.restore();
  }
}
function drawParts() {
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.t * 3, 0, 1);
    px(sx(p.x), sy(p.y), p.s, p.s, p.c);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.font = 'bold 13px Verdana';
  for (const f of G.floats) {
    ctx.globalAlpha = clamp(f.t * 2, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillText(f.txt, sx(f.x) + 1, sy(f.y) + 1);
    ctx.fillStyle = f.hurt ? '#ff5b5b' : f.gold ? '#ffd75e' : f.heal ? '#5eff7d' : f.crit ? '#ffd75e' : '#fff';
    ctx.fillText(f.txt, sx(f.x), sy(f.y));
  }
  ctx.globalAlpha = 1;
}
function drawHUDCanvas() {
  // low-hp vignette
  if (P.hp / P.maxhp < .35 && G.state === 'play') {
    const a = .25 + Math.sin(G.time * 6) * .1;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(160,10,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // wave banner
  if (G.time < 6 && G.state === 'play') {
    ctx.textAlign = 'center';
    ctx.globalAlpha = clamp(6 - G.time, 0, 1) * clamp(G.time * 2, 0, 1);
    ctx.font = '900 40px Georgia'; ctx.fillStyle = '#000'; ctx.fillText('NETZ-SEKTOR 01', W / 2 + 2, H / 2 - 18);
    ctx.fillStyle = '#d8ecff'; ctx.fillText('NETZ-SEKTOR 01', W / 2, H / 2 - 20);
    ctx.font = '14px Georgia'; ctx.fillStyle = '#35f0ff'; ctx.fillText('— halte den Virus-Sturm auf —', W / 2, H / 2 + 6);
    ctx.globalAlpha = 1;
  }
}

function render() {
  ctx.fillStyle = '#101a10'; ctx.fillRect(0, 0, W, H);
  drawGround();
  // sort enemies + player by y
  const draws = G.enemies.map(e => ({ y: e.y, e }));
  draws.sort((a, b) => a.y - b.y);
  drawGems();
  let playerDrawn = false;
  for (const d of draws) {
    if (!playerDrawn && P.y < d.y) { drawPlayer(); playerDrawn = true; }
    drawEnemy(d.e);
  }
  if (!playerDrawn) drawPlayer();
  drawShots();
  drawParts();
  drawHUDCanvas();
  // scanlines subtle
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  let dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (G.state === 'play') update(dt);
  else {
    // idle anim on title/team: drift camera
    if (G.state === 'title' || G.state === 'team') { G.time += dt; G.cam.x += dt * 12; G.cam.y += dt * 6; }
    for (const p of G.parts) { p.t -= dt; }
    for (const f of G.floats) { f.t -= dt; f.y -= 30 * dt; }
  }
  render();
  requestAnimationFrame(loop);
}
// demo background enemies on title
G.cam.x = -W / 2; G.cam.y = -H / 2;
resetGame();
for (let i = 0; i < 12; i++) spawnEnemy();
requestAnimationFrame(loop);
