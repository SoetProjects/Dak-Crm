import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  CANCELLED: "border-slate-300 bg-slate-50",
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
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function formatDate(d: Date) {
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

async function addPlanning(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const jobId = String(formData.get("jobId") ?? "") || null;
  const startAt = String(formData.get("startAt") ?? "");
  const endAt = String(formData.get("endAt") ?? "");
  if (!startAt || !endAt) return;

  await db.planningItem.create({
    data: {
      companyId: session.companyId,
      jobId,
      type: "JOB",
      title: String(formData.get("title") ?? "Planning"),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    },
  });
  revalidatePath("/planning");
}

type SearchParams = { week?: string };
type Props = { searchParams: Promise<SearchParams> };

export default async function PlanningPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Planning</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);

  // Determine week offset
  const weekOffset = parseInt(sp.week ?? "0") || 0;
  const today = new Date();
  const monday = addDays(startOfDay(today), -((today.getDay() + 6) % 7) + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [planningItems, jobs, activeJobs] = await Promise.all([
    db.planningItem.findMany({
      where: {
        companyId: session.companyId,
        startAt: { gte: days[0], lte: endOfDay(days[6]) },
      },
      include: {
        job: { include: { customer: { select: { name: true } } } },
      },
      orderBy: { startAt: "asc" },
    }),
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        scheduledStart: { gte: days[0], lte: endOfDay(days[6]) },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    db.job.findMany({
      where: {
        companyId: session.companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { scheduledStart: "asc" },
      select: { id: true, title: true, jobNumber: true },
    }),
  ]);

  const prevWeek = weekOffset - 1;
  const nextWeek = weekOffset + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Planning</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(days[0])} — {formatDate(days[6])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/planning?week=${prevWeek}`} className="btn-secondary text-sm">← Vorige week</Link>
          <Link href="/planning" className="btn-secondary text-sm">Vandaag</Link>
          <Link href={`/planning?week=${nextWeek}`} className="btn-secondary text-sm">Volgende week →</Link>
        </div>
      </div>

      {/* Add planning item */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-[var(--primary)]">Planning toevoegen</h2>
        <form action={addPlanning} className="grid gap-3 md:grid-cols-4 items-end">
          <input name="title" placeholder="Omschrijving" className="input" />
          <select name="jobId" className="input">
            <option value="">Geen werkbon</option>
            {activeJobs.map(j => (
              <option key={j.id} value={j.id}>{j.jobNumber} — {j.title}</option>
            ))}
          </select>
          <input name="startAt" type="datetime-local" className="input" required />
          <input name="endAt" type="datetime-local" className="input" required />
          <button type="submit" className="btn-primary md:col-span-4 md:w-auto">Toevoegen</button>
        </form>
      </section>

      {/* Week view */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="grid min-w-[700px]" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
          {days.map((day, i) => {
            const isToday = startOfDay(day).getTime() === startOfDay(today).getTime();
            const dayJobs = jobs.filter(j =>
              j.scheduledStart && startOfDay(new Date(j.scheduledStart)).getTime() === startOfDay(day).getTime()
            );
            const dayPlanning = planningItems.filter(p =>
              startOfDay(new Date(p.startAt)).getTime() === startOfDay(day).getTime()
            );

            return (
              <div key={i} className={`border-r border-slate-100 last:border-r-0 min-h-[200px] ${isToday ? "bg-blue-50/50" : ""}`}>
                <div className={`border-b border-slate-100 px-3 py-2 text-center text-xs font-semibold ${isToday ? "text-[var(--primary)]" : "text-slate-500"}`}>
                  {formatDate(day)}
                  {isToday && <span className="ml-1 text-[var(--accent)]">●</span>}
                </div>
                <div className="p-2 space-y-1.5">
                  {/* Scheduled jobs */}
                  {dayJobs.map(j => (
                    <Link
                      key={j.id}
                      href={`/jobs/${j.id}`}
                      className={`block rounded-lg border-l-2 p-2 text-xs hover:opacity-80 transition ${STATUS_COLORS[j.status] ?? "border-slate-300 bg-slate-50"}`}
                    >
                      <p className="font-semibold text-slate-800 truncate">{j.title}</p>
                      <p className="text-slate-600 truncate">{j.customer.name}</p>
                      {j.scheduledStart && (
                        <p className="text-slate-400">
                          {new Date(j.scheduledStart).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </Link>
                  ))}
                  {/* Planning items */}
                  {dayPlanning.map(p => (
                    <div
                      key={p.id}
                      className="rounded-lg border-l-2 border-purple-400 bg-purple-50 p-2 text-xs"
                    >
                      {p.job ? (
                        <Link href={`/jobs/${p.job.id}`} className="block hover:underline">
                          <p className="font-semibold text-slate-800 truncate">{p.title}</p>
                          <p className="text-slate-600 truncate">{p.job.customer.name}</p>
                        </Link>
                      ) : (
                        <p className="font-semibold text-slate-800 truncate">{p.title}</p>
                      )}
                      <p className="text-slate-400">
                        {new Date(p.startAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {new Date(p.endAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                  {dayJobs.length === 0 && dayPlanning.length === 0 && (
                    <p className="text-center text-slate-200 text-xs pt-4">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Today's jobs list */}
      {(() => {
        const todayJobs = jobs.filter(j =>
          j.scheduledStart && startOfDay(new Date(j.scheduledStart)).getTime() === startOfDay(today).getTime()
        );
        if (todayJobs.length === 0) return null;
        return (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Vandaag ({todayJobs.length})</h2>
            <div className="divide-y divide-slate-100">
              {todayJobs.map(j => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-slate-50 px-2 rounded-lg">
                  <div>
                    <p className="font-medium text-[var(--primary)]">{j.title}</p>
                    <p className="text-xs text-slate-500">{j.customer.name} &middot; {j.city ?? "—"}</p>
                  </div>
                  <span className={`badge shrink-0 ${STATUS_COLORS[j.status] ?? "border-slate-300 bg-slate-50"} border`}>
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
