const https = require("https");
const { URL } = require("url");

async function requestJsonWithFetch(options) {
  const timeoutMs = options.timeoutMs || 20000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(options.url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body || undefined,
      signal: controller.signal
    });
    const rawBody = await response.text();
    let json = null;

    if (rawBody) {
      try {
        json = JSON.parse(rawBody);
      } catch (error) {
        json = null;
      }
    }

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      status: response.status,
      headers,
      body: json,
      rawBody
    };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${options.url}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function requestJson(options) {
  if (typeof fetch === "function" && typeof AbortController === "function") {
    return requestJsonWithFetch(options);
  }

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
