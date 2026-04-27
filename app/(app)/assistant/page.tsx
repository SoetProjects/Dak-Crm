"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant" | "error";

type CrmEntity = "customers" | "leads" | "jobs" | "quotes" | "invoices" | "materials" | "planning";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  entity?: CrmEntity;
  data?: Record<string, unknown>[];
  count?: number;
  appliedFilters?: string[];
};

// ─── Example questions ────────────────────────────────────────────────────────

const EXAMPLES: { label: string; question: string }[] = [
  { label: "Actieve klanten", question: "Laat me alle actieve klanten zien" },
  { label: "Leads deze maand", question: "Welke leads zijn er binnengekomen deze maand?" },
  { label: "Niet benaderd", question: "Welke klanten zijn de afgelopen 30 dagen niet benaderd?" },
  { label: "Jobs vandaag", question: "Welke werkbonnen staan er vandaag gepland?" },
  { label: "Open offertes", question: "Toon alle openstaande offertes" },
  { label: "Achterstallige facturen", question: "Welke facturen zijn te laat betaald?" },
  { label: "Zakelijke klanten", question: "Laat me alle zakelijke klanten zien" },
  { label: "Lopende werkbonnen", question: "Werkbonnen die momenteel in uitvoering zijn" },
];

// ─── Entity column definitions ────────────────────────────────────────────────

type ColumnDef = { key: string; label: string; format?: (v: unknown) => string };

const COLUMNS: Record<CrmEntity, ColumnDef[]> = {
  customers: [
    { key: "name", label: "Naam" },
    { key: "customerType", label: "Type", format: (v) => ({ PRIVATE: "Particulier", BUSINESS: "Zakelijk", HOA: "VvE", CONTRACTOR: "Aannemer" })[String(v)] ?? String(v) },
    { key: "contactPerson", label: "Contactpersoon" },
    { key: "billingCity", label: "Stad" },
    { key: "phone", label: "Telefoon" },
    { key: "_count", label: "Jobs / Offertes", format: (v) => { const c = v as { jobs?: number; quotes?: number } | null; return c ? `${c.jobs ?? 0} / ${c.quotes ?? 0}` : "-"; } },
  ],
  leads: [
    { key: "name", label: "Naam" },
    { key: "status", label: "Status" },
    { key: "requestType", label: "Type aanvraag" },
    { key: "city", label: "Stad" },
    { key: "source", label: "Bron" },
    { key: "createdAt", label: "Aangemeld", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL") : "-" },
  ],
  jobs: [
    { key: "jobNumber", label: "Nummer" },
    { key: "title", label: "Titel" },
    { key: "status", label: "Status" },
    { key: "customer", label: "Klant", format: (v) => (v as { name?: string } | null)?.name ?? "-" },
    { key: "city", label: "Stad" },
    { key: "scheduledStart", label: "Gepland", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-" },
  ],
  quotes: [
    { key: "quoteNumber", label: "Nummer" },
    { key: "title", label: "Omschrijving" },
    { key: "status", label: "Status" },
    { key: "customer", label: "Klant", format: (v) => (v as { name?: string } | null)?.name ?? "-" },
    { key: "totalAmount", label: "Totaal", format: (v) => v != null ? `€ ${Number(v).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "-" },
    { key: "validUntil", label: "Geldig t/m", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL") : "-" },
  ],
  invoices: [
    { key: "invoiceNumber", label: "Nummer" },
    { key: "status", label: "Status" },
    { key: "customer", label: "Klant", format: (v) => (v as { name?: string } | null)?.name ?? "-" },
    { key: "totalAmount", label: "Totaal", format: (v) => v != null ? `€ ${Number(v).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "-" },
    { key: "invoiceDate", label: "Factuurdatum", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL") : "-" },
    { key: "dueDate", label: "Vervaldatum", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL") : "-" },
  ],
  materials: [
    { key: "name", label: "Naam" },
    { key: "category", label: "Categorie" },
    { key: "unit", label: "Eenheid" },
    { key: "defaultPrice", label: "Prijs", format: (v) => v != null ? `€ ${Number(v).toFixed(2)}` : "-" },
    { key: "stockQuantity", label: "Voorraad" },
  ],
  planning: [
    { key: "title", label: "Omschrijving" },
    { key: "type", label: "Type" },
    { key: "startAt", label: "Begintijd", format: (v) => v ? new Date(String(v)).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "endAt", label: "Eindtijd", format: (v) => v ? new Date(String(v)).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "user", label: "Medewerker", format: (v) => { const u = v as { firstName?: string; lastName?: string } | null; return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "-"; } },
    { key: "job", label: "Werkbon", format: (v) => (v as { jobNumber?: string } | null)?.jobNumber ?? "-" },
  ],
};

const ENTITY_LINKS: Partial<Record<CrmEntity, string>> = {
  customers: "/customers",
  leads: "/leads",
  jobs: "/jobs",
  quotes: "/quotes",
  invoices: "/invoices",
  materials: "/materials",
};

// ─── Status badge colours ─────────────────────────────────────────────────────

function statusClass(value: string): string {
  const map: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    CONTACTED: "bg-purple-100 text-purple-800",
    APPOINTMENT_PLANNED: "bg-indigo-100 text-indigo-800",
    QUOTED: "bg-yellow-100 text-yellow-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-gray-100 text-gray-500",
    PLANNED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-orange-100 text-orange-800",
    WAITING_FOR_MATERIAL: "bg-yellow-100 text-yellow-800",
    WAITING_FOR_WEATHER: "bg-sky-100 text-sky-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500",
    DRAFT: "bg-gray-100 text-gray-600",
    SENT: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    EXPIRED: "bg-orange-100 text-orange-800",
    PAID: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
  };
  return map[value] ?? "bg-gray-100 text-gray-700";
}

function isStatusKey(key: string) {
  return key === "status";
}

// ─── Results table ────────────────────────────────────────────────────────────

function ResultsTable({ entity, data }: { entity: CrmEntity; data: Record<string, unknown>[] }) {
  const cols = COLUMNS[entity] ?? [];
  const detailBase = ENTITY_LINKS[entity];

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 italic py-2">Geen resultaten gevonden.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                {c.label}
              </th>
            ))}
            {detailBase && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {cols.map((c) => {
                const raw = row[c.key];
                const display = c.format ? c.format(raw) : raw != null ? String(raw) : "-";
                return (
                  <td key={c.key} className="px-3 py-2 whitespace-nowrap text-gray-700">
                    {isStatusKey(c.key) && typeof raw === "string" ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(raw)}`}>
                        {display}
                      </span>
                    ) : (
                      display
                    )}
                  </td>
                );
              })}
              {detailBase && (
                <td className="px-3 py-2">
                  <a
                    href={`${detailBase}/${row.id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Bekijk →
                  </a>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "error", content: json.error ?? "Er is een fout opgetreden." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: json.summary,
          entity: json.entity,
          data: json.data,
          count: json.count,
          appliedFilters: json.appliedFilters,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "error", content: "Netwerkfout. Controleer je verbinding." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(question);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
            AI
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Assistent</h1>
            <p className="text-xs text-gray-500">Stel vragen over je klanten, werkbonnen, offertes en meer</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤖</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Hoe kan ik je helpen?</h2>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Stel vragen in gewoon Nederlands. Ik zoek de gegevens op uit je CRM.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Voorbeeldvragen</p>
              <div className="grid grid-cols-2 gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => ask(ex.question)}
                    className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700 group"
                  >
                    <span className="font-medium text-gray-800 group-hover:text-blue-700 block">{ex.label}</span>
                    <span className="text-gray-400 text-xs">{ex.question}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" && (
              <div className="max-w-[70%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm">
                {msg.content}
              </div>
            )}

            {msg.role === "error" && (
              <div className="max-w-[80%] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <span className="text-red-500 flex-shrink-0">⚠</span>
                {msg.content}
              </div>
            )}

            {msg.role === "assistant" && (
              <div className="max-w-[90%] w-full space-y-2">
                {/* Summary bubble */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    AI
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-gray-800">{msg.content}</p>

                    {msg.appliedFilters && msg.appliedFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.appliedFilters.map((f) => (
                          <span key={f} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Results table */}
                {msg.entity && msg.data && msg.data.length > 0 && (
                  <div className="ml-9">
                    <ResultsTable entity={msg.entity} data={msg.data} />
                    {msg.entity && ENTITY_LINKS[msg.entity] && (
                      <a
                        href={ENTITY_LINKS[msg.entity]}
                        className="inline-block mt-2 text-xs text-blue-600 hover:underline"
                      >
                        Ga naar {msg.entity} overzicht →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-none px-6 py-4 border-t border-gray-200 bg-white">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {EXAMPLES.slice(0, 4).map((ex) => (
              <button
                key={ex.label}
                onClick={() => ask(ex.question)}
                disabled={loading}
                className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stel een vraag... (bijv. 'welke klanten zijn niet benaderd?')"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
            style={{ maxHeight: "120px", overflowY: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white flex items-center justify-center transition-colors"
            title="Verstuur (Enter)"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter om te versturen · Shift+Enter voor nieuwe regel · Gegevens worden gefilterd op jouw bedrijf
        </p>
      </div>
    </div>
  );
}
