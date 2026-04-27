/**
 * DakCRM – gedeelde TypeScript typen
 * Afgeleid van het Prisma-schema; gebruik deze typen in UI en server-functies.
 */

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type UserRole = "ADMIN" | "OFFICE" | "FIELD_WORKER";

export type LeadStatus = "NEW" | "CONTACTED" | "QUOTED" | "WON" | "LOST";

export type RequestType =
  | "LEAK"
  | "RENOVATION"
  | "INSPECTION"
  | "MAINTENANCE"
  | "NEW_BUILD"
  | "OTHER";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type JobType =
  | "LEAK"
  | "BITUMEN_ROOF"
  | "ROOF_RENOVATION"
  | "INSPECTION"
  | "MAINTENANCE"
  | "NEW_BUILD"
  | "OTHER";

export type JobStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type PlanningItemType = "JOB" | "MEETING" | "ABSENCE" | "TRAINING" | "OTHER";

export type TimeEntryType = "WORK" | "TRAVEL" | "BREAK";

export type MaterialUnit = "M2" | "M" | "PIECE" | "KG" | "L" | "HOUR" | "SET";

export type IntegrationProvider = "EXACT" | "SNELSTART" | "MONEYBIRD" | "TWINFIELD" | "AFAS" | "OTHER";

export type IntegrationStatus = "ACTIVE" | "INACTIVE" | "ERROR";

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nieuw",
  CONTACTED: "Benaderd",
  QUOTED: "Offerte uitgebracht",
  WON: "Gewonnen",
  LOST: "Verloren",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  LEAK: "Lekkage",
  RENOVATION: "Renovatie",
  INSPECTION: "Inspectie",
  MAINTENANCE: "Onderhoud",
  NEW_BUILD: "Nieuwbouw",
  OTHER: "Overig",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Concept",
  SENT: "Verstuurd",
  ACCEPTED: "Geaccepteerd",
  REJECTED: "Afgewezen",
  EXPIRED: "Verlopen",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  ON_HOLD: "On hold",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  LEAK: "Lekkage",
  BITUMEN_ROOF: "Bitumen dak",
  ROOF_RENOVATION: "Dakrenovatie",
  INSPECTION: "Inspectie",
  MAINTENANCE: "Onderhoud",
  NEW_BUILD: "Nieuwbouw",
  OTHER: "Overig",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Concept",
  SENT: "Verstuurd",
  PAID: "Betaald",
  OVERDUE: "Verlopen",
  CANCELLED: "Geannuleerd",
};

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  M2: "m²",
  M: "m¹",
  PIECE: "stuk",
  KG: "kg",
  L: "liter",
  HOUR: "uur",
  SET: "set",
};

// ─────────────────────────────────────────────
// Entity types (light – voor lijstweergaven)
// ─────────────────────────────────────────────

export type CompanyRow = {
  id: string;
  name: string;
  kvkNumber: string | null;
  vatNumber: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRow = {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

export type CustomerRow = {
  id: string;
  companyId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  serviceAddress: string | null;
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
  city: string | null;
  requestType: RequestType;
  status: LeadStatus;
  notes: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteRow = {
  id: string;
  companyId: string;
  customerId: string;
  leadId: string | null;
  quoteNumber: string;
  status: QuoteStatus;
  subject: string | null;
  totalAmount: number;
  vatAmount: number;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { name: string };
};

export type QuoteLineRow = {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  vatRate: number;
  sortOrder: number;
};

export type JobRow = {
  id: string;
  companyId: string;
  customerId: string;
  quoteId: string | null;
  jobNumber: string | null;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  jobType: JobType;
  status: JobStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { name: string };
  assignments?: { user: { firstName: string; lastName: string } }[];
};

export type PlanningItemRow = {
  id: string;
  companyId: string;
  jobId: string | null;
  userId: string | null;
  type: PlanningItemType;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string | null;
  job?: { title: string } | null;
  user?: { firstName: string; lastName: string } | null;
};

export type TimeEntryRow = {
  id: string;
  jobId: string;
  userId: string;
  type: TimeEntryType;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number | null;
  notes: string | null;
};

export type MaterialRow = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: MaterialUnit;
  costPrice: number | null;
  salesPrice: number | null;
  vatRate: number;
  isActive: boolean;
};

export type JobMaterialRow = {
  id: string;
  jobId: string;
  materialId: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type InvoiceRow = {
  id: string;
  companyId: string;
  customerId: string;
  jobId: string | null;
  quoteId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  subject: string | null;
  invoiceDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  totalAmount: number;
  vatAmount: number;
  createdAt: Date;
  customer?: { name: string };
};

export type IntegrationRow = {
  id: string;
  companyId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  lastSyncAt: Date | null;
  lastError: string | null;
};

// ─────────────────────────────────────────────
// CRUD input types
// ─────────────────────────────────────────────

export type CreateLeadInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  requestType: RequestType;
  notes?: string;
  source?: string;
  customerId?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  status?: LeadStatus;
};

export type CreateCustomerInput = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  billingCity?: string;
  billingZip?: string;
  serviceAddress?: string;
  serviceCity?: string;
  serviceZip?: string;
  kvkNumber?: string;
  vatNumber?: string;
  notes?: string;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateQuoteInput = {
  customerId: string;
  leadId?: string;
  subject?: string;
  notes?: string;
  validUntil?: Date;
  vatRate?: number;
};

export type UpdateQuoteInput = Partial<CreateQuoteInput> & {
  status?: QuoteStatus;
  totalAmount?: number;
  vatAmount?: number;
};

export type CreateQuoteLineInput = {
  quoteId: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate?: number;
  sortOrder?: number;
};

export type CreateJobInput = {
  customerId: string;
  quoteId?: string;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  jobType: JobType;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  notes?: string;
};

export type UpdateJobInput = Partial<CreateJobInput> & {
  status?: JobStatus;
  actualStart?: Date;
  actualEnd?: Date;
  jobNumber?: string;
};

// ─────────────────────────────────────────────
// Dashboard types
// ─────────────────────────────────────────────

export type DashboardStats = {
  openLeads: number;
  openQuotes: number;
  activeJobs: number;
  jobsToday: number;
  plannedWorkersToday: number;
  overdueInvoices: number;
  openInvoicesAmount: number;
};

export type TodayJob = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  status: JobStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  customerName: string;
  assignedWorkers: string[];
};

export type TodayPlanningItem = {
  id: string;
  type: PlanningItemType;
  title: string;
  startAt: Date;
  endAt: Date;
  workerName: string | null;
  jobTitle: string | null;
};
