"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Clock3,
  Database,
  Disc3,
  Library,
  ListMusic,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type DashboardData = {
  snapshot: any;
  analytics: any;
} | null;

type DashboardClientProps = {
  initialData: DashboardData;
  storageMode: string;
};

const chartColors = ["#1db954", "#44d27c", "#b8f7ca", "#7dd3fc", "#c084fc"];

function formatDate(value?: string) {
  if (!value) {
    return "Sin snapshot";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[8px] border border-line bg-panel/82 p-5 ${className}`}>
      {children}
    </section>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/58">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-spotify/14 text-spotify">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[8px] bg-spotify/16 text-spotify">
        <Database className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-semibold text-white">Todavía no hay snapshot</h1>
      <p className="mt-4 text-base leading-7 text-white/66">
        Ejecuta un refresh para traer tus datos de Spotify y llenar el dashboard.
      </p>
      <button
        className="mt-8 flex h-12 items-center gap-2 rounded-[8px] bg-spotify px-5 font-semibold text-ink transition hover:bg-[#24d764] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Actualizando" : "Crear snapshot"}
      </button>
    </div>
  );
}

export default function DashboardClient({
  initialData,
  storageMode
}: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analytics = data?.analytics;
  const snapshot = data?.snapshot;

  const topGenre = analytics?.topItems?.genres?.[0]?.name || "Sin datos";
  const topArtist = analytics?.topItems?.artists?.[0]?.name || "Sin datos";
  const yearData = useMemo(
    () => analytics?.library?.savedTrackReleaseYears?.slice(0, 12) || [],
    [analytics]
  );
  const genreData = useMemo(
    () => analytics?.topItems?.genres?.slice(0, 6) || [],
    [analytics]
  );

  async function refreshSnapshot() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/spotify/refresh", {
      method: "POST"
    });
    const body = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      setError(body.error || "No se pudo refrescar Spotify.");
      return;
    }

    const snapshotResponse = await fetch("/api/spotify/snapshot");
    const snapshotBody = await snapshotResponse.json();
    setData(snapshotBody);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!analytics || !snapshot) {
    return <EmptyState onRefresh={refreshSnapshot} loading={loading} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-spotify">
            <ShieldCheck className="h-4 w-4" />
            Dashboard privado
          </p>
          <h1 className="text-4xl font-semibold text-white">
            {analytics.profile.displayName || "Spotify Analytics"}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/62">
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {formatDate(snapshot.generatedAt)}
            </span>
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {storageMode}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex h-11 items-center gap-2 rounded-[8px] border border-line bg-white/7 px-4 font-medium text-white transition hover:border-spotify"
            onClick={refreshSnapshot}
            disabled={loading}
            title="Refrescar datos de Spotify"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Actualizando" : "Refresh"}
          </button>
          <button
            className="flex h-11 items-center gap-2 rounded-[8px] border border-line bg-white/7 px-4 font-medium text-white transition hover:border-red-300"
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-[8px] border border-red-300/40 bg-red-950/35 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Library className="h-5 w-5" />}
          label="Saved tracks"
          value={compactNumber(analytics.library.savedTracks)}
        />
        <Stat
          icon={<Disc3 className="h-5 w-5" />}
          label="Saved albums"
          value={compactNumber(analytics.library.savedAlbums)}
        />
        <Stat
          icon={<ListMusic className="h-5 w-5" />}
          label="Playlists"
          value={compactNumber(analytics.playlists.length)}
        />
        <Stat
          icon={<Sparkles className="h-5 w-5" />}
          label="Top genre"
          value={topGenre}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Top artists</h2>
              <p className="mt-1 text-sm text-white/56">Medium term ranking</p>
            </div>
            <BarChart3 className="h-5 w-5 text-spotify" />
          </div>
          <div className="space-y-3">
            {analytics.topItems.artists.slice(0, 8).map((artist: any, index: number) => (
              <div
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-3"
                key={artist.id || artist.name}
              >
                <span className="text-sm text-white/45">{index + 1}</span>
                <div>
                  <p className="font-medium text-white">{artist.name}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {(artist.genres || []).slice(0, 3).join(", ") || "Sin género"}
                  </p>
                </div>
                <span className="text-sm text-white/60">
                  {compactNumber(artist.followers || 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Genre mix</h2>
            <p className="mt-1 text-sm text-white/56">Basado en tus top artists</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="count" data={genreData} innerRadius={58} outerRadius={92}>
                  {genreData.map((entry: any, index: number) => (
                    <Cell
                      key={entry.name}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f1c15",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 8
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-white/60">Artista más fuerte: {topArtist}</p>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-white">Top tracks</h2>
          <div className="mt-5 space-y-3">
            {analytics.topItems.tracks.slice(0, 10).map((track: any, index: number) => (
              <div
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-3"
                key={track.id || `${track.name}-${index}`}
              >
                <span className="text-sm text-white/45">{index + 1}</span>
                <div>
                  <p className="font-medium text-white">{track.name}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {(track.artists || []).join(", ")}
                  </p>
                </div>
                <span className="text-sm text-white/60">{track.popularity || 0}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Library by release year</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.55)" />
                <YAxis stroke="rgba(255,255,255,0.55)" />
                <Tooltip
                  contentStyle={{
                    background: "#0f1c15",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="count" fill="#1db954" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-lg font-semibold text-white">Recently played repeats</h2>
          <div className="mt-5 space-y-3">
            {(analytics.recentlyPlayed.repeatedTracks.length
              ? analytics.recentlyPlayed.repeatedTracks
              : analytics.recentlyPlayed.topArtists
            )
              .slice(0, 8)
              .map((item: any) => (
                <div className="flex items-center justify-between gap-3" key={item.name}>
                  <span className="font-medium text-white">{item.name}</span>
                  <span className="text-sm text-white/58">{item.count}</span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Playlist analytics</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="text-white/48">
                <tr>
                  <th className="border-b border-line py-3 font-medium">Playlist</th>
                  <th className="border-b border-line py-3 font-medium">Tracks</th>
                  <th className="border-b border-line py-3 font-medium">Explicit</th>
                  <th className="border-b border-line py-3 font-medium">Popularity</th>
                  <th className="border-b border-line py-3 font-medium">Top artist</th>
                </tr>
              </thead>
              <tbody>
                {analytics.playlists.slice(0, 8).map((playlist: any) => (
                  <tr key={playlist.id}>
                    <td className="border-b border-line py-3 text-white">
                      {playlist.name}
                    </td>
                    <td className="border-b border-line py-3 text-white/64">
                      {playlist.totalTracks}
                    </td>
                    <td className="border-b border-line py-3 text-white/64">
                      {playlist.explicitTracks}
                    </td>
                    <td className="border-b border-line py-3 text-white/64">
                      {playlist.averagePopularity ?? "N/A"}
                    </td>
                    <td className="border-b border-line py-3 text-white/64">
                      {playlist.topArtists?.[0]?.name || "Sin datos"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}
