# Project guidance

This is a public, GPL-3.0-or-later static chess demo. Keep it independently buildable with `npm ci && npm run check` on Node.js 24 or newer. Do not import the private Blujay training repository or bot service, copy credentials, or add server inference without discussing the architecture change.

Branding and model selection belong in `src/config.js`; tensor encoding belongs in `src/engine/`. Game and UI logic should depend on FEN, legal UCI moves, and the asynchronous engine interface. Preserve full legal-move coverage, side-to-move scores, and stale-reply protection.

Model weights and encoding in `public/models/` are intentionally public and separately licensed CC BY 4.0. Preserve hash identities and versioned immutable asset paths. Do not replace weights, publish additional artifacts, or change model licensing without authorization.

Run `npm test` for game/controller changes and `npm run build` for shipped changes. For runtime/adapter changes, also run actual browser inference against the corresponding export reference fixtures. Use a real browser for board interaction and responsive layout checks; a build alone does not verify WASM execution. See VERIFICATION.md for existing evidence and its limitations.

Keep deployments static: no Worker server entrypoint, API secrets, Durable Objects, KV bindings, or `run_worker_first`. `npm run deploy` publishes; builds and dry-runs do not. Preserve the visible GPL source link and dependency notices when changing assets or dependencies.
