const { buildAnalytics } = require("./analytics");
const { SpotifyClient } = require("./client");

function createSpotifyClientFromEnv() {
  return new SpotifyClient({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
  });
}

async function pullTopItems(client, timeRanges) {
  const topArtists = {};
  const topTracks = {};

  for (const timeRange of timeRanges) {
    topArtists[timeRange] = await client.getTopArtists(timeRange);
    topTracks[timeRange] = await client.getTopTracks(timeRange);
  }

  return { topArtists, topTracks };
}

async function pullPlaylistTracks(client, playlists) {
  const playlistTracks = {};

  for (const playlist of playlists) {
    playlistTracks[playlist.id] = await client.getPlaylistTracks(playlist.id);
  }

  return playlistTracks;
}

async function pullSpotifySnapshot(client) {
  await client.refreshAccessToken();

  const profile = await client.getProfile();
  const { topArtists, topTracks } = await pullTopItems(client, [
    "short_term",
    "medium_term",
    "long_term"
  ]);
  const recentlyPlayed = await client.getRecentlyPlayed(50);
  const savedTracks = await client.getSavedTracks();
  const savedAlbums = await client.getSavedAlbums();
  const playlists = await client.getPlaylists();
  const playlistTracks = await pullPlaylistTracks(client, playlists);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    profile,
    topArtists,
    topTracks,
    recentlyPlayed,
    savedTracks,
    savedAlbums,
    playlists,
    playlistTracks
  };

  return {
    snapshot,
    analytics: buildAnalytics(snapshot)
  };
}

module.exports = {
  createSpotifyClientFromEnv,
  pullSpotifySnapshot
};
