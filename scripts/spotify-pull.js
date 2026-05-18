#!/usr/bin/env node

const { loadDotEnv, requireEnv } = require("../src/config");
const { saveSnapshot } = require("../src/storage/snapshot-store");
const {
  createSpotifyClientFromEnv,
  pullSpotifySnapshot
} = require("../src/spotify/pull");

loadDotEnv(".env.local");
loadDotEnv();
requireEnv([
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "SPOTIFY_REFRESH_TOKEN"
]);

async function main() {
  console.log("Pulling Spotify snapshot...");
  const output = await pullSpotifySnapshot(createSpotifyClientFromEnv(), {
    onProgress: (message) => console.log(message)
  });
  const saved = await saveSnapshot(output);

  console.log(`\nWrote Spotify snapshot to ${saved.latestKey}`);
  console.log(
    `Profile: ${output.analytics.profile.displayName || output.analytics.profile.id}`
  );
  console.log(`Saved tracks: ${output.analytics.library.savedTracks}`);
  console.log(`Playlists: ${output.analytics.playlists.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
