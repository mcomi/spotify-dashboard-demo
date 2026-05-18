# Project Context

This project is a guided demo based on analytics dashboard ideas. The original direction was a YouTube tutorial, and the current implemented path starts with a personal Spotify analytics connection.

The dashboard connects to Spotify as a personal analytics app. It should be deployable to Vercel from GitHub, protected by a private token, and backed by Upstash Redis for snapshots in production. Local development can fall back to `data/spotify-snapshot.json`.

# User Context

The user is building this as a practical demo and wants help moving from setup into a working product. Keep the work incremental, explain important choices plainly, and favor implementation steps that make the next session easier.

Assume the user wants a collaborative build process: set up the basics, connect services when needed, create reusable skills or workflows where useful, and eventually add automations for recurring data pulls or reporting.

# Product Goal

Build an analytics dashboard that can:

- Connect to Spotify first, with YouTube still available as a later direction.
- Pull account-level information.
- Pull listening, library, and playlist data.
- Analyze top artists, tracks, genres, repeated listens, playlist composition, and library patterns.
- Display the information in a modern dark dashboard.
- Support repeatable refreshes through API routes, scripts, Vercel Cron, or GitHub Actions.
- Deploy through GitHub and Vercel.

# Working Principles

- Keep changes small, clear, and easy to inspect.
- Prefer simple, working foundations before adding extra architecture.
- Document setup decisions as they are made.
- Avoid hard-coding secrets, API keys, or personal credentials.
- Use environment variables or local config files for credentials when integrations are added.
- Favor reusable scripts and commands for data pulling, analysis, testing, and deployment.

# Likely Next Steps

1. Install dependencies with Node.js 20 or newer.
2. Run the Spotify OAuth helper and add a local refresh token to `.env.local`.
3. Run the Next.js app locally and refresh the dashboard.
4. Push to GitHub.
5. Import the repo into Vercel.
6. Add Upstash Redis from Vercel Marketplace.
7. Add production environment variables in Vercel.
8. Confirm scheduled refresh through Vercel Cron or GitHub Actions.

# Notes For Future Agents

- Read this file before starting new work.
- Check the current project files before assuming a framework or architecture.
- If a tutorial step is referenced, follow the tutorial direction unless it conflicts with security, maintainability, or the user's stated goal.
- When adding integrations, explain any account setup, API scopes, credentials, or quotas involved.
- For Spotify v1, avoid restricted newer-app endpoints such as Audio Features, Audio Analysis, Recommendations, and Related Artists.
- Keep the dashboard useful first, polished second.
