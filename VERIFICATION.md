# Initial verification — 2026-09-29

This records local browser and build checks before the first live website deployment. It does not claim a deployed URL, an Elo rating, or compatibility with untested browsers.

## Automated checks

`npm test` passed 12 tests covering legal turns, Black’s initial reply, takeback, stale asynchronous replies after undo/new game/resignation, illegal engine responses and retry, castling, en passant, all four promotions, terminal games, PGN results, save restoration/repetition history, deduplicated legal destinations, three-digit FEN clocks, and deterministic score selection.

`npm run build` verifies bundled model/encoding hashes, builds all browser code, and checks static-only deployment configuration and per-file limits. `npx wrangler deploy --dry-run` passed without publishing. The model file is 16,251,319 bytes and the WASM binary is 14,239,890 bytes, each below 25 MiB. Direct dependencies are pinned in `package-lock.json`.

## Actual browser inference

The production build was served by local Wrangler/workerd with its real CSP and cache headers. T3 Code’s collaborative Chromium browser (Chromium 152 / Electron 44.4.2, Linux x86-64 workstation) executed the production module Worker and ONNX Runtime 1.30.0 WASM, with one WASM thread.

The export’s 79 reference positions, including a 218-legal-move position, produced **79/79 matching best moves** in the supplied reference move order. Maximum absolute action-value error was **0.00029754638671875**, below the export’s 0.005 tolerance. These checks used the same epoch-15 model SHA recorded in the README. They do not measure playing strength. Live chess.js legal-move ordering can resolve previously unseen exact ties differently from python-chess.

`tests/browser-parity.mjs` contains the browser verification helper. Supply the export’s `reference-values.json` positions explicitly, the production module-worker URL, and engine configuration with absolute `modelUrl`/`runtimeUrl`. The reference fixture is a separate local verification input and is not needed to build or play. It is not shipped to visitors or checked into this repository. The initial parity run is therefore recorded evidence, not part of public CI. Public CI verifies game logic and artifact integrity.

## Browser interactions

The following were exercised through the actual page:

- Initial page load fetched no model, WASM, or engine Worker. Starting loaded same-origin assets and reached a playable board.
- Board clicks played `e2e4`; the actual model replied `c7c5`. Coordinate keyboard entry produced the same legal exchange.
- Choosing Black produced the model’s `d2d4` opening and a correctly oriented board.
- Reload restored the saved move history without downloading the engine; explicit Resume continued play. Takeback restored the previous human turn.
- Review mode disabled move entry, and Back to live restored it. Board flip changed orientation.
- A promotion position displayed all four piece options. Choosing a knight saved `a7a8n` and ended in the expected insufficient-material draw.
- A deliberately missing model URL caused a readable error while preserving the game. Try again loaded the valid artifact and returned to a playable board. This was injected only by browser test instrumentation, not a production fallback.
- Layouts at 320 and 390 CSS pixels had no horizontal overflow; desktop layout was visually inspected at 1280×800. These were resized desktop viewports, not physical phone, touch, Safari, or Firefox tests.

The tests use no hosted inference API. A live Cloudflare smoke test and a physical mobile browser check remain useful after the owner connects the deployment.
