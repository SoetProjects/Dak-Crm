import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { CreateLeadInput, UpdateLeadInput, LeadStatus } from "@/lib/types";

// ─── List ────────────────────────────────────

export async function getLeads(companyId: string, status?: LeadStatus) {
  if (!isDatabaseReady()) return [];

  return db.lead.findMany({
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

export async function getLeadById(companyId: string, id: string) {
  if (!isDatabaseReady()) return null;

  return db.lead.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      quotes: {
        select: { id: true, quoteNumber: true, status: true, totalAmount: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ─── Create ──────────────────────────────────

export async function createLead(companyId: string, input: CreateLeadInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.lead.create({
    data: {
      companyId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      requestType: input.requestType,
      notes: input.notes ?? null,
      source: input.source ?? null,
      customerId: input.customerId ?? null,
    },
  });
}

// ─── Update ──────────────────────────────────

export async function updateLead(
  companyId: string,
  id: string,
  input: UpdateLeadInput,
) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.lead.updateMany({
    where: { id, companyId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.requestType !== undefined && { requestType: input.requestType }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
    },
  });
}

export async function updateLeadStatus(
  companyId: string,
  id: string,
  status: LeadStatus,
) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.lead.updateMany({
    where: { id, companyId },
    data: { status },
  });
}

// ─── Delete ──────────────────────────────────

export async function deleteLead(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.lead.deleteMany({ where: { id, companyId } });
}

// ─── Convert lead → customer ─────────────────

export async function convertLeadToCustomer(companyId: string, leadId: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  const lead = await db.lead.findFirst({ where: { id: leadId, companyId } });
  if (!lead) throw new Error("Lead niet gevonden");

  return db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        companyId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        serviceAddress: lead.address,
        serviceCity: lead.city,
      },
    });

    await tx.lead.updateMany({
      where: { id: leadId, companyId },
      data: { status: "WON", customerId: customer.id },
    });

    return customer;
  });
}
