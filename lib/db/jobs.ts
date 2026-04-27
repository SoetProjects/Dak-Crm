import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { CreateJobInput, UpdateJobInput, JobStatus } from "@/lib/types";

async function nextJobNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const last = await db.job.findFirst({
    where: { companyId, jobNumber: { startsWith: `JOB-${year}-` } },
    orderBy: { jobNumber: "desc" },
  });
  const seq = last?.jobNumber ? parseInt(last.jobNumber.split("-").pop() ?? "0") + 1 : 1;
  return `JOB-${year}-${String(seq).padStart(4, "0")}`;
}

export async function getJobs(
  companyId: string,
  filters?: { status?: JobStatus; customerId?: string; from?: Date; to?: Date },
) {
  if (!isDatabaseReady()) return [];
  return db.job.findMany({
    where: {
      companyId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      ...(filters?.from || filters?.to
        ? { scheduledStart: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } }
        : {}),
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });
}

export async function getJobById(companyId: string, id: string) {
  if (!isDatabaseReady()) return null;
  return db.job.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      quote: { select: { id: true, quoteNumber: true, status: true, totalAmount: true } },
      assignments: {
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, role: true } } },
      },
      jobNotes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      photos: { orderBy: { createdAt: "desc" } },
      timeEntries: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { startedAt: "desc" },
      },
      jobMaterials: {
        include: { material: { select: { name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getJobsForRange(companyId: string, from: Date, to: Date) {
  if (!isDatabaseReady()) return [];
  return db.job.findMany({
    where: {
      companyId,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      scheduledStart: { gte: from, lt: to },
    },
    include: {
      customer: { select: { name: true } },
      assignments: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });
}

export async function createJob(companyId: string, input: CreateJobInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  const jobNumber = await nextJobNumber(companyId);
  return db.job.create({
    data: {
      companyId,
      customerId: input.customerId,
      quoteId: input.quoteId ?? null,
      leadId: input.leadId ?? null,
      jobNumber,
      title: input.title,
      description: input.description ?? null,
      address: input.address ?? null,
      postalCode: input.postalCode ?? null,
      city: input.city ?? null,
      jobType: input.jobType,
      scheduledStart: input.scheduledStart ?? null,
      scheduledEnd: input.scheduledEnd ?? null,
      internalNotes: input.internalNotes ?? null,
      customerNotes: input.customerNotes ?? null,
    },
  });
}

export async function updateJob(companyId: string, id: string, input: UpdateJobInput) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.job.updateMany({
    where: { id, companyId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.jobType !== undefined && { jobType: input.jobType }),
      ...(input.scheduledStart !== undefined && { scheduledStart: input.scheduledStart }),
      ...(input.scheduledEnd !== undefined && { scheduledEnd: input.scheduledEnd }),
      ...(input.internalNotes !== undefined && { internalNotes: input.internalNotes }),
      ...(input.customerNotes !== undefined && { customerNotes: input.customerNotes }),
    },
  });
}

export async function updateJobStatus(companyId: string, id: string, status: JobStatus) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") data.completedAt = new Date();
  return db.job.updateMany({ where: { id, companyId }, data });
}

export async function assignWorker(companyId: string, jobId: string, userId: string, isLead = false) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.jobAssignment.upsert({
    where: { jobId_userId: { jobId, userId } },
    update: { isLead },
    create: { companyId, jobId, userId, isLead },
  });
}

export async function unassignWorker(companyId: string, jobId: string, userId: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.jobAssignment.deleteMany({ where: { jobId, userId, companyId } });
}

export async function addJobNote(companyId: string, jobId: string, authorId: string, content: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.jobNote.create({ data: { companyId, jobId, authorId, content } });
}

export async function deleteJob(companyId: string, id: string) {
  if (!isDatabaseReady()) throw new Error("Database niet beschikbaar");
  return db.job.deleteMany({ where: { id, companyId } });
}
