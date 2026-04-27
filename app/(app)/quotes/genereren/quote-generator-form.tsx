"use client";

import { useState } from "react";
import type { GeneratedQuote, GeneratedQuoteLine } from "@/lib/ai/quote-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerOption = {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
};

type JobType =
  | "LEAK"
  | "INSPECTION"
  | "BITUMEN_ROOF"
  | "ROOF_RENOVATION"
  | "ROOF_TERRACE"
  | "MAINTENANCE"
  | "OTHER";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  LEAK: "Lekkage reparatie",
  INSPECTION: "Dakinspectie",
  BITUMEN_ROOF: "Bitumen dakrenovatie",
  ROOF_RENOVATION: "Dakrenovatie",
  ROOF_TERRACE: "Dakterras aanleg",
  MAINTENANCE: "Dakonderhoud",
  OTHER: "Overig dakwerk",
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Particulier",
  BUSINESS: "Zakelijk",
  HOA: "VvE",
  CONTRACTOR: "Aannemer",
};

// ─── Price formatting ─────────────────────────────────────────────────────────

function eur(amount: number) {
  return amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Quote Preview ────────────────────────────────────────────────────────────

function QuotePreview({
  quote,
  customerName,
  onLineChange,
  onSave,
  saving,
  savedId,
}: {
  quote: GeneratedQuote;
  customerName: string;
  onLineChange: (index: number, field: keyof GeneratedQuoteLine, value: string | number) => void;
  onSave: () => void;
  saving: boolean;
  savedId: string | null;
}) {
  const subtotal = quote.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vatAmount = Math.round(subtotal * 0.21 * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Quote document */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Document header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium">Berteck Dakwerken</p>
              <p className="text-xs text-slate-400">Dakstraat 14, 1011 AB Amsterdam</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Concept offerte</p>
              <p className="text-xs text-slate-400">{new Date().toLocaleDateString("nl-NL")}</p>
            </div>
          </div>
          <h2 className="mt-4 text-lg font-bold leading-snug">{quote.title}</h2>
          <p className="text-sm text-slate-300 mt-1">t.a.v. {customerName}</p>
        </div>

        {/* Introduction */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{quote.introduction}</p>
        </div>

        {/* Line items */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide pr-4 w-[40%]">
                  Omschrijving
                </th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide w-20">
                  Aantal
                </th>
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide pl-2 w-16">
                  Eenheid
                </th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">
                  Prijs/eenheid
                </th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.lines.map((line, i) => (
                <tr key={i} className="group">
                  <td className="py-2.5 pr-4">
                    <input
                      value={line.description}
                      onChange={(e) => onLineChange(i, "description", e.target.value)}
                      className="w-full text-gray-800 border-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 transition-colors"
                    />
                  </td>
                  <td className="py-2.5 text-right">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => onLineChange(i, "quantity", parseFloat(e.target.value) || 0)}
                      min={0}
                      className="w-16 text-right text-gray-800 border-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 transition-colors"
                    />
                  </td>
                  <td className="py-2.5 pl-2">
                    <input
                      value={line.unit}
                      onChange={(e) => onLineChange(i, "unit", e.target.value)}
                      className="w-14 text-gray-600 border-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 transition-colors"
                    />
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-gray-400 text-xs">€</span>
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => onLineChange(i, "unitPrice", parseFloat(e.target.value) || 0)}
                        min={0}
                        step={0.01}
                        className="w-20 text-right text-gray-800 border-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 transition-colors"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-gray-800 font-medium tabular-nums">
                    € {eur(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <div className="w-56 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotaal (excl. BTW)</span>
                <span className="tabular-nums">€ {eur(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>BTW {quote.vatPercentage}%</span>
                <span className="tabular-nums">€ {eur(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-300">
                <span>Totaal</span>
                <span className="tabular-nums">€ {eur(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions + closing */}
        <div className="px-6 py-5 border-t border-gray-100 space-y-3 text-xs text-gray-500">
          <p><strong className="text-gray-600">Geldigheid:</strong> {quote.validityDays} dagen na offertedatum.</p>
          <p><strong className="text-gray-600">Voorwaarden:</strong> {quote.conditions}</p>
          <p className="text-gray-600 italic">{quote.closingText}</p>
        </div>
      </div>

      {/* Save actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {savedId ? (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <span className="text-green-500">✓</span>
            Offerte opgeslagen —{" "}
            <a href={`/quotes/${savedId}`} className="underline hover:no-underline">
              Bekijk offerte →
            </a>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Prijzen zijn bewerkbaar. Klik op een veld om te bewerken.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors"
          >
            Afdrukken
          </button>
          {!savedId && (
            <button
              onClick={onSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Opslaan...
                </>
              ) : (
                "Opslaan als concept"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────

export function QuoteGeneratorForm({ customers }: { customers: CustomerOption[] }) {
  // Form state
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState<JobType | "">("");
  const [area, setArea] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [budgetHint, setBudgetHint] = useState("");

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Allow inline editing of generated lines
  function handleLineChange(index: number, field: keyof GeneratedQuoteLine, value: string | number) {
    if (!quote) return;
    const newLines = quote.lines.map((l, i) =>
      i === index ? { ...l, [field]: value } : l,
    );
    setQuote({ ...quote, lines: newLines });
  }

  async function generate() {
    if (!selectedCustomer || !jobDescription.trim()) return;

    setLoading(true);
    setError(null);
    setQuote(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/ai/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: selectedCustomer.name,
            type: selectedCustomer.type,
            address: selectedCustomer.address,
            city: selectedCustomer.city,
          },
          jobDescription: jobDescription.trim(),
          ...(jobType && { jobType }),
          ...(area && { area: parseFloat(area) }),
          ...(laborHours && { laborHours: parseFloat(laborHours) }),
          ...(budgetHint && { budgetHint }),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Er is een fout opgetreden.");
        return;
      }

      setQuote(json.quote as GeneratedQuote);
    } catch {
      setError("Netwerkfout. Controleer je verbinding.");
    } finally {
      setLoading(false);
    }
  }

  async function saveQuote() {
    if (!quote || !selectedCustomer) return;

    setSaving(true);
    try {
      // Recompute totals from current (possibly edited) lines before saving
      const subtotal = quote.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const vatAmount = Math.round(subtotal * 0.21 * 100) / 100;
      const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          title: quote.title,
          notes: `${quote.introduction}\n\n${quote.conditions}\n\n${quote.closingText}`,
          validUntil: new Date(Date.now() + quote.validityDays * 86_400_000).toISOString(),
          subtotal,
          vatPercentage: 21,
          vatAmount,
          totalAmount,
          lines: quote.lines.map((l, i) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            vatPercentage: 21,
            totalAmount: Math.round(l.quantity * l.unitPrice * 100) / 100,
            sortOrder: i,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.id) {
        setSavedId(json.id);
      } else {
        setError(json.error ?? "Opslaan mislukt.");
      }
    } catch {
      setError("Netwerkfout bij opslaan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Input form ── */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Gegevens</h2>

          {/* Customer selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Klant *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.type ? ` — ${CUSTOMER_TYPE_LABELS[c.type] ?? c.type}` : ""}
                  {c.city ? `, ${c.city}` : ""}
                </option>
              ))}
            </select>
            {selectedCustomer && (
              <p className="text-xs text-gray-400 mt-1">
                {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(", ")}
                {selectedCustomer.phone && ` · ${selectedCustomer.phone}`}
              </p>
            )}
          </div>

          {/* Job description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Omschrijving werkzaamheden *
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              placeholder={
                "Beschrijf de werkzaamheden zo volledig mogelijk.\n\nBijv.: Lekkage bij dakkapel repareren, folie vervangen over ~3 m². Er is waterschade zichtbaar in de slaapkamer."
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{jobDescription.length}/1000</p>
          </div>

          {/* Job type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Type werk (optioneel)
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as JobType | "")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Selecteer type —</option>
              {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Hints row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Dakoppervlak (m²)
              </label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="bijv. 45"
                min={0}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Arbeidstijd (uur)
              </label>
              <input
                type="number"
                value={laborHours}
                onChange={(e) => setLaborHours(e.target.value)}
                placeholder="bijv. 8"
                min={0}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Budget hint */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Budgetindicatie klant (optioneel)
            </label>
            <input
              type="text"
              value={budgetHint}
              onChange={(e) => setBudgetHint(e.target.value)}
              placeholder="bijv. 500-1000 of < 2000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading || !customerId || jobDescription.trim().length < 10}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Offerte genereren...
            </>
          ) : (
            "✨ Genereer offerte met AI"
          )}
        </button>

        {loading && (
          <p className="text-xs text-center text-gray-400">
            AI berekent realistische prijzen voor de Nederlandse markt — even geduld.
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <span className="text-red-400 flex-shrink-0">⚠</span>
            {error}
          </div>
        )}

        {!customers.length && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Geen klanten gevonden.{" "}
            <a href="/customers" className="underline">
              Voeg eerst een klant toe.
            </a>
          </div>
        )}
      </div>

      {/* ── Preview / right column ── */}
      <div>
        {quote ? (
          <QuotePreview
            quote={quote}
            customerName={selectedCustomer?.name ?? "Klant"}
            onLineChange={handleLineChange}
            onSave={saveQuote}
            saving={saving}
            savedId={savedId}
          />
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-gray-200 p-8 text-gray-400">
            <div className="text-5xl mb-4">📄</div>
            <p className="font-medium text-gray-500">Gegenereerde offerte verschijnt hier</p>
            <p className="text-sm mt-1 max-w-xs">
              Vul klant en omschrijving in, klik op genereren en de AI maakt een
              professionele offerte klaar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
