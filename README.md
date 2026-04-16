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
| `VITE_API_BASE_URL` | Web | All API calls | Base URL of the API (no trailing slash) |
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
