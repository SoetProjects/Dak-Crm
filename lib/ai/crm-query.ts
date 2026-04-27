/**
 * Safe CRM Query Abstraction Layer
 *
 * OpenAI provides structured parameters → this layer executes predefined Prisma queries.
 * No raw SQL, no dynamic code execution. Every query path is explicit and typed.
 */

import { db } from "@/lib/db/prisma";

// ─── Intent types (what OpenAI is allowed to produce) ────────────────────────

export type CrmEntity =
  | "customers"
  | "leads"
  | "jobs"
  | "quotes"
  | "invoices"
  | "materials"
  | "planning";

export type DateRangePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_7_days"
  | "last_30_days"
  | "overdue";

export type CrmFilters = {
  status?: string;
  dateRange?: DateRangePreset;
  search?: string;
  limit?: number;
  isActive?: boolean;
  notContactedDays?: number;
  customerType?: string;
  jobType?: string;
};

export type CrmQueryIntent = {
  entity: CrmEntity;
  filters?: CrmFilters;
};

export type CrmQueryResult = {
  entity: CrmEntity;
  data: Record<string, unknown>[];
  count: number;
  appliedFilters: string[];
  summary: string;
};

// ─── Allowed enum values (whitelist — prevents enum injection) ────────────────

const ALLOWED_STATUSES: Record<CrmEntity, string[]> = {
  leads: ["NEW", "CONTACTED", "APPOINTMENT_PLANNED", "QUOTED", "WON", "LOST"],
  customers: [],
  jobs: ["PLANNED", "IN_PROGRESS", "WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER", "COMPLETED", "CANCELLED"],
  quotes: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  invoices: ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"],
  materials: [],
  planning: ["JOB", "INSPECTION", "QUOTE_VISIT", "MAINTENANCE", "BLOCKED"],
};

const ALLOWED_CUSTOMER_TYPES = ["PRIVATE", "BUSINESS", "HOA", "CONTRACTOR"];
const ALLOWED_JOB_TYPES = ["LEAK", "INSPECTION", "BITUMEN_ROOF", "ROOF_RENOVATION", "ROOF_TERRACE", "MAINTENANCE", "OTHER"];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfLastMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolveDateFilter(preset: DateRangePreset): { gte?: Date; lt?: Date; lte?: Date } {
  switch (preset) {
    case "today":
      return { gte: startOfDay(), lte: endOfDay() };
    case "this_week":
      return { gte: startOfWeek() };
    case "this_month":
      return { gte: startOfMonth() };
    case "last_month":
      return { gte: startOfLastMonth(), lt: startOfMonth() };
    case "last_7_days":
      return { gte: daysAgo(7) };
    case "last_30_days":
      return { gte: daysAgo(30) };
    case "overdue":
      return { lt: startOfDay() };
    default:
      return {};
  }
}

// ─── Input validation ─────────────────────────────────────────────────────────

function validateFilters(entity: CrmEntity, filters: CrmFilters): CrmFilters {
  const clean: CrmFilters = {};

  if (filters.limit !== undefined) {
    clean.limit = Math.min(Math.max(1, Math.floor(filters.limit)), 50);
  }

  if (filters.search) {
    clean.search = String(filters.search).slice(0, 100);
  }

  if (filters.dateRange && Object.values(["today","this_week","this_month","last_month","last_7_days","last_30_days","overdue"]).includes(filters.dateRange)) {
    clean.dateRange = filters.dateRange;
  }

  if (filters.status) {
    const allowed = ALLOWED_STATUSES[entity] ?? [];
    if (allowed.includes(filters.status.toUpperCase())) {
      clean.status = filters.status.toUpperCase();
    }
  }

  if (filters.isActive !== undefined) {
    clean.isActive = Boolean(filters.isActive);
  }

  if (filters.customerType && ALLOWED_CUSTOMER_TYPES.includes(filters.customerType.toUpperCase())) {
    clean.customerType = filters.customerType.toUpperCase();
  }

  if (filters.jobType && ALLOWED_JOB_TYPES.includes(filters.jobType.toUpperCase())) {
    clean.jobType = filters.jobType.toUpperCase();
  }

  if (filters.notContactedDays !== undefined) {
    clean.notContactedDays = Math.min(Math.max(1, Math.floor(filters.notContactedDays)), 365);
  }

  return clean;
}

// ─── Query executors (one per entity) ────────────────────────────────────────

async function queryCustomers(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  where.isActive = f.isActive !== false; // default: only active
  applied.push(f.isActive === false ? "Inclusief gearchiveerde klanten" : "Alleen actieve klanten");

  if (f.customerType) {
    where.customerType = f.customerType;
    applied.push(`Type: ${f.customerType}`);
  }

  if (f.search) {
    where.OR = [
      { name: { contains: f.search, mode: "insensitive" } },
      { city: { contains: f.search, mode: "insensitive" } },
      { email: { contains: f.search, mode: "insensitive" } },
      { contactPerson: { contains: f.search, mode: "insensitive" } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    where.createdAt = dateF;
    applied.push(`Aangemaakt: ${f.dateRange.replace(/_/g, " ")}`);
  }

  if (f.notContactedDays) {
    // Customers whose most recent job/quote is older than N days (or have none)
    const cutoff = daysAgo(f.notContactedDays);
    where.AND = [
      {
        OR: [
          { jobs: { none: { createdAt: { gte: cutoff } } } },
          { jobs: { none: {} } },
        ],
      },
    ];
    applied.push(`Geen contact in ${f.notContactedDays} dagen`);
  }

  return db.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      customerType: true,
      contactPerson: true,
      phone: true,
      email: true,
      billingCity: true,
      createdAt: true,
      _count: { select: { jobs: true, quotes: true, invoices: true } },
    },
    orderBy: { name: "asc" },
    take: f.limit ?? 20,
  });
}

async function queryLeads(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  if (f.status) {
    where.status = f.status;
    applied.push(`Status: ${f.status}`);
  }

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    where.createdAt = dateF;
    applied.push(`Aangemaakt: ${f.dateRange.replace(/_/g, " ")}`);
  }

  if (f.search) {
    where.OR = [
      { name: { contains: f.search, mode: "insensitive" } },
      { city: { contains: f.search, mode: "insensitive" } },
      { email: { contains: f.search, mode: "insensitive" } },
      { description: { contains: f.search, mode: "insensitive" } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  return db.lead.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      requestType: true,
      status: true,
      source: true,
      description: true,
      createdAt: true,
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: f.limit ?? 20,
  });
}

async function queryJobs(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  if (f.status) {
    where.status = f.status;
    applied.push(`Status: ${f.status}`);
  }

  if (f.jobType) {
    where.jobType = f.jobType;
    applied.push(`Type: ${f.jobType}`);
  }

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    if (f.dateRange === "overdue") {
      // Jobs that were scheduled in the past but not completed
      where.scheduledEnd = { lt: startOfDay() };
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      applied.push("Verlopen (niet afgerond)");
    } else {
      where.scheduledStart = dateF;
      applied.push(`Gepland: ${f.dateRange.replace(/_/g, " ")}`);
    }
  }

  if (f.search) {
    where.OR = [
      { title: { contains: f.search, mode: "insensitive" } },
      { address: { contains: f.search, mode: "insensitive" } },
      { city: { contains: f.search, mode: "insensitive" } },
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  return db.job.findMany({
    where,
    select: {
      id: true,
      jobNumber: true,
      title: true,
      status: true,
      jobType: true,
      address: true,
      city: true,
      scheduledStart: true,
      scheduledEnd: true,
      completedAt: true,
      customer: { select: { id: true, name: true } },
    },
    orderBy: { scheduledStart: "desc" },
    take: f.limit ?? 20,
  });
}

async function queryQuotes(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  if (f.status) {
    where.status = f.status;
    applied.push(`Status: ${f.status}`);
  }

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    if (f.dateRange === "overdue") {
      where.validUntil = { lt: startOfDay() };
      where.status = { notIn: ["ACCEPTED", "REJECTED"] };
      applied.push("Verlopen offertes");
    } else {
      where.createdAt = dateF;
      applied.push(`Aangemaakt: ${f.dateRange.replace(/_/g, " ")}`);
    }
  }

  if (f.search) {
    where.OR = [
      { title: { contains: f.search, mode: "insensitive" } },
      { quoteNumber: { contains: f.search, mode: "insensitive" } },
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  return db.quote.findMany({
    where,
    select: {
      id: true,
      quoteNumber: true,
      title: true,
      status: true,
      subtotal: true,
      totalAmount: true,
      validUntil: true,
      createdAt: true,
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: f.limit ?? 20,
  });
}

async function queryInvoices(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  if (f.status) {
    where.status = f.status;
    applied.push(`Status: ${f.status}`);
  }

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    if (f.dateRange === "overdue") {
      where.dueDate = { lt: startOfDay() };
      where.status = { notIn: ["PAID", "CANCELLED"] };
      applied.push("Te laat (niet betaald)");
    } else {
      where.invoiceDate = dateF;
      applied.push(`Factuurdatum: ${f.dateRange.replace(/_/g, " ")}`);
    }
  }

  if (f.search) {
    where.OR = [
      { invoiceNumber: { contains: f.search, mode: "insensitive" } },
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  return db.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      subtotal: true,
      totalAmount: true,
      invoiceDate: true,
      dueDate: true,
      paidAt: true,
      customer: { select: { id: true, name: true } },
    },
    orderBy: { invoiceDate: "desc" },
    take: f.limit ?? 20,
  });
}

async function queryMaterials(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId, isActive: true };

  if (f.search) {
    where.OR = [
      { name: { contains: f.search, mode: "insensitive" } },
      { category: { contains: f.search, mode: "insensitive" } },
    ];
    applied.push(`Zoekterm: "${f.search}"`);
  }

  return db.material.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      defaultPrice: true,
      stockQuantity: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: f.limit ?? 50,
  });
}

async function queryPlanning(companyId: string, f: CrmFilters, applied: string[]) {
  const where: Record<string, unknown> = { companyId };

  if (f.dateRange) {
    const dateF = resolveDateFilter(f.dateRange);
    where.startAt = dateF;
    applied.push(`Datum: ${f.dateRange.replace(/_/g, " ")}`);
  } else {
    // Default: next 7 days
    where.startAt = { gte: startOfDay() };
    applied.push("Komende periode");
  }

  return db.planningItem.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      allDay: true,
      job: { select: { id: true, jobNumber: true, title: true, status: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { startAt: "asc" },
    take: f.limit ?? 30,
  });
}

// ─── Generate plain-Dutch summary ─────────────────────────────────────────────

function generateSummary(entity: CrmEntity, count: number, filters: CrmFilters): string {
  const labels: Record<CrmEntity, [string, string]> = {
    customers: ["klant", "klanten"],
    leads: ["lead", "leads"],
    jobs: ["werkbon", "werkbonnen"],
    quotes: ["offerte", "offertes"],
    invoices: ["factuur", "facturen"],
    materials: ["materiaal", "materialen"],
    planning: ["planning item", "planning items"],
  };
  const [singular, plural] = labels[entity];
  const label = count === 1 ? singular : plural;

  if (count === 0) return `Geen ${plural} gevonden met de opgegeven filters.`;

  let summary = `${count} ${label} gevonden`;

  if (filters.status) summary += ` met status "${filters.status}"`;
  if (filters.dateRange) {
    const dateLabels: Record<DateRangePreset, string> = {
      today: " van vandaag",
      this_week: " van deze week",
      this_month: " van deze maand",
      last_month: " van vorige maand",
      last_7_days: " van de afgelopen 7 dagen",
      last_30_days: " van de afgelopen 30 dagen",
      overdue: " die te laat zijn",
    };
    summary += dateLabels[filters.dateRange] ?? "";
  }
  if (filters.search) summary += ` die overeenkomen met "${filters.search}"`;
  if (filters.notContactedDays) summary += ` zonder recente contactactiviteit (>${filters.notContactedDays} dagen)`;

  return summary + ".";
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function executeSafeQuery(
  intent: CrmQueryIntent,
  companyId: string,
): Promise<CrmQueryResult> {
  const { entity } = intent;
  const rawFilters = intent.filters ?? {};
  const f = validateFilters(entity, rawFilters);
  const applied: string[] = [];

  let data: Record<string, unknown>[];

  switch (entity) {
    case "customers":
      data = (await queryCustomers(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "leads":
      data = (await queryLeads(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "jobs":
      data = (await queryJobs(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "quotes":
      data = (await queryQuotes(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "invoices":
      data = (await queryInvoices(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "materials":
      data = (await queryMaterials(companyId, f, applied)) as Record<string, unknown>[];
      break;
    case "planning":
      data = (await queryPlanning(companyId, f, applied)) as Record<string, unknown>[];
      break;
    default:
      data = [];
  }

  return {
    entity,
    data,
    count: data.length,
    appliedFilters: applied,
    summary: generateSummary(entity, data.length, f),
  };
}

// ─── OpenAI tool schema (exported for use in API route) ───────────────────────

export const CRM_QUERY_TOOL = {
  type: "function" as const,
  function: {
    name: "query_crm",
    description:
      "Query the CRM database. Use this for any question about customers, leads, jobs, quotes, invoices, materials or planning.",
    parameters: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: ["customers", "leads", "jobs", "quotes", "invoices", "materials", "planning"],
          description: "The type of data to retrieve.",
        },
        filters: {
          type: "object",
          description: "Optional filters to narrow the results.",
          properties: {
            status: {
              type: "string",
              description:
                "Filter by status. For leads: NEW, CONTACTED, APPOINTMENT_PLANNED, QUOTED, WON, LOST. For jobs: PLANNED, IN_PROGRESS, WAITING_FOR_MATERIAL, WAITING_FOR_WEATHER, COMPLETED, CANCELLED. For quotes: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED. For invoices: DRAFT, SENT, PAID, OVERDUE, CANCELLED.",
            },
            dateRange: {
              type: "string",
              enum: [
                "today",
                "this_week",
                "this_month",
                "last_month",
                "last_7_days",
                "last_30_days",
                "overdue",
              ],
              description: "Filter by a date range preset.",
            },
            search: {
              type: "string",
              description: "Text search across name, email, city, description fields.",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (1-50). Default is 20.",
            },
            isActive: {
              type: "boolean",
              description: "For customers/materials: true = active only (default), false = include archived.",
            },
            notContactedDays: {
              type: "number",
              description:
                "For customers: return customers with no job activity in the last N days.",
            },
            customerType: {
              type: "string",
              enum: ["PRIVATE", "BUSINESS", "HOA", "CONTRACTOR"],
              description: "Filter customers by type.",
            },
            jobType: {
              type: "string",
              enum: [
                "LEAK",
                "INSPECTION",
                "BITUMEN_ROOF",
                "ROOF_RENOVATION",
                "ROOF_TERRACE",
                "MAINTENANCE",
                "OTHER",
              ],
              description: "Filter jobs by type.",
            },
          },
          additionalProperties: false,
        },
      },
      required: ["entity"],
      additionalProperties: false,
    },
  },
} as const;

export const CRM_SYSTEM_PROMPT = `You are an AI assistant for a Dutch roofing company CRM called DakCRM.
Your task is to translate questions (Dutch or English) into structured database queries using the query_crm function.

Business context:
- The company manages leads, customers (klanten), jobs (werkbonnen), quotes (offertes), invoices (facturen), and materials (materialen).
- Customers can be: PRIVATE (particulier), BUSINESS (zakelijk), HOA (VvE), CONTRACTOR (aannemer).
- Jobs can be: LEAK (lekkage), INSPECTION (inspectie), BITUMEN_ROOF (bitumen dak), ROOF_RENOVATION (dakrenovatie), ROOF_TERRACE (dakterras), MAINTENANCE, OTHER.
- A lead becomes a customer after conversion. Quotes come from customers. Jobs come from accepted quotes.

Rules:
- Always call query_crm. Never answer without calling the function.
- "recent" or "niet benaderd" → use notContactedDays: 30
- "vandaag" → dateRange: today
- "deze maand" / "this month" → dateRange: this_month
- "actief" without context → for jobs use status: IN_PROGRESS, for customers use isActive: true
- "open" for quotes/invoices → status: SENT or DRAFT
- When the user asks "which" or "welke", they want a list — use appropriate filters
- Keep limit at 20 unless user asks for more or fewer
- Prefer specific filters over broad searches`;
