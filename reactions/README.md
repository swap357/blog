# Anonymous reactions

One anonymous “Useful” reaction per article and browser, with undo. The service
uses a Cloudflare Worker and D1 (SQLite). It has no runtime npm dependencies.
Wrangler is pinned as a development and deployment tool. The Worker and
`themes/quiet/assets/js/useful.js` are covered by the [MIT license](LICENSE).
This license does not cover the blog's prose.

## Local development

With Node 24 or newer, from this directory:

```sh
npm ci
npm test
npx wrangler d1 migrations apply autoscaler-reactions --local
npm run dev
```

In the repository root, create the ignored `hugo.preview.toml`:

```toml
[params.reactions]
endpoint = 'http://127.0.0.1:8787/api/useful'
```

Then run `hugo server --config hugo.toml,hugo.preview.toml --disableLiveReload`.
The local API accepts the local Hugo origins and uses a separate local database.
New positive reactions check that the corresponding article exists on the
production blog. Undo does not require the article to remain published.

## Deployment

Authorize Wrangler with the account that manages `autoscaler.sh`, then:

```sh
npx wrangler d1 create autoscaler-reactions
```

Put the returned database ID in `wrangler.toml` before continuing. The all-zero
ID is a local-development placeholder and must not be deployed.

```sh
npx wrangler d1 migrations apply autoscaler-reactions --remote
npm run deploy
```

The route covers only `autoscaler.sh/api/useful*`; GitHub Pages still serves the
blog. Publish the backend before enabling `params.reactions.endpoint` in Hugo.
Remove that setting to hide the button. Set `reactions: false` in an article's
front matter to disable just that article. Backend changes use `npm run deploy`;
the Pages workflow runs backend tests but deploys only the static blog.

## Behavior and limits

- Counts are stored on the server and shared by all readers.
- A random key is generated on the first click, stored locally per article,
  and sent in a request header. The database stores only article paths and keys.
- Repeating a request does not add another vote. Undo removes only that key's vote.
- The frontend updates only after a successful server response; failed requests
  can be retried safely. With JavaScript disabled the control is hidden.
- Cloudflare rate-limits reads to 120 and writes to 20 per minute per connecting
  IP at each edge location. Shared networks can hit that limit; a 429 response
  asks the reader to wait. The application does not save IPs in D1. Cloudflare
  still processes requests and connection metadata as the hosting provider.
- Clearing browser storage, using another browser, or deliberately changing keys
  can permit another vote. Counts are informal feedback, not unique-person totals.
- If browser storage is unavailable, the key lasts only for that page visit.

There are no accounts, cookies, analytics events, or paid-plan changes in the
counter code. Hosting has its own quotas; this service does not configure billing.

## Verification

`npm test` uses Node's test runner and an actual in-memory SQLite database. It
checks duplicate writes, shared counts, undo, article isolation, rejected inputs,
CORS, missing articles, rate-limit responses, and upstream failures.

Run `tests/check_useful.js` from the repository root through the existing
Playwright tool against the local preview and API. It tests separate readers,
reload persistence, undo, failure recovery, and narrow screens, then removes its
own local test reactions. It refuses to run against a production endpoint.
