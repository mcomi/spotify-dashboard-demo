"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";

export default function LoginForm() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    setLoading(false);

    if (!response.ok) {
      setError("Token incorrecto. Revisa DASHBOARD_ACCESS_TOKEN.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm text-white/70">Token privado</span>
        <input
          className="h-12 w-full rounded-[8px] border border-line bg-white/7 px-4 text-white outline-none transition focus:border-spotify"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-spotify px-4 font-semibold text-ink transition hover:bg-[#24d764] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        <LogIn className="h-4 w-4" />
        {loading ? "Verificando" : "Entrar"}
      </button>
    </form>
  );
}
