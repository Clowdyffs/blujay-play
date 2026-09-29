// Artifact boundary: UI code never needs to know the tensor/token encoding.
export function encodeBoard(fen, characters) {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('Expected a complete FEN.');
  const [board, side, castling, ep, halfmove, fullmove] = fields;
  const expanded = board.replaceAll('/', '').replace(/[1-8]/g, d => '.'.repeat(Number(d)));
  if (expanded.length !== 64 || !/^[wb]$/.test(side)) throw new Error('Invalid FEN position.');
  if (![halfmove, fullmove].every(x => /^\d{1,3}$/.test(x))) throw new Error('This model supports move counters through 999.');
  const text = side + expanded + (castling === '-' ? '' : castling).padEnd(4, '.')
    + (ep === '-' ? '..' : ep) + halfmove.padEnd(3, '.') + fullmove.padEnd(3, '.');
  const tokens = [0, ...Array.from(text, char => characters.indexOf(char))];
  if (tokens.length !== 78 || tokens.some(x => x < 0)) throw new Error('Position is outside this model’s encoding.');
  return BigInt64Array.from(tokens, BigInt);
}
export function selectBest(moves, values) {
  if (moves.length !== values.length) throw new Error('Incomplete model result.');
  let best = -1;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) throw new Error('The model returned an invalid score.');
    if (best < 0 || values[i] > values[best]) best = i;
  }
  return best < 0 ? null : moves[best];
}
