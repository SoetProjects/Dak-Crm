import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAppSession } from "@/lib/auth/session";
import { isDatabaseReady } from "@/lib/db/db-ready";
import {
  executeSafeQuery,
  CRM_QUERY_TOOL,
  CRM_SYSTEM_PROMPT,
  type CrmQueryIntent,
} from "@/lib/ai/crm-query";

// ─── Conversation memory ──────────────────────────────────────────────────────

type ContextMessage = { role: "user" | "assistant"; content: string };

/**
 * Sanitise context messages from the client.
 * - Accepts only "user" and "assistant" roles (rejects "system")
 * - Trims each message to 300 chars so context never dominates the prompt
 * - Caps at 10 messages (= last 5 back-and-forth exchanges)
 */
function sanitizeContext(raw: unknown): ContextMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is Record<string, unknown> =>
        !!m && typeof m === "object" && "role" in m && "content" in m,
    )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content ?? "").slice(0, 300),
    }));
}

// ─── Rate limiting (simple in-memory, per deployment) ─────────────────────────
// In production, replace with Redis or Upstash. This prevents abuse per session.
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;         // max requests
const RATE_WINDOW_MS = 60_000; // per minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT) return true;

  record.count++;
  return false;
}

// ─── POST /api/ai/query ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Authentication
  const session = await getAppSession();
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: "Niet ingelogd. Log in om de AI assistent te gebruiken." },
      { status: 401 },
    );
  }

  // 2. Rate limiting per company
  if (isRateLimited(session.companyId)) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
      { status: 429 },
    );
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek (geen geldige JSON)." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("question" in body)) {
    return NextResponse.json({ error: "Verplicht veld ontbreekt: question." }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;
  const question = String(parsed.question ?? "").trim();
  const context = sanitizeContext(parsed.context);

  if (question.length < 3) {
    return NextResponse.json({ error: "Vraag is te kort (minimaal 3 tekens)." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json(
      { error: "Vraag is te lang (maximaal 500 tekens)." },
      { status: 400 },
    );
  }

  // 4. Check service availability
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI assistent is niet geconfigureerd.",
        hint: "Voeg OPENAI_API_KEY toe aan de omgevingsvariabelen.",
      },
      { status: 503 },
    );
  }

  if (!isDatabaseReady()) {
    return NextResponse.json(
      { error: "Database niet beschikbaar. Controleer DATABASE_URL." },
      { status: 503 },
    );
  }

  // 5. Call OpenAI to parse the intent via function calling
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let intent: CrmQueryIntent;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CRM_SYSTEM_PROMPT },
        // Inject sanitised conversation history so the model understands
        // follow-up references ("die klanten", "hetzelfde filter", "ook de zakelijke")
        ...context,
        { role: "user", content: question },
      ],
      tools: [CRM_QUERY_TOOL],
      tool_choice: { type: "function", function: { name: "query_crm" } },
      temperature: 0,
      max_tokens: 256,
    });

    const rawToolCall = completion.choices[0]?.message?.tool_calls?.[0];
    // Narrow to function tool call (discriminated union on type field)
    const toolCall =
      rawToolCall?.type === "function" ? rawToolCall : undefined;
    if (!toolCall || toolCall.function.name !== "query_crm") {
      return NextResponse.json(
        { error: "AI kon de vraag niet vertalen naar een databasequery." },
        { status: 422 },
      );
    }

    // Parse and validate the JSON arguments produced by OpenAI
    let args: unknown;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return NextResponse.json(
        { error: "AI gaf een ongeldige query terug. Probeer de vraag anders te stellen." },
        { status: 422 },
      );
    }

    // Type-check the entity field (critical security gate)
    const validEntities = ["customers", "leads", "jobs", "quotes", "invoices", "materials", "planning"];
    const toolArgs = args as Record<string, unknown>;
    if (!toolArgs.entity || !validEntities.includes(String(toolArgs.entity))) {
      return NextResponse.json(
        { error: "AI produceerde een onbekend entiteittype. Probeer de vraag te herformuleren." },
        { status: 422 },
      );
    }

    intent = {
      entity: toolArgs.entity as CrmQueryIntent["entity"],
      filters: typeof toolArgs.filters === "object" && toolArgs.filters !== null
        ? (toolArgs.filters as CrmQueryIntent["filters"])
        : {},
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Surface useful OpenAI errors without leaking internals
    if (msg.includes("API key")) {
      return NextResponse.json(
        { error: "Ongeldige OPENAI_API_KEY. Controleer de configuratie." },
        { status: 503 },
      );
    }
    if (msg.includes("quota") || msg.includes("rate")) {
      return NextResponse.json(
        { error: "OpenAI limiet bereikt. Probeer het later opnieuw." },
        { status: 503 },
      );
    }

    console.error("[AI query] OpenAI error:", msg);
    return NextResponse.json(
      { error: "AI service tijdelijk niet beschikbaar. Probeer het later opnieuw." },
      { status: 503 },
    );
  }

  // 6. Execute the safe Prisma query (no raw SQL, no dynamic code)
  try {
    const result = await executeSafeQuery(intent, session.companyId);

    return NextResponse.json({
      ok: true,
      question,
      contextLength: context.length,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI query] DB error:", msg);
    return NextResponse.json(
      { error: "Databasequery mislukt. Probeer het later opnieuw." },
      { status: 500 },
    );
  }
}

// Only POST is supported
export async function GET() {
  return NextResponse.json({ error: "Methode niet toegestaan." }, { status: 405 });
}
