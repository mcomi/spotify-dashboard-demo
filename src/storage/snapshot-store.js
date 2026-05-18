const fs = require("fs");
const path = require("path");
const {
  getLatestSnapshot: getRedisLatestSnapshot,
  getSnapshotIndex: getRedisSnapshotIndex,
  hasRedisConfig,
  saveSnapshot: saveRedisSnapshot
} = require("./redis");

function localSnapshotPath() {
  return path.join(process.cwd(), "data", "spotify-snapshot.json");
}

function readLocalSnapshot() {
  const filePath = localSnapshotPath();

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeLocalSnapshot(snapshotEnvelope) {
  const filePath = localSnapshotPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(snapshotEnvelope, null, 2));

  return {
    latestKey: filePath,
    historicalKey: filePath,
    timestamp: snapshotEnvelope.snapshot.generatedAt
  };
}

async function getLatestSnapshot() {
  if (hasRedisConfig()) {
    return getRedisLatestSnapshot();
  }

  return readLocalSnapshot();
}

async function getSnapshotIndex() {
  if (hasRedisConfig()) {
    return getRedisSnapshotIndex();
  }

  const snapshot = readLocalSnapshot();
  return snapshot ? [snapshot.snapshot.generatedAt] : [];
}

async function saveSnapshot(snapshotEnvelope) {
  if (hasRedisConfig()) {
    return saveRedisSnapshot(snapshotEnvelope);
  }

  return writeLocalSnapshot(snapshotEnvelope);
}

function getStorageMode() {
  return hasRedisConfig() ? "upstash-redis" : "local-file";
}

module.exports = {
  getLatestSnapshot,
  getSnapshotIndex,
  getStorageMode,
  saveSnapshot
};
