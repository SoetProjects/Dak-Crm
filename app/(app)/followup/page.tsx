"use client";

import { useState } from "react";
import type { FollowUpCandidate, FollowUpResult } from "@/lib/followup/generate-followup";

// ─── Customer type labels ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Particulier",
  BUSINESS: "Zakelijk",
  HOA: "VvE",
  CONTRACTOR: "Aannemer",
};

const TYPE_COLORS: Record<string, string> = {
  PRIVATE: "bg-green-100 text-green-800",
  BUSINESS: "bg-blue-100 text-blue-800",
  HOA: "bg-purple-100 text-purple-800",
  CONTRACTOR: "bg-orange-100 text-orange-800",
};

// ─── Candidate card ───────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  onMessageChange,
}: {
  candidate: FollowUpCandidate;
  onMessageChange: (id: string, msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(candidate.suggestedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lastActivityLabel = candidate.lastActivity
    ? new Date(candidate.lastActivity).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Onbekend";

  const urgencyColor =
    candidate.daysSinceContact >= 90
      ? "text-red-600 bg-red-50 border-red-200"
      : candidate.daysSinceContact >= 60
        ? "text-orange-600 bg-orange-50 border-orange-200"
        : "text-yellow-700 bg-yellow-50 border-yellow-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 select-none">
            {candidate.customerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/customers/${candidate.customerId}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {candidate.customerName}
              </a>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[candidate.customerType] ?? "bg-gray-100 text-gray-600"}`}
              >
                {TYPE_LABELS[candidate.customerType] ?? candidate.customerType}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {candidate.contactPerson && <span>{candidate.contactPerson} · </span>}
              {candidate.city}
            </div>
          </div>
        </div>

        {/* Days badge */}
        <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold ${urgencyColor}`}>
          {candidate.daysSinceContact}d
          <span className="font-normal"> geleden</span>
        </div>
      </div>

      {/* Meta info */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500 flex-wrap">
        <span>📅 Laatste contact: {lastActivityLabel}</span>
        <span>🔧 {candidate.jobCount} werkbon{candidate.jobCount !== 1 ? "nen" : ""}</span>
        <span>📋 {candidate.quoteCount} offerte{candidate.quoteCount !== 1 ? "s" : ""}</span>
        <span className="flex items-center gap-1">
          {candidate.channel === "whatsapp" ? "📱 WhatsApp" : "✉️ E-mail"}
        </span>
      </div>

      {/* Contact info */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-4 flex-wrap text-sm">
        {candidate.phone && (
          <a href={`tel:${candidate.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
            📞 {candidate.phone}
          </a>
        )}
        {candidate.email && (
          <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline flex items-center gap-1 truncate">
            ✉ {candidate.email}
          </a>
        )}
        {!candidate.phone && !candidate.email && (
          <span className="text-gray-400 italic text-xs">Geen contactgegevens beschikbaar</span>
        )}
      </div>

      {/* Editable message */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Voorgesteld bericht
          </label>
          <button
            onClick={copyMessage}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            {copied ? (
              <><span className="text-green-600">✓</span> Gekopieerd</>
            ) : (
              <><span>⎘</span> Kopieer</>
            )}
          </button>
        </div>
        <textarea
          value={candidate.suggestedMessage}
          onChange={(e) => onMessageChange(candidate.customerId, e.target.value)}
          rows={candidate.channel === "whatsapp" ? 3 : 6}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 hover:bg-white transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {candidate.suggestedMessage.length} tekens
        </p>
      </div>

      {/* Action buttons */}
      <div className="px-5 py-4 pt-0 flex gap-2 flex-wrap">
        {candidate.whatsappUrl && (
          <a
            href={candidate.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp openen
          </a>
        )}
        {candidate.mailtoUrl && (
          <a
            href={candidate.mailtoUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            E-mail openen
          </a>
        )}
        <a
          href={`/customers/${candidate.customerId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
        >
          Klantpagina →
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FollowUpPage() {
  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState(5);
  const [channel, setChannel] = useState<"both" | "whatsapp" | "email">("both");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Editable messages are kept in local state so edits persist across re-renders
  const [messages, setMessages] = useState<Record<string, string>>({});

  function updateMessage(customerId: string, msg: string) {
    setMessages((prev) => ({ ...prev, [customerId]: msg }));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setMessages({});

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notContactedDays: days, limit, channel }),
      });

      const json: FollowUpResult & { error?: string } = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Er is een fout opgetreden.");
        return;
      }

      setResult(json);
      // Pre-populate editable messages
      const initial: Record<string, string> = {};
      for (const c of json.candidates) initial[c.customerId] = c.suggestedMessage;
      setMessages(initial);
    } catch {
      setError("Netwerkfout. Controleer je verbinding en probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  // Merge edited messages back into candidates for rendering
  const candidates: FollowUpCandidate[] =
    result?.candidates.map((c) => ({
      ...c,
      suggestedMessage: messages[c.customerId] ?? c.suggestedMessage,
    })) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opvolging</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Vind klanten die je al een tijdje niet gesproken hebt en genereer een persoonlijk
          follow-up bericht via AI.
        </p>
      </div>

      {/* Configuration panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Instellingen</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Days slider */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Niet benaderd in
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={7}
                max={180}
                step={7}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="flex-1 h-2 accent-blue-600"
              />
              <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                {days} dagen
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>7d</span>
              <span>180d</span>
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Aantal klanten
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n} klanten
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Kanaal
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
              {(["both", "whatsapp", "email"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 py-2 text-center transition-colors ${
                    channel === ch
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {ch === "both" ? "Beide" : ch === "whatsapp" ? "📱 WA" : "✉ Mail"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Berichten genereren...
            </>
          ) : (
            "✨ Genereer follow-up berichten"
          )}
        </button>

        {loading && (
          <p className="text-xs text-center text-gray-400">
            AI genereert persoonlijke berichten — dit duurt 5–15 seconden.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-start gap-2">
          <span className="text-red-500 flex-shrink-0">⚠</span>
          {error}
        </div>
      )}

      {/* Results header */}
      {result && (
        <div>
          {result.candidates.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-semibold text-green-800">Alle klanten zijn recent benaderd!</p>
              <p className="text-green-600 text-sm mt-1">
                Er zijn geen klanten gevonden die langer dan {days} dagen niet benaderd zijn.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {candidates.length} follow-up
                    {candidates.length !== 1 ? "s" : ""} gegenereerd
                  </h2>
                  <p className="text-sm text-gray-500">
                    {result.totalFound > candidates.length && (
                      <>
                        {result.totalFound} klanten totaal niet benaderd in {days} dagen —
                        top {candidates.length} getoond.{" "}
                      </>
                    )}
                    Berichten zijn bewerkbaar voor verzending.
                  </p>
                </div>
                <button
                  onClick={generate}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  Vernieuwen
                </button>
              </div>

              <div className="space-y-4">
                {candidates.map((c) => (
                  <CandidateCard
                    key={c.customerId}
                    candidate={c}
                    onMessageChange={updateMessage}
                  />
                ))}
              </div>

              <p className="text-xs text-center text-gray-400 mt-6">
                Berichten worden niet automatisch verzonden. Klik op WhatsApp of E-mail om te versturen.
              </p>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-medium text-gray-500">Stel je criteria in en klik op genereren.</p>
          <p className="text-sm mt-1">
            AI schrijft een persoonlijk bericht per klant, klaar voor WhatsApp of e-mail.
          </p>
        </div>
      )}
    </div>
  );
}
