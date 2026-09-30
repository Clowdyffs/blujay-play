# Verification

Records of what was checked, newest first, and the limits of each check.

## Icon contrast and board alignment — 2026-09-30

Bot avatars now use the favicon's lavender background (`#e0d8fd`) so the white belly remains visible. Removed the redundant lowercase header brand while retaining Lichess, the GPL source link, and Portfolio. Shortened the navigation strip, raised the board size cap to 768 px, and aligned the desktop side panel with the actual board square rather than the player rows.

At 1280×800, the board moved from y=136 to y=104 and grew from 584 to 616 px. The board and side panel both span y=104–720. Compact views retain the controls and credits without clipping; stacked setup views reserve room for the full introductory card.

`npm run check` passed the game tests and production build. Subsequent CSS refinements passed `npm run build`, including model/encoding hash verification and static-only asset checks (27 files). Changes are limited to page markup and CSS; engine, runtime, and model assets are unchanged.

T3 Code's Chromium browser exercised the production build served by local Wrangler with the real CSP. Board clicks played `e2e4`; the real WASM model replied `c7c5` without an error. Setup and game views were checked across 1920×1080, 1280×800, 1024×768, 1024×600, 844×390, 820×1180, 720×800, 720×600, 390×844, 320×721, and 320×568. All final checked views fit without horizontal or vertical overflow, clipped controls, or hidden credits. Desktop board and panel edges aligned; stacked views kept the panel beneath the board. Visible bot avatars had the same lavender background as the favicon.

These are resized Chromium viewports, not physical phone, Safari, or Firefox tests. The full inference-reference suite was not repeated for this layout change.

## Selected minimal blue jay icon — 2026-09-30

Replaced the earlier drawing with a flat SVG refinement of the selected OpenAI Image Gen concept, option 3: one swept blue crest, a dark wing, and a pale belly. The interface and generated favicon share the same three-path drawing. The favicon URL includes a new version query so browsers fetch the replacement.

`npm run build` passed model/encoding hash verification, the production build, and static-only asset checks (27 files). No dependencies, game/controller code, inference code, runtime files, or model artifacts changed.

T3 Code's Chromium browser compared the SVG with the selected concept and inspected the favicon at 16, 32, 64, and 128 px. The production build was served by local Wrangler with its actual CSP. Board clicks played `e2e4`, and the real WASM model replied `c7c5`. The new drawing rendered in the header and bot identity. Layouts at 1280×800, 390×844, and 320×568 fit without horizontal or vertical overflow; Source and Credits & licenses remained visible.

These are resized Chromium viewports, not physical phone, Safari, or Firefox tests. The full inference-reference suite was not repeated for this asset-only change.

## Portfolio visual alignment — 2026-09-30

Matched the live clowdy.dev palette and Instrument Sans typeface: lavender background, plum text, violet controls, softer borders, and muted lavender board squares. The font is self-hosted with its SIL Open Font License. The interface and favicon share one original blue jay drawing. Desktop board size is capped at 720 px, and phones retain outer gutters.

`npm run check` passed the game tests, model/encoding hash verification, production build, and static-only asset checks. The build contains 27 files, including the hashed font and its license notice.

T3 Code’s Chromium browser exercised the production build served by local Wrangler with its actual CSP:

- First visit loaded the page script, stylesheet, and local font, with no engine Worker or model download. Instrument Sans loaded successfully under `font-src 'self'`.
- Board clicks played `e2e4`; the actual WASM model replied `c7c5`. Selecting Black and pressing Play produced `d2d4` and the Black board orientation.
- Layouts at 1920×1080, 1280×800, 1024×768, 820×1180, 390×844, 375×667, and 320×568 were inspected. The ordinary setup/game layouts fit without horizontal overflow; the final compact phone layouts also fit vertically. All seven toolbar buttons remain inside the panel at its smallest 256 px width. Confirmation controls wrap on narrow phones and can require vertical scrolling.
- The favicon was visually inspected at 16, 32, 64, and 128 px. The Portfolio link resolves to clowdy.dev; Source and Credits & licenses remain visible.

These are resized Chromium viewports, not physical phone, Safari, or Firefox tests. The inference adapter, runtime, encoding, and model were not changed; the full export-reference parity suite was not repeated. No deployment was performed.

## Interface redesign — 2026-09-29

The page, board theme, sounds, and controls were rebuilt; `src/engine/`, the model artifact, and the runtime were not changed, so the earlier inference parity result still applies and was not rerun.

### Automated checks

`npm test` passed 14 tests: the 12 earlier tests plus `Game.reset()` rejecting a pending reply and result labels naming the winner from the player’s side. `npm run build` passed with 25 static files, including the two sound files as hashed, immutably cached assets.

### Browser checks

Run in T3 Code’s Chromium browser against the Vite dev server and against the production build served by local Wrangler with the real `_headers` CSP:

- First visit loaded only the page script and stylesheet: no model, runtime, worker, or sounds, and no page scroll at 1280×800.
- Moving a white pawn on the setup board started a game, loaded the engine, and the model replied `c7c5`. Choosing Black produced the model’s `d2d4`. With the engine cached, replies landed about 450 ms after the move (the presentation floor); direct worker timing was 13–25 ms per move.
- On-board promotion showed queen, knight, rook, and bishop on the promotion file; choosing the queen played `bxa8=Q+` with the capture sound and updated the material difference.
- A mate position ended with `1–0 · Checkmate · You win`, disabled Resign, and promoted New game.
- Clicking an earlier move showed that position and highlighted the latest-move button; clicking the board returned to the live game. Resign and New game asked inline and could be cancelled. Takeback removed the player’s move and the reply and updated the saved game.
- The Tab-revealed move field accepted SAN (`Nf6`) and keeps focus while the engine replies.
- Reloading on the engine’s turn showed Continue game and downloaded nothing until it was pressed.
- Both WAV files were served as `audio/wav` with immutable caching, fetched under the CSP, and decoded in the browser (120 ms and 150 ms, onset 1.4 ms).
- Layouts at 1920×1080, 1280×800, 1024×768, 820×1180, 390×844, and 375×667 fit without horizontal overflow; the setup and game panels fit without vertical scrolling at 375×667 as well. These were resized desktop viewports, not physical phones or Safari/Firefox.

### Sound selection

The move and capture sounds come from a CC0 recording of real pieces (see THIRD_PARTY_NOTICES.md). Individual hits were chosen and processed by measurement — attack, decay to −20/−40 dB, and energy by frequency band — against the profile of a typical online move click. They were not auditioned by ear during this change; listen before relying on them.

### Not re-verified

The engine load failure and Retry path was not re-exercised. Its code path is unchanged in substance: a failed load shows the message with Retry, and the game is kept.

## Initial verification — 2026-09-29

This records local browser and build checks before the first live website deployment. It does not claim a deployed URL, an Elo rating, or compatibility with untested browsers.

### Automated checks

`npm test` passed 12 tests covering legal turns, Black’s initial reply, takeback, stale asynchronous replies after undo/new game/resignation, illegal engine responses and retry, castling, en passant, all four promotions, terminal games, PGN results, save restoration/repetition history, deduplicated legal destinations, three-digit FEN clocks, and deterministic score selection.

`npm run build` verifies bundled model/encoding hashes, builds all browser code, and checks static-only deployment configuration and per-file limits. `npx wrangler deploy --dry-run` passed without publishing. The model file is 16,251,319 bytes and the WASM binary is 14,239,890 bytes, each below 25 MiB. Direct dependencies are pinned in `package-lock.json`.

### Actual browser inference

The production build was served by local Wrangler/workerd with its real CSP and cache headers. T3 Code’s collaborative Chromium browser (Chromium 152 / Electron 44.4.2, Linux x86-64 workstation) executed the production module Worker and ONNX Runtime 1.30.0 WASM, with one WASM thread.

The export’s 79 reference positions, including a 218-legal-move position, produced **79/79 matching best moves** in the supplied reference move order. Maximum absolute action-value error was **0.00029754638671875**, below the export’s 0.005 tolerance. These checks used the same epoch-15 model SHA recorded in the README. They do not measure playing strength. Live chess.js legal-move ordering can resolve previously unseen exact ties differently from python-chess.

`tests/browser-parity.mjs` contains the browser verification helper. Supply the export’s `reference-values.json` positions explicitly, the production module-worker URL, and engine configuration with absolute `modelUrl`/`runtimeUrl`. The reference fixture is a separate local verification input and is not needed to build or play. It is not shipped to visitors or checked into this repository. The initial parity run is therefore recorded evidence, not part of public CI. Public CI verifies game logic and artifact integrity.

### Browser interactions

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
