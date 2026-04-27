import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "border-blue-400",
  IN_PROGRESS: "border-yellow-400",
  WAITING_FOR_MATERIAL: "border-orange-400",
  WAITING_FOR_WEATHER: "border-sky-400",
  COMPLETED: "border-green-400",
  CANCELLED: "border-slate-300",
};
const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht materiaal",
  WAITING_FOR_WEATHER: "Wacht weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};
const STATUS_BADGE: Record<string, string> = {
  PLANNED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700",
  WAITING_FOR_MATERIAL: "bg-orange-50 text-orange-700",
  WAITING_FOR_WEATHER: "bg-sky-50 text-sky-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};
const TYPE_LABELS: Record<string, string> = {
  LEAK: "Lekkage",
  INSPECTION: "Inspectie",
  BITUMEN_ROOF: "Bitumen dak",
  ROOF_RENOVATION: "Dakrenovatie",
  ROOF_TERRACE: "Dakterras",
  MAINTENANCE: "Onderhoud",
  OTHER: "Overig",
};

export default async function MobileJobsPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-[var(--primary)]">Werkbonnen</h1>
        <p className="text-sm text-slate-500">Database niet beschikbaar.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);

  // TODO: When user role management is implemented, filter by assigned user:
  // const user = await db.user.findFirst({ where: { email: session.email } });
  // const assignedJobIds = user ? (await db.jobAssignment.findMany({ where: { userId: user.id } })).map(a => a.jobId) : [];
  // For now: show all active jobs for this company, ordered by scheduled date.

  const [activeJobs, completedJobs] = await Promise.all([
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    }),
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["COMPLETED", "CANCELLED"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Werkbonnen</h1>
        <span className="text-sm text-slate-400">{activeJobs.length} actief</span>
      </div>

      {/* Active jobs */}
      {activeJobs.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <p className="text-slate-400 text-sm">Geen actieve werkbonnen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((job) => (
            <Link
              key={job.id}
              href={`/mobile/jobs/${job.id}`}
              className={`block rounded-2xl bg-white border border-slate-200 border-l-4 p-4 active:scale-[0.98] transition-transform ${STATUS_COLORS[job.status] ?? "border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-base leading-tight">{job.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{job.customer.name}</p>
                </div>
                <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                {job.address && (
                  <p>📍 {job.address}{job.city ? `, ${job.city}` : ""}</p>
                )}
                {job.scheduledStart && (
                  <p>
                    🕐 {new Date(job.scheduledStart).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                    {" "}
                    {new Date(job.scheduledStart).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {job.customer.phone && (
                  <p>📞 {job.customer.phone}</p>
                )}
                <p className="text-slate-400">{TYPE_LABELS[job.jobType] ?? job.jobType}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recently completed */}
      {completedJobs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent afgerond</h2>
          <div className="space-y-2">
            {completedJobs.map((job) => (
              <Link
                key={job.id}
                href={`/mobile/jobs/${job.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3 opacity-60 active:scale-[0.98] transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{job.title}</p>
                  <p className="text-xs text-slate-400">{job.customer.name}</p>
                </div>
                <span className="shrink-0 text-xs text-green-600 font-medium">✓ Afgerond</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
