import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { db } from "@/lib/db/prisma";

/**
 * POST /api/quotes
 * Creates a quote with pre-computed lines (used by the AI quote generator).
 * The standard quote creation via server actions handles the basic form —
 * this route handles the richer AI-generated payload (lines included in one call).
 */
export async function POST(req: NextRequest) {
  const session = await getAppSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  if (!isDatabaseReady()) {
    return NextResponse.json({ error: "Database niet beschikbaar." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Validate required fields
  if (typeof b.customerId !== "string" || !b.customerId) {
    return NextResponse.json({ error: "customerId is verplicht." }, { status: 400 });
  }
  if (typeof b.title !== "string" || !b.title.trim()) {
    return NextResponse.json({ error: "title is verplicht." }, { status: 400 });
  }

  // Verify customer belongs to this company
  const customer = await db.customer.findFirst({
    where: { id: b.customerId, companyId: session.companyId },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden." }, { status: 404 });
  }

  // Generate quote number
  const year = new Date().getFullYear();
  const last = await db.quote.findFirst({
    where: { companyId: session.companyId, quoteNumber: { startsWith: `OFF-${year}-` } },
    orderBy: { quoteNumber: "desc" },
  });
  const seq = last ? parseInt(last.quoteNumber.split("-").pop() ?? "0") + 1 : 1;
  const quoteNumber = `OFF-${year}-${String(seq).padStart(4, "0")}`;

  // Parse and validate lines
  type RawLine = { description: string; quantity: number; unit: string; unitPrice: number; vatPercentage?: number; totalAmount: number; sortOrder?: number };
  const rawLines: RawLine[] = Array.isArray(b.lines) ? b.lines as RawLine[] : [];

  try {
    const quote = await db.quote.create({
      data: {
        companyId: session.companyId,
        customerId: b.customerId,
        quoteNumber,
        title: String(b.title).slice(0, 200),
        notes: typeof b.notes === "string" ? b.notes.slice(0, 2000) : null,
        validUntil: typeof b.validUntil === "string" ? new Date(b.validUntil) : null,
        status: "DRAFT",
        subtotal: typeof b.subtotal === "number" ? b.subtotal : 0,
        vatPercentage: 21,
        vatAmount: typeof b.vatAmount === "number" ? b.vatAmount : 0,
        totalAmount: typeof b.totalAmount === "number" ? b.totalAmount : 0,
        lines: rawLines.length
          ? {
              create: rawLines.map((l, i) => ({
                companyId: session.companyId,
                description: String(l.description ?? "").slice(0, 200),
                quantity: Math.max(0, Number(l.quantity) || 0),
                unit: String(l.unit ?? "stuk").slice(0, 20),
                unitPrice: Math.max(0, Number(l.unitPrice) || 0),
                vatPercentage: 21,
                totalAmount: Math.round(Math.max(0, Number(l.quantity) || 0) * Math.max(0, Number(l.unitPrice) || 0) * 100) / 100,
                sortOrder: typeof l.sortOrder === "number" ? l.sortOrder : i,
              })),
            }
          : undefined,
      },
      select: { id: true, quoteNumber: true },
    });

    return NextResponse.json({ id: quote.id, quoteNumber: quote.quoteNumber });
  } catch (err) {
    console.error("[api/quotes POST]", err);
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }
}
