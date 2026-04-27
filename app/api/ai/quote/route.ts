import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { generateQuote, validateQuoteInput } from "@/lib/ai/quote-generator";

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getAppSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek (geen geldige JSON)." }, { status: 400 });
  }

  // 3. Validate input
  const validation = validateQuoteInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 4. Generate
  try {
    const result = await generateQuote(validation.input);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, quote: result.quote });
  } catch (err) {
    console.error("[api/ai/quote]", err);
    return NextResponse.json({ error: "Generatie mislukt." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Gebruik POST." }, { status: 405 });
}
