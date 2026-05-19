# Spotify Analytics Dashboard

Private Spotify analytics dashboard built with Next.js, Vercel, and Upstash Redis. It connects to one personal Spotify account, refreshes listening/library/playlist data server-side, stores snapshots, and renders a modern dark dashboard.

## Local Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

4. Create or reuse a Spotify app at <https://developer.spotify.com/dashboard>.
5. Add these Redirect URIs in Spotify:

   ```text
   http://127.0.0.1:3000/api/spotify/callback
   https://TU-DOMINIO.vercel.app/api/spotify/callback
   ```

6. Fill these local variables:

   ```text
   SPOTIFY_CLIENT_ID
   SPOTIFY_CLIENT_SECRET
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
   DASHBOARD_ACCESS_TOKEN
   CRON_SECRET
   ```

7. Generate a Spotify refresh token:

   ```bash
   npm run spotify:auth
   ```

8. Add the printed `SPOTIFY_REFRESH_TOKEN` to `.env.local`.

9. Run locally:

   ```bash
   npm run dev
   ```

10. Open <http://127.0.0.1:3000>, log in with `DASHBOARD_ACCESS_TOKEN`, and click Refresh.

Local development can work without Upstash. If Redis is not configured, snapshots are stored at `data/spotify-snapshot.json`, which is ignored by git.

## Vercel Deployment

1. Push this folder to a GitHub repository.
2. In Vercel, import the GitHub repo as a Next.js project.
3. Add Upstash Redis from Vercel Marketplace.
4. Confirm these variables exist in Vercel:

   ```text
   SPOTIFY_CLIENT_ID
   SPOTIFY_CLIENT_SECRET
   SPOTIFY_REFRESH_TOKEN
   SPOTIFY_REDIRECT_URI=https://TU-DOMINIO.vercel.app/api/spotify/callback
   DASHBOARD_ACCESS_TOKEN
   CRON_SECRET
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   OPENAI_API_KEY
   OPENAI_MODEL=gpt-4.1-mini
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2:3b
   ```

5. Deploy from `main`.

Pushes to `main` deploy production. Pull requests create preview deployments.

## Data And APIs

- `GET /api/spotify/snapshot` returns the current snapshot and analytics.
- `POST /api/spotify/refresh` refreshes Spotify data and saves a snapshot.
- `GET /api/spotify/status` checks configuration without exposing secrets.
- `GET /api/spotify/callback` exchanges a Spotify auth code for a refresh token.
- `/api/cron/refresh-spotify` refreshes Spotify from Vercel Cron or GitHub Actions when called with `CRON_SECRET`.

The dashboard avoids Spotify endpoints restricted for newer apps, including Audio Features, Audio Analysis, Recommendations, and Related Artists.

## AI Listening Brief

The dashboard includes an AI Listening Brief card. It can summarize patterns, surprises, recommendations, and playlist ideas from the current Spotify snapshot.

- With `OPENAI_API_KEY`, the app calls OpenAI server-side.
- With `OLLAMA_BASE_URL` or `OLLAMA_MODEL`, the app can call a local Ollama model.
- Without either provider, the app uses a deterministic local fallback so the feature still works in demos.
- The brief is saved back into the current snapshot in Upstash Redis or the local `data/spotify-snapshot.json` fallback.

To use Ollama locally:

```bash
brew install ollama
ollama pull llama3.2:3b
ollama serve
```

Then set:

```env
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

Provider order is OpenAI, then Ollama, then deterministic fallback. Set `AI_FALLBACK_ON_ERROR=false` if you want provider errors to surface instead of falling back.

## Automation

`vercel.json` configures a daily Vercel Cron refresh at 08:00 UTC.

If Vercel Cron is unavailable, use the included GitHub Actions workflow. Add these GitHub repository secrets:

```text
SPOTIFY_REFRESH_URL=https://TU-DOMINIO.vercel.app/api/cron/refresh-spotify
CRON_SECRET
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run spotify:auth
npm run spotify:pull
npm test
```

## Security Notes

- Never commit `.env`, `.env.local`, refresh tokens, client secrets, or snapshot data.
- `DASHBOARD_ACCESS_TOKEN` protects the UI and private APIs.
- `CRON_SECRET` protects scheduled refreshes.
- Rotate Spotify client secrets if they were shared outside your machine.
