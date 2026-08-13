## Demo site deploy

This repo's `www/` is the demo site behind **https://material.viewflow.io/docs/**. Nothing in this
repo deploys it — the site lives in `../viewflow-pro/material/` (landing page in `public/`, demos
staged into the git-ignored `public/docs/`), and nginx there serves `public/` off disk.

Run it from `viewflow-pro/`:

```sh
make deploy-material-content   # content only — what a library change needs
make deploy-material           # same, plus the nginx/certbot vhost tasks
```

Both first run `material/scripts/build-docs.sh`, which does `npm run build` here, rsyncs `www/` into
`public/docs/`, rewrites the `/build/ /static/ /demos/ /showcases/` prefixes to `/docs/…` (the pages
are written for a web root), refreshes `public/vendor/` from `cdn/material.min.js` +
`css/theme.css` + `css/material.css`, and re-stamps the landing page's `?v=` fingerprints.

Two things bite:

- `scripts/check-claims.mjs` fails the build when the landing page's counts drift. **Adding a demo
  page here** (`src/demos/*.html`) means updating the demo-page count in `viewflow-pro/material/`
  — `public/index.html` and `PRODUCT.md`, three places.
- `build-docs.sh` copies only `theme.css` and `material.css` into `public/vendor/`. New published
  stylesheets (`tokens.css`, `tailwind.css`) are not staged; add them there if the landing page
  ever needs them.

## Agent skills

### Issue tracker

Issues live on the private `kmmbvnr/viewflow-pro` repo (not this repo's own GitHub Issues) — always pass `--repo kmmbvnr/viewflow-pro` to `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
