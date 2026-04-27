import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { generateFollowUps, type FollowUpChannel } from "@/lib/followup/generate-followup";

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getAppSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // 2. Database check
  if (!isDatabaseReady()) {
    return NextResponse.json(
      { error: "Database niet beschikbaar. Controleer DATABASE_URL." },
      { status: 503 },
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek (geen geldige JSON)." }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;

  const notContactedDays =
    typeof parsed.notContactedDays === "number"
      ? parsed.notContactedDays
      : 30;

  const limit =
    typeof parsed.limit === "number"
      ? parsed.limit
      : 5;

  const validChannels = ["whatsapp", "email", "both"];
  const channel = validChannels.includes(String(parsed.channel))
    ? (parsed.channel as FollowUpChannel | "both")
    : "both";

  // 4. Generate follow-ups
  try {
    const result = await generateFollowUps({
      companyId: session.companyId,
      notContactedDays,
      limit,
      channel,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[followup] error:", msg);
    return NextResponse.json(
      { error: "Generatie mislukt. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Gebruik POST." }, { status: 405 });
}
