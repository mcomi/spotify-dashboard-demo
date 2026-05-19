const https = require("https");
const { URL } = require("url");

function requestJson(options) {
  const url = new URL(options.url);
  const body = options.body || null;
  const headers = Object.assign({}, options.headers || {});
  const timeoutMs = options.timeoutMs || 20000;

  if (body) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: options.method || "GET",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          let json = null;

          if (rawBody) {
            try {
              json = JSON.parse(rawBody);
            } catch (error) {
              json = null;
            }
          }

          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: json,
            rawBody
          });
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${url.href}`));
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

module.exports = {
  requestJson
};
