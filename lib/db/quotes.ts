import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { Decimal } from "@prisma/client/runtime/library";
import type { CreateQuoteInput, UpdateQuoteInput, CreateQuoteLineInput, QuoteStatus } from "@/lib/types";

// ─── Helpers ─────────────────────────────────

async function nextQuoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.quote.count({
    where: { companyId, quoteNumber: { startsWith: `OFF-${year}-` } },
  });
  return `OFF-${year}-${String(count + 1).padStart(4, "0")}`;
}

function toNumber(d: Decimal | number): number {
  return typeof d === "number" ? d : d.toNumber();
}

// ─── List ────────────────────────────────────

export async function getQuotes(companyId: string, status?: QuoteStatus) {
  if (!isDatabaseReady()) return [];

  return db.quote.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Single ──────────────────────────────────

export async function getQuoteById(companyId: string, id: string) {
  if (!isDatabaseReady()) return null;

  return db.quote.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      lead: { select: { id: true, name: true, requestType: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      jobs: { select: { id: true, title: true, status: true } },
    },
  });
}

// ─── Create ──────────────────────────────────

export async function createQuote(companyId: string, input: CreateQuoteInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  const quoteNumber = await nextQuoteNumber(companyId);

  return db.quote.create({
    data: {
      companyId,
      customerId: input.customerId,
      leadId: input.leadId ?? null,
      quoteNumber,
      subject: input.subject ?? null,
      notes: input.notes ?? null,
      validUntil: input.validUntil ?? null,
      vatRate: input.vatRate ?? 21,
    },
  });
}

// ─── Update ──────────────────────────────────

export async function updateQuote(
  companyId: string,
  id: string,
  input: UpdateQuoteInput,
) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.quote.updateMany({
    where: { id, companyId },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      ...(input.totalAmount !== undefined && { totalAmount: input.totalAmount }),
      ...(input.vatAmount !== undefined && { vatAmount: input.vatAmount }),
    },
  });
}

export async function updateQuoteStatus(
  companyId: string,
  id: string,
  status: QuoteStatus,
) {
  return updateQuote(companyId, id, { status });
}

// ─── Lines ───────────────────────────────────

export async function addQuoteLine(companyId: string, input: CreateQuoteLineInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  const total = input.quantity * input.unitPrice;

  const line = await db.quoteLine.create({
    data: {
      companyId,
      quoteId: input.quoteId,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit ?? "st",
      unitPrice: input.unitPrice,
      total,
      vatRate: input.vatRate ?? 21,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  await recalculateQuoteTotals(companyId, input.quoteId);
  return line;
}

export async function deleteQuoteLine(companyId: string, lineId: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  const line = await db.quoteLine.findFirst({ where: { id: lineId, companyId } });
  if (!line) return;

  await db.quoteLine.delete({ where: { id: lineId } });
  await recalculateQuoteTotals(companyId, line.quoteId);
}

async function recalculateQuoteTotals(companyId: string, quoteId: string) {
  const lines = await db.quoteLine.findMany({ where: { quoteId, companyId } });

  const totalAmount = lines.reduce((sum, l) => sum + toNumber(l.total), 0);
  const vatRate = lines[0] ? toNumber(lines[0].vatRate) : 21;
  const vatAmount = totalAmount - totalAmount / (1 + vatRate / 100);

  await db.quote.updateMany({
    where: { id: quoteId, companyId },
    data: {
      totalAmount: Math.round(totalAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
    },
  });
}

// ─── Delete ──────────────────────────────────

export async function deleteQuote(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.quote.deleteMany({ where: { id, companyId } });
}
