// Per-move repetition levels from the game history; mirrors the training
// repository's repetition.py exactly (tests/repetition.test.mjs checks its fixture).
//   0  the position after the move has not occurred in this game
//   1  it occurred once before
//   2  after the move a threefold draw is claimable (third occurrence, or the
//      opponent has a reply that makes some position occur a third time)
// A position is its piece placement, side to move, castling rights and the en
// passant square only when an en passant capture is legal (FIDE repetition).
import { Chess } from 'chess.js';

export const NEW = 0, REPEAT = 1, CLAIMABLE = 2;

const play = (chess, uci) => chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

export function positionKey(chess) {
  const [placement, side, castling, ep] = chess.fen().split(' ');
  const legalEp = ep !== '-' && chess.moves({ verbose: true }).some(move => move.flags.includes('e'));
  return `${placement} ${side} ${castling} ${legalEp ? ep : '-'}`;
}

const placementOf = key => key.split(' ')[0].replaceAll('/', '').replace(/[1-8]/g, d => '.'.repeat(Number(d)));

function withinOneMove(a, b) {
  // One move changes at most four squares (castling).
  let changed = 0;
  for (let i = 0; i < 64; i++) if (a[i] !== b[i] && ++changed > 4) return false;
  return true;
}

// Levels for `moves` (UCI) in the position reached by `history` (UCI) from `initialFen`.
export function repetitionLevels(initialFen, history, moves) {
  const chess = new Chess(initialFen);
  const counts = new Map();
  const count = () => { const key = positionKey(chess); counts.set(key, (counts.get(key) ?? 0) + 1); };
  count();
  for (const uci of history) { play(chess, uci); count(); }
  const targets = [...counts].filter(([, n]) => n >= 2).map(([key]) => [key, placementOf(key)]);
  return moves.map(uci => {
    play(chess, uci);
    const key = positionKey(chess);
    const seen = counts.get(key) ?? 0;
    let level = seen >= 2 ? CLAIMABLE : seen === 1 ? REPEAT : NEW;
    if (level < CLAIMABLE && targets.length) {
      const here = placementOf(key);
      const near = new Set(targets.filter(([, placement]) => withinOneMove(here, placement)).map(([target]) => target));
      if (near.size) {
        for (const reply of chess.moves({ verbose: true })) {
          chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
          const hit = near.has(positionKey(chess));
          chess.undo();
          if (hit) { level = CLAIMABLE; break; }
        }
      }
    }
    chess.undo();
    return level;
  });
}
