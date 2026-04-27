"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleDemoLogin() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dev-login", { method: "POST" });
      if (!response.ok) {
        setError("Demo login is niet beschikbaar.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Kon demo login niet starten.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-[var(--primary)]">DakCRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Log in om leads, planning en jobs te beheren.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--primary)]">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-[var(--accent)] transition focus:ring-2"
              placeholder="naam@bedrijf.nl"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--primary)]">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-[var(--accent)] transition focus:ring-2"
              placeholder="********"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:bg-[#153058] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Bezig met inloggen..." : "Inloggen"}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-[var(--primary)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Verder als demo gebruiker
          </button>
        </form>
      </div>
    </main>
  );
}
