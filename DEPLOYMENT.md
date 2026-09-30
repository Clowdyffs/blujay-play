# Deploy the static demo

The repository is ready for deployment. Creating/pushing this repository does not publish a live website or change the portfolio’s DNS.

## Cloudflare Workers with GitHub

In Cloudflare **Workers & Pages**, create a Worker from the `Clowdyffs/blujay-play` GitHub repository. Use these settings:

| Setting | Value |
| --- | --- |
| Worker name | `blujay-play` |
| Production branch | `main` |
| Root directory | repository root (`/`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `24` (the committed `.node-version`; `NODE_VERSION=24` also works) |
| Application secrets/bindings | none |

Cloudflare installs dependencies from `package-lock.json`. The checked-in `wrangler.jsonc` points to `dist/`; there is no server entrypoint. Use the normal Cloudflare-managed deployment authentication supplied by its Git integration. Do not copy Lichess or bot admin tokens into this project.

Cloudflare documents these [build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [Node version overrides](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/). The included GitHub Actions workflow checks tests/builds independently and has no deployment credentials.

After the first successful deployment, open the generated `workers.dev` URL. Confirm the page loads, start a game, make a move, reload, and resume. In developer tools, model/runtime downloads should begin only after starting or resuming, and moves should produce no network inference calls.

## Cost and files

This uses Workers Static Assets only. Cloudflare currently makes [static asset requests free and unlimited, with no additional storage charge](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/). No `run_worker_first`, SSR, inference Worker, Durable Object, database, or KV binding is configured. The browser does the computation.

Every asset is below the [25 MiB per-file limit](https://developers.cloudflare.com/workers/platform/limits/) and the build checks that limit plus the Free plan’s file-count limit. The model is checked into Git normally, so no Git LFS bandwidth or private artifact hosting is needed. Cloudflare build quotas and the existing domain’s registration costs are separate from serving the static demo. Cloudflare’s current terms and limits still apply.

The `_headers` file supplies a restrictive same-origin content security policy, permits WASM execution, and caches versioned model/runtime/built assets for a year. HTML stays revalidatable. Keep model/runtime paths versioned when changing their contents.

## Portfolio integration

A dedicated subdomain such as **blujay.clowdy.dev** keeps deployment independent of the portfolio. After verifying the default URL, add the chosen custom domain in the Worker’s **Settings → Domains & Routes**. Cloudflare manages the domain route and certificate. This step must be performed in the account that manages the domain.

The portfolio can link to it:

```html
<a href="https://blujay.clowdy.dev">Play Blujay</a>
```

Or embed it once that URL is live:

```html
<iframe
  src="https://blujay.clowdy.dev"
  title="Play chess against Blujay"
  loading="lazy"
  style="width:100%; height:760px; border:0; border-radius:12px"
></iframe>
```

The layout sizes itself to whatever box it is given, so any height works; wide frames place the move panel beside the board, narrow ones stack it below. The demo permits framing by `https://clowdy.dev` and `https://www.clowdy.dev`, with the earlier `clowdydev.com` origins retained for compatibility. If the portfolio sets its own `frame-src` CSP, allow the demo’s origin there too. A direct link gives the board more room on a phone. Storage may be partitioned when embedded, so a game saved in the iframe might not appear when opening the subdomain directly. There is no cross-site tracking or shared account state.

Neither the portfolio repository nor DNS is changed by the setup in this repository.

## Deploy from a local checkout instead

```sh
npm ci
npm run check
npx wrangler deploy --dry-run
npx wrangler login
npm run deploy
```

Only the last command publishes. Run it from this repository, not the private bot service. Future connected `main` pushes will deploy automatically if Git integration is enabled.

## Other static hosts

Serve the contents of `dist/` over HTTPS, with `.mjs` as JavaScript and `.wasm` as `application/wasm`. Preserve the headers from `public/_headers` using the host’s configuration. The app has relative asset URLs and no server API; it does not require a special single-page-app fallback. Cloudflare Pages can also use build command `npm run build` and output directory `dist`.
