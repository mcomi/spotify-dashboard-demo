import { NextResponse } from "next/server";

const {
  AUTH_COOKIE,
  createSessionValue,
  getCookieOptions,
  isValidAccessToken
} = require("../../../../src/auth");
const { errorResponse } = require("../../../../src/http-responses");

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!isValidAccessToken(body.token)) {
    return errorResponse("Invalid dashboard token.", 401);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, createSessionValue(), getCookieOptions());
  return response;
}
