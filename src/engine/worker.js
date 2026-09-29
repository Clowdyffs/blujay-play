import { loadActionValue } from './action-value.js';
let engine;
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    const { id, type, payload } = data;
    try {
      if (type === 'load') {
        if (payload.adapter !== 'action-value-onnx-v1') throw new Error('Unknown engine adapter.');
        engine ??= await loadActionValue(payload, progress => self.postMessage({ id, type: 'progress', ...progress }));
        self.postMessage({ id, type: 'result', result: { ready: true } });
      } else if (type === 'choose' || type === 'evaluate') {
        if (!engine) throw new Error('Load an engine before asking for a move.');
        const start = performance.now();
        const result = await engine.evaluate(payload.fen, payload.moves);
        self.postMessage({ id, type: 'result', result: { ...result, milliseconds: performance.now() - start } });
      } else throw new Error('Unknown engine request.');
    } catch (error) { self.postMessage({ id, type: 'error', message: error.message || 'The engine could not complete this request.' }); }
  });
};
