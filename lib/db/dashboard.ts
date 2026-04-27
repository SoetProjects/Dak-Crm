import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { Decimal } from "@prisma/client/runtime/library";
import type { DashboardStats, TodayJob, TodayPlanningItem } from "@/lib/types";

function toNumber(d: Decimal | number): number {
  return typeof d === "number" ? d : d.toNumber();
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// ─────────────────────────────────────────────
// Summary stats for the dashboard header
// ─────────────────────────────────────────────

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const empty: DashboardStats = {
    openLeads: 0,
    openQuotes: 0,
    activeJobs: 0,
    jobsToday: 0,
    plannedWorkersToday: 0,
    overdueInvoices: 0,
    openInvoicesAmount: 0,
  };

  if (!isDatabaseReady()) return empty;

  const { start, end } = todayRange();
  const now = new Date();

  const [
    openLeads,
    openQuotes,
    activeJobs,
    jobsToday,
    workersToday,
    overdueInvoices,
    openInvoices,
  ] = await Promise.all([
    // Open leads
    db.lead.count({
      where: { companyId, status: { in: ["NEW", "CONTACTED"] } },
    }),

    // Open quotes
    db.quote.count({
      where: { companyId, status: { in: ["DRAFT", "SENT"] } },
    }),

    // Active jobs
    db.job.count({
      where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    }),

    // Jobs scheduled today
    db.job.count({
      where: {
        companyId,
        status: { notIn: ["CANCELLED"] },
        scheduledStart: { gte: start, lt: end },
      },
    }),

    // Unique workers assigned to today's jobs
    db.jobAssignment.findMany({
      where: {
        companyId,
        job: {
          scheduledStart: { gte: start, lt: end },
          status: { notIn: ["CANCELLED"] },
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),

    // Overdue invoices
    db.invoice.count({
      where: {
        companyId,
        status: { in: ["SENT", "OVERDUE"] },
        dueDate: { lt: now },
      },
    }),

    // Open invoices total amount
    db.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "OVERDUE"] },
      },
      select: { totalAmount: true },
    }),
  ]);

  const openInvoicesAmount = openInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount),
    0,
  );

  return {
    openLeads,
    openQuotes,
    activeJobs,
    jobsToday,
    plannedWorkersToday: workersToday.length,
    overdueInvoices,
    openInvoicesAmount: Math.round(openInvoicesAmount * 100) / 100,
  };
}

// ─────────────────────────────────────────────
// Jobs today
// ─────────────────────────────────────────────

export async function getJobsToday(companyId: string): Promise<TodayJob[]> {
  if (!isDatabaseReady()) return [];

  const { start, end } = todayRange();

  const jobs = await db.job.findMany({
    where: {
      companyId,
      status: { notIn: ["CANCELLED"] },
      scheduledStart: { gte: start, lt: end },
    },
    include: {
      customer: { select: { name: true } },
      assignments: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    address: job.address,
    city: job.city,
    status: job.status,
    scheduledStart: job.scheduledStart,
    scheduledEnd: job.scheduledEnd,
    customerName: job.customer.name,
    assignedWorkers: job.assignments.map(
      (a) => `${a.user.firstName} ${a.user.lastName}`,
    ),
  }));
}

// ─────────────────────────────────────────────
// Planning items today
// ─────────────────────────────────────────────

export async function getPlanningToday(companyId: string): Promise<TodayPlanningItem[]> {
  if (!isDatabaseReady()) return [];

  const { start, end } = todayRange();

  const items = await db.planningItem.findMany({
    where: {
      companyId,
      startAt: { gte: start, lt: end },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      job: { select: { title: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    startAt: item.startAt,
    endAt: item.endAt,
    workerName: item.user
      ? `${item.user.firstName} ${item.user.lastName}`
      : null,
    jobTitle: item.job?.title ?? null,
  }));
}

// ─────────────────────────────────────────────
// Open leads
// ─────────────────────────────────────────────

export async function getOpenLeads(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];

  return db.lead.findMany({
    where: { companyId, status: { in: ["NEW", "CONTACTED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────
// Open quotes
// ─────────────────────────────────────────────

export async function getOpenQuotes(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];

  return db.quote.findMany({
    where: { companyId, status: { in: ["DRAFT", "SENT"] } },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────
// Active jobs
// ─────────────────────────────────────────────

export async function getActiveJobs(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];

  return db.job.findMany({
    where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    include: {
      customer: { select: { name: true } },
      assignments: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────
// Planned workers today
// ─────────────────────────────────────────────

export async function getPlannedWorkersToday(companyId: string) {
  if (!isDatabaseReady()) return [];

  const { start, end } = todayRange();

  const assignments = await db.jobAssignment.findMany({
    where: {
      companyId,
      job: {
        scheduledStart: { gte: start, lt: end },
        status: { notIn: ["CANCELLED"] },
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      job: { select: { id: true, title: true, address: true, scheduledStart: true } },
    },
    distinct: ["userId"],
    orderBy: { user: { lastName: "asc" } },
  });

  return assignments.map((a) => ({
    userId: a.user.id,
    name: `${a.user.firstName} ${a.user.lastName}`,
    phone: a.user.phone,
    jobId: a.job.id,
    jobTitle: a.job.title,
    jobAddress: a.job.address,
    scheduledStart: a.job.scheduledStart,
  }));
}
