import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { config } from '../src/config.js';
const modelRoot = 'public/' + config.engine.modelPath;
const manifest = JSON.parse(await readFile(modelRoot + 'manifest.json', 'utf8'));
for (const name of ['model.onnx', 'encoding.json']) {
  const bytes = await readFile(modelRoot + name);
  const expected = manifest.files[name];
  if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) throw new Error('Artifact mismatch: ' + name);
}
if (manifest.files['model.onnx'].sha256 !== config.engine.modelSha256) throw new Error('Configured model identity differs.');
const target = 'public/' + config.engine.runtimePath;
await mkdir(target, { recursive: true });
for (const name of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) await copyFile('node_modules/onnxruntime-web/dist/' + name, target + name);
await mkdir('public/licenses', { recursive: true });
for (const [name, file] of [['chessground', '@lichess-org/chessground/LICENSE'], ['chess.js', 'chess.js/LICENSE']]) {
  await copyFile('node_modules/' + file, 'public/licenses/' + name + '.txt');
}
await copyFile('LICENSE', 'public/licenses/app-GPL-3.0.txt');
await copyFile('THIRD_PARTY_NOTICES.md', 'public/licenses/THIRD_PARTY_NOTICES.md');
const bluejay = (await readFile('src/bluejay.svg', 'utf8')).replace('<svg ', '<svg x="3" y="3" width="34" height="34" ');
await writeFile('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#e0d8fd"/>${bluejay}</svg>\n`);
console.log('Verified model and prepared same-origin WASM assets.');

for (const name of ['onnxruntime-LICENSE.txt', 'onnxruntime-ThirdPartyNotices.txt', 'CC-BY-4.0.txt', 'instrument-sans-OFL.txt']) await copyFile('licenses/' + name, 'public/licenses/' + name);
