const { requireCronSecret } = require("../../../../src/http-responses");
import { POST as refreshSpotify } from "../../spotify/refresh/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requireCronSecret(request)) {
    return Response.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const internalRequest = {
    cookies: {
      get: () => ({
        value: require("../../../../src/auth").createSessionValue()
      })
    }
  };

  return refreshSpotify(internalRequest as unknown as Request);
}

export const GET = POST;
