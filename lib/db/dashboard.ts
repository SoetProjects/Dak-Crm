import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { DashboardStats } from "@/lib/types";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const empty: DashboardStats = {
    jobsToday: 0,
    planningToday: 0,
    openLeads: 0,
    openQuotes: 0,
    activeJobs: 0,
    waitingJobs: 0,
    openInvoicesCount: 0,
    openInvoicesTotal: 0,
  };
  if (!isDatabaseReady()) return empty;

  const { start, end } = todayRange();

  const [jobsToday, planningToday, openLeads, openQuotes, activeJobs, waitingJobs, openInvoices] =
    await Promise.all([
      db.job.count({
        where: { companyId, scheduledStart: { gte: start, lt: end }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      }),
      db.planningItem.count({
        where: { companyId, startAt: { gte: start, lt: end } },
      }),
      db.lead.count({ where: { companyId, status: { notIn: ["WON", "LOST"] } } }),
      db.quote.count({ where: { companyId, status: { in: ["DRAFT", "SENT"] } } }),
      db.job.count({ where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS", "WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER"] } } }),
      db.job.count({ where: { companyId, status: { in: ["WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER"] } } }),
      db.invoice.aggregate({
        where: { companyId, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

  return {
    jobsToday,
    planningToday,
    openLeads,
    openQuotes,
    activeJobs,
    waitingJobs,
    openInvoicesCount: openInvoices._count,
    openInvoicesTotal: Math.round(Number(openInvoices._sum.totalAmount ?? 0) * 100) / 100,
  };
}

export async function getJobsToday(companyId: string) {
  if (!isDatabaseReady()) return [];
  const { start, end } = todayRange();
  return db.job.findMany({
    where: { companyId, status: { notIn: ["CANCELLED"] }, scheduledStart: { gte: start, lt: end } },
    include: {
      customer: { select: { name: true } },
      assignments: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { scheduledStart: "asc" },
  });
}

export async function getPlanningToday(companyId: string) {
  if (!isDatabaseReady()) return [];
  const { start, end } = todayRange();
  return db.planningItem.findMany({
    where: { companyId, startAt: { gte: start, lt: end } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      job: { select: { id: true, title: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getOpenLeads(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];
  return db.lead.findMany({
    where: { companyId, status: { notIn: ["WON", "LOST"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getOpenQuotes(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];
  return db.quote.findMany({
    where: { companyId, status: { in: ["DRAFT", "SENT"] } },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getActiveJobs(companyId: string, limit = 10) {
  if (!isDatabaseReady()) return [];
  return db.job.findMany({
    where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS", "WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER"] } },
    include: {
      customer: { select: { name: true } },
      assignments: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { scheduledStart: "asc" },
    take: limit,
  });
}
