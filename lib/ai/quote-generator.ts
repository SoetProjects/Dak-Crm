/**
 * AI Quote Generator Service
 *
 * Uses OpenAI function calling to produce a structured Dutch roofing quote.
 * Pricing math (subtotal, VAT, total) is always computed server-side — never trusted from AI.
 * The service is stateless and has no Prisma dependency; saving is the caller's responsibility.
 */

import OpenAI from "openai";

// ─── Public types ─────────────────────────────────────────────────────────────

export type CustomerType = "PRIVATE" | "BUSINESS" | "HOA" | "CONTRACTOR";
export type JobType =
  | "LEAK"
  | "INSPECTION"
  | "BITUMEN_ROOF"
  | "ROOF_RENOVATION"
  | "ROOF_TERRACE"
  | "MAINTENANCE"
  | "OTHER";

export type QuoteGeneratorInput = {
  customer: {
    name: string;
    type: CustomerType;
    address?: string;
    city?: string;
  };
  /** Plain-text description of the work. Required. */
  jobDescription: string;
  jobType?: JobType;
  /** Roof surface area in m² (optional but improves pricing accuracy). */
  area?: number;
  /** Estimated labour hours (optional). */
  laborHours?: number;
  /** Specific materials to include (optional). */
  materials?: string[];
  /** Budget guidance, e.g. "500–1000" or "< 500". */
  budgetHint?: string;
};

export type GeneratedQuoteLine = {
  description: string;
  quantity: number;
  unit: string;
  /** Price per unit excluding VAT (€). */
  unitPrice: number;
  /** Always 21 (standard Dutch BTW rate for construction work). */
  vatPercentage: 21;
  /** quantity × unitPrice — computed server-side. */
  totalAmount: number;
};

export type GeneratedQuote = {
  title: string;
  /** Professional opening paragraph. */
  introduction: string;
  lines: GeneratedQuoteLine[];
  /** Standard terms & conditions text. */
  conditions: string;
  /** Closing paragraph / call to action. */
  closingText: string;
  subtotal: number;
  vatPercentage: 21;
  vatAmount: number;
  totalAmount: number;
  /** Days the quote is valid. */
  validityDays: number;
};

export type QuoteGeneratorResult = {
  ok: boolean;
  quote?: GeneratedQuote;
  error?: string;
};

// ─── OpenAI tool schema ───────────────────────────────────────────────────────

const GENERATE_QUOTE_TOOL = {
  type: "function" as const,
  function: {
    name: "create_roofing_quote",
    description:
      "Generate a structured Dutch roofing quote with a title, introduction, line items, conditions and closing text.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Short, professional title for the quote (e.g. 'Offerte dakrenovatie Prinsengracht 112, Amsterdam').",
        },
        introduction: {
          type: "string",
          description:
            "2–3 sentences. Professional Dutch opening that references the customer, the work to be done and Berteck Dakwerken.",
        },
        lines: {
          type: "array",
          description: "Line items that make up the quote price. Min 1, max 10.",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Clear Dutch description of this cost item.",
              },
              quantity: {
                type: "number",
                description: "Numeric quantity (e.g. 45 for 45 m²).",
              },
              unit: {
                type: "string",
                description: "Unit of measure. Use: m², m1, uur, stuk, post, dag.",
              },
              unitPrice: {
                type: "number",
                description:
                  "Price per unit in euros, excluding BTW. Use realistic Dutch roofing market rates.",
              },
            },
            required: ["description", "quantity", "unit", "unitPrice"],
            additionalProperties: false,
          },
        },
        conditions: {
          type: "string",
          description:
            "1–2 sentences of standard Dutch terms (e.g. payment within 30 days, work subject to weather conditions).",
        },
        closingText: {
          type: "string",
          description:
            "Warm closing paragraph in Dutch (1–2 sentences) inviting the customer to accept or ask questions.",
        },
        validityDays: {
          type: "number",
          description: "How many days the quote is valid. Typically 14 or 30.",
        },
      },
      required: ["title", "introduction", "lines", "conditions", "closingText", "validityDays"],
      additionalProperties: false,
    },
  },
} as const;

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional Dutch quote writer for Berteck Dakwerken, a roofing company in Amsterdam.

Company details:
- Name: Berteck Dakwerken
- Location: Dakstraat 14, 1011 AB Amsterdam
- Phone: +31 20 555 0147
- Email: info@berteck.nl
- KvK: 12345678 | BTW: NL123456789B01

All text must be in professional Dutch (formal "u/uw" for BUSINESS, HOA, CONTRACTOR customers; friendly "u" for PRIVATE).

Dutch roofing market price guidance (excluding 21% BTW):
- Bitumen afdichting (dakbedekking): €28–45/m²
- PIR isolatie 60–120mm: €12–22/m²
- EPDM dakafdichting: €22–38/m²
- Dakpannen inclusief monteren: €6–14/stuk
- Lekkage herstel (eenvoudig): €95–195/post
- Lekkage herstel (complex): €250–450/post
- Dakkapel herstel: €175–350/post
- Dakinspectie: €85–175/post
- Arbeid monteur: €55–75/uur
- Arbeid ploeg (2 man): €110–145/uur
- Reiskosten: €35–65/post
- Afvoer puin: €55–95/post
- Dakrand / daktrim: €8–16/m1
- Grind (beschermlaag): €4–8/m²

Rules:
- Always compute quantities based on area if provided.
- Include labour separately from materials.
- Include travel costs for jobs > €400.
- Round unit prices to sensible values (€45.00 not €44.37).
- validityDays: 14 for small jobs, 30 for large.
- Conditions: always include "Betaling binnen 30 dagen na factuurdatum." and BTW mention.
- Never include BTW in unitPrice — that is computed by the system.
- Always call create_roofing_quote. Never answer without calling the function.`;

// ─── Pricing helpers ──────────────────────────────────────────────────────────

type RawLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

function computeTotals(lines: RawLine[]): {
  lines: GeneratedQuoteLine[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
} {
  const computedLines: GeneratedQuoteLine[] = lines.map((l) => ({
    description: String(l.description).slice(0, 200),
    quantity: Math.max(0, Number(l.quantity) || 0),
    unit: String(l.unit || "stuk").slice(0, 20),
    unitPrice: Math.max(0, Number(l.unitPrice) || 0),
    vatPercentage: 21,
    totalAmount: Math.round(Math.max(0, Number(l.quantity) || 0) * Math.max(0, Number(l.unitPrice) || 0) * 100) / 100,
  }));

  const subtotal = Math.round(computedLines.reduce((s, l) => s + l.totalAmount, 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * 0.21 * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  return { lines: computedLines, subtotal, vatAmount, totalAmount };
}

// ─── Input validation ─────────────────────────────────────────────────────────

const VALID_JOB_TYPES: JobType[] = [
  "LEAK", "INSPECTION", "BITUMEN_ROOF", "ROOF_RENOVATION", "ROOF_TERRACE", "MAINTENANCE", "OTHER",
];
const VALID_CUSTOMER_TYPES: CustomerType[] = ["PRIVATE", "BUSINESS", "HOA", "CONTRACTOR"];

export function validateQuoteInput(raw: unknown): {
  valid: true; input: QuoteGeneratorInput
} | { valid: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Verzoek moet een object zijn." };
  }
  const r = raw as Record<string, unknown>;

  const customer = r.customer as Record<string, unknown> | undefined;
  if (!customer || typeof customer.name !== "string" || !customer.name.trim()) {
    return { valid: false, error: "customer.name is verplicht." };
  }
  if (!customer.type || !VALID_CUSTOMER_TYPES.includes(customer.type as CustomerType)) {
    return { valid: false, error: `customer.type moet een van ${VALID_CUSTOMER_TYPES.join(", ")} zijn.` };
  }

  const jobDescription = typeof r.jobDescription === "string" ? r.jobDescription.trim() : "";
  if (jobDescription.length < 10) {
    return { valid: false, error: "jobDescription moet minimaal 10 tekens bevatten." };
  }
  if (jobDescription.length > 1000) {
    return { valid: false, error: "jobDescription mag maximaal 1000 tekens bevatten." };
  }

  const jobType = r.jobType as JobType | undefined;
  if (jobType && !VALID_JOB_TYPES.includes(jobType)) {
    return { valid: false, error: `Ongeldig jobType: ${jobType}.` };
  }

  const area = typeof r.area === "number" ? Math.min(Math.max(0, r.area), 5000) : undefined;
  const laborHours = typeof r.laborHours === "number" ? Math.min(Math.max(0, r.laborHours), 200) : undefined;
  const budgetHint = typeof r.budgetHint === "string" ? r.budgetHint.slice(0, 50) : undefined;
  const materials = Array.isArray(r.materials)
    ? r.materials.slice(0, 10).map((m) => String(m).slice(0, 50))
    : undefined;

  return {
    valid: true,
    input: {
      customer: {
        name: customer.name.trim().slice(0, 100),
        type: customer.type as CustomerType,
        address: typeof customer.address === "string" ? customer.address.slice(0, 100) : undefined,
        city: typeof customer.city === "string" ? customer.city.slice(0, 50) : undefined,
      },
      jobDescription,
      jobType,
      area,
      laborHours,
      materials,
      budgetHint,
    },
  };
}

// ─── Main service function ────────────────────────────────────────────────────

export async function generateQuote(input: QuoteGeneratorInput): Promise<QuoteGeneratorResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY is niet ingesteld." };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build a rich user prompt from the input
  const customerTypeLabels: Record<CustomerType, string> = {
    PRIVATE: "particuliere klant",
    BUSINESS: "zakelijke klant",
    HOA: "VvE (appartementencomplex)",
    CONTRACTOR: "aannemer",
  };
  const jobTypeLabels: Partial<Record<JobType, string>> = {
    LEAK: "lekkage reparatie",
    INSPECTION: "dakinspectie",
    BITUMEN_ROOF: "bitumen dakrenovatie",
    ROOF_RENOVATION: "dakrenovatie",
    ROOF_TERRACE: "dakterras aanleg",
    MAINTENANCE: "dakonderhoud",
    OTHER: "overig dakwerk",
  };

  const userPromptLines = [
    `Klant: ${input.customer.name} (${customerTypeLabels[input.customer.type]})`,
    input.customer.address ? `Adres: ${input.customer.address}` : "",
    input.customer.city ? `Stad: ${input.customer.city}` : "",
    "",
    `Werkzaamheden: ${input.jobDescription}`,
    input.jobType ? `Type werk: ${jobTypeLabels[input.jobType] ?? input.jobType}` : "",
    input.area ? `Dakoppervlak: ${input.area} m²` : "",
    input.laborHours ? `Geschatte arbeidstijd: ${input.laborHours} uur` : "",
    input.materials?.length
      ? `Specifieke materialen: ${input.materials.join(", ")}`
      : "",
    input.budgetHint ? `Budgetindicatie klant: €${input.budgetHint}` : "",
  ];
  const userPrompt = userPromptLines.filter(Boolean).join("\n");

  let rawArgs: unknown;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [GENERATE_QUOTE_TOOL],
      tool_choice: { type: "function", function: { name: "create_roofing_quote" } },
      temperature: 0.4,   // Lower temp = more consistent pricing
      max_tokens: 1200,
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== "function") {
      return { ok: false, error: "AI heeft geen offerte gegenereerd. Probeer opnieuw." };
    }

    rawArgs = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("API key")) return { ok: false, error: "Ongeldige OPENAI_API_KEY." };
    if (msg.includes("quota") || msg.includes("rate")) {
      return { ok: false, error: "OpenAI limiet bereikt. Probeer later opnieuw." };
    }
    console.error("[quote-generator] OpenAI error:", msg);
    return { ok: false, error: "AI service tijdelijk niet beschikbaar." };
  }

  // Validate and compute totals server-side (never trust AI for math)
  const r = rawArgs as Record<string, unknown>;

  if (!Array.isArray(r.lines) || r.lines.length === 0) {
    return { ok: false, error: "AI produceerde geen regelitems. Probeer een uitgebreidere omschrijving." };
  }

  const { lines, subtotal, vatAmount, totalAmount } = computeTotals(r.lines as RawLine[]);

  const quote: GeneratedQuote = {
    title: String(r.title || "Offerte dakwerkzaamheden").slice(0, 200),
    introduction: String(r.introduction || "").slice(0, 800),
    lines,
    conditions: String(r.conditions || "Betaling binnen 30 dagen na factuurdatum. Prijzen zijn exclusief BTW.").slice(0, 500),
    closingText: String(r.closingText || "Wij hopen u een goede offerte te hebben aangeboden.").slice(0, 400),
    subtotal,
    vatPercentage: 21,
    vatAmount,
    totalAmount,
    validityDays: Math.min(Math.max(7, Number(r.validityDays) || 30), 90),
  };

  return { ok: true, quote };
}
