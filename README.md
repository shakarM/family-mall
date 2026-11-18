# family-mall

Interactive 3D mall map (Lumen Square) built with React, Three.js, Tailwind and Vite.

**Live site:** https://shakarm.github.io/family-mall/

- `/` — combined version
- `/simple.html` — simple version
- `/pro.html` — pro version

## Run locally

```bash
npm install
npm run dev            # dev server
ENTRY=both npm run build   # builds dist/both/both.html (single self-contained file)
```

`ENTRY` can be `both`, `simple`, `pro` or `test`.

Pushing to `main` rebuilds and redeploys the site via GitHub Actions.
