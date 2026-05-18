const crypto = require("crypto");

const AUTH_COOKIE = "spotify_dashboard_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function getDashboardToken() {
  return process.env.DASHBOARD_ACCESS_TOKEN || "";
}

function signToken(token) {
  const secret = getDashboardToken();

  if (!secret) {
    throw new Error("DASHBOARD_ACCESS_TOKEN is required.");
  }

  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function isValidAccessToken(token) {
  const expected = getDashboardToken();
  return Boolean(expected && token && timingSafeEqual(token, expected));
}

function createSessionValue() {
  return signToken(getDashboardToken());
}

function isValidSessionValue(value) {
  if (!value || !getDashboardToken()) {
    return false;
  }

  return timingSafeEqual(value, createSessionValue());
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK_SECONDS
  };
}

module.exports = {
  AUTH_COOKIE,
  ONE_WEEK_SECONDS,
  createSessionValue,
  getCookieOptions,
  isValidAccessToken,
  isValidSessionValue
};
