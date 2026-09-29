// The rest of the app depends on load() and choose(fen, legalUciMoves), not ONNX.
export class EngineClient {
  constructor(config, onProgress = () => {}) {
    this.config = { ...config,
      modelUrl: new URL(config.modelPath, document.baseURI).href,
      runtimeUrl: new URL(config.runtimePath, document.baseURI).href,
    };
    this.onProgress = onProgress;
    this.pending = new Map(); this.id = 0; this.loaded = null;
  }
  createWorker() {
    this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module', name: 'chess-engine' });
    this.worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      if (data.type === 'progress') { this.onProgress(data); return; }
      this.pending.delete(data.id);
      data.type === 'error' ? pending.reject(new Error(data.message)) : pending.resolve(data.result);
    };
    this.worker.onerror = event => {
      event.preventDefault();
      this.dispose(new Error('The engine stopped. Try again, or use a browser with WebAssembly support.'));
    };
  }
  request(type, payload) {
    this.worker ?? this.createWorker();
    const id = ++this.id;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker.postMessage({ id, type, payload }); });
  }
  load() {
    this.loaded ??= this.request('load', this.config).catch(error => { this.dispose(error); throw error; });
    return this.loaded;
  }
  async choose(fen, moves) { await this.load(); return this.request('choose', { fen, moves }); }
  dispose(error = new Error('Engine request canceled.')) {
    this.worker?.terminate(); this.worker = null; this.loaded = null;
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
