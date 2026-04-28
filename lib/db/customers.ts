import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/lib/types";

// ─── List ────────────────────────────────────

export async function getCustomers(companyId: string, search?: string) {
  if (!isDatabaseReady()) return [];

  return db.customer.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

// ─── Single ──────────────────────────────────

export async function getCustomerById(companyId: string, id: string) {
  if (!isDatabaseReady()) return null;

  return db.customer.findFirst({
    where: { id, companyId },
    include: {
      quotes: {
        select: { id: true, quoteNumber: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      jobs: {
        select: { id: true, title: true, status: true, scheduledStart: true, jobType: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

// ─── Create ──────────────────────────────────

export async function createCustomer(companyId: string, input: CreateCustomerInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.customer.create({
    data: {
      companyId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      billingAddress: input.billingAddress ?? null,
      billingPostalCode: input.billingPostalCode ?? null,
      billingCity: input.billingCity ?? null,
      serviceAddress: input.serviceAddress ?? null,
      servicePostalCode: input.servicePostalCode ?? null,
      serviceCity: input.serviceCity ?? null,
      kvkNumber: input.kvkNumber ?? null,
      vatNumber: input.vatNumber ?? null,
      notes: input.notes ?? null,
    },
  });
}

// ─── Update ──────────────────────────────────

export async function updateCustomer(
  companyId: string,
  id: string,
  input: UpdateCustomerInput,
) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.customer.updateMany({
    where: { id, companyId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.billingAddress !== undefined && { billingAddress: input.billingAddress }),
      ...(input.billingPostalCode !== undefined && { billingPostalCode: input.billingPostalCode }),
      ...(input.billingCity !== undefined && { billingCity: input.billingCity }),
      ...(input.serviceAddress !== undefined && { serviceAddress: input.serviceAddress }),
      ...(input.servicePostalCode !== undefined && { servicePostalCode: input.servicePostalCode }),
      ...(input.serviceCity !== undefined && { serviceCity: input.serviceCity }),
      ...(input.kvkNumber !== undefined && { kvkNumber: input.kvkNumber }),
      ...(input.vatNumber !== undefined && { vatNumber: input.vatNumber }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

// ─── Soft delete ─────────────────────────────

export async function archiveCustomer(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.customer.updateMany({
    where: { id, companyId },
    data: { isActive: false },
  });
}

export async function deleteCustomer(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");

  return db.customer.deleteMany({ where: { id, companyId } });
}
