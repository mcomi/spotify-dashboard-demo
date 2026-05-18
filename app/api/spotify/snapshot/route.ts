const { getLatestSnapshot } = require("../../../../src/storage/snapshot-store");
const { errorResponse, jsonResponse } = require("../../../../src/http-responses");
const {
  isAuthorizedRequest,
  unauthorizedResponse
} = require("../../../../src/route-auth");

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected snapshot error.";
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await getLatestSnapshot();

    if (!snapshot) {
      return jsonResponse({ snapshot: null, analytics: null }, 200);
    }

    return jsonResponse(snapshot);
  } catch (error) {
    return errorResponse(getErrorMessage(error), 500);
  }
}
