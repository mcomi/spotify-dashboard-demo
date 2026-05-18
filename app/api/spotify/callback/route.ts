const { URL } = require("url");
const { requireEnv } = require("../../../../src/config");
const { errorResponse } = require("../../../../src/http-responses");
const { SpotifyClient } = require("../../../../src/spotify/client");

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Spotify callback error.";
}

export async function GET(request: Request) {
  try {
    requireEnv([
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "SPOTIFY_REDIRECT_URI"
    ]);

    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");

    if (error) {
      return errorResponse(`Spotify returned an error: ${error}`, 400);
    }

    if (!code) {
      return errorResponse("Missing Spotify callback code.", 400);
    }

    const client = new SpotifyClient({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    const tokens = await client.exchangeCodeForTokens(code);

    return new Response(
      `Spotify connected.\n\nAdd this refresh token to your environment:\n\nSPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n`,
      {
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  } catch (callbackError) {
    return errorResponse(getErrorMessage(callbackError), 500);
  }
}
