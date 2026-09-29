import moveUrl from './sounds/move.wav';
import captureUrl from './sounds/capture.wav';

// Recorded wooden piece sounds (CC0, see THIRD_PARTY_NOTICES.md), decoded once and
// played through Web Audio so they land with the move instead of after it.
const sources = { move: moveUrl, capture: captureUrl };
export class Sound {
  constructor(enabled = true) { this.enabled = enabled; this.context = null; this.buffers = null; }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext({ latencyHint: 'interactive' });
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
      this.buffers ??= Promise.all(Object.entries(sources).map(async ([kind, url]) => {
        const response = await fetch(url);
        return [kind, await this.context.decodeAudioData(await response.arrayBuffer())];
      })).then(Object.fromEntries).catch(() => { this.buffers = null; return {}; });
    } catch { /* Sound is optional. */ }
  }
  async play(kind = 'move') {
    if (!this.enabled || !this.buffers || this.context?.state !== 'running') return;
    const buffer = (await this.buffers)[kind];
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer; source.connect(this.context.destination); source.start();
  }
}
