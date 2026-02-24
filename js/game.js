'use strict';

// ============================================================
// CONSTANTS
// ============================================================

const MAP_W          = 60;
const MAP_H          = 30;
const MAX_ENEMIES    = 8;
const MAX_ITEMS      = 5;
const MAX_MESSAGES   = 8;
const SIGHT_RANGE    = 12;
const MIN_SPAWN_DIST = 8;
const ROUND_DURATION = 10;
const DEATH_DELAY    = 15;   // seconds before auto-restart
const HOF_MAX        = 10;
const CHAT_MAX_LEN   = 120;
const CHAT_HISTORY   = 40;

const SUPABASE_URL = 'https://uzdeqporpuioziaokilw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZGVxcG9ycHVpb3ppYW9raWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzMzNjMsImV4cCI6MjA4NzQ0OTM2M30.dHNbMEWdtD8MBOoQ7qKbBRpAfPm3kVKIZ1ax_kysSS4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// DATA
// ============================================================

const FIRST_NAMES = [
  'Aldric', 'Bram',  'Cael',  'Dwyn',  'Eryn',  'Faen',
  'Gorn',   'Hael',  'Idris', 'Jorn',  'Kael',  'Lyra',
  'Maren',  'Nyx',   'Orin',  'Petra', 'Rael',  'Syla',
  'Thane',  'Vael',  'Wren',  'Zorn',  'Aela',  'Cress',
];

const LAST_NAMES = [
  'Ashford',    'Blackmoor',  'Coldwater',  'Duskmantle',
  'Embervale',  'Frostholm',  'Greystone',  'Hawkwind',
  'Ironwood',   'Losthaven',  'Moonwhisper','Nighthollow',
  'Oakenshield','Ravenmark',  'Silverstream','Thornwall',
  'Voidwalker', 'Wilderpath', 'Yewbarrow',  'Zephyrhold',
];

// minFloor: first floor on which this enemy can appear
const ENEMY_DEFS = [
  { char: 'G', name: 'Goblin', color: '#4a4', hp: [5, 10],  atk: [2, 4], def: [0, 1], minFloor: 1 },
  { char: 'O', name: 'Orc',    color: '#8a4', hp: [10, 16], atk: [3, 5], def: [1, 2], minFloor: 3 },
  { char: 'T', name: 'Troll',  color: '#a44', hp: [15, 22], atk: [5, 8], def: [2, 3], minFloor: 4 },
];

const CODEX = {
  '@': { name: 'Adventurer',    color: '#fff', desc: "That's you." },
  '>': { name: 'Stairs',        color: '#dd0', desc: 'Vote Go Down Stairs to descend.' },
  '!': { name: 'Health Potion', color: '#e55', desc: 'Vote Pick Up Item, then Use Potion.' },
  ')': { name: 'Weapon',        color: '#fa0', desc: 'Vote Pick Up Item to raise ATK.' },
  'G': { name: 'Goblin',        color: '#4a4', desc: 'Fast and weak. Common from floor 1.' },
  'O': { name: 'Orc',           color: '#8a4', desc: 'Tougher fighter. Appears on floor 3.' },
  'T': { name: 'Troll',         color: '#a44', desc: 'Dangerous brute. Appears on floor 4.' },
};

const CODEX_ORDER = ['@', '>', '!', ')', 'G', 'O', 'T'];

// ============================================================
// ACTIONS
// ============================================================

const ACTIONS = [
  { id: 'north',   label: 'Move North',     displayKey: 'W' },
  { id: 'south',   label: 'Move South',     displayKey: 'S' },
  { id: 'east',    label: 'Move East',       displayKey: 'D' },
  { id: 'west',    label: 'Move West',       displayKey: 'A' },
  { id: 'attack',  label: 'Attack Nearest', displayKey: 'F' },
  { id: 'pickup',  label: 'Pick Up Item',   displayKey: 'G' },
  { id: 'potion',  label: 'Use Potion',      displayKey: 'P' },
  { id: 'stairs',  label: 'Go Down Stairs', displayKey: '>' },
  { id: 'wait',    label: 'Wait',            displayKey: '.' },
];

const KEY_TO_ACTION = {
  'w': 'north', 'ArrowUp':    'north', 'k': 'north',
  's': 'south', 'ArrowDown':  'south', 'j': 'south',
  'd': 'east',  'ArrowRight': 'east',  'l': 'east',
  'a': 'west',  'ArrowLeft':  'west',  'h': 'west',
  'f': 'attack',
  'g': 'pickup',
  'p': 'potion',
  '>': 'stairs',
  '.': 'wait', ' ': 'wait',
};

// ============================================================
// STATE
// ============================================================

let display, map, player, enemies, items, stairs, messages,
    floorNum, gameActive, rooms, discovered,
    votes, timeLeft, timerInterval,
    deathTimer, deathTimeLeft;

// Supabase sync metadata
let currentVersion, roundEndsAt, realtimeChannel, isExecutingRound;

// Chat & presence
let displayName, presenceChannel;

const CLIENT_ID = (() => {
  let id = sessionStorage.getItem('cc_cid');
  if (!id) { id = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('cc_cid', id); }
  return id;
})();

// ============================================================
// UTILITIES
// ============================================================

const rand  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick  = (arr)    => arr[Math.floor(Math.random() * arr.length)];
const cheby = (a, b)   => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const an    = (word)   => /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;

// ============================================================
// INITIALISATION
// ============================================================

async function init() {
  display = new ROT.Display({
    width:      MAP_W,
    height:     MAP_H,
    fontSize:   16,
    fontFamily: '"Courier New", Courier, monospace',
    bg:         '#0d0d0d',
    fg:         '#aaa',
  });
  document.getElementById('canvas-container').appendChild(display.getContainer());

  initVoteUI();
  initCollapsibles();
  initChat();

  const { data, error } = await sb.from('game_state').select('*').eq('id', 1).single();

  if (data) {
    hydrate(data);
  } else {
    // error.code 'PGRST116' = no rows — bootstrap
    await createInitialState();
  }

  subscribeRealtime();

  window.addEventListener('keydown', onKey);
  document.getElementById('restart-btn').addEventListener('click', restart);
}

// ============================================================
// CHARACTER CREATION
// ============================================================

function makePlayer() {
  const maxHp = rand(20, 35);
  return {
    x: 0, y: 0,
    hp: maxHp, maxHp,
    atk:      rand(3, 8),
    def:      rand(1, 5),
    name:     `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    potions:  0,
    kills:    0,
    killedBy: null,
  };
}

// ============================================================
// FLOOR GENERATION
// ============================================================

function newFloor() {
  map     = [];
  enemies = [];
  items   = [];
  stairs  = null;
  rooms   = [];

  for (let y = 0; y < MAP_H; y++) {
    map[y] = new Array(MAP_W).fill('#');
  }

  const digger = new ROT.Map.Digger(MAP_W, MAP_H, {
    roomWidth:      [4, 10],
    roomHeight:     [3, 7],
    corridorLength: [2, 5],
    dugPercentage:  0.25,
  });
  digger.create((x, y, v) => { map[y][x] = v ? '#' : '.'; });
  rooms = digger.getRooms();

  const [px, py] = rooms[0].getCenter();
  player.x = px;
  player.y = py;

  const [sx, sy] = rooms[rooms.length - 1].getCenter();
  stairs = { x: sx, y: sy };

  placeEnemies();
  placeItems();
  revealSymbols();
}

function placeEnemies() {
  const defs  = ENEMY_DEFS.filter(d => d.minFloor <= floorNum);
  const lo    = Math.min(2 + floorNum, MAX_ENEMIES - 2);
  const hi    = Math.min(3 + floorNum, MAX_ENEMIES);
  const count = rand(lo, hi);
  const pool  = rooms.length > 2 ? rooms.slice(1, -1) : rooms.slice(1);

  for (let i = 0; i < count; i++) {
    const def  = pick(defs);
    const room = pick(pool.length ? pool : rooms);
    const pos  = freeSpot(room, player, MIN_SPAWN_DIST);
    if (!pos) continue;

    enemies.push({
      x: pos.x, y: pos.y,
      hp:    rand(def.hp[0],  def.hp[1]),
      maxHp: def.hp[1],
      atk:   rand(def.atk[0], def.atk[1]),
      def:   rand(def.def[0], def.def[1]),
      char:  def.char,
      name:  def.name,
      color: def.color,
      alive: true,
    });
  }
}

function placeItems() {
  const count = rand(MAX_ITEMS - 1, MAX_ITEMS);
  for (let i = 0; i < count; i++) {
    const room = pick(rooms);
    const pos  = freeSpot(room);
    if (!pos) continue;

    const isPotion = Math.random() < 0.65;
    items.push({
      x: pos.x, y: pos.y,
      type:  isPotion ? 'potion'        : 'weapon',
      char:  isPotion ? '!'             : ')',
      name:  isPotion ? 'Health Potion' : 'Rusty Weapon',
      value: isPotion ? rand(8, 15)     : rand(1, 3),
    });
  }
}

function freeSpot(room, from = null, minDist = 0) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = rand(room.getLeft(), room.getRight());
    const y = rand(room.getTop(),  room.getBottom());
    if (isOccupied(x, y)) continue;
    if (from && cheby({ x, y }, from) < minDist) continue;
    return { x, y };
  }
  return null;
}

// ============================================================
// CODEX
// ============================================================

function revealSymbols() {
  let changed = false;
  const toCheck = ['@', '>'];
  for (const e of enemies) toCheck.push(e.char);
  for (const i of items)   toCheck.push(i.char);
  for (const sym of toCheck) {
    if (CODEX[sym] && !discovered.has(sym)) {
      discovered.add(sym);
      changed = true;
    }
  }
  if (changed) updateCodex();
}

function updateCodex() {
  const el = document.getElementById('codex-list');
  if (!el) return;
  el.innerHTML = CODEX_ORDER
    .filter(sym => discovered.has(sym))
    .map(sym => {
      const c = CODEX[sym];
      return `<div class="codex-entry">` +
        `<span class="codex-char" style="color:${c.color}">${sym}</span>` +
        `<span class="codex-info">` +
        `<span class="codex-name">${c.name}</span>` +
        `<span class="codex-desc">${c.desc}</span>` +
        `</span></div>`;
    })
    .join('');
}

// ============================================================
// QUERIES
// ============================================================

function isFloor(x, y) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && map[y][x] === '.';
}

function isOccupied(x, y) {
  if (map[y][x] !== '.')                                          return true;
  if (player.x === x && player.y === y)                          return true;
  if (enemies.some(e => e.alive && e.x === x && e.y === y))      return true;
  if (items.some(i => i.x === x && i.y === y))                   return true;
  if (stairs && stairs.x === x && stairs.y === y)                return true;
  return false;
}

function enemyAt(x, y) {
  return enemies.find(e => e.alive && e.x === x && e.y === y) || null;
}

function itemAt(x, y) {
  return items.find(i => i.x === x && i.y === y) || null;
}

// ============================================================
// COMBAT
// ============================================================

function rollDamage(attacker, defender) {
  return Math.max(1, attacker.atk - defender.def + rand(-1, 1));
}

function playerAttacks(enemy) {
  const dmg = rollDamage(player, enemy);
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    player.kills++;
    addMsg(`${player.name} slays the ${enemy.name}!`);
  } else {
    addMsg(`${player.name} hits the ${enemy.name} for ${dmg}. (${enemy.hp}/${enemy.maxHp} HP)`);
  }
}

function enemyAttacks(enemy) {
  const dmg = rollDamage(enemy, player);
  player.hp = Math.max(0, player.hp - dmg);
  addMsg(`The ${enemy.name} hits ${player.name} for ${dmg}!`);
  if (player.hp === 0) {
    player.killedBy = enemy.name;
    gameActive = false;
  }
}

// ============================================================
// INPUT
// ============================================================

function onKey(e) {
  if (!gameActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  const actionId = KEY_TO_ACTION[e.key];
  if (actionId) vote(actionId);
}

// ============================================================
// VOTING SYSTEM
// ============================================================

function initVotes() {
  const v = {};
  ACTIONS.forEach(a => { v[a.id] = 0; });
  return v;
}

function vote(actionId) {
  if (!gameActive) return;
  votes[actionId] = (votes[actionId] || 0) + 1;
  const action = ACTIONS.find(a => a.id === actionId);
  addMsg(`Player voted: ${action.label}`);
  const msgEl = document.getElementById('message-list');
  if (msgEl) {
    msgEl.innerHTML = messages.map(m => `<div>${m}</div>`).join('');
    msgEl.scrollTop = msgEl.scrollHeight;
  }
  updateVoteUI();
  sb.rpc('increment_vote', { p_action: actionId })
    .then(({ error }) => { if (error) console.error('[vote]', error); });
}

function startTimer() {
  timeLeft = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
  updateTimerUI();
  timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function tick() {
  timeLeft = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
  updateTimerUI();
  if (timeLeft <= 0) { stopTimer(); tryExecuteRound(); }
}

async function tryExecuteRound() {
  if (isExecutingRound || !gameActive) return;
  isExecutingRound = true;
  const lockedVersion = currentVersion;

  // Pick winner action
  let maxVotes = 0;
  for (const a of ACTIONS) maxVotes = Math.max(maxVotes, votes[a.id] || 0);
  const candidates = maxVotes === 0
    ? [ACTIONS.find(a => a.id === 'wait')]
    : ACTIONS.filter(a => (votes[a.id] || 0) === maxVotes);
  const winner = pick(candidates);

  // Run game logic — unchanged functions
  votes = initVotes();
  executeAction(winner.id);
  if (gameActive) enemyTurns();
  render();

  const newState       = serializeState();
  const newRoundEndsAt = new Date(Date.now() + ROUND_DURATION * 1000).toISOString();

  const { data: committed, error } = await sb.rpc('try_commit_round', {
    p_version: lockedVersion, p_new_state: newState, p_new_round_ends_at: newRoundEndsAt,
  });
  isExecutingRound = false;
  if (error) { console.error('[tryExecuteRound]', error); return; }

  if (committed) {
    currentVersion++;
    roundEndsAt = new Date(newRoundEndsAt);
    if (gameActive) startTimer();
    else setTimeout(showDeath, 200);
  }
  // If !committed: another client won — Realtime delivers their state via hydrate()
}

function executeAction(id) {
  switch (id) {
    case 'north':  doMove(0, -1);                        break;
    case 'south':  doMove(0,  1);                        break;
    case 'east':   doMove( 1,  0);                       break;
    case 'west':   doMove(-1,  0);                       break;
    case 'attack': doAttackNearest();                    break;
    case 'pickup': doPickUp();                           break;
    case 'potion': doPotion();                           break;
    case 'stairs': doStairs();                           break;
    case 'wait':   addMsg(`${player.name} waits.`);     break;
  }
}

function initVoteUI() {
  const container = document.getElementById('vote-buttons');
  if (!container) return;
  container.innerHTML = ACTIONS.map(a =>
    `<button class="vote-btn" id="vbtn-${a.id}" data-action="${a.id}">` +
      `<span class="vote-label">${a.label}</span>` +
      `<span class="vote-right">` +
      `<span class="vote-key">[${a.displayKey}]</span>` +
      `<span class="vote-count" id="vcount-${a.id}">0</span>` +
      `</span>` +
    `</button>`
  ).join('');

  container.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => vote(btn.dataset.action));
  });
}

function updateVoteUI() {
  ACTIONS.forEach(a => {
    const count   = votes[a.id] || 0;
    const countEl = document.getElementById(`vcount-${a.id}`);
    const btn     = document.getElementById(`vbtn-${a.id}`);
    if (countEl) countEl.textContent = count;
    if (btn)     btn.classList.toggle('has-votes', count > 0);
  });
}

function updateTimerUI() {
  const valEl  = document.getElementById('timer-value');
  const fillEl = document.getElementById('timer-bar-fill');
  if (valEl)  valEl.textContent  = timeLeft;
  if (fillEl) fillEl.style.width = `${(timeLeft / ROUND_DURATION) * 100}%`;
}

// ============================================================
// PLAYER ACTIONS
// ============================================================

function doMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;

  const e = enemyAt(nx, ny);
  if (e) { playerAttacks(e); return; }

  if (!isFloor(nx, ny)) return;

  player.x = nx;
  player.y = ny;

  const item = itemAt(nx, ny);
  if (item) addMsg(`${player.name} sees a ${item.name} here.`);
  if (stairs && nx === stairs.x && ny === stairs.y) {
    addMsg('Stairs lead down.');
  }
}

function doAttackNearest() {
  const alive = enemies.filter(e => e.alive);
  if (!alive.length) {
    addMsg(`${player.name} looks around but sees no enemies.`);
    return;
  }
  const nearest = alive.reduce((a, b) => cheby(a, player) <= cheby(b, player) ? a : b);
  doMove(Math.sign(nearest.x - player.x), Math.sign(nearest.y - player.y));
}

function doPickUp() {
  const item = itemAt(player.x, player.y);
  if (!item) { addMsg('Nothing to pick up here.'); return; }

  if (item.type === 'weapon') {
    player.atk += item.value;
    addMsg(`${player.name} grabs the ${item.name}. ATK +${item.value} (now ${player.atk}).`);
  } else {
    player.potions++;
    addMsg(`${player.name} takes a ${item.name}. Potions: ${player.potions}.`);
  }
  items.splice(items.indexOf(item), 1);
}

function doPotion() {
  if (player.potions === 0) { addMsg(`${player.name} has no potions.`); return; }
  const heal = rand(8, 15);
  player.hp  = Math.min(player.maxHp, player.hp + heal);
  player.potions--;
  addMsg(`${player.name} drinks a potion. Healed ${heal} HP. (${player.hp}/${player.maxHp})`);
}

function doStairs() {
  if (!stairs || player.x !== stairs.x || player.y !== stairs.y) {
    addMsg(`${player.name} is not standing on the stairs.`);
    return;
  }
  const missing = player.maxHp - player.hp;
  const restore = Math.floor(missing * 0.25);
  if (restore > 0) {
    player.hp += restore;
    addMsg(`${player.name} rests briefly. Recovered ${restore} HP.`);
  }
  floorNum++;
  addMsg(`${player.name} descends to floor ${floorNum}...`);
  newFloor();
  addMsg(`Floor ${floorNum}. The air grows colder.`);
}

// ============================================================
// ENEMY AI
// ============================================================

function enemyTurns() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dist = cheby(e, player);
    if (dist === 1) {
      enemyAttacks(e);
      if (!gameActive) return;
    } else if (dist <= SIGHT_RANGE) {
      moveEnemyToward(e);
    }
  }
}

function moveEnemyToward(e) {
  const dx = Math.sign(player.x - e.x);
  const dy = Math.sign(player.y - e.y);

  const candidates = [
    [dx, dy], [dx, 0], [0, dy], [dx, -dy], [-dx, dy],
  ];

  for (const [mx, my] of candidates) {
    if (mx === 0 && my === 0) continue;
    const nx = e.x + mx;
    const ny = e.y + my;
    if (
      isFloor(nx, ny) &&
      !enemyAt(nx, ny) &&
      !(nx === player.x && ny === player.y)
    ) {
      e.x = nx;
      e.y = ny;
      return;
    }
  }
}

// ============================================================
// RENDER
// ============================================================

function render() {
  display.clear();

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === '#') {
        display.draw(x, y, '#', '#444', '#0d0d0d');
      } else {
        display.draw(x, y, '.', '#222', '#0d0d0d');
      }
    }
  }

  if (stairs) display.draw(stairs.x, stairs.y, '>', '#dd0', '#0d0d0d');

  for (const i of items) {
    const col = i.type === 'potion' ? '#e55' : '#fa0';
    display.draw(i.x, i.y, i.char, col, '#0d0d0d');
  }

  for (const e of enemies) {
    if (e.alive) display.draw(e.x, e.y, e.char, e.color, '#0d0d0d');
  }

  display.draw(player.x, player.y, '@', '#fff', '#0d0d0d');

  updateUI();
}

// ============================================================
// UI
// ============================================================

function updateUI() {
  document.getElementById('ui-name').textContent  = player.name;
  document.getElementById('ui-floor').textContent = `Floor ${floorNum}`;
  document.getElementById('ui-kills').textContent = `Kills: ${player.kills}`;
  document.getElementById('ui-atk').textContent   = `ATK: ${player.atk}`;
  document.getElementById('ui-def').textContent   = `DEF: ${player.def}`;
  document.getElementById('ui-pot').textContent   = `Potions: ${player.potions}`;

  const hpEl = document.getElementById('ui-hp');
  hpEl.textContent = `HP: ${player.hp} / ${player.maxHp}`;
  const pct  = player.hp / player.maxHp;
  hpEl.className   = pct > 0.5 ? 'hp-high' : pct > 0.25 ? 'hp-mid' : 'hp-low';

  const msgEl = document.getElementById('message-list');
  msgEl.innerHTML = messages.map(m => `<div>${m}</div>`).join('');
  msgEl.scrollTop = msgEl.scrollHeight;

  updateVoteUI();
}

function addMsg(text) {
  messages.push(text);
  if (messages.length > MAX_MESSAGES) messages.shift();
}

// ============================================================
// SUPABASE SYNC
// ============================================================

function serializeState() {
  return {
    map,
    player:     { ...player },
    enemies:    enemies.map(e => ({ ...e })),
    items:      items.map(i => ({ ...i })),
    stairs:     stairs ? { ...stairs } : null,
    messages:   [...messages],
    discovered: [...discovered],
    floorNum,
    gameActive,
  };
}

function hydrate(row) {
  const s = row.state;
  currentVersion = row.version;
  roundEndsAt    = new Date(row.round_ends_at);
  map        = s.map;
  player     = s.player;
  enemies    = s.enemies;
  items      = s.items;
  stairs     = s.stairs;
  messages   = s.messages;
  floorNum   = s.floorNum;
  gameActive = s.gameActive;
  discovered = new Set(s.discovered || []);
  votes = initVotes();
  if (row.votes) {
    for (const key of Object.keys(votes)) votes[key] = row.votes[key] || 0;
  }
  isExecutingRound = false;
  stopTimer();
  const msRemaining = roundEndsAt - Date.now();
  timeLeft = Math.max(0, Math.ceil(msRemaining / 1000));
  updateVoteUI();
  updateTimerUI();
  updateCodex();
  render();
  if (!gameActive) {
    const overlay = document.getElementById('death-overlay');
    if (overlay.style.display !== 'flex') setTimeout(showDeath, 200);
    return;
  }
  document.getElementById('death-overlay').style.display = 'none';
  stopDeathCountdown();
  if (msRemaining > 0) timerInterval = setInterval(tick, 1000);
  else tryExecuteRound();
}

function subscribeRealtime() {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('game-state-changes')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
      (payload) => {
        if (payload.new.version < currentVersion) return;
        hydrate(payload.new);
      })
    .subscribe();
}

async function createInitialState() {
  floorNum   = 1;
  messages   = [];
  gameActive = true;
  discovered = new Set();
  votes      = initVotes();
  player     = makePlayer();
  newFloor();
  addMsg(`${player.name} descends into the dark. Good luck!`);

  const p_state         = serializeState();
  const p_round_ends_at = new Date(Date.now() + ROUND_DURATION * 1000).toISOString();

  const { data: won, error } = await sb.rpc('create_initial_state', { p_state, p_round_ends_at });
  if (won) {
    currentVersion = 1;
    roundEndsAt    = new Date(p_round_ends_at);
    render();
    startTimer();
  } else {
    // Another client won the INSERT race — read their row
    const { data: winner } = await sb.from('game_state').select('*').eq('id', 1).single();
    if (winner) hydrate(winner);
    else { console.error('[createInitialState] fallback read failed', error); }
  }
}

// ============================================================
// HALL OF FAME
// ============================================================

async function addToHallOfFame(p, floor, epitaph) {
  try {
    const newEntry = {
      name:    p.name,
      floor,
      kills:   p.kills,
      atk:     p.atk,
      def:     p.def,
      epitaph,
    };
    const { data: inserted, error: insertErr } = await sb
      .from('hall_of_fame')
      .insert(newEntry)
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    const { data: rows, error: fetchErr } = await sb
      .from('hall_of_fame')
      .select('*')
      .order('floor', { ascending: false })
      .order('kills', { ascending: false })
      .limit(HOF_MAX);
    if (fetchErr) throw fetchErr;

    const currentIdx = rows.findIndex(r => r.id === inserted.id);
    return { entries: rows, currentIdx };
  } catch (err) {
    console.error('[HoF] FAILED:', err);
    return { entries: [], currentIdx: -1 };
  }
}

function generateEpitaph(p, floor) {
  const killer = p.killedBy || 'the dungeon';
  const kills  = p.kills;

  if (kills === 0) {
    return `Never landed a blow. ${an(killer)} ended the adventure before it began.`;
  }
  if (floor === 1) {
    return `The first floor proved fatal. Felled by ${an(killer)}.`;
  }
  if (kills >= 20) {
    return `A fearsome warrior who slew ${kills} enemies. Even legends fall — this one to ${an(killer)}.`;
  }
  if (kills >= 10) {
    return `${kills} enemies fell across ${floor} floors before ${an(killer)} prevailed.`;
  }
  if (kills === 1) {
    return `Slew one enemy before ${an(killer)} struck the killing blow on floor ${floor}.`;
  }
  return `Slew ${kills} enemies before ${an(killer)} prevailed on floor ${floor}.`;
}

// ============================================================
// DEATH & RESTART
// ============================================================

async function showDeath() {
  const epitaph = generateEpitaph(player, floorNum);
  const { entries, currentIdx } = await addToHallOfFame(player, floorNum, epitaph);

  document.getElementById('death-name').textContent    = player.name;
  document.getElementById('death-run-stats').textContent =
    `Floor ${floorNum}  ·  ${player.kills} kills  ·  ATK ${player.atk}  ·  DEF ${player.def}`;
  document.getElementById('death-epitaph').textContent = epitaph;

  const tbody = document.getElementById('hof-body');
  if (tbody) {
    tbody.innerHTML = entries.map((e, i) =>
      `<tr${i === currentIdx ? ' class="hof-current"' : ''}>` +
        `<td>${i + 1}</td>` +
        `<td>${e.name}</td>` +
        `<td>${e.floor}</td>` +
        `<td>${e.kills}</td>` +
        `<td>${new Date(e.created_at).toLocaleDateString()}</td>` +
      `</tr>`
    ).join('');
  }

  document.getElementById('death-overlay').style.display = 'flex';
  startDeathCountdown();
}

function startDeathCountdown() {
  deathTimeLeft = DEATH_DELAY;
  updateDeathCountdownUI();
  deathTimer = setInterval(() => {
    deathTimeLeft--;
    updateDeathCountdownUI();
    if (deathTimeLeft <= 0) {
      stopDeathCountdown();
      restart();
    }
  }, 1000);
}

function stopDeathCountdown() {
  if (deathTimer) {
    clearInterval(deathTimer);
    deathTimer = null;
  }
}

function updateDeathCountdownUI() {
  const el = document.getElementById('countdown-value');
  if (el) el.textContent = deathTimeLeft;
}

async function restart() {
  stopDeathCountdown();
  document.getElementById('death-overlay').style.display = 'none';
  stopTimer();

  const lockedVersion = currentVersion;

  floorNum   = 1;
  messages   = [];
  gameActive = true;
  discovered = new Set();
  votes      = initVotes();
  player     = makePlayer();
  newFloor();
  addMsg(`${player.name} enters the dungeon. A new run begins!`);

  const newState       = serializeState();
  const newRoundEndsAt = new Date(Date.now() + ROUND_DURATION * 1000).toISOString();

  const { data: committed, error } = await sb.rpc('try_commit_round', {
    p_version: lockedVersion, p_new_state: newState, p_new_round_ends_at: newRoundEndsAt,
  });
  render();
  if (error) { console.error('[restart]', error); return; }
  if (committed) {
    currentVersion++;
    roundEndsAt = new Date(newRoundEndsAt);
    startTimer();
  }
  // If !committed: Realtime delivers winner's new run via hydrate()
}

// ============================================================
// CHAT & PRESENCE
// ============================================================

function hasLink(text) {
  return /https?:\/\/|www\.\S|\S+\.(com|net|org|io|co|uk)\b/i.test(text);
}

function initChat() {
  displayName = localStorage.getItem('cc_name') || 'Anon';

  const nameInput = document.getElementById('chat-name-input');
  if (nameInput) {
    nameInput.value = displayName === 'Anon' ? '' : displayName;
    nameInput.addEventListener('blur', () => {
      const v = nameInput.value.trim().slice(0, 20);
      displayName = v || 'Anon';
      if (v) localStorage.setItem('cc_name', v);
      else   localStorage.removeItem('cc_name');
    });
  }

  const chatInput = document.getElementById('chat-input');
  const sendBtn   = document.getElementById('chat-send');
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
  if (sendBtn)   sendBtn.addEventListener('click', sendChat);

  loadChatHistory();
  subscribeChatRealtime();
  initPresence();
}

async function loadChatHistory() {
  const { data, error } = await sb
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(CHAT_HISTORY);
  if (error) { console.error('[chat] load', error); return; }
  const el = document.getElementById('chat-messages');
  if (!el) return;
  el.innerHTML = '';
  (data || []).reverse().forEach(row => appendChatMessage(row, false));
}

function subscribeChatRealtime() {
  sb.channel('chat-inserts')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      payload => appendChatMessage(payload.new, true))
    .subscribe();
}

function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg || msg.length > CHAT_MAX_LEN) return;
  if (hasLink(msg)) {
    input.value = '';
    const prev = input.placeholder;
    input.placeholder = 'No links allowed.';
    setTimeout(() => { input.placeholder = prev; }, 2000);
    return;
  }
  input.value = '';
  sb.from('chat_messages')
    .insert({ display_name: displayName, message: msg })
    .then(({ error }) => { if (error) console.error('[chat] send', error); });
}

function appendChatMessage(row, scroll) {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  const div      = document.createElement('div');
  div.className  = 'chat-msg';
  div.innerHTML  =
    `<span class="chat-msg-name">${escapeHtml(row.display_name)}:</span>` +
    `<span class="chat-msg-text"> ${escapeHtml(row.message)}</span>`;
  el.appendChild(div);

  while (el.children.length > CHAT_HISTORY) el.removeChild(el.firstChild);
  if (scroll) el.scrollTop = el.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initPresence() {
  presenceChannel = sb.channel('lobby', {
    config: { presence: { key: CLIENT_ID } },
  });
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const count = Object.keys(presenceChannel.presenceState()).length;
      const el = document.getElementById('ui-viewers');
      if (el) el.textContent = `Viewers: ${count}`;
    })
    .subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ joined_at: new Date().toISOString() });
      }
    });
}

// ============================================================
// COLLAPSIBLE PANELS
// ============================================================

function initCollapsibles() {
  document.querySelectorAll('.panel.collapsible .panel-toggle').forEach(h3 => {
    h3.addEventListener('click', () => {
      h3.closest('.panel').classList.toggle('collapsed');
    });
  });
}

// ============================================================
// BOOTSTRAP
// ============================================================

window.addEventListener('DOMContentLoaded', init);
