#!/usr/bin/env node

const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");
const { loadDotEnv, requireEnv } = require("../src/config");
const { SPOTIFY_SCOPES } = require("../src/spotify/scopes");
const {
  SpotifyClient,
  createAuthorizationUrl
} = require("../src/spotify/client");

loadDotEnv();
requireEnv([
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI"
]);

const redirectUrl = new URL(process.env.SPOTIFY_REDIRECT_URI);
const state = crypto.randomBytes(16).toString("hex");
const client = new SpotifyClient({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const authUrl = createAuthorizationUrl({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  scopes: SPOTIFY_SCOPES,
  state,
  showDialog: true
});

console.log("\nOpen this URL to connect Spotify:\n");
console.log(authUrl);
console.log("\nWaiting for Spotify callback...");

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, process.env.SPOTIFY_REDIRECT_URI);

  if (requestUrl.pathname !== redirectUrl.pathname) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }

  const returnedState = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");

  if (error) {
    response.writeHead(400, { "Content-Type": "text/plain" });
    response.end(`Spotify returned an error: ${error}`);
    console.error(`Spotify returned an error: ${error}`);
    server.close();
    return;
  }

  if (!code || returnedState !== state) {
    response.writeHead(400, { "Content-Type": "text/plain" });
    response.end("Invalid Spotify callback. Missing code or state mismatch.");
    console.error("Invalid Spotify callback. Missing code or state mismatch.");
    server.close();
    return;
  }

  try {
    const tokens = await client.exchangeCodeForTokens(code);
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Spotify connected. You can return to the terminal.");

    console.log("\nSpotify connected successfully.");
    console.log("\nAdd this to your .env file:\n");
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nThen run: npm run spotify:pull\n");
  } catch (tokenError) {
    response.writeHead(500, { "Content-Type": "text/plain" });
    response.end(`Failed to exchange Spotify code: ${tokenError.message}`);
    console.error(tokenError);
  } finally {
    server.close();
  }
});

server.listen(Number(redirectUrl.port || 80), redirectUrl.hostname, () => {
  console.log(
    `\nLocal callback server listening on ${redirectUrl.origin}${redirectUrl.pathname}\n`
  );
});
