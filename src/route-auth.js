const { AUTH_COOKIE, isValidSessionValue } = require("./auth");

function getSessionCookieFromRequest(request) {
  if (request.cookies && typeof request.cookies.get === "function") {
    const cookie = request.cookies.get(AUTH_COOKIE);
    return cookie ? cookie.value : null;
  }

  const rawCookie = request.headers.get("cookie") || "";
  const cookies = rawCookie.split(";").map((item) => item.trim());
  const sessionCookie = cookies.find((item) => item.startsWith(`${AUTH_COOKIE}=`));

  return sessionCookie ? decodeURIComponent(sessionCookie.split("=")[1]) : null;
}

function isAuthorizedRequest(request) {
  return isValidSessionValue(getSessionCookieFromRequest(request));
}

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

module.exports = {
  isAuthorizedRequest,
  unauthorizedResponse
};
