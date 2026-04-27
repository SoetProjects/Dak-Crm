import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { CreateQuoteInput, UpdateQuoteInput, QuoteStatus } from "@/lib/types";

async function nextQuoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.quote.count({
    where: { companyId, quoteNumber: { startsWith: `OFF-${year}-` } },
  });
  return `OFF-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function recalculateQuoteTotals(quoteId: string) {
  const lines = await db.quoteLine.findMany({ where: { quoteId } });
  const subtotal = lines.reduce((s, l) => s + Number(l.totalAmount), 0);
  const vatPct = lines.length > 0 ? Number(lines[0].vatPercentage) : 21;
  const vatAmount = subtotal * (vatPct / 100);
  await db.quote.update({
    where: { id: quoteId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round((subtotal + vatAmount) * 100) / 100,
    },
  });
}

export async function getQuotes(companyId: string, status?: QuoteStatus) {
  if (!isDatabaseReady()) return [];
  return db.quote.findMany({
    where: { companyId, ...(status ? { status } : {}) },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

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

export async function createQuote(companyId: string, input: CreateQuoteInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  const quoteNumber = await nextQuoteNumber(companyId);
  return db.quote.create({
    data: {
      companyId,
      customerId: input.customerId,
      leadId: input.leadId ?? null,
      quoteNumber,
      title: input.title ?? "Offerte",
      notes: input.notes ?? null,
      validUntil: input.validUntil ?? null,
      vatPercentage: input.vatPercentage ?? 21,
    },
  });
}

export async function updateQuote(companyId: string, id: string, input: UpdateQuoteInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.quote.updateMany({
    where: { id, companyId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      ...(input.vatPercentage !== undefined && { vatPercentage: input.vatPercentage }),
    },
  });
}

export async function updateQuoteStatus(companyId: string, id: string, status: QuoteStatus) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.quote.updateMany({ where: { id, companyId }, data: { status } });
}

export async function addQuoteLine(
  companyId: string,
  quoteId: string,
  input: {
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatPercentage?: number;
    sortOrder?: number;
  },
) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  const total = input.quantity * input.unitPrice;
  const line = await db.quoteLine.create({
    data: {
      companyId,
      quoteId,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit ?? "stuk",
      unitPrice: input.unitPrice,
      vatPercentage: input.vatPercentage ?? 21,
      totalAmount: Math.round(total * 100) / 100,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  await recalculateQuoteTotals(quoteId);
  return line;
}

export async function deleteQuoteLine(companyId: string, lineId: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  const line = await db.quoteLine.findFirst({ where: { id: lineId, companyId } });
  if (!line) return;
  await db.quoteLine.delete({ where: { id: lineId } });
  await recalculateQuoteTotals(line.quoteId);
}

export async function deleteQuote(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.quote.deleteMany({ where: { id, companyId } });
}
