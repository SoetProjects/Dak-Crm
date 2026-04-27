import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "border-blue-400 bg-blue-50",
  IN_PROGRESS: "border-yellow-400 bg-yellow-50",
  WAITING_FOR_MATERIAL: "border-orange-400 bg-orange-50",
  WAITING_FOR_WEATHER: "border-sky-400 bg-sky-50",
  COMPLETED: "border-green-400 bg-green-50",
  CANCELLED: "border-slate-200 bg-slate-50",
};
const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal",
  WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export default async function MobileHomePage() {
  const session = await getAppSession();
  const today = new Date();
  const dayLabel = today.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  if (!isDatabaseReady()) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-[var(--primary)]">Vandaag</h1>
        <p className="text-sm text-slate-500">Database niet beschikbaar.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);

  const [todayJobs, upcomingJobs] = await Promise.all([
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        scheduledStart: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        scheduledStart: { gt: endOfDay(today) },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-400 capitalize">{dayLabel}</p>
        <h1 className="text-2xl font-bold text-[var(--primary)]">Vandaag</h1>
      </div>

      {/* Today's jobs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Jobs vandaag ({todayJobs.length})
          </h2>
          <Link href="/mobile/jobs" className="text-sm text-[var(--accent)]">Alle →</Link>
        </div>

        {todayJobs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 text-center">
            <p className="text-slate-400 text-sm">Geen jobs gepland voor vandaag.</p>
            <p className="text-slate-300 text-xs mt-1">Geniet van de rust! ☀️</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <Link
                key={job.id}
                href={`/mobile/jobs/${job.id}`}
                className={`block rounded-2xl border-l-4 bg-white border border-slate-200 p-4 active:scale-[0.98] transition-transform ${STATUS_COLORS[job.status] ?? "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate text-base">{job.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{job.customer.name}</p>
                    {job.address && (
                      <p className="text-xs text-slate-400 mt-1">📍 {job.address}{job.city ? `, ${job.city}` : ""}</p>
                    )}
                    {job.scheduledStart && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        🕐 {new Date(job.scheduledStart).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                        {job.scheduledEnd && ` — ${new Date(job.scheduledEnd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs rounded-full px-2 py-1 bg-white/80 border border-slate-200 text-slate-600 whitespace-nowrap">
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Snel doen</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/mobile/jobs"
            className="rounded-2xl bg-[var(--primary)] text-white p-4 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl">🔨</span>
            <p className="mt-1 text-sm font-semibold">Open job</p>
          </Link>
          <Link
            href="/planning"
            className="rounded-2xl bg-white border border-slate-200 text-[var(--primary)] p-4 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl">📅</span>
            <p className="mt-1 text-sm font-semibold">Planning</p>
          </Link>
        </div>
      </section>

      {/* Upcoming jobs */}
      {upcomingJobs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Aankomende jobs</h2>
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <Link
                key={job.id}
                href={`/mobile/jobs/${job.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3 active:scale-[0.98] transition-transform"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.customer.name}</p>
                </div>
                {job.scheduledStart && (
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(job.scheduledStart).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(job.scheduledStart).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
