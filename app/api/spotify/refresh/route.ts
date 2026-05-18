const { requireEnv } = require("../../../../src/config");
const { errorResponse, jsonResponse } = require("../../../../src/http-responses");
const { saveSnapshot } = require("../../../../src/storage/snapshot-store");
const {
  isAuthorizedRequest,
  unauthorizedResponse
} = require("../../../../src/route-auth");
const {
  createSpotifyClientFromEnv,
  pullSpotifySnapshot
} = require("../../../../src/spotify/pull");

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Spotify refresh error.";
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    requireEnv([
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "SPOTIFY_REDIRECT_URI",
      "SPOTIFY_REFRESH_TOKEN"
    ]);

    const output = await pullSpotifySnapshot(createSpotifyClientFromEnv());
    const saved = await saveSnapshot(output);

    return jsonResponse({
      ok: true,
      saved,
      generatedAt: output.snapshot.generatedAt,
      analytics: output.analytics
    });
  } catch (error) {
    return errorResponse(getErrorMessage(error), 500);
  }
}
