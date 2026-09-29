import { encodeBoard, selectBest } from './encoding.js';

export async function digest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function verified(url, expected, progress) {
  if (!expected || !Number.isSafeInteger(expected.bytes) || !/^[a-f0-9]{64}$/.test(expected.sha256)) throw new Error('Invalid artifact manifest.');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download the model (HTTP ${response.status}).`);
  const reader = response.body.getReader();
  const bytes = new Uint8Array(expected.bytes);
  let loaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (loaded + value.length > bytes.length) throw new Error('Model download size does not match its manifest.');
      bytes.set(value, loaded); loaded += value.length;
      progress?.({ stage: 'download', loaded, total: expected.bytes });
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (loaded !== expected.bytes || await digest(bytes) !== expected.sha256) throw new Error('Model integrity check failed. Please reload and try again.');
  return bytes;
}
export async function loadActionValue(config, progress) {
  const ort = await import(/* @vite-ignore */ new URL('ort.wasm.min.mjs', config.runtimeUrl).href);
  const base = new URL(config.modelUrl);
  const response = await fetch(new URL('manifest.json', base));
  if (!response.ok) throw new Error(`Model manifest is unavailable (HTTP ${response.status}).`);
  const manifest = await response.json();
  if (manifest.format !== 'blujay-onnx-artifact' || manifest.format_version !== 1 || manifest.precision !== 'float32'
      || manifest.files?.['model.onnx']?.sha256 !== config.modelSha256
      || manifest.contract?.inputs?.map(x => x.name).join(',') !== 'board_tokens,move_tokens'
      || manifest.contract?.outputs?.map(x => x.name).join(',') !== 'logits,action_values') throw new Error('Unsupported or unexpected model artifact.');
  const encoding = JSON.parse(new TextDecoder().decode(await verified(new URL('encoding.json', base), manifest.files['encoding.json'])));
  if (encoding.name !== manifest.encoding.name || encoding.actions.length !== manifest.encoding.actions) throw new Error('Model encoding does not match.');
  const actions = new Map(encoding.actions.map((uci, i) => [uci, i]));
  const bytes = await verified(new URL('model.onnx', base), manifest.files['model.onnx'], progress);
  progress?.({ stage: 'prepare' });
  // One CPU thread in our own Web Worker works without cross-origin isolation,
  // including when embedded on a portfolio. Only ship the standard WASM backend.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {
    wasm: new URL('ort-wasm-simd-threaded.wasm', config.runtimeUrl).href,
    mjs: new URL('ort-wasm-simd-threaded.mjs', config.runtimeUrl).href,
  };
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return {
    async evaluate(fen, moves) {
      const board = encodeBoard(fen, encoding.characters);
      const values = [];
      // Bound temporary memory even for unusual positions. Every legal move is scored.
      for (let offset = 0; offset < moves.length; offset += 32) {
        const batch = moves.slice(offset, offset + 32).map(move => {
          const index = actions.get(move);
          if (index === undefined) throw new Error('A legal move is outside this model’s vocabulary.');
          return BigInt(index);
        });
        const feeds = {
          board_tokens: new ort.Tensor('int64', board, [board.length]),
          move_tokens: new ort.Tensor('int64', BigInt64Array.from(batch), [batch.length]),
        };
        let output;
        try {
          output = await session.run(feeds, ['action_values']);
          values.push(...output.action_values.data);
        } finally {
          for (const tensor of Object.values(feeds)) tensor.dispose();
          for (const tensor of Object.values(output ?? {})) tensor.dispose();
        }
      }
      return { move: selectBest(moves, values), values };
    },
  };
}
