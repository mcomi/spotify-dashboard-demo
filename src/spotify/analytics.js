function compactTrack(track) {
  return {
    id: track.id,
    name: track.name,
    popularity: track.popularity,
    explicit: track.explicit,
    album: track.album ? track.album.name : null,
    releaseDate: track.album ? track.album.release_date : null,
    artists: (track.artists || []).map((artist) => artist.name)
  };
}

function countBy(items, getKeys) {
  const counts = {};

  for (const item of items) {
    const keys = getKeys(item).filter(Boolean);

    for (const key of keys) {
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  return Object.keys(counts)
    .map((name) => ({ name, count: counts[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function getReleaseYear(track) {
  const releaseDate = track && track.album ? track.album.release_date : null;
  return releaseDate ? releaseDate.slice(0, 4) : null;
}

function summarizePlaylist(playlist, tracks) {
  const playableTracks = tracks
    .map((item) => item.track)
    .filter((track) => track && track.type === "track");

  const artistNames = countBy(playableTracks, (track) =>
    (track.artists || []).map((artist) => artist.name)
  );
  const releaseYears = countBy(playableTracks, (track) => [getReleaseYear(track)]);
  const explicitTracks = playableTracks.filter((track) => track.explicit).length;
  const popularityValues = playableTracks
    .map((track) => track.popularity)
    .filter((value) => typeof value === "number");

  const averagePopularity =
    popularityValues.length > 0
      ? Math.round(
          popularityValues.reduce((sum, value) => sum + value, 0) /
            popularityValues.length
        )
      : null;

  return {
    id: playlist.id,
    name: playlist.name,
    owner: playlist.owner ? playlist.owner.display_name : null,
    public: playlist.public,
    totalTracks: playableTracks.length,
    explicitTracks,
    averagePopularity,
    topArtists: artistNames.slice(0, 10),
    releaseYears: releaseYears.slice(0, 20)
  };
}

function buildAnalytics(snapshot) {
  const savedTracks = snapshot.savedTracks.map((item) => item.track).filter(Boolean);
  const savedAlbums = snapshot.savedAlbums.map((item) => item.album).filter(Boolean);
  const recentlyPlayedTracks = (snapshot.recentlyPlayed.items || [])
    .map((item) => item.track)
    .filter(Boolean);
  const topArtists = snapshot.topArtists.medium_term || [];
  const topTracks = snapshot.topTracks.medium_term || [];

  return {
    generatedAt: snapshot.generatedAt,
    profile: {
      id: snapshot.profile.id,
      displayName: snapshot.profile.display_name,
      country: snapshot.profile.country,
      product: snapshot.profile.product
    },
    library: {
      savedTracks: savedTracks.length,
      savedAlbums: savedAlbums.length,
      topSavedTrackArtists: countBy(savedTracks, (track) =>
        (track.artists || []).map((artist) => artist.name)
      ).slice(0, 20),
      savedTrackReleaseYears: countBy(savedTracks, (track) => [
        getReleaseYear(track)
      ]).slice(0, 30)
    },
    topItems: {
      artists: topArtists.slice(0, 20).map((artist) => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        popularity: artist.popularity,
        followers: artist.followers ? artist.followers.total : null
      })),
      tracks: topTracks.slice(0, 20).map(compactTrack),
      genres: countBy(topArtists, (artist) => artist.genres || []).slice(0, 20)
    },
    recentlyPlayed: {
      totalItems: recentlyPlayedTracks.length,
      repeatedTracks: countBy(recentlyPlayedTracks, (track) => [track.name]).filter(
        (item) => item.count > 1
      ),
      topArtists: countBy(recentlyPlayedTracks, (track) =>
        (track.artists || []).map((artist) => artist.name)
      ).slice(0, 20)
    },
    playlists: snapshot.playlists.map((playlist) =>
      summarizePlaylist(playlist, snapshot.playlistTracks[playlist.id] || [])
    )
  };
}

module.exports = {
  buildAnalytics,
  compactTrack,
  countBy,
  summarizePlaylist
};
