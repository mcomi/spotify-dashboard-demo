const { loadDotEnv, requireEnv } = require("../../../../src/config");
const { errorResponse, jsonResponse } = require("../../../../src/http-responses");
const {
  isAuthorizedRequest,
  unauthorizedResponse
} = require("../../../../src/route-auth");
const { SpotifyClient } = require("../../../../src/spotify/client");

export const runtime = "nodejs";
export const preferredRegion = "sfo1";
export const maxDuration = 60;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Spotify token error.";
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    loadDotEnv(".env.local", { override: process.env.NODE_ENV !== "production" });
    requireEnv([
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "SPOTIFY_REDIRECT_URI",
      "SPOTIFY_REFRESH_TOKEN"
    ]);

    const startedAt = Date.now();
    const client = new SpotifyClient({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
      refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
    });
    const token = await client.refreshAccessToken();

    return jsonResponse({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      hasAccessToken: Boolean(token.access_token),
      expiresIn: token.expires_in || null,
      region: "sfo1"
    });
  } catch (error) {
    return errorResponse(getErrorMessage(error), 500);
  }
}
