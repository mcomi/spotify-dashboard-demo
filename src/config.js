const fs = require("fs");
const path = require("path");

function loadDotEnv(filePath, options) {
  const resolved = filePath || path.join(process.cwd(), ".env");
  const loadOptions = options || {};

  if (!fs.existsSync(resolved)) {
    return;
  }

  const lines = fs.readFileSync(resolved, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (
      !process.env[key] ||
      loadOptions.override ||
      isUnsetEnvValue(key)
    ) {
      process.env[key] = value;
    }
  }
}

function isUnsetEnvValue(name) {
  const value = process.env[name];

  return (
    !value ||
    value === "your_spotify_client_id" ||
    value === "your_spotify_client_secret"
  );
}

function requireEnv(names) {
  const missing = names.filter((name) => isUnsetEnvValue(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing or placeholder environment variables: ${missing.join(", ")}`
    );
  }
}

module.exports = {
  isUnsetEnvValue,
  loadDotEnv,
  requireEnv
};
