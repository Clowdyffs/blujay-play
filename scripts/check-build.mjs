import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function walk(dir) { const rows = []; for (const name of await readdir(dir)) { const path = join(dir, name); (await stat(path)).isDirectory() ? rows.push(...await walk(path)) : rows.push(path); } return rows; }
const files = await walk('dist');
for (const path of files) if ((await stat(path)).size > 25 * 1024 * 1024) throw new Error('Cloudflare asset exceeds 25 MiB: ' + path);
const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
if ('main' in config || config.assets.run_worker_first) throw new Error('Deployment must remain static-only.');
if (files.length > 20000) throw new Error('Too many assets for Workers Free.');
console.log(`Static build checked: ${files.length} files; all below Cloudflare’s per-asset limit; no server Worker.`);
