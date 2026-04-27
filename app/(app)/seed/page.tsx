"use server";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { runDemoSeed } from "@/lib/db/seed-demo";

export default async function SeedPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; done?: string }>;
}) {
  const session = await getAppSession();
  if (!session.isAuthenticated) redirect("/login");

  const params = await searchParams;
  let result = null;

  if (params.run === "1") {
    result = await runDemoSeed(session.companyId);
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-3xl">🏗</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demo data seeden</h1>
            <p className="text-gray-500 text-sm">Berteck Dakwerken — éénmalige setup</p>
          </div>
        </div>

        {!result && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Let op:</strong> dit maakt demo data aan voor bedrijf{" "}
              <code className="bg-amber-100 px-1 rounded">{session.companyId}</code>. Bestaande
              data wordt niet overschreven.
            </div>
            <p className="text-gray-600 text-sm">De volgende data wordt aangemaakt:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-none">
              {[
                "✓ Bedrijf: Berteck Dakwerken (Amsterdam)",
                "✓ 3 klanten: Jansen B.V., P. de Vries, VvE Zonstraat 12",
                "✓ 3 leads: Amsterdam, Utrecht, Rotterdam",
                "✓ 4 materialen: Bitumen rol, PIR isolatie, Daktrim, Grind",
                "✓ 2 offertes (OFF-2026-0001 en OFF-2026-0002)",
                "✓ 3 werkbonnen: vandaag gepland, vandaag in uitvoering, gisteren afgerond",
                "✓ 2 planning-items (beide vandaag — zichtbaar op dashboard)",
                "✓ 1 concept factuur (FAC-2026-0001) gekoppeld aan afgeronde werkbon",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">{item.slice(0, 1)}</span>
                  <span>{item.slice(2)}</span>
                </li>
              ))}
            </ul>
            <form action={`/seed?run=1`} method="GET">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-base transition-colors"
              >
                🚀 Demo data aanmaken
              </button>
            </form>
          </div>
        )}

        {result && result.ok && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              <strong>✅ Seed succesvol!</strong>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Aangemaakt ({result.created.length})</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {result.created.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {result.skipped.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-500 mb-2 text-sm">
                  Overgeslagen (al aanwezig, {result.skipped.length})
                </h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  {result.skipped.map((item) => (
                    <li key={item}>↳ {item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-4 flex gap-3">
              <a
                href="/dashboard"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center text-base transition-colors"
              >
                Naar dashboard →
              </a>
              <a
                href="/leads"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg text-center text-base transition-colors"
              >
                Naar leads
              </a>
            </div>
          </div>
        )}

        {result && !result.ok && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <strong>❌ Seed mislukt</strong>
              <p className="text-sm mt-1">{result.message}</p>
              {result.error && (
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{result.error}</pre>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded p-3 text-sm text-amber-700">
              Controleer of <code>DATABASE_URL</code> is ingesteld in je omgevingsvariabelen (Vercel
              dashboard → Settings → Environment Variables).
            </div>
            <a
              href="/seed"
              className="block text-center text-blue-600 hover:underline text-sm"
            >
              Opnieuw proberen
            </a>
            {result.created.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                  Al aangemaakt voor de fout ({result.created.length})
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.created.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        /seed — alleen zichtbaar voor ingelogde gebruikers. Verwijder deze pagina na gebruik als je
        wil.
      </p>
    </div>
  );
}
