const { requestJson } = require("../spotify/http");

const LATEST_KEY = "spotify:latest-snapshot";
const INDEX_KEY = "spotify:snapshots:index";
const MAX_INDEX_ITEMS = 30;

function getRedisRestUrl() {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.KV_REST_API_URL
  );
}

function getRedisRestToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN
  );
}

function hasRedisConfig() {
  return Boolean(getRedisRestUrl() && getRedisRestToken());
}

function redisUrl(command) {
  return `${getRedisRestUrl()}/${command
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

async function redisCommand(command) {
  const response = await requestJson({
    method: "POST",
    url: redisUrl(command),
    headers: {
      Authorization: `Bearer ${getRedisRestToken()}`
    }
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upstash Redis request failed with status ${response.status}`);
  }

  if (response.body && response.body.error) {
    throw new Error(response.body.error);
  }

  return response.body ? response.body.result : null;
}

async function getJson(key) {
  const value = await redisCommand(["GET", key]);

  if (!value) {
    return null;
  }

  return typeof value === "string" ? JSON.parse(value) : value;
}

async function setJson(key, value) {
  return redisCommand(["SET", key, JSON.stringify(value)]);
}

async function saveSnapshot(snapshotEnvelope) {
  if (!hasRedisConfig()) {
    throw new Error("Upstash Redis is not configured.");
  }

  const timestamp = snapshotEnvelope.snapshot.generatedAt;
  const historicalKey = `spotify:snapshot:${timestamp}`;
  const index = (await getSnapshotIndex()).filter((item) => item !== timestamp);

  index.unshift(timestamp);

  await setJson(LATEST_KEY, snapshotEnvelope);
  await setJson(historicalKey, snapshotEnvelope);
  await setJson(INDEX_KEY, index.slice(0, MAX_INDEX_ITEMS));

  return {
    latestKey: LATEST_KEY,
    historicalKey,
    timestamp
  };
}

async function getLatestSnapshot() {
  if (!hasRedisConfig()) {
    return null;
  }

  return getJson(LATEST_KEY);
}

async function getSnapshotIndex() {
  if (!hasRedisConfig()) {
    return [];
  }

  return (await getJson(INDEX_KEY)) || [];
}

module.exports = {
  INDEX_KEY,
  LATEST_KEY,
  getLatestSnapshot,
  getSnapshotIndex,
  getRedisRestToken,
  getRedisRestUrl,
  hasRedisConfig,
  redisCommand,
  saveSnapshot
};
