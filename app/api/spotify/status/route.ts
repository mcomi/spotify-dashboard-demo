const { jsonResponse } = require("../../../../src/http-responses");
const {
  isAuthorizedRequest,
  unauthorizedResponse
} = require("../../../../src/route-auth");
const {
  getLatestSnapshot,
  getSnapshotIndex,
  getStorageMode
} = require("../../../../src/storage/snapshot-store");

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  const latest = await getLatestSnapshot();
  const index = await getSnapshotIndex();

  return jsonResponse({
    configured: {
      spotifyClientId: Boolean(process.env.SPOTIFY_CLIENT_ID),
      spotifyClientSecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET),
      spotifyRefreshToken: Boolean(process.env.SPOTIFY_REFRESH_TOKEN),
      spotifyRedirectUri: Boolean(process.env.SPOTIFY_REDIRECT_URI),
      dashboardAccessToken: Boolean(process.env.DASHBOARD_ACCESS_TOKEN),
      cronSecret: Boolean(process.env.CRON_SECRET),
      upstashRedis: Boolean(
        process.env.UPSTASH_REDIS_REST_URL &&
          process.env.UPSTASH_REDIS_REST_TOKEN
      )
    },
    storageMode: getStorageMode(),
    latestGeneratedAt: latest ? latest.snapshot.generatedAt : null,
    snapshotCount: index.length
  });
}
