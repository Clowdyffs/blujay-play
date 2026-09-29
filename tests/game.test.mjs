import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { Game, legalDests, toUci } from '../src/game.js';
import { encodeBoard, selectBest } from '../src/engine/encoding.js';
import { readFile } from 'node:fs/promises';
const encoding = JSON.parse(await readFile(new URL('../public/models/blujay-7a937a0f7cf2/encoding.json', import.meta.url)));
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const engineMove = move => ({ choose: async () => ({ move, milliseconds: 12 }) });

test('white human move and black engine response follow legal turns', async () => {
  const g = new Game(); g.start('w');
  assert.throws(() => g.play('e2e5')); assert.equal(g.chess.history().length, 0);
  g.play('e2e4'); assert.throws(() => g.play('d2d4'));
  await g.requestReply(engineMove('e7e5'));
  assert.deepEqual(g.chess.history(), ['e4','e5']); assert.equal(g.humanTurn,true); assert.equal(g.thinking,false);
});
test('choosing black gives the engine the opening move, and takeback removes a full turn', async () => {
  const g = new Game(); g.start('b'); await g.requestReply(engineMove('e2e4'));
  g.undo(); assert.deepEqual(g.chess.history(), ['e4']);
  g.play('e7e5'); await g.requestReply(engineMove('g1f3')); g.undo();
  assert.deepEqual(g.chess.history(), ['e4']); assert.equal(g.humanTurn,true);
});
test('a takeback while inference is pending rejects its stale result', async () => {
  const g = new Game(); const d = defer(); g.start('w'); g.play('e2e4');
  const pending = g.requestReply({choose:()=>d.promise}); g.undo();
  d.resolve({move:'e7e5'}); await pending;
  assert.equal(g.chess.history().length,0); assert.equal(g.thinking,false); assert.equal(g.humanTurn,true);
});
test('an old response cannot modify a new game or clear its thinking indicator', async () => {
  const g = new Game(); const old = defer(), current = defer(); g.start('b');
  const p = g.requestReply({choose:()=>old.promise}); g.start('b');
  const q = g.requestReply({choose:()=>current.promise}); old.resolve({move:'e2e4'}); await p;
  assert.equal(g.thinking,true); assert.equal(g.chess.history().length,0);
  current.resolve({move:'d2d4'}); await q; assert.deepEqual(g.chess.history(),['d4']); assert.equal(g.thinking,false);
});
test('illegal engine output and failures leave the position intact and allow retry', async () => {
  const g = new Game(); g.start('b'); const fen=g.chess.fen();
  await g.requestReply(engineMove('e7e5')); assert.equal(g.chess.fen(),fen); assert.match(g.error,/illegal/); assert.equal(g.thinking,false);
  await g.requestReply({choose:async()=>{throw Error('Offline');}}); assert.equal(g.error,'Offline');
  await g.requestReply(engineMove('e2e4')); assert.equal(g.error,null); assert.deepEqual(g.chess.history(),['e4']);
});
test('castling, en passant and all four promotions preserve chess rules', () => {
  const castle = new Game(); castle.start('w','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  castle.play('e1g1'); assert.equal(castle.chess.get('f1').type,'r'); assert.equal(castle.chess.get('g1').type,'k');
  const ep = new Game(); ep.start('w','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  ep.play('e5d6'); assert.equal(ep.chess.get('d5'),undefined);
  for (const role of ['q','r','b','n']) { const g=new Game();g.start('w','4k3/P7/8/8/8/8/8/4K3 w - - 0 1');g.play('a7a8'+role);assert.equal(g.chess.get('a8').type,role); }
});
test('terminal positions never ask the engine to move', async () => {
  for (const fen of ['7k/6Q1/6K1/8/8/8/8/8 b - - 0 1','7k/5Q2/6K1/8/8/8/8/8 b - - 0 1','7k/8/6K1/8/8/8/8/8 w - - 0 1']) {
    const g=new Game();g.start('w',fen);assert.equal(g.over,true);assert.ok(g.result());await g.requestReply({choose:()=>assert.fail('terminal inference')});
  }
});
test('resignation rejects a pending move, and exports the correct PGN result', async () => {
  const g = new Game(); const d=defer();g.start('w');g.play('e2e4');const p=g.requestReply({choose:()=>d.promise});
  g.resign();d.resolve({move:'e7e5'});await p;assert.equal(g.chess.history().length,1);assert.equal(g.over,true);assert.match(g.pgn('Test'),/\[Result "0-1"\]/);
});
test('reset returns to an unstarted board and rejects a pending reply', async () => {
  const g = new Game(); const d = defer(); g.start('w'); g.play('e2e4');
  const pending = g.requestReply({choose:()=>d.promise}); g.reset();
  d.resolve({move:'e7e5'}); await pending;
  assert.equal(g.started,false); assert.equal(g.thinking,false); assert.equal(g.chess.history().length,0); assert.equal(g.result(),null);
});
test('results name the winner from the human perspective', () => {
  const mate = new Game(undefined, 'Bot'); mate.start('b','7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'); assert.deepEqual(mate.result(), {title:'Checkmate',detail:'Bot wins',pgn:'1-0'});
  const won = new Game(undefined, 'Bot'); won.start('w','7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'); assert.equal(won.result().detail,'You win');
  const resigned = new Game(undefined, 'Bot'); resigned.start('b'); resigned.resign(); assert.deepEqual(resigned.result(), {title:'Resignation',detail:'Bot wins',pgn:'1-0'});
});
test('save and restore replay full history, including repetition and color', () => {
  const g = new Game();g.start('w');
  for (const m of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8']) g.apply(m);
  const restored=new Game();restored.restore(g.serialize());assert.equal(restored.chess.fen(),g.chess.fen());assert.equal(restored.chess.isThreefoldRepetition(),true);assert.equal(restored.human,'w');
  const bad={...g.serialize(),moves:['e2e5']};assert.throws(()=>restored.restore(bad));assert.equal(restored.chess.fen(),g.chess.fen());
});
test('legal destination maps deduplicate promotion destinations', () => {
  const b=new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');assert.deepEqual(legalDests(b).get('a7'),['a8']);assert.equal(b.moves({verbose:true}).map(toUci).filter(m=>m.startsWith('a7a8')).length,4);
});
test('reference token encoding preserves three-digit clocks and rejects truncation', () => {
  const b=new Chess();const fen=b.fen().replace('0 1','123 456');const tokens=encodeBoard(fen,encoding.characters);
  assert.equal(tokens.length,78);assert.equal(tokens[0],0n);assert.equal([...tokens.slice(-6)].map(i=>encoding.characters[Number(i)]).join(''),'123456');
  assert.throws(()=>encodeBoard(b.fen().replace('0 1','0 1000'),encoding.characters));
});
test('first-maximum selection preserves tie order and rejects missing/nonfinite scores', () => {
  assert.equal(selectBest(['a2a3','a2a4'],[50,50]),'a2a3');assert.equal(selectBest([],[]),null);
  assert.throws(()=>selectBest(['a2a3'],[]));assert.throws(()=>selectBest(['a2a3'],[NaN]));
});
