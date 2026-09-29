// Original synthesized sounds. No remote audio or copied Lichess recordings.
export class Sound {
  constructor(enabled = true) { this.enabled = enabled; this.context = null; }
  unlock() {
    if (!this.enabled) return;
    try { this.context ??= new AudioContext(); this.context.resume().catch(() => {}); } catch { /* Sound is optional. */ }
  }
  play(kind = 'move') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const frequencies = kind === 'end' ? [523, 659, 784] : kind === 'check' ? [440, 554] : kind === 'capture' ? [180, 120] : [360];
    frequencies.forEach((frequency, i) => {
      const start = this.context.currentTime + i * 0.06;
      const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, start + 0.09);
      gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.10, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(start); oscillator.stop(start + 0.13);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
}
