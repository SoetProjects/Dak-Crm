import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

type PlanningPageProps = {
  searchParams: Promise<{
    view?: string;
    date?: string;
  }>;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default async function PlanningPage(props: PlanningPageProps) {
  const params = await props.searchParams;
  const view = params.view === "day" ? "day" : "week";
  const baseDate = params.date ? new Date(params.date) : new Date();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Planning</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om planning te laden.
        </p>
      </div>
    );
  }

  const session = await getAppSession();

  const rangeStart = startOfDay(baseDate);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeStart.getDate() + (view === "day" ? 1 : 7));

  const jobs = await db.job.findMany({
    where: {
      companyId: session.companyId,
      scheduledStart: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    include: {
      customer: { select: { name: true } },
      assignments: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const groupedJobs = new Map<string, typeof jobs>();
  for (const job of jobs) {
    if (!job.scheduledStart) continue;
    const key = formatDateKey(job.scheduledStart);
    const current = groupedJobs.get(key) ?? [];
    current.push(job);
    groupedJobs.set(key, current);
  }

  const days: Date[] = [];
  const count = view === "day" ? 1 : 7;
  for (let i = 0; i < count; i += 1) {
    const day = new Date(rangeStart);
    day.setDate(rangeStart.getDate() + i);
    days.push(day);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Planning</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dag- en weekweergave met klik naar jobdetails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/planning?view=day&date=${formatDateKey(baseDate)}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              view === "day"
                ? "bg-[var(--primary)] text-white"
                : "border border-slate-200 bg-white text-[var(--primary)]"
            }`}
          >
            Dag
          </Link>
          <Link
            href={`/planning?view=week&date=${formatDateKey(baseDate)}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              view === "week"
                ? "bg-[var(--primary)] text-white"
                : "border border-slate-200 bg-white text-[var(--primary)]"
            }`}
          >
            Week
          </Link>
        </div>
      </section>

      <section className="grid gap-3">
        {days.map((day) => {
          const key = formatDateKey(day);
          const jobsForDay = groupedJobs.get(key) ?? [];
          return (
            <article key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold text-[var(--primary)]">
                {day.toLocaleDateString("nl-NL", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </h2>
              <div className="mt-3 space-y-2">
                {jobsForDay.length === 0 ? (
                  <p className="text-sm text-slate-500">Geen jobs gepland.</p>
                ) : (
                  jobsForDay.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-[var(--primary)]">{job.title}</p>
                      <p className="text-xs text-slate-600">{job.customer.name}</p>
                      <p className="text-xs text-slate-500">
                        {job.scheduledStart?.toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) ?? "--:--"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
