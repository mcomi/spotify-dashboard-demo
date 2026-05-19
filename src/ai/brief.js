const http = require("http");
const https = require("https");

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";

function compactAnalytics(analytics) {
  return {
    profile: analytics.profile,
    library: {
      savedTracks: analytics.library.savedTracks,
      savedAlbums: analytics.library.savedAlbums,
      topSavedTrackArtists: analytics.library.topSavedTrackArtists.slice(0, 10),
      savedTrackReleaseYears: analytics.library.savedTrackReleaseYears.slice(0, 12)
    },
    topItems: {
      artists: analytics.topItems.artists.slice(0, 10),
      tracks: analytics.topItems.tracks.slice(0, 10),
      genres: analytics.topItems.genres.slice(0, 12)
    },
    recentlyPlayed: {
      totalItems: analytics.recentlyPlayed.totalItems,
      repeatedTracks: analytics.recentlyPlayed.repeatedTracks.slice(0, 10),
      topArtists: analytics.recentlyPlayed.topArtists.slice(0, 10)
    },
    playlists: analytics.playlists.slice(0, 10).map((playlist) => ({
      name: playlist.name,
      totalTracks: playlist.totalTracks,
      explicitTracks: playlist.explicitTracks,
      averagePopularity: playlist.averagePopularity,
      topArtists: playlist.topArtists.slice(0, 5),
      releaseYears: playlist.releaseYears.slice(0, 8)
    }))
  };
}

function fallbackBrief(analytics) {
  const topGenre = analytics.topItems.genres[0];
  const topArtist = analytics.topItems.artists[0];
  const topTrack = analytics.topItems.tracks[0];
  const repeated = analytics.recentlyPlayed.repeatedTracks[0];
  const playlist = analytics.playlists
    .slice()
    .sort((a, b) => (b.totalTracks || 0) - (a.totalTracks || 0))[0];

  return {
    generatedAt: new Date().toISOString(),
    source: "fallback",
    title: "Listening brief",
    summary: `Tu perfil actual se concentra alrededor de ${topArtist ? topArtist.name : "tus artistas principales"} y ${topGenre ? topGenre.name : "tus generos dominantes"}, con una biblioteca de ${analytics.library.savedTracks} tracks guardados.`,
    patterns: [
      topGenre
        ? `El genero con mas senales en tus top artists es ${topGenre.name}.`
        : "Tus generos todavia no muestran una senal dominante.",
      playlist
        ? `Tu playlist mas grande en el snapshot es ${playlist.name}, con ${playlist.totalTracks} tracks analizados.`
        : "Todavia no hay playlists suficientes para detectar composicion.",
      repeated
        ? `${repeated.name} aparece repetida en recently played, una senal de escucha activa reciente.`
        : "Recently played no muestra repeticiones fuertes en el snapshot actual."
    ],
    surprises: [
      topTrack
        ? `Tu top track del periodo medio es ${topTrack.name}, de ${(topTrack.artists || []).join(", ")}.`
        : "No hay top track disponible todavia."
    ],
    recommendations: [
      "Crea un snapshot semanal para comparar cambios reales en genero, artistas y playlists.",
      topGenre
        ? `Explora una playlist curada alrededor de ${topGenre.name} para ver si refuerza o diversifica tu patron.`
        : "Agrega mas datos de escucha para que el dashboard detecte patrones mas claros."
    ],
    playlistIdeas: [
      {
        name: "Focus from your library",
        description: "Una playlist de trabajo basada en tus artistas repetidos y tracks guardados."
      },
      {
        name: "Recent energy",
        description: "Una seleccion corta con canciones y artistas que aparecen en recently played."
      }
    ]
  };
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI response did not include a JSON object.");
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
}

function openAiRequest(payload) {
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: "api.openai.com",
        path: "/v1/responses",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const json = raw ? JSON.parse(raw) : {};

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(
                json.error && json.error.message
                  ? json.error.message
                  : `OpenAI request failed with status ${response.statusCode}`
              )
            );
            return;
          }

          resolve(json);
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error("OpenAI request timed out after 30000ms."));
    });
    request.write(body);
    request.end();
  });
}

function requestJson(urlString, payload, timeoutMs) {
  const url = new URL(urlString);
  const body = JSON.stringify(payload);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const json = raw ? JSON.parse(raw) : {};

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`AI provider failed with status ${response.statusCode}`));
            return;
          }

          resolve(json);
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(timeoutMs || 60000, () => {
      request.destroy(new Error(`AI provider timed out after ${timeoutMs || 60000}ms.`));
    });
    request.write(body);
    request.end();
  });
}

function extractResponseText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const output = response.output || [];
  const textParts = [];

  for (const item of output) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n");
}

async function generateOpenAiBrief(analytics) {
  const compact = compactAnalytics(analytics);
  const response = await openAiRequest({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input: [
      {
        role: "system",
        content:
          "You are a music analytics assistant. Return only valid JSON. Be specific, concise, and useful. Do not invent Spotify audio features."
      },
      {
        role: "user",
        content: `Create a Spanish listening brief from this Spotify analytics JSON. Return this exact JSON shape: {\"title\": string, \"summary\": string, \"patterns\": string[], \"surprises\": string[], \"recommendations\": string[], \"playlistIdeas\": [{\"name\": string, \"description\": string}]}. Analytics: ${JSON.stringify(compact)}`
      }
    ]
  });
  const parsed = parseJsonObject(extractResponseText(response));

  return Object.assign(
    {
      generatedAt: new Date().toISOString(),
      source: "openai"
    },
    parsed
  );
}

function createBriefPrompt(analytics) {
  return `Create a Spanish listening brief from this Spotify analytics JSON. Return only valid JSON with this exact shape: {\"title\": string, \"summary\": string, \"patterns\": string[], \"surprises\": string[], \"recommendations\": string[], \"playlistIdeas\": [{\"name\": string, \"description\": string}]}. Be specific, concise, and useful. Do not invent Spotify audio features. Analytics: ${JSON.stringify(compactAnalytics(analytics))}`;
}

async function generateOllamaBrief(analytics, options) {
  const request = options && options.request ? options.request : requestJson;
  const baseUrl =
    process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const model =
    process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const response = await request(
    `${baseUrl.replace(/\/$/, "")}/api/generate`,
    {
      model,
      prompt: createBriefPrompt(analytics),
      stream: false,
      format: "json",
      options: {
        temperature: 0.2
      }
    },
    Number(process.env.OLLAMA_TIMEOUT_MS || 60000)
  );
  const parsed = parseJsonObject(response.response || "");

  return Object.assign(
    {
      generatedAt: new Date().toISOString(),
      source: "ollama",
      model
    },
    parsed
  );
}

async function generateAiBrief(analytics, options) {
  if (!analytics) {
    throw new Error("Analytics are required to generate an AI brief.");
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAiBrief(analytics);
    } catch (error) {
      if (process.env.AI_FALLBACK_ON_ERROR === "false") {
        throw error;
      }
    }
  }

  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
    try {
      return await generateOllamaBrief(analytics, options);
    } catch (error) {
      if (process.env.AI_FALLBACK_ON_ERROR === "false") {
        throw error;
      }
    }
  }

  return fallbackBrief(analytics);
}

module.exports = {
  compactAnalytics,
  fallbackBrief,
  generateAiBrief,
  generateOllamaBrief,
  parseJsonObject
};
