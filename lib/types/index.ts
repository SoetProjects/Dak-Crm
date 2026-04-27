/**
 * DakCRM – gedeelde TypeScript typen
 * Afgeleid van het Prisma-schema.
 */

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type UserRole = "ADMIN" | "OFFICE" | "FIELD_WORKER";

export type CustomerType = "PRIVATE" | "BUSINESS" | "HOA" | "CONTRACTOR";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "APPOINTMENT_PLANNED"
  | "QUOTED"
  | "WON"
  | "LOST";

export type RequestType =
  | "LEAK"
  | "RENOVATION"
  | "INSPECTION"
  | "BITUMEN_ROOF"
  | "ROOF_TERRACE"
  | "OTHER";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type JobType =
  | "LEAK"
  | "INSPECTION"
  | "BITUMEN_ROOF"
  | "ROOF_RENOVATION"
  | "ROOF_TERRACE"
  | "MAINTENANCE"
  | "OTHER";

export type JobStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_MATERIAL"
  | "WAITING_FOR_WEATHER"
  | "COMPLETED"
  | "CANCELLED";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type PlanningItemType = "JOB" | "INSPECTION" | "QUOTE_VISIT" | "MAINTENANCE" | "BLOCKED";

export type TimeEntryType = "WORK" | "TRAVEL" | "BREAK";

export type MaterialUnit = "M2" | "M1" | "STUK" | "UUR" | "DAG" | "KG" | "L" | "POST";

export type IntegrationProvider = "MOLLIE" | "OPENWEATHER" | "POSTCODE_API" | "EMAIL" | "SNELSTART";

export type IntegrationStatus = "ACTIVE" | "INACTIVE" | "ERROR";

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nieuw",
  CONTACTED: "Benaderd",
  APPOINTMENT_PLANNED: "Afspraak gepland",
  QUOTED: "Offerte uitgebracht",
  WON: "Gewonnen",
  LOST: "Verloren",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  LEAK: "Lekkage",
  RENOVATION: "Renovatie",
  INSPECTION: "Inspectie",
  BITUMEN_ROOF: "Bitumen dak",
  ROOF_TERRACE: "Dakterras",
  OTHER: "Overig",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  ACCEPTED: "Geaccepteerd",
  REJECTED: "Afgewezen",
  EXPIRED: "Verlopen",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal",
  WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  LEAK: "Lekkage",
  INSPECTION: "Inspectie",
  BITUMEN_ROOF: "Bitumen dak",
  ROOF_RENOVATION: "Dakrenovatie",
  ROOF_TERRACE: "Dakterras",
  MAINTENANCE: "Onderhoud",
  OTHER: "Overig",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  PAID: "Betaald",
  OVERDUE: "Te laat",
  CANCELLED: "Geannuleerd",
};

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  M2: "m²",
  M1: "m¹",
  STUK: "stuk",
  UUR: "uur",
  DAG: "dag",
  KG: "kg",
  L: "L",
  POST: "post",
};

// ─────────────────────────────────────────────
// Row types (database output)
// ─────────────────────────────────────────────

export type CompanyRow = {
  id: string;
  name: string;
  kvkNumber: string | null;
  vatNumber: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
};

export type CustomerRow = {
  id: string;
  companyId: string;
  customerType: CustomerType;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  serviceAddress: string | null;
  servicePostalCode: string | null;
  serviceCity: string | null;
  kvkNumber: string | null;
  vatNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadRow = {
  id: string;
  companyId: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  requestType: RequestType;
  status: LeadStatus;
  source: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteRow = {
  id: string;
  companyId: string;
  customerId: string;
  leadId: string | null;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  validUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JobRow = {
  id: string;
  companyId: string;
  customerId: string;
  quoteId: string | null;
  leadId: string | null;
  jobNumber: string | null;
  title: string;
  description: string | null;
  jobType: JobType;
  status: JobStatus;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  completedAt: Date | null;
  internalNotes: string | null;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceRow = {
  id: string;
  companyId: string;
  customerId: string;
  jobId: string | null;
  quoteId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  invoiceDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

// ─────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────

export type CreateLeadInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  requestType: RequestType;
  status?: LeadStatus;
  source?: string | null;
  description?: string | null;
  customerId?: string | null;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

export type CreateCustomerInput = {
  customerType?: CustomerType;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  serviceAddress?: string | null;
  servicePostalCode?: string | null;
  serviceCity?: string | null;
  kvkNumber?: string | null;
  vatNumber?: string | null;
  notes?: string | null;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateQuoteInput = {
  customerId: string;
  leadId?: string | null;
  title?: string;
  notes?: string | null;
  validUntil?: Date | null;
  vatPercentage?: number;
};

export type UpdateQuoteInput = Partial<Omit<CreateQuoteInput, "customerId">>;

export type CreateJobInput = {
  customerId: string;
  quoteId?: string | null;
  leadId?: string | null;
  title: string;
  description?: string | null;
  jobType: JobType;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
};

export type UpdateJobInput = Partial<Omit<CreateJobInput, "customerId">>;

// ─────────────────────────────────────────────
// Dashboard types
// ─────────────────────────────────────────────

export type DashboardStats = {
  jobsToday: number;
  planningToday: number;
  openLeads: number;
  openQuotes: number;
  activeJobs: number;
  waitingJobs: number;
  openInvoicesCount: number;
  openInvoicesTotal: number;
};
