import { Chessground } from '@lichess-org/chessground';
import { Chess } from 'chess.js';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './style.css';
import { config } from './config.js';
import { Game, colorName, legalDests, toUci } from './game.js';
import { EngineClient } from './engine/client.js';
import { Sound } from './sound.js';
import { bird, icon } from './icons.js';

const $ = id => document.getElementById(id);
const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const storage = {
  read(key) { try { return JSON.parse(localStorage.getItem('chess-play:' + key)); } catch { return null; } },
  write(key, value) { try { localStorage.setItem('chess-play:' + key, JSON.stringify(value)); } catch { /* Private browsing or full storage: play still works. */ } },
};
const sourceUrl = config.sourceUrl + (typeof __APP_COMMIT__ !== 'undefined' && __APP_COMMIT__ ? '/tree/' + __APP_COMMIT__ : '');
const roles = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
// A reply faster than this lands on top of the player's own move; pad it so each move is seen and heard.
const MIN_REPLY_MS = 450;
const piece = (role, color) => `<piece class="${role} ${color}"></piece>`;
const tool = (action, name, label) => `<button type="button" class="tool" data-action="${action}" aria-label="${label}" title="${label}">${icon(name)}</button>`;

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <nav class="links" aria-label="Links">
      <a href="${config.lichessUrl}" target="_blank" rel="noreferrer" title="Play ${escapeHtml(config.name)} on Lichess">Lichess${icon('external')}</a>
      <a href="${sourceUrl}" target="_blank" rel="noreferrer" title="Source code (GPL-3.0)">Source${icon('external')}</a>
      <a href="${config.portfolioUrl}">Portfolio${icon('external')}</a>
    </nav>
  </header>
  <main class="stage">
    <section class="board-col" aria-label="Board">
      <div class="player" id="player-top"></div>
      <div class="board-wrap" id="board-wrap">
        <div id="board" class="cg-wrap" role="application" aria-label="Chessboard"></div>
        <div id="promotion" class="promotion cg-wrap" role="dialog" aria-label="Promote pawn" hidden></div>
      </div>
      <div class="player" id="player-bottom"></div>
    </section>
    <aside class="side" aria-label="Game">
      <div class="setup" id="setup">
        <div class="bot-card">
          <span class="avatar bot">${bird}</span>
          <h1>${escapeHtml(config.name)}<span class="tag">BOT</span></h1>
          <p>${escapeHtml(config.tagline)}</p>
        </div>
        <p class="setup-label" id="side-label">Play as</p>
        <div class="side-picker cg-wrap" role="radiogroup" aria-labelledby="side-label">
          <button type="button" role="radio" data-side="w">${piece('king', 'white')}<span>White</span></button>
          <button type="button" role="radio" data-side="random"><span class="random-king">${piece('king', 'white')}${piece('king', 'black')}</span><span>Random</span></button>
          <button type="button" role="radio" data-side="b">${piece('king', 'black')}<span>Black</span></button>
        </div>
        <button type="button" class="button primary" data-action="start">Play</button>
      </div>
      <div class="game" id="game">
        <div class="moves" id="moves"></div>
        <form class="move-entry" id="move-form"><label class="sr-only" for="move-input">Type a move</label><input id="move-input" placeholder="Type a move, like Nf3" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="10"></form>
        <div class="notice" id="notice" role="alert" hidden><p id="notice-text"></p><button type="button" class="button" data-action="retry">${icon('retry')}Retry</button></div>
        <button type="button" class="button primary resume" id="resume" data-action="resume" hidden>Continue game</button>
        <div class="toolbar">
          <div class="tool-group">${tool('first', 'first', 'First move')}${tool('back', 'back', 'Previous move')}${tool('next', 'next', 'Next move')}${tool('last', 'last', 'Latest move')}</div>
          <div class="tool-group">${tool('flip', 'flip', 'Flip board')}${tool('sound', 'volume', 'Mute sounds')}${tool('pgn', 'download', 'Download PGN')}</div>
        </div>
        <div class="controls" id="controls">
          <button type="button" class="button" data-action="undo">${icon('undo')}Takeback</button>
          <button type="button" class="button" data-action="resign">${icon('flag')}Resign</button>
          <button type="button" class="button" data-action="new" id="new-game">${icon('plus')}New game</button>
        </div>
        <div class="controls confirm" id="confirm" hidden>
          <span id="confirm-text"></span>
          <button type="button" class="button" data-action="cancel">Cancel</button>
          <button type="button" class="button danger" data-action="confirm" id="confirm-yes"></button>
        </div>
      </div>
      <footer class="credits"><span>© 2026 ${escapeHtml(config.author)}</span><a href="./licenses/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Credits &amp; licenses</a></footer>
    </aside>
  </main>
  <div class="sr-only" id="announcer" aria-live="polite"></div>
`;

let selectedSide = ['w', 'b', 'random'].includes(storage.read('side')) ? storage.read('side') : 'w';
let orientation = selectedSide === 'b' ? 'black' : 'white';
let reviewPly = null; let promotion = null; let confirming = null;
let ready = false; let loading = false; let loadError = null; let loadAttempt = 0; let loadProgress = 0;
let lastRenderedPly = 0; let lastShownPly = -1; let drawQueued = false;
const sound = new Sound(storage.read('sound') !== false);
const engine = new EngineClient(config.engine, progress => {
  // The WASM runtime compiles after the model download without byte progress, so it owns the last stretch.
  loadProgress = progress.stage === 'download' ? progress.loaded / progress.total * 0.85 : 0.92;
  const bar = document.querySelector('.player .progress i');
  if (bar) { bar.style.width = Math.round(loadProgress * 100) + '%'; } else render();
});
const pacedEngine = {
  async choose(fen, moves) {
    const started = performance.now();
    const result = await engine.choose(fen, moves);
    const rest = MIN_REPLY_MS - (performance.now() - started);
    if (rest > 0) await new Promise(resolve => setTimeout(resolve, rest));
    return result;
  },
};
const game = new Game(() => render(), config.name);
const saved = storage.read('game');
if (saved) { try { game.restore(saved); orientation = colorName(game.human); lastRenderedPly = game.chess.history().length; } catch { storage.write('game', null); } }
const ground = Chessground($('board'), {
  fen: game.chess.fen(), orientation, coordinates: true, ranksPosition: 'left',
  animation: { enabled: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 180 },
  movable: { free: false, color: undefined, dests: new Map(), showDests: true, events: { after: onBoardMove } },
  premovable: { enabled: false }, drawable: { enabled: true, visible: true },
});

const history = () => game.chess.history({ verbose: true });
const currentPly = () => reviewPly ?? history().length;
const humanColor = () => game.started ? game.human : orientation[0];
function render() {
  if (drawQueued) return;
  drawQueued = true;
  queueMicrotask(() => { drawQueued = false; draw(); });
}
// Chessground also accepts the king dropped on its own rook as castling.
function boardDests(chess) {
  const dests = legalDests(chess);
  for (const move of chess.moves({ verbose: true })) {
    if (/[kq]/.test(move.flags)) dests.get(move.from).push((move.flags.includes('k') ? 'h' : 'a') + move.from[1]);
  }
  return dests;
}
function material(board) {
  const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of board.board()) for (const square of row) if (square && square.type !== 'k') count[square.color][square.type]++;
  const extra = { w: [], b: [] }; let score = 0;
  for (const type of ['p', 'n', 'b', 'r', 'q']) {
    const diff = count.w[type] - count.b[type];
    score += diff * values[type];
    if (diff) extra[diff > 0 ? 'w' : 'b'].push([type, Math.abs(diff)]);
  }
  return { extra, score };
}
function playerRow(color, board) {
  const human = color === humanColor();
  const { extra, score } = material(board);
  const lead = color === 'w' ? score : -score;
  const pieces = extra[color].map(([type, n]) => `<span>${piece(roles[type], 'white').repeat(n)}</span>`).join('');
  let status = '';
  if (!human && loading) status = `<span class="status">Loading<span class="progress"><i style="width:${Math.round(loadProgress * 100)}%"></i></span></span>`;
  else if (!human && game.thinking) status = '<span class="status thinking" role="img" aria-label="Thinking"><i></i><i></i><i></i></span>';
  return `<span class="avatar${human ? '' : ' bot'}">${human ? icon('user') : bird}</span>`
    + `<span class="name">${human ? 'You' : `${escapeHtml(config.name)}<span class="tag">BOT</span>`}</span>`
    + `<span class="material cg-wrap">${pieces}${lead > 0 ? `<em>+${lead}</em>` : ''}</span>${status}`;
}
const scoreText = pgn => ({ '1-0': '1–0', '0-1': '0–1' }[pgn] ?? '½–½');
function moveCell(move, n, ply) {
  const current = n === ply;
  return `<button type="button" class="move${current ? ' current' : ''}" data-ply="${n}" aria-label="${Math.ceil(n / 2)}${move.color === 'w' ? '.' : '…'} ${escapeHtml(move.san)}"${current ? ' aria-current="step"' : ''}>${escapeHtml(move.san)}</button>`;
}
function reveal(container, element) {
  if (!element) return;
  const box = container.getBoundingClientRect(); const rect = element.getBoundingClientRect();
  if (rect.top < box.top) container.scrollTop += rect.top - box.top - 6;
  else if (rect.bottom > box.bottom) container.scrollTop += rect.bottom - box.bottom + 6;
  if (rect.left < box.left) container.scrollLeft += rect.left - box.left - 6;
  else if (rect.right > box.right) container.scrollLeft += rect.right - box.right + 6;
}
function draw() {
  const moves = history(); const live = reviewPly === null; const ply = live ? moves.length : reviewPly;
  const shown = live ? game.chess : new Chess(ply ? moves[ply - 1].after : game.initialFen);
  const setup = !game.started; const result = game.result(); const error = loadError || game.error;
  const playable = !promotion && live && (setup ? selectedSide === 'w' : game.humanTurn && !game.thinking);
  const last = ply ? moves[ply - 1] : null;
  if (!promotion) {
    const board = { orientation, turnColor: colorName(shown.turn()), check: shown.isCheck(), lastMove: last ? [last.from, last.to] : undefined,
      movable: { color: playable ? colorName(setup ? 'w' : game.human) : undefined, dests: playable ? boardDests(game.chess) : new Map() } };
    // Only replace pieces when the position changed, so drawn arrows survive status updates.
    if (ground.getFen() !== shown.fen().split(' ')[0]) board.fen = shown.fen();
    ground.set(board);
  }
  const top = orientation === 'white' ? 'b' : 'w';
  $('player-top').innerHTML = playerRow(top, shown);
  $('player-bottom').innerHTML = playerRow(top === 'w' ? 'b' : 'w', shown);

  $('setup').hidden = !setup; $('game').hidden = setup;
  for (const choice of document.querySelectorAll('[data-side]')) choice.setAttribute('aria-checked', String(choice.dataset.side === selectedSide));

  const list = $('moves'); const hadFocus = list.contains(document.activeElement);
  let html = '';
  for (let i = 0; i < moves.length; i += 2) {
    html += `<span class="index">${i / 2 + 1}</span>${moveCell(moves[i], i + 1, ply)}${moves[i + 1] ? moveCell(moves[i + 1], i + 2, ply) : '<span class="move"></span>'}`;
  }
  if (result) html += `<div class="result"><strong>${scoreText(result.pgn)}</strong><span>${escapeHtml(result.title)} · ${escapeHtml(result.detail)}</span></div>`;
  list.innerHTML = html;
  if (ply !== lastShownPly || moves.length !== lastRenderedPly) {
    if (live) { list.scrollTop = list.scrollHeight; list.scrollLeft = list.scrollWidth; } else reveal(list, list.querySelector('.current'));
    lastShownPly = ply;
  }
  if (hadFocus) list.querySelector('.current')?.focus();

  $('notice').hidden = !error; $('notice-text').textContent = error ?? '';
  $('resume').hidden = !(game.started && !game.over && !ready && !loading && !error && !game.humanTurn);
  const tools = Object.fromEntries([...document.querySelectorAll('#game [data-action]')].map(b => [b.dataset.action, b]));
  tools.first.disabled = tools.back.disabled = ply === 0;
  tools.next.disabled = tools.last.disabled = live;
  tools.last.classList.toggle('attention', !live);
  tools.pgn.disabled = !moves.length;
  tools.sound.innerHTML = icon(sound.enabled ? 'volume' : 'mute');
  tools.sound.title = sound.enabled ? 'Mute sounds' : 'Unmute sounds';
  tools.sound.setAttribute('aria-label', tools.sound.title);
  tools.undo.disabled = !moves.some(move => move.color === game.human);
  tools.resign.disabled = game.over;
  tools.new.classList.toggle('primary', game.over);
  $('controls').hidden = !!confirming; $('confirm').hidden = !confirming;
  if (confirming) {
    $('confirm-text').textContent = confirming === 'resign' ? 'Resign this game?' : 'Abandon this game?';
    $('confirm-yes').textContent = confirming === 'resign' ? 'Resign' : 'New game';
  }

  if (moves.length > lastRenderedPly) {
    const move = moves.at(-1);
    void sound.play(move.captured ? 'capture' : 'move');
    $('announcer').textContent = `${move.color === game.human ? 'You' : config.name} played ${move.san}.${result ? ` ${result.title}. ${result.detail}.` : ''}`;
  }
  lastRenderedPly = moves.length;
  if (game.started) storage.write('game', game.serialize());
}
function requestReply() {
  if (ready) void game.requestReply(pacedEngine);
  else if (game.started && !game.over) void ensureReady();
}
async function ensureReady() {
  if (ready || loading) return;
  const attempt = ++loadAttempt;
  loading = true; loadError = null; loadProgress = 0; render();
  try { await engine.load(); if (attempt === loadAttempt) ready = true; }
  catch (error) { if (attempt === loadAttempt) loadError = error.message || 'The engine could not load.'; }
  finally { if (attempt === loadAttempt) { loading = false; render(); if (ready) void game.requestReply(pacedEngine); } }
}
function makeMove(uci) {
  try { game.play(uci); } catch { render(); return; }
  requestReply();
}
function onBoardMove(from, to) {
  const moves = game.chess.moves({ verbose: true }).filter(move => move.from === from);
  const castle = moves.find(move => /[kq]/.test(move.flags) && to === (move.flags.includes('k') ? 'h' : 'a') + from[1]);
  const options = castle ? [castle] : moves.filter(move => move.to === to);
  if (!options.length) { render(); return; }
  // Moving a white piece on the setup board starts a game as White.
  if (!game.started) startGame('w');
  if (options.some(move => move.promotion)) showPromotion(from, to); else makeMove(toUci(options[0]));
}
function showPromotion(from, to) {
  promotion = { from, to };
  const file = to.charCodeAt(0) - 97; const x = orientation === 'white' ? file : 7 - file;
  const fromTop = (to[1] === '8') === (orientation === 'white');
  $('promotion').innerHTML = [['q', 'queen'], ['n', 'knight'], ['r', 'rook'], ['b', 'bishop']].map(([code, role], i) =>
    `<button type="button" data-promote="${code}" style="left:${x * 12.5}%;top:${(fromTop ? i : 7 - i) * 12.5}%" aria-label="Promote to ${role}">${piece(role, colorName(game.human))}</button>`).join('');
  $('promotion').hidden = false;
  draw();
  $('promotion').querySelector('button').focus();
}
function cancelPromotion(redraw = true) {
  if (!promotion) return;
  promotion = null; $('promotion').hidden = true;
  if (redraw) render();
}
function startGame(side) {
  const color = side === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 'w' : 'b') : side;
  reviewPly = null; confirming = null; cancelPromotion(false); ground.cancelMove(); ground.setShapes([]);
  orientation = colorName(color); lastRenderedPly = 0;
  game.start(color);
  requestReply();
}
function openSetup() {
  reviewPly = null; confirming = null; cancelPromotion(false); ground.cancelMove(); ground.setShapes([]);
  lastRenderedPly = 0; storage.write('game', null);
  if (selectedSide !== 'random') orientation = colorName(selectedSide);
  game.reset();
}
function goTo(ply) {
  const moves = history(); const from = currentPly(); const target = Math.max(0, Math.min(ply, moves.length));
  if (target === from) return;
  cancelPromotion(false); ground.cancelMove();
  reviewPly = target === moves.length ? null : target;
  if (target === from + 1) void sound.play(moves[target - 1].captured ? 'capture' : 'move');
  render();
}
function downloadPgn() {
  const url = URL.createObjectURL(new Blob([game.pgn(config.name)], { type: 'application/x-chess-pgn' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${config.name.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pgn`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Accepts coordinates (e2e4, e7e8q) or SAN (e4, Nf3, O-O), matched against the legal moves.
function parseMove(text) {
  const legal = game.chess.moves({ verbose: true });
  const clean = san => san.replace(/[x+#!?=\s]/g, '').replace(/0/g, 'O').replace(/-/g, '');
  const input = clean(text.trim());
  const uci = legal.find(move => toUci(move) === input.toLowerCase());
  if (uci) return toUci(uci);
  const exact = legal.find(move => clean(move.san) === input);
  if (exact) return toUci(exact);
  const loose = legal.filter(move => clean(move.san).toLowerCase() === input.toLowerCase());
  return loose.length === 1 ? toUci(loose[0]) : null;
}

const actions = {
  start: () => startGame(selectedSide),
  first: () => goTo(0), back: () => goTo(currentPly() - 1), next: () => goTo(currentPly() + 1), last: () => goTo(history().length),
  flip: () => { cancelPromotion(false); orientation = orientation === 'white' ? 'black' : 'white'; render(); },
  sound: () => { sound.enabled = !sound.enabled; storage.write('sound', sound.enabled); sound.unlock(); render(); },
  pgn: downloadPgn,
  undo: () => { reviewPly = null; confirming = null; cancelPromotion(false); ground.cancelMove(); game.undo(); requestReply(); },
  resign: () => { confirming = 'resign'; render(); },
  new: () => {
    if (game.over || !history().some(move => move.color === game.human)) openSetup();
    else { confirming = 'new'; render(); }
  },
  cancel: () => { confirming = null; render(); },
  confirm: () => { const action = confirming; confirming = null; if (action === 'resign') game.resign(); else openSetup(); },
  retry: () => { if (loadError) void ensureReady(); else requestReply(); },
  resume: requestReply,
};
for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => sound.unlock(), { capture: true, passive: true });
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], [data-side], [data-ply]');
  if (!target || target.disabled) return;
  if (target.dataset.side) {
    selectedSide = target.dataset.side; storage.write('side', selectedSide);
    if (selectedSide !== 'random') orientation = colorName(selectedSide);
    render();
  } else if (target.dataset.ply) goTo(Number(target.dataset.ply));
  else actions[target.dataset.action]?.();
});
$('promotion').addEventListener('click', event => {
  const choice = event.target.closest('[data-promote]'); const pending = promotion;
  cancelPromotion(false);
  if (choice && pending) makeMove(pending.from + pending.to + choice.dataset.promote); else render();
});
// The move list switches between a column and a strip; keep the current move in view.
addEventListener('resize', () => { lastShownPly = -1; render(); });
// Clicking the board while reviewing returns to the game, like most chess sites.
$('board-wrap').addEventListener('pointerdown', event => { if (reviewPly !== null && event.button === 0) goTo(history().length); }, true);
// Stays enabled while the engine replies, so keyboard focus is never dropped mid-game.
$('move-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('move-input');
  if (reviewPly !== null || promotion || !game.humanTurn || game.thinking) { $('announcer').textContent = game.over ? 'The game is over.' : 'Wait for your turn.'; return; }
  const uci = parseMove(input.value);
  if (!uci) { input.setAttribute('aria-invalid', 'true'); $('announcer').textContent = 'That move is not legal here.'; return; }
  input.removeAttribute('aria-invalid'); input.value = '';
  makeMove(uci);
});
$('move-input').addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (promotion) cancelPromotion(); else if (confirming) actions.cancel(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const action = { ArrowLeft: 'back', ArrowRight: 'next', ArrowUp: 'first', ArrowDown: 'last', Home: 'first', End: 'last', f: 'flip' }[event.key];
  if (!action || (!game.started && action !== 'flip')) return;
  event.preventDefault(); actions[action]();
});

draw();
