function jsonResponse(body, status) {
  return Response.json(body, { status: status || 200 });
}

function errorResponse(message, status) {
  return jsonResponse({ error: message }, status || 500);
}

function requireCronSecret(request) {
  const expected = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || "";

  if (!expected) {
    return false;
  }

  return header === `Bearer ${expected}`;
}

module.exports = {
  errorResponse,
  jsonResponse,
  requireCronSecret
};
