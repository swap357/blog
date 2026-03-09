# autoscaler.sh

A zero-build, pure static site for humans and AI agents.

## Scope
- `index.html` landing portal
- `about/` identity and context
- `projects/` project gallery + per-project interactive pages
- `writing/` post index + individual post pages

## Agent-aware data layer
- Every major page has a JSON twin next to the HTML:
  - `/index.json`
  - `/about/index.json`
  - `/projects/index.json`
  - `/writing/index.json`
- Machine-discovery:
  - `/llms.txt`
  - `/.well-known/agent-manifest.json`
  - `/site-map.json`

## Design
Each page can keep a distinct visual identity while sharing only a small navigation and typography base.
No build step, no templates, no client framework.

## Run locally
Open `index.html` directly in a browser, or serve this directory with any static server:

```bash
python -m http.server
```

## Deploy
GitHub Pages workflow is in `.github/workflows/deploy.yml` and deploys the repository files directly.
