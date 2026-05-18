const https = require("https");
const { URL } = require("url");

function requestJson(options) {
  const url = new URL(options.url);
  const body = options.body || null;
  const headers = Object.assign({}, options.headers || {});

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
              error.message = `Failed to parse JSON response from ${url.href}: ${error.message}`;
              reject(error);
              return;
            }
          }

          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: json
          });
        });
      }
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

module.exports = {
  requestJson
};
