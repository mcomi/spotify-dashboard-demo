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

function getNumberOption(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function getLimitedItems(client, path, params, maxItems) {
  const items = [];
  let offset = 0;
  const pageLimit = Math.min(Number(params.limit || 50), maxItems);

  while (items.length < maxItems) {
    const urlParams = new URLSearchParams(
      Object.assign({}, params, {
        limit: String(Math.min(pageLimit, maxItems - items.length)),
        offset: String(offset)
      })
    );
    const page = await client.api(`${path}?${urlParams.toString()}`);
    const pageItems = page.items || [];

    items.push.apply(items, pageItems);

    if (!page.next || pageItems.length === 0) {
      break;
    }

    offset += pageItems.length;
  }

  return items;
}

async function pullTopItems(client, timeRanges, onProgress) {
  const topArtists = {};
  const topTracks = {};

  for (const timeRange of timeRanges) {
    if (onProgress) {
      onProgress(`Pulling top artists: ${timeRange}`);
    }

    topArtists[timeRange] = await client.getTopArtists(timeRange);

    if (onProgress) {
      onProgress(`Pulling top tracks: ${timeRange}`);
    }

    topTracks[timeRange] = await client.getTopTracks(timeRange);
  }

  return { topArtists, topTracks };
}

async function pullPlaylistTracks(client, playlists, options) {
  const playlistTracks = {};
  const playlistTrackLimit = options.playlistTrackLimit;
  const playlistDetailLimit = options.playlistDetailLimit;
  const selectedPlaylists = playlists.slice(0, playlistDetailLimit);

  for (const playlist of selectedPlaylists) {
    if (options.onProgress) {
      options.onProgress(`Pulling playlist: ${playlist.name}`);
    }

    playlistTracks[playlist.id] = await getLimitedItems(
      client,
      `/playlists/${encodeURIComponent(playlist.id)}/tracks`,
      { limit: "100" },
      playlistTrackLimit
    );
  }

  return playlistTracks;
}

async function pullSpotifySnapshot(client, options) {
  const pullOptions = Object.assign(
    {
      savedTrackLimit: getNumberOption("SPOTIFY_SAVED_TRACK_LIMIT", 200),
      savedAlbumLimit: getNumberOption("SPOTIFY_SAVED_ALBUM_LIMIT", 100),
      playlistLimit: getNumberOption("SPOTIFY_PLAYLIST_LIMIT", 20),
      playlistDetailLimit: getNumberOption("SPOTIFY_PLAYLIST_DETAIL_LIMIT", 8),
      playlistTrackLimit: getNumberOption("SPOTIFY_PLAYLIST_TRACK_LIMIT", 100),
      onProgress: null
    },
    options || {}
  );

  if (pullOptions.onProgress) {
    pullOptions.onProgress("Refreshing access token");
  }

  await client.refreshAccessToken();

  if (pullOptions.onProgress) {
    pullOptions.onProgress("Pulling profile");
  }

  const profile = await client.getProfile();

  if (pullOptions.onProgress) {
    pullOptions.onProgress("Pulling top artists and tracks");
  }

  const { topArtists, topTracks } = await pullTopItems(
    client,
    ["short_term", "medium_term", "long_term"],
    pullOptions.onProgress
  );

  if (pullOptions.onProgress) {
    pullOptions.onProgress("Pulling recently played tracks");
  }

  const recentlyPlayed = await client.getRecentlyPlayed(50);

  if (pullOptions.onProgress) {
    pullOptions.onProgress(`Pulling saved tracks (${pullOptions.savedTrackLimit})`);
  }

  const savedTracks = await getLimitedItems(
    client,
    "/me/tracks",
    { limit: "50" },
    pullOptions.savedTrackLimit
  );

  if (pullOptions.onProgress) {
    pullOptions.onProgress(`Pulling saved albums (${pullOptions.savedAlbumLimit})`);
  }

  const savedAlbums = await getLimitedItems(
    client,
    "/me/albums",
    { limit: "50" },
    pullOptions.savedAlbumLimit
  );

  if (pullOptions.onProgress) {
    pullOptions.onProgress(`Pulling playlists (${pullOptions.playlistLimit})`);
  }

  const playlists = await getLimitedItems(
    client,
    "/me/playlists",
    { limit: "50" },
    pullOptions.playlistLimit
  );
  const playlistTracks = await pullPlaylistTracks(client, playlists, pullOptions);

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
    analytics: buildAnalytics(snapshot),
    limits: {
      savedTrackLimit: pullOptions.savedTrackLimit,
      savedAlbumLimit: pullOptions.savedAlbumLimit,
      playlistLimit: pullOptions.playlistLimit,
      playlistDetailLimit: pullOptions.playlistDetailLimit,
      playlistTrackLimit: pullOptions.playlistTrackLimit
    }
  };
}

module.exports = {
  createSpotifyClientFromEnv,
  getLimitedItems,
  pullSpotifySnapshot
};
