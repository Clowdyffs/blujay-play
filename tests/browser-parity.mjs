// Browser-side verification helper. Pass exported reference fixtures explicitly;
// no training data or fixture downloads are part of the production application.
export async function verifyBrowser({ workerUrl, engineConfig, fixtures }) {
  const worker = new Worker(workerUrl, { type: 'module' });
  const pending = new Map(); let id = 0;
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') return;
    const p = pending.get(data.id); if (!p) return;
    pending.delete(data.id);
    data.type === 'error' ? p.reject(new Error(data.message)) : p.resolve(data.result);
  };
  worker.onerror = event => { for (const p of pending.values()) p.reject(new Error(event.message)); };
  const call = (type, payload) => new Promise((resolve, reject) => {
    const key = ++id; pending.set(key, { resolve, reject }); worker.postMessage({ id: key, type, payload });
  });
  const start = performance.now();
  try {
    await call('load', engineConfig);
    let matching = 0, maxError = 0;
    for (const f of fixtures) {
      const result = await call('evaluate', { fen: f.fen, moves: f.moves });
      if (result.move !== f.best_move || result.values.length !== f.action_values.length) throw new Error('Reference move or score-count mismatch.');
      matching++;
      for (let i = 0; i < result.values.length; i++) maxError = Math.max(maxError, Math.abs(result.values[i] - f.action_values[i]));
    }
    if (maxError >= 0.005) throw new Error('Value tolerance exceeded: ' + maxError);
    return { matching, maxError, elapsedMs: performance.now() - start, userAgent: navigator.userAgent };
  } finally { worker.terminate(); }
}
