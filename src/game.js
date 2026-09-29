import { Chess, DEFAULT_POSITION } from 'chess.js';
export const toUci = move => move.from + move.to + (move.promotion ?? '');
export const colorName = color => color === 'w' ? 'white' : 'black';
export function legalDests(chess) {
  const dests = new Map();
  for (const move of chess.moves({ verbose: true })) {
    if (!dests.has(move.from)) dests.set(move.from, []);
    if (!dests.get(move.from).includes(move.to)) dests.get(move.from).push(move.to);
  }
  return dests;
}
export class Game {
  constructor(onChange = () => {}, engineName = 'Engine') {
    this.engineName = engineName;
    this.onChange = onChange; this.revision = 0; this.chess = new Chess();
    this.human = 'w'; this.started = false; this.thinking = false; this.error = null;
    this.resigned = false; this.initialFen = DEFAULT_POSITION; this.lastTime = null;
  }
  start(human, fen = DEFAULT_POSITION) {
    if (!['w', 'b'].includes(human)) throw new Error('Invalid player color.');
    this.revision++; this.replyOwner = null; this.chess = new Chess(fen); this.initialFen = fen;
    this.human = human; this.started = true; this.thinking = false;
    this.error = null; this.resigned = false; this.lastTime = null; this.onChange();
  }
  get over() { return this.resigned || this.chess.isGameOver(); }
  get humanTurn() { return this.started && !this.over && this.chess.turn() === this.human; }
  play(uci) {
    if (!this.humanTurn || this.thinking) throw new Error('It is not your turn.');
    this.apply(uci); this.onChange();
  }
  apply(uci) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Enter a legal move, such as e2e4.');
    this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    this.revision++; this.error = null;
  }
  async requestReply(engine) {
    if (!this.started || this.over || this.humanTurn || this.thinking) return;
    const owner = {}; this.replyOwner = owner;
    const revision = this.revision; const fen = this.chess.fen();
    this.thinking = true; this.error = null; this.onChange();
    try {
      const legal = this.chess.moves({ verbose: true }).map(toUci);
      const result = await engine.choose(fen, legal);
      if (this.replyOwner !== owner || this.revision !== revision || this.chess.fen() !== fen) return;
      if (!legal.includes(result.move)) throw new Error('The engine returned an illegal move.');
      this.apply(result.move); this.lastTime = result.milliseconds;
    } catch (error) {
      if (this.replyOwner === owner) this.error = error.message || 'The engine could not move.';
    } finally {
      if (this.replyOwner === owner) { this.thinking = false; this.replyOwner = null; this.onChange(); }
    }
  }
  undo() {
    if (!this.started || !this.chess.history({ verbose: true }).some(move => move.color === this.human)) return;
    this.revision++; this.replyOwner = null; this.thinking = false; this.resigned = false; this.error = null;
    this.chess.undo();
    if (this.chess.turn() !== this.human && this.chess.history().length) this.chess.undo();
    this.lastTime = null; this.onChange();
  }
  resign() { this.revision++; this.replyOwner = null; this.thinking = false; this.resigned = true; this.onChange(); }
  reset() {
    this.revision++; this.replyOwner = null; this.chess = new Chess(); this.initialFen = DEFAULT_POSITION;
    this.started = false; this.thinking = false; this.error = null; this.resigned = false; this.lastTime = null; this.onChange();
  }
  result() {
    const winner = color => color === this.human ? 'You win' : `${this.engineName} wins`;
    if (this.resigned) return { title: 'Resignation', detail: winner(this.human === 'w' ? 'b' : 'w'), pgn: this.human === 'w' ? '0-1' : '1-0' };
    if (this.chess.isCheckmate()) return { title: 'Checkmate', detail: winner(this.chess.turn() === 'w' ? 'b' : 'w'), pgn: this.chess.turn() === 'w' ? '0-1' : '1-0' };
    if (this.chess.isStalemate()) return { title: 'Stalemate', detail: 'Draw', pgn: '1/2-1/2' };
    if (this.chess.isThreefoldRepetition()) return { title: 'Threefold repetition', detail: 'Draw', pgn: '1/2-1/2' };
    if (this.chess.isInsufficientMaterial()) return { title: 'Insufficient material', detail: 'Draw', pgn: '1/2-1/2' };
    if (this.chess.isDraw()) return { title: 'Fifty-move rule', detail: 'Draw', pgn: '1/2-1/2' };
    return null;
  }
  serialize() { return { version: 1, human: this.human, moves: this.chess.history({ verbose: true }).map(toUci), resigned: this.resigned, initialFen: this.initialFen }; }
  restore(value) {
    if (value?.version !== 1 || !['w', 'b'].includes(value.human) || !Array.isArray(value.moves) || value.moves.length > 2000) throw new Error('Invalid saved game.');
    const candidate = new Chess(value.initialFen ?? DEFAULT_POSITION);
    for (const uci of value.moves) {
      if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Invalid saved move.');
      candidate.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    this.revision++; this.replyOwner = null; this.chess = candidate; this.initialFen = value.initialFen ?? DEFAULT_POSITION;
    this.human = value.human; this.started = true; this.thinking = false; this.error = null; this.resigned = value.resigned === true; this.onChange();
  }
  pgn(engineName = 'Engine') {
    this.chess.header('Event', 'Browser game', 'Site', 'Local', 'Date', new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
      'White', this.human === 'w' ? 'You' : engineName, 'Black', this.human === 'b' ? 'You' : engineName,
      'Result', this.result()?.pgn ?? '*');
    return this.chess.pgn();
  }
}
