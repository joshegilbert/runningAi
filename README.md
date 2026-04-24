# RunSync

Full-stack running app: log runs, sync Strava, daily AI-backed workout recommendations, and a training profile (availability, zones, race goal).

## Tech stack

- **Web:** Vue 3, Vite, Pinia, Vue Router, Tailwind CSS (`apps/web`)
- **API:** Express 5, Mongoose, JWT auth (`apps/api`)
- **Integrations:** Strava OAuth + activity sync; optional OpenAI-compatible LLM for recommendations

## Features

- Email/password auth and protected routes
- Manual workout logging and workout history
- Strava connect + incremental run sync (onboarding can cap imported runs)
- Daily recommendation with structured workout, targets, and fallback when the coach API is unavailable
- Training profile: timezone, availability, pace/HR zones, optional race goal

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **MongoDB** for local API development (tests use an in-memory MongoDB; no local DB required for `npm test`)

## Deploy on Vercel (full stack)

The repo is configured for **one Vercel project at the monorepo root**: `vercel.json` builds the Vue app to `apps/web/dist`, sends `/api` and `/api/*` to `api/index.mjs` (Express + Mongoose), and rewrites other paths to `index.html` for the SPA.

### Checklist

1. **MongoDB Atlas** (or any Mongo host): create a cluster and user, get **`MONGO_URI`**. In Atlas → Network Access, allow the IPs your host needs (Vercel serverless often uses `0.0.0.0/0` on free tiers with a strong password).
2. **Vercel project**  
   - [vercel.com/new](https://vercel.com/new): **Import** this GitHub repo.  
   - **Root Directory:** leave as **`.`** (repository root), not `apps/web`.  
   - Framework: none / other is fine; build is driven by `vercel.json`.  
   - If you had an older project only for `apps/web`, either delete it or ignore it; this layout expects **one** project linked at the repo root (`npx vercel link` from the repo root). Remove `apps/web/.vercel` if it causes the CLI to use the wrong root.
3. **Environment variables** (Vercel → Project → Settings → Environment Variables). Add for **Production** (and **Preview** if you use previews):

   | Variable | Notes |
   |----------|--------|
   | `MONGO_URI` | Required |
   | `JWT_SECRET` | Long random string |
   | `CLIENT_ORIGIN` | Your live site origin(s), e.g. `https://your-project.vercel.app` — no trailing slash. Comma-separated = multiple CORS origins; **Strava post-OAuth redirects use the first value only**, so put the URL users actually open in the browser first. |
   | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | From Strava API settings |
   | `STRAVA_REDIRECT_URI` | Must match Strava app exactly: `https://<your-deployment>.vercel.app/api/strava/callback` |
   | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Optional; for AI recommendations |
   | `VITE_API_BASE_URL` | **Optional** on Vercel — omit to use same origin (`window.location.origin`). |

4. **Strava application** ([developers.strava.com](https://www.strava.com/settings/api)): set **Authorization Callback Domain** / redirect URI to match **`STRAVA_REDIRECT_URI`** (same scheme, host, and path as production).
5. **Deploy**  
   - **Git:** push to `main`; Vercel builds automatically if the repo is connected.  
   - **CLI:** from repo root, `npx vercel` (preview) or `npx vercel --prod` after `vercel login` / `vercel link`.
6. **Smoke test:** open the production URL, register or log in, hit **GET** `https://<host>/api/health` (should return `{ "ok": true }`). Exercise Strava connect on production once redirects are correct.

**Limits:** The API function uses `maxDuration` in `vercel.json`; long LLM calls on Hobby may time out — shorten work or raise limits on a paid plan if needed.

## Quick start

```bash
git clone <repo-url> && cd runAi
npm install
```

### API

Create `apps/api/.env` (see table below). Then:

```bash
npm run dev:api
```

API defaults to `http://localhost:8080` (or `PORT`).

### Web

Create `apps/web/.env` with `VITE_API_BASE_URL` pointing at your API (e.g. `http://localhost:8080`). Then:

```bash
npm run dev:web
```

## Environment variables

| Variable | App | Required for | Description |
|----------|-----|--------------|-------------|
| `MONGO_URI` | API | Local dev | MongoDB connection string |
| `JWT_SECRET` | API | Auth | Secret for signing JWTs |
| `CLIENT_ORIGIN` | API | CORS | Frontend origin (e.g. `http://localhost:5173`) |
| `VITE_API_BASE_URL` | Web | Optional on Vercel | Base URL of the API (no trailing slash); omit on same-origin Vercel to use the page origin |
| `STRAVA_*` | API | Strava | Client id/secret, redirect URI for OAuth |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | API | Coach recommendations | OpenAI-compatible chat API |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:api` | Start API with nodemon |
| `npm run dev:web` | Start Vite dev server |
| `npm test` | Run API integration tests (same as `npm run test --workspace apps/api`) |

## Testing & CI

- **Local:** `npm test` from the repo root (uses in-memory MongoDB).
- **CI:** GitHub Actions runs API tests on push and pull requests ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). After the repo is on GitHub, add a status badge from the Actions tab if you want one in this README.

## Repo structure

```
apps/
  api/     Express API, Mongoose models, routes
  web/     Vue SPA
```

## License

See `apps/api/package.json` and `apps/web/package.json` (`license` field).
