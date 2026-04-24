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

Use the **repository root** as the Vercel project root (not `apps/web`). `vercel.json` builds the Vue app into `apps/web/dist`, routes `/api/*` to a single Express serverless function (`api/index.mjs`), and rewrites other paths to `index.html` for the SPA.

1. Link or import the repo, set **Root Directory** to `.` (repo root).
2. In the Vercel project **Environment variables**, add the same keys you use on the API (`MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, Strava, LLM, etc.). You can set **`CLIENT_ORIGIN`** to several comma-separated origins for CORS (e.g. production and a fixed preview URL). **Strava browser redirects** always use the **first** origin in that list, so put your primary public web URL first.
3. Optional: `VITE_API_BASE_URL` — if unset, the web app uses `window.location.origin` so API calls stay on the same deployment.
4. Set **`STRAVA_REDIRECT_URI`** to your deployed callback URL: `https://<project>.vercel.app/api/strava/callback` (see `GET /api/strava/callback` in `apps/api/src/routes/strava.routes.js`).
5. Deploy: `npx vercel` from the repo root, or connect Git and push.

**Note:** If you previously linked `apps/web` as its own Vercel project, use a single root-linked project for this layout, or remove the nested `.vercel` under `apps/web` to avoid confusion.

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
