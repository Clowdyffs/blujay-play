# Blujay Play

A small chess model, a board, and your move. A static browser demo for [Alex Ashworth’s portfolio](https://clowdydev.com), with a custom blue Chessground board and on-device inference.

Play White, Black, or a random side. Click or drag pieces, promote to any legal piece, take back a turn, review the game, export PGN, and resume a saved game. Coordinate move entry is also available below the board. Sounds are synthesized locally and can be muted. There is no clock or difficulty slider; the model scores every legal move and selects its highest-scoring move without tree search.

**Everything runs in the visitor’s browser.** The deployment serves static files, including the approved epoch-15 ONNX model. No accounts, server inference, analytics, API keys, Durable Objects, or connection to the Lichess bot service are required. The Lichess link opens that separate bot’s profile.

## Develop

Use Node.js 24 or newer (`.node-version` selects 24).

```sh
npm ci
npm run dev
```

Open the printed localhost URL (port 5174). For checks and a production preview:

```sh
npm run check
npm run preview
```

To exercise Cloudflare’s actual static headers and routing locally, after building:

```sh
npx wrangler dev --local --port 4174
```

`npm run build` verifies the bundled artifact hashes, prepares the pinned ONNX Runtime files and license notices, and builds `dist/`. It also rejects files exceeding Cloudflare’s asset limit or a configuration that introduces server execution. No private repository, training environment, GPU, external model download, or Git LFS is needed to build. `private: true` in `package.json` prevents accidental npm publication; this Git repository is public.

See [deployment instructions](DEPLOYMENT.md) for Cloudflare and portfolio embedding, and [verification](VERIFICATION.md) for the tests and their limits.

## How it fits together

```text
Chessground board + controls
          │ FEN and legal moves in UCI notation
          ▼
Game controller (chess.js rules)
          │ load() / choose(fen, legalMoves)
          ▼
Dedicated browser Worker
          │ selected inference adapter
          ▼
ONNX Runtime WASM + versioned model artifact
```

- `src/config.js`: branding, links, artifact identity, and adapter selection.
- `src/game.js`: chess rules, turn ownership, saved games, PGN, and stale-reply protection. Independent of Blujay and ONNX.
- `src/main.js`, `src/style.css`: page, board controls, and fixed visual theme.
- `src/engine/client.js`, `worker.js`: asynchronous engine boundary. Heavy inference stays off the interface thread.
- `src/engine/action-value.js`, `encoding.js`: the supplied model’s tensor and token contract. These are the model-specific parts.

The interface uses **UCI move notation**, not a native UCI subprocess. Another model with this artifact contract can use the same adapter; an arbitrary ONNX model needs an adapter for its inputs, outputs, and encoding. A browser-compatible UCI engine could implement the same `load`/`choose` boundary separately. The training repository is not imported, copied, or required.

## Model and loading

The included float32 model has 3,961,664 parameters, shared-board architecture version 3, and comes from epoch 15. Its manifest records the tensor contract, source-checkpoint identity, and file hashes. Model SHA-256:

```text
7a937a0f7cf2e0e762abaf82a1dbb983bee8f3ada2a6bf704f97844f2cbeb536
```

The page does not download the model or WASM until **Let’s play** or **Resume game**. The first game fetches a 16.25 MB model and a 14.24 MB WASM runtime plus small support files (uncompressed sizes). HTTP caching lets later visits reuse versioned assets, subject to the browser’s cache. There is no offline service worker and no promise that an evicted cache stays available offline.

One WASM thread runs in a dedicated Web Worker; no WebGPU or cross-origin isolation is needed. Scores are evaluated in batches of at most 32 legal moves to bound temporary memory. The session is reused between games. Results are from the side-to-move perspective and are not centipawns or a demonstrated Elo rating. Exact score ties select the first supplied legal move; chess.js ordering can differ from another chess library.

Use HTTPS in production (localhost works for development). A modern browser with WebAssembly SIMD, module Workers, and Web Crypto is required. Device speed and memory affect loading and play. Only Chromium was exercised for this initial release; resized desktop viewports are not physical iOS/Safari testing.

For new weights, add a **new versioned model directory**, update the path and SHA in `src/config.js`, and rerun parity checks against that export. Never overwrite an existing immutable asset path with different bytes. When updating ONNX Runtime, also change its versioned runtime path and bundled upstream notices.

## Source and licenses

The complete playable application is **GPL-3.0-or-later**; see [LICENSE](LICENSE). Its deployed footer links to the source revision used to build it. Chessground supplies the board mechanics and Cburnett pieces; this app supplies its own controls, colors, and sounds. It is not the complete Lichess website.

The bundled ONNX weights, manifest, and encoding data are separately supplied under **CC BY 4.0**, attributed to Alex Ashworth. These downloadable files are public. The separate training source, datasets, and original checkpoint are not part of this repository. See [credits and dependency licenses](THIRD_PARTY_NOTICES.md).
