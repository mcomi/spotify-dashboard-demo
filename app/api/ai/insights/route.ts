const { errorResponse, jsonResponse } = require("../../../../src/http-responses");
const {
  isAuthorizedRequest,
  unauthorizedResponse
} = require("../../../../src/route-auth");
const { generateAiBrief } = require("../../../../src/ai/brief");
const {
  getLatestSnapshot,
  saveAiBrief
} = require("../../../../src/storage/snapshot-store");

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected AI insights error.";
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await getLatestSnapshot();

    if (!snapshot || !snapshot.analytics) {
      return errorResponse("Generate a Spotify snapshot before AI insights.", 400);
    }

    const aiBrief = await generateAiBrief(snapshot.analytics);
    const updated = await saveAiBrief(aiBrief);

    return jsonResponse({
      ok: true,
      aiBrief,
      snapshot: updated.snapshot,
      analytics: updated.analytics
    });
  } catch (error) {
    return errorResponse(getErrorMessage(error), 500);
  }
}
