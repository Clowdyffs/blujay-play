import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
let commit = '';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* Uncommitted first build. */ }
export default defineConfig({
  base: './',
  define: { __APP_COMMIT__: JSON.stringify(commit) },
  build: { target: 'es2022', sourcemap: true },
  worker: { format: 'es' },
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
