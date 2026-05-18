const { URLSearchParams } = require("url");
const { requestJson } = require("./http");

const AUTH_BASE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE_URL = "https://api.spotify.com/v1";

function encodeBasicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAuthorizationUrl(options) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scopes.join(" "),
    show_dialog: options.showDialog ? "true" : "false"
  });

  if (options.state) {
    params.set("state", options.state);
  }

  return `${AUTH_BASE_URL}?${params.toString()}`;
}

class SpotifyClient {
  constructor(options) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.refreshToken = options.refreshToken || null;
    this.request = options.request || requestJson;
    this.accessToken = options.accessToken || null;
    this.accessTokenExpiresAt = 0;
  }

  async exchangeCodeForTokens(code) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri
    }).toString();

    return this.postToken(body);
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("SPOTIFY_REFRESH_TOKEN is required to refresh access.");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken
    }).toString();

    const tokens = await this.postToken(body);
    this.accessToken = tokens.access_token;
    this.accessTokenExpiresAt = Date.now() + (tokens.expires_in - 60) * 1000;

    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }

    return tokens;
  }

  async postToken(body) {
    const response = await this.request({
      method: "POST",
      url: TOKEN_URL,
      headers: {
        Authorization: `Basic ${encodeBasicAuth(
          this.clientId,
          this.clientSecret
        )}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (response.status < 200 || response.status >= 300) {
      const message =
        response.body && response.body.error_description
          ? response.body.error_description
          : `Spotify token request failed with status ${response.status}`;
      throw new Error(message);
    }

    return response.body;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    const tokens = await this.refreshAccessToken();
    return tokens.access_token;
  }

  async api(pathOrUrl, options) {
    const requestOptions = options || {};
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${API_BASE_URL}${pathOrUrl}`;

    return this.apiWithRetry(url, requestOptions, 0);
  }

  async apiWithRetry(url, options, attempt) {
    const accessToken = await this.getAccessToken();
    const response = await this.request({
      method: options.method || "GET",
      url,
      headers: Object.assign({}, options.headers || {}, {
        Authorization: `Bearer ${accessToken}`
      }),
      body: options.body
    });

    if (response.status === 401 && attempt === 0) {
      this.accessToken = null;
      await this.refreshAccessToken();
      return this.apiWithRetry(url, options, attempt + 1);
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfterSeconds = Number(response.headers["retry-after"] || 1);
      await sleep(retryAfterSeconds * 1000);
      return this.apiWithRetry(url, options, attempt + 1);
    }

    if (response.status < 200 || response.status >= 300) {
      const errorMessage =
        response.body && response.body.error && response.body.error.message
          ? response.body.error.message
          : `Spotify API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.body;
  }

  async getAll(path, params) {
    const searchParams = new URLSearchParams(params || {});
    const separator = path.indexOf("?") === -1 ? "?" : "&";
    let nextUrl = `${API_BASE_URL}${path}${separator}${searchParams.toString()}`;
    const items = [];

    while (nextUrl) {
      const page = await this.api(nextUrl);
      items.push.apply(items, page.items || []);
      nextUrl = page.next;
    }

    return items;
  }

  async getProfile() {
    return this.api("/me");
  }

  async getTopArtists(timeRange) {
    return this.getAll("/me/top/artists", {
      time_range: timeRange,
      limit: "50"
    });
  }

  async getTopTracks(timeRange) {
    return this.getAll("/me/top/tracks", {
      time_range: timeRange,
      limit: "50"
    });
  }

  async getRecentlyPlayed(limit) {
    return this.api(`/me/player/recently-played?limit=${limit || 50}`);
  }

  async getSavedTracks() {
    return this.getAll("/me/tracks", { limit: "50" });
  }

  async getSavedAlbums() {
    return this.getAll("/me/albums", { limit: "50" });
  }

  async getPlaylists() {
    return this.getAll("/me/playlists", { limit: "50" });
  }

  async getPlaylistTracks(playlistId) {
    return this.getAll(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      limit: "100"
    });
  }
}

module.exports = {
  API_BASE_URL,
  AUTH_BASE_URL,
  TOKEN_URL,
  SpotifyClient,
  createAuthorizationUrl,
  encodeBasicAuth
};
