"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const supabase = createClient();

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setInfo("Account aangemaakt. Controleer je e-mail voor verificatie.");
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold text-primary">
        {isLogin ? "Inloggen" : "Registreren"}
      </h1>
      <p className="mt-2 text-sm text-blue-700">
        {isLogin
          ? "Log in om je dakdekkers CRM te openen."
          : "Maak een account aan voor je CRM omgeving."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-primary">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm text-primary outline-none ring-accent/30 focus:ring"
            placeholder="naam@bedrijf.nl"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-primary">
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm text-primary outline-none ring-accent/30 focus:ring"
            placeholder="Minimaal 6 tekens"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-blue-700">{info}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#163158] disabled:opacity-60"
        >
          {isSubmitting
            ? "Bezig..."
            : isLogin
              ? "Inloggen"
              : "Account aanmaken"}
        </button>
      </form>

      <p className="mt-4 text-sm text-blue-700">
        {isLogin ? "Nog geen account?" : "Al een account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-accent hover:underline"
        >
          {isLogin ? "Registreren" : "Inloggen"}
        </Link>
      </p>
    </div>
  );
}
