const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const {
  createSessionValue,
  isValidAccessToken,
  isValidSessionValue
} = require("../src/auth");
const { buildAnalytics } = require("../src/spotify/analytics");
const { SPOTIFY_SCOPES } = require("../src/spotify/scopes");
const {
  getLatestSnapshot,
  getStorageMode,
  saveSnapshot
} = require("../src/storage/snapshot-store");
const {
  API_BASE_URL,
  SpotifyClient,
  createAuthorizationUrl
} = require("../src/spotify/client");

async function testAuthorizationUrl() {
  const url = new URL(
    createAuthorizationUrl({
      clientId: "client-id",
      redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
      scopes: SPOTIFY_SCOPES,
      state: "state-123",
      showDialog: true
    })
  );

  assert.strictEqual(url.origin, "https://accounts.spotify.com");
  assert.strictEqual(url.searchParams.get("response_type"), "code");
  assert.strictEqual(url.searchParams.get("client_id"), "client-id");
  assert.strictEqual(
    url.searchParams.get("redirect_uri"),
    "http://127.0.0.1:3000/api/spotify/callback"
  );
  assert.strictEqual(url.searchParams.get("state"), "state-123");
  assert.strictEqual(url.searchParams.get("show_dialog"), "true");

  const scope = url.searchParams.get("scope");
  for (const expectedScope of SPOTIFY_SCOPES) {
    assert(scope.includes(expectedScope), `Expected scope ${expectedScope}`);
  }
}

async function testTokenExchange() {
  let tokenRequest;
  const client = new SpotifyClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
    request: async (request) => {
      tokenRequest = request;
      return {
        status: 200,
        headers: {},
        body: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600
        }
      };
    }
  });

  const tokens = await client.exchangeCodeForTokens("code-123");

  assert.strictEqual(tokens.refresh_token, "refresh-token");
  assert.strictEqual(tokenRequest.method, "POST");
  assert(tokenRequest.headers.Authorization.startsWith("Basic "));
  assert(tokenRequest.body.includes("grant_type=authorization_code"));
  assert(tokenRequest.body.includes("code=code-123"));
}

async function testTokenExchangeFallsBackToBodyCredentials() {
  const tokenRequests = [];
  const client = new SpotifyClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
    request: async (request) => {
      tokenRequests.push(request);

      if (request.headers.Authorization) {
        return {
          status: 400,
          headers: {},
          body: {
            error: "invalid_client",
            error_description: "Invalid client"
          }
        };
      }

      return {
        status: 200,
        headers: {},
        body: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600
        }
      };
    }
  });

  const tokens = await client.exchangeCodeForTokens("code-123");

  assert.strictEqual(tokens.refresh_token, "refresh-token");
  assert.strictEqual(tokenRequests.length, 2);
  assert(tokenRequests[0].headers.Authorization.startsWith("Basic "));
  assert(!tokenRequests[1].headers.Authorization);
  assert(tokenRequests[1].body.includes("client_id=client-id"));
  assert(tokenRequests[1].body.includes("client_secret=client-secret"));
}

async function testRefreshAndPagination() {
  const calls = [];
  const client = new SpotifyClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
    refreshToken: "refresh-token",
    request: async (request) => {
      calls.push(request.url);

      if (request.url.includes("accounts.spotify.com")) {
        return {
          status: 200,
          headers: {},
          body: {
            access_token: "fresh-token",
            expires_in: 3600
          }
        };
      }

      if (request.url.includes("page=2")) {
        return {
          status: 200,
          headers: {},
          body: {
            items: [{ id: "second" }],
            next: null
          }
        };
      }

      return {
        status: 200,
        headers: {},
        body: {
          items: [{ id: "first" }],
          next: `${API_BASE_URL}/me/tracks?limit=50&page=2`
        }
      };
    }
  });

  const items = await client.getSavedTracks();

  assert.deepStrictEqual(items, [{ id: "first" }, { id: "second" }]);
  assert(calls.some((url) => url.includes("accounts.spotify.com")));
  assert(calls.some((url) => url.includes("/me/tracks")));
  assert(calls.some((url) => url.includes("page=2")));
}

async function testUnauthorizedRetryRefreshesToken() {
  let apiCalls = 0;
  let tokenCalls = 0;
  const client = new SpotifyClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
    refreshToken: "refresh-token",
    accessToken: "expired-token",
    request: async (request) => {
      if (request.url.includes("accounts.spotify.com")) {
        tokenCalls += 1;
        return {
          status: 200,
          headers: {},
          body: {
            access_token: `fresh-token-${tokenCalls}`,
            expires_in: 3600
          }
        };
      }

      apiCalls += 1;

      if (apiCalls === 1) {
        return {
          status: 401,
          headers: {},
          body: {
            error: {
              message: "The access token expired"
            }
          }
        };
      }

      return {
        status: 200,
        headers: {},
        body: {
          id: "profile"
        }
      };
    }
  });
  client.accessTokenExpiresAt = Date.now() + 60000;

  const profile = await client.getProfile();

  assert.strictEqual(profile.id, "profile");
  assert.strictEqual(apiCalls, 2);
  assert.strictEqual(tokenCalls, 1);
}

async function testRateLimitRetry() {
  let apiCalls = 0;
  const client = new SpotifyClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
    refreshToken: "refresh-token",
    accessToken: "token",
    request: async () => {
      apiCalls += 1;

      if (apiCalls === 1) {
        return {
          status: 429,
          headers: {
            "retry-after": "0"
          },
          body: {}
        };
      }

      return {
        status: 200,
        headers: {},
        body: {
          id: "profile"
        }
      };
    }
  });
  client.accessTokenExpiresAt = Date.now() + 60000;

  const profile = await client.getProfile();

  assert.strictEqual(profile.id, "profile");
  assert.strictEqual(apiCalls, 2);
}

async function testAnalytics() {
  const track = {
    id: "track-1",
    name: "Song",
    type: "track",
    popularity: 80,
    explicit: true,
    album: {
      name: "Album",
      release_date: "2020-01-01"
    },
    artists: [{ name: "Artist" }]
  };
  const snapshot = {
    generatedAt: "2026-05-16T00:00:00.000Z",
    profile: {
      id: "user",
      display_name: "Demo User",
      country: "US",
      product: "premium"
    },
    topArtists: {
      medium_term: [
        {
          id: "artist-1",
          name: "Artist",
          genres: ["pop"],
          popularity: 90,
          followers: { total: 1000 }
        }
      ]
    },
    topTracks: {
      medium_term: [track]
    },
    recentlyPlayed: {
      items: [{ track }, { track }]
    },
    savedTracks: [{ track }],
    savedAlbums: [{ album: { id: "album-1" } }],
    playlists: [
      {
        id: "playlist-1",
        name: "Playlist",
        public: false,
        owner: { display_name: "Demo User" }
      }
    ],
    playlistTracks: {
      "playlist-1": [{ track }]
    }
  };

  const analytics = buildAnalytics(snapshot);

  assert.strictEqual(analytics.profile.displayName, "Demo User");
  assert.strictEqual(analytics.library.savedTracks, 1);
  assert.strictEqual(analytics.topItems.genres[0].name, "pop");
  assert.strictEqual(analytics.recentlyPlayed.repeatedTracks[0].count, 2);
  assert.strictEqual(analytics.playlists[0].explicitTracks, 1);
}

async function testPrivateAuth() {
  const originalToken = process.env.DASHBOARD_ACCESS_TOKEN;
  process.env.DASHBOARD_ACCESS_TOKEN = "private-token";

  const session = createSessionValue();

  assert.strictEqual(isValidAccessToken("private-token"), true);
  assert.strictEqual(isValidAccessToken("wrong-token"), false);
  assert.strictEqual(isValidSessionValue(session), true);
  assert.strictEqual(isValidSessionValue("bad-session"), false);

  if (originalToken === undefined) {
    delete process.env.DASHBOARD_ACCESS_TOKEN;
  } else {
    process.env.DASHBOARD_ACCESS_TOKEN = originalToken;
  }
}

async function testLocalSnapshotStore() {
  const originalCwd = process.cwd();
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotify-dashboard-"));

  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.chdir(tempDir);

  const envelope = {
    snapshot: {
      generatedAt: "2026-05-18T12:00:00.000Z"
    },
    analytics: {
      profile: {
        id: "demo"
      }
    }
  };

  const saved = await saveSnapshot(envelope);
  const latest = await getLatestSnapshot();

  assert.strictEqual(getStorageMode(), "local-file");
  assert(saved.latestKey.endsWith("data/spotify-snapshot.json"));
  assert.deepStrictEqual(latest, envelope);

  process.chdir(originalCwd);

  if (originalRedisUrl === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL;
  } else {
    process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
  }

  if (originalRedisToken === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
  }
}

async function run() {
  const tests = [
    testAuthorizationUrl,
    testTokenExchange,
    testTokenExchangeFallsBackToBodyCredentials,
    testRefreshAndPagination,
    testUnauthorizedRetryRefreshesToken,
    testRateLimitRetry,
    testAnalytics,
    testPrivateAuth,
    testLocalSnapshotStore
  ];

  for (const test of tests) {
    await test();
    console.log(`ok - ${test.name}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
