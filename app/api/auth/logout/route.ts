import { NextResponse } from "next/server";

const { AUTH_COOKIE, getCookieOptions } = require("../../../../src/auth");

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", Object.assign({}, getCookieOptions(), {
    maxAge: 0
  }));
  return response;
}
