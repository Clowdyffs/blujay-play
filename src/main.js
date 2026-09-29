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
document.querySelector('#app').innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a class="wordmark" href="./" aria-label="${config.name} home"><span class="brand-bird">${bird}</span>${config.name.toLowerCase()}<span class="wordmark-note">/ play</span></a>
      <nav aria-label="Site navigation"><a href="${config.portfolioUrl}">Portfolio ${icon('arrow')}</a><a href="${sourceUrl}" target="_blank" rel="noreferrer">Source ${icon('arrow')}</a></nav>
    </header>
    <main>
      <section class="intro" aria-labelledby="page-title">
        <div><p class="eyebrow">A LITTLE EXPERIMENT IN CHESS</p><h1 id="page-title">Your move<span>.</span></h1></div>
        <p class="intro-copy">Meet ${config.name}, my homemade chess model.<br> Pull up a chair. It plays right in your browser.</p>
      </section>
      <section class="play-layout" aria-label="Play chess">
        <div class="board-column">
          <div class="player-row" id="top-player"></div>
          <div class="board-frame"><div id="board" class="cg-wrap" role="group" aria-label="Chessboard. Click or drag to move. Keyboard move entry is below the board."></div>
            <div id="review-banner" class="review-banner" hidden>Reviewing the game <button id="return-live">Back to live ${icon('arrowRight')}</button></div>
          </div>
          <div class="player-row" id="bottom-player"></div>
          <div class="board-tools">
            <span id="board-hint">Click or drag a piece to move</span>
            <div class="tool-group"><button class="icon-button" id="flip" aria-label="Flip board" title="Flip board (F)">${icon('flip')}</button><button class="icon-button" id="sound" aria-label="Mute sounds" aria-pressed="false" title="Toggle sounds">${icon('volume')}</button></div>
          </div>
          <details class="keyboard-play"><summary>Keyboard play</summary><form id="move-form"><label for="move-input">Move in coordinate notation</label><div><input id="move-input" placeholder="e2e4" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="5" list="legal-moves" aria-describedby="move-help"><button type="submit" class="small-button">Move</button></div><datalist id="legal-moves"></datalist><p id="move-help">Use e2e4, or e7e8q to promote. Arrow keys browse the move history.</p><p id="move-error" role="alert"></p></form></details>
        </div>
        <aside class="game-panel" aria-label="Game controls">
          <div class="panel-heading"><span class="eyebrow">THE MATCH</span><span class="quiet-badge">No clock</span></div>
          <div class="status-block" role="status" aria-live="polite" aria-atomic="true"><h2 id="status-title">Ready when you are.</h2><p id="status-detail">Choose your side. Take your time.</p></div>
          <div id="setup">
            <span class="field-label" id="side-label">I’LL PLAY AS</span>
            <div class="side-picker" role="group" aria-labelledby="side-label"><button data-side="w" class="selected" aria-pressed="true"><span class="side-disc white"></span>White</button><button data-side="b" aria-pressed="false"><span class="side-disc black"></span>Black</button><button data-side="random" aria-pressed="false"><span class="random-disc">◐</span>Random</button></div>
            <button id="start" class="primary-button">Let’s play ${icon('arrowRight')}</button>
            <p class="download-note">First game downloads the engine.<br>After that, every move stays on your device.</p>
          </div>
          <div id="loading" hidden><div class="progress-track"><div id="progress-bar"></div></div><p id="loading-detail" class="small-muted">Preparing the engine…</p></div>
          <div id="error-box" class="error-box" hidden><p id="engine-error"></p><button id="retry" class="small-button">Try again</button></div>
          <div id="game-actions" hidden><button id="new-game" class="secondary-button">New game ${icon('arrowRight')}</button><div class="secondary-actions"><button id="undo" class="text-button">${icon('undo')}Take back</button><button id="resign" class="text-button">${icon('flag')}Resign</button></div></div>
          <section class="history-section" aria-labelledby="history-title"><div class="section-heading"><h3 id="history-title">Moves</h3><span id="move-count" class="small-muted">0 played</span></div><div id="move-list" class="move-list"><div class="history-empty"><span class="empty-lines"><i></i><i></i><i></i></span>Your story starts on the board.</div></div><div class="history-nav"><button class="icon-button" id="history-first" aria-label="First position">${icon('first')}</button><button class="icon-button" id="history-back" aria-label="Previous move">${icon('back')}</button><button class="icon-button" id="history-next" aria-label="Next move">${icon('next')}</button><button class="icon-button" id="history-last" aria-label="Latest position">${icon('last')}</button><span class="history-divider"></span><button class="icon-button" id="download-pgn" aria-label="Download PGN" title="Download PGN">${icon('download')}</button></div></section>
          <div class="local-note">${icon('chip')}<div><strong>Played here. Kept here.</strong><span>Your game is saved in this browser.</span></div></div>
        </aside>
      </section>
      <section class="below-board"><p>A small model with a mind of its own.<br><span>Built by <a href="${config.portfolioUrl}">${config.author}</a>.</span></p><div><button id="about" class="text-button">About this experiment ${icon('arrow')}</button><a class="text-button" href="${config.lichessUrl}" target="_blank" rel="noreferrer">Play on Lichess ${icon('arrow')}</a></div></section>
    </main>
    <footer><span>Made for the love of the game.</span><span><a href="https://github.com/lichess-org/chessground" target="_blank" rel="noreferrer">Board by Chessground</a><span class="footer-dot">·</span><a href="${sourceUrl}" target="_blank" rel="noreferrer">GPL-3.0+ source</a></span></footer>
  </div>
  <dialog id="promotion-dialog" aria-labelledby="promotion-title"><h2 id="promotion-title">A little promotion.</h2><p>Choose your new piece.</p><div id="promotion-options" class="promotion-options cg-wrap"></div><button id="cancel-promotion" class="text-button">Cancel move</button></dialog>
  <dialog id="confirm-dialog" aria-labelledby="confirm-title"><h2 id="confirm-title"></h2><p id="confirm-detail"></p><div class="dialog-actions"><button id="confirm-cancel" class="secondary-button">Keep playing</button><button id="confirm-yes" class="primary-button">Continue</button></div></dialog>
  <dialog id="about-dialog" aria-labelledby="about-title"><button class="icon-button dialog-close" id="close-about" aria-label="Close about">${icon('close')}</button><span class="eyebrow">BEHIND THE BOARD</span><h2 id="about-title">A chess model, made from scratch.</h2><p>${config.name} is my experiment in teaching a small neural network to choose chess moves. This demo uses the 3.96-million-parameter, epoch-15 model. It scores every legal move and picks its favorite, without searching a tree of future positions.</p><p>The model runs on your device using ONNX Runtime Web. The board stays responsive while a separate browser worker does the thinking. There’s no account, move API, or analytics.</p><p>This is an experiment, not a claim of playing strength. Try an unusual position—or just enjoy a game.</p><div class="about-links"><a href="${sourceUrl}" target="_blank" rel="noreferrer">Explore the source ${icon('arrow')}</a><a href="./licenses/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Credits & licenses ${icon('arrow')}</a></div><p class="small-muted">Chessground board · chess.js rules · original synthesized sounds.<br>App source: GPL-3.0-or-later. Model weights: CC BY 4.0.</p></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
`;

let selectedSide = 'w'; let orientation = 'white'; let reviewPly = null;
let ready = false; let loading = false; let loadError = null; let loadAttempt = 0;
let lastRenderedPly = 0; let promotion = null; let confirmAction = null;
const sound = new Sound(storage.read('sound') !== false);
const engine = new EngineClient(config.engine, progress => {
  if (progress.stage === 'download') {
    $('loading-detail').textContent = `Downloading model · ${(progress.loaded / 1e6).toFixed(1)} / ${(progress.total / 1e6).toFixed(1)} MB`;
    $('progress-bar').style.width = Math.round(progress.loaded / progress.total * 85) + '%';
  } else { $('loading-detail').textContent = 'Preparing the engine on your device…'; $('progress-bar').style.width = '92%'; }
});
const game = new Game(() => render(), config.name);
const ground = Chessground($('board'), {
  fen: game.chess.fen(), orientation, coordinates: true, coordinatesOnSquares: false,
  animation: { enabled: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 160 },
  movable: { free: false, color: undefined, dests: new Map(), events: { after: onBoardMove }, rookCastle: false },
  premovable: { enabled: false }, drawable: { enabled: true, visible: true },
});
function persist() { if (game.started) storage.write('game', game.serialize()); }
function history() { return game.chess.history({ verbose: true }); }
function shownBoard() { const moves = history(); return reviewPly === null ? game.chess : new Chess(reviewPly ? moves[reviewPly - 1].after : game.initialFen); }
function playerRow(color) {
  const human = color[0] === game.human;
  const active = game.started && !game.over && game.chess.turn() === color[0];
  return `<div class="player-identity"><span class="avatar ${human ? 'human-avatar' : 'engine-avatar'}">${human ? icon('user') : bird}</span><div><strong>${human ? 'You' : config.name}</strong><span>${human ? color[0].toUpperCase() + color.slice(1) + ' pieces' : 'Homemade neural model'}</span></div></div><span class="player-tag ${active ? 'active' : ''}">${active ? '<i></i>' : ''}${human ? 'HUMAN' : 'ON YOUR DEVICE'}</span>`;
}
function render() {
  for (const choice of document.querySelectorAll('[data-side]')) { choice.classList.toggle('selected', choice.dataset.side === selectedSide); choice.setAttribute('aria-pressed', String(choice.dataset.side === selectedSide)); }
  const moves = history(); const shown = shownBoard(); const live = reviewPly === null;
  const playable = ready && live && game.humanTurn && !game.thinking && !promotion;
  ground.set({ fen: shown.fen(), orientation, turnColor: colorName(shown.turn()), check: shown.isCheck(),
    lastMove: (live ? moves.at(-1) : moves[reviewPly - 1]) ? [(live ? moves.at(-1) : moves[reviewPly - 1]).from, (live ? moves.at(-1) : moves[reviewPly - 1]).to] : [],
    movable: { color: playable ? colorName(game.human) : undefined, dests: playable ? legalDests(game.chess) : new Map() },
  });
  $('top-player').innerHTML = playerRow(orientation === 'white' ? 'black' : 'white');
  $('bottom-player').innerHTML = playerRow(orientation);
  $('review-banner').hidden = live;
  $('setup').hidden = game.started;
  $('game-actions').hidden = !game.started;
  $('loading').hidden = !loading;
  $('error-box').hidden = !(loadError || game.error);
  $('engine-error').textContent = loadError || game.error || '';
  const result = game.result();
  let title, detail;
  if (!game.started) { title = 'Ready when you are.'; detail = 'Choose your side. Take your time.'; }
  else if (loading) { title = 'A moment to settle in.'; detail = 'Getting the engine ready on your device.'; }
  else if (loadError || game.error) { title = 'Let’s try that again.'; detail = 'Your game is safe. The engine needs a retry.'; }
  else if (result) { title = result.title; detail = result.detail; }
  else if (!ready) { title = 'Welcome back.'; detail = 'Resume your saved game when you’re ready.'; }
  else if (game.thinking) { title = `${config.name} is thinking…`; detail = 'Finding a move, right here on your device.'; }
  else { title = game.humanTurn ? (game.chess.isCheck() ? 'You’re in check.' : 'Your move.') : `${config.name} to move.`; detail = game.humanTurn ? 'The board is yours.' : 'One position. All the possibilities.'; }
  $('status-title').textContent = title; $('status-detail').textContent = detail;
  $('status-title').classList.toggle('thinking', game.thinking || loading);
  $('undo').disabled = !moves.some(move => move.color === game.human) || loading;
  $('resign').disabled = game.over || loading;
  $('move-input').disabled = !playable;
  $('move-form').querySelector('button').disabled = !playable;
  $('legal-moves').innerHTML = playable ? game.chess.moves({ verbose: true }).map(m => `<option value="${toUci(m)}">${m.san}</option>`).join('') : '';
  $('download-pgn').disabled = !moves.length;
  $('history-first').disabled = !moves.length || reviewPly === 0;
  $('history-back').disabled = !moves.length || reviewPly === 0;
  $('history-next').disabled = live;
  $('history-last').disabled = live;
  $('move-count').textContent = `${moves.length} played`;
  if (moves.length) {
    let html = '';
    for (let i = 0; i < moves.length; i += 2) {
      html += `<div class="move-pair"><span>${Math.floor(i / 2) + 1}.</span>${[i, i + 1].map(j => moves[j] ? `<button data-ply="${j + 1}" class="${(live ? moves.length : reviewPly) === j + 1 ? 'current' : ''}" aria-label="Move ${Math.floor(j / 2) + 1}, ${moves[j].color === 'w' ? 'white' : 'black'}, ${escapeHtml(moves[j].san)}" ${(live ? moves.length : reviewPly) === j + 1 ? 'aria-current="step"' : ''}>${escapeHtml(moves[j].san)}</button>` : '<span></span>').join('')}</div>`;
    }
    $('move-list').innerHTML = html;
    if (live && moves.length !== lastRenderedPly) $('move-list').scrollTop = $('move-list').scrollHeight;
  } else $('move-list').innerHTML = '<div class="history-empty"><span class="empty-lines"><i></i><i></i><i></i></span>Your story starts on the board.</div>';
  if (moves.length > lastRenderedPly && ready) sound.play(result ? 'end' : game.chess.isCheck() ? 'check' : moves.at(-1).captured ? 'capture' : 'move');
  lastRenderedPly = moves.length;
  $('board-hint').textContent = !game.started ? 'Choose your side to start' : !live ? 'Use the arrows to explore this game' : game.over ? 'A game well spent' : game.thinking ? 'Thinking on your device' : 'Click or drag a piece to move';
  $('sound').innerHTML = icon(sound.enabled ? 'volume' : 'mute');
  $('sound').setAttribute('aria-label', sound.enabled ? 'Mute sounds' : 'Enable sounds');
  $('sound').setAttribute('aria-pressed', String(!sound.enabled));
  // Offer an explicit resume after a page reload, without downloading anything on arrival.
  let resume = $('resume');
  if (game.started && !ready && !loading && !loadError && !game.over) {
    if (!resume) { resume = document.createElement('button'); resume.id = 'resume'; resume.className = 'primary-button'; resume.textContent = 'Resume game'; resume.onclick = () => ensureReady(); $('game-actions').prepend(resume); }
  } else resume?.remove();
  persist();
}
async function ensureReady() {
  sound.unlock();
  if (loading) return;
  const attempt = ++loadAttempt;
  loading = true; loadError = null; $('loading-detail').textContent = 'Preparing the engine…'; $('progress-bar').style.width = '0%'; render();
  try { await engine.load(); if (attempt !== loadAttempt) return; ready = true; }
  catch (error) { if (attempt !== loadAttempt) return; loadError = error.message; ready = false; }
  finally { if (attempt === loadAttempt) { loading = false; render(); if (ready) void game.requestReply(engine); } }
}
function makeMove(uci) {
  try { game.play(uci); $('move-error').textContent = ''; $('move-input').value = ''; void game.requestReply(engine); }
  catch { $('move-error').textContent = 'That move isn’t legal here. Try a move from the suggestions.'; render(); }
}
function onBoardMove(from, to) {
  sound.unlock();
  const options = game.chess.moves({ verbose: true }).filter(m => m.from === from && m.to === to);
  if (options.some(m => m.promotion)) {
    promotion = { from, to }; render();
    const roles = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
    options.sort((a, b) => ['q', 'r', 'b', 'n'].indexOf(a.promotion) - ['q', 'r', 'b', 'n'].indexOf(b.promotion));
    $('promotion-options').innerHTML = options.map(m => `<button data-promotion="${m.promotion}" aria-label="Promote to ${roles[m.promotion]}"><piece class="promotion-piece ${roles[m.promotion]} ${colorName(game.human)}" aria-hidden="true"></piece><span>${roles[m.promotion]}</span></button>`).join('');
    $('promotion-dialog').showModal();
  } else makeMove(from + to);
}
function closePromotion() { promotion = null; $('promotion-dialog').close(); render(); }
function startGame() {
  reviewPly = null; promotion = null; ground.cancelMove(); ground.setShapes([]);
  const color = selectedSide === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 'w' : 'b') : selectedSide;
  orientation = colorName(color); lastRenderedPly = 0; game.start(color);
  if (ready) void game.requestReply(engine); else void ensureReady();
}
function confirm(title, detail, action) {
  $('confirm-title').textContent = title; $('confirm-detail').textContent = detail; confirmAction = action; $('confirm-dialog').showModal();
}
function openSetup() {
  game.revision++; game.replyOwner = null; game.started = false; game.thinking = false; game.error = null;
  game.chess = new Chess(); game.resigned = false; reviewPly = null; lastRenderedPly = 0; storage.write('game', null); ground.cancelMove(); render();
}
function goTo(ply) { const count = history().length; reviewPly = ply >= count ? null : Math.max(0, ply); ground.cancelMove(); render(); }
for (const button of document.querySelectorAll('[data-side]')) button.onclick = () => {
  selectedSide = button.dataset.side;
  for (const choice of document.querySelectorAll('[data-side]')) { choice.classList.toggle('selected', choice === button); choice.setAttribute('aria-pressed', String(choice === button)); }
  if (selectedSide !== 'random') { game.human = selectedSide; orientation = colorName(selectedSide); render(); }
};
$('start').onclick = startGame;
$('retry').onclick = () => { if (loadError) void ensureReady(); else { game.error = null; void game.requestReply(engine); } };
$('new-game').onclick = () => { if (!game.over && history().length) confirm('Start fresh?', 'This replaces the game saved in your browser. You can download its PGN first.', openSetup); else openSetup(); };
$('confirm-cancel').onclick = () => $('confirm-dialog').close();
$('confirm-yes').onclick = () => { $('confirm-dialog').close(); const action = confirmAction; confirmAction = null; action?.(); };
$('undo').onclick = () => { reviewPly = null; ground.cancelMove(); game.undo(); if (ready) void game.requestReply(engine); };
$('resign').onclick = () => confirm('Resign this game?', 'You can review the moves afterward or start another game.', () => game.resign());
$('flip').onclick = () => { orientation = orientation === 'white' ? 'black' : 'white'; render(); };
$('sound').onclick = () => { sound.enabled = !sound.enabled; storage.write('sound', sound.enabled); sound.unlock(); render(); };
$('move-form').onsubmit = event => { event.preventDefault(); sound.unlock(); makeMove($('move-input').value.trim().toLowerCase()); };
$('move-list').onclick = event => { const button = event.target.closest('[data-ply]'); if (button) goTo(Number(button.dataset.ply)); };
$('history-first').onclick = () => goTo(0); $('history-back').onclick = () => goTo((reviewPly ?? history().length) - 1);
$('history-next').onclick = () => goTo((reviewPly ?? history().length) + 1); $('history-last').onclick = () => goTo(history().length);
$('return-live').onclick = () => goTo(history().length);
$('promotion-options').onclick = event => { const button = event.target.closest('[data-promotion]'); if (button && promotion) { const { from, to } = promotion; closePromotion(); makeMove(from + to + button.dataset.promotion); } };
$('cancel-promotion').onclick = closePromotion;
$('promotion-dialog').addEventListener('cancel', event => { event.preventDefault(); closePromotion(); });
$('download-pgn').onclick = () => { const url = URL.createObjectURL(new Blob([game.pgn(config.name)], { type: 'application/x-chess-pgn' })); const a = document.createElement('a'); a.href = url; a.download = 'blujay-' + new Date().toISOString().slice(0, 10) + '.pgn'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('about').onclick = () => $('about-dialog').showModal(); $('close-about').onclick = () => $('about-dialog').close();
document.addEventListener('keydown', event => {
  if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); goTo((reviewPly ?? history().length) - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); goTo((reviewPly ?? history().length) + 1); }
  if (event.key.toLowerCase() === 'f') $('flip').click();
});
const saved = storage.read('game');
if (saved) { try { game.restore(saved); orientation = colorName(game.human); selectedSide = game.human; lastRenderedPly = history().length; } catch { storage.write('game', null); } }
render();
