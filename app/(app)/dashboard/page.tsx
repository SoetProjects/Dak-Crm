import Link from "next/link";
import { MobileRedirect } from "@/components/mobile/mobile-redirect";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

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

export default async function DashboardPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">DATABASE_URL niet ingesteld. Stel de omgevingsvariabele in om data te zien.</p>
        </section>
        <DashboardActions />
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [
    jobsToday,
    openLeadsCount,
    openQuotesCount,
    activeJobs,
    openInvoices,
    waitingJobs,
    todayPlanning,
  ] = await Promise.all([
    db.job.findMany({
      where: {
        companyId: session.companyId,
        scheduledStart: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    db.lead.count({
      where: {
        companyId: session.companyId,
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    db.quote.count({
      where: {
        companyId: session.companyId,
        status: { in: ["DRAFT", "SENT"] },
      },
    }),
    db.job.count({
      where: {
        companyId: session.companyId,
        status: { in: ["PLANNED", "IN_PROGRESS", "WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER"] },
      },
    }),
    db.invoice.aggregate({
      where: {
        companyId: session.companyId,
        status: { in: ["SENT", "OVERDUE"] },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.job.count({
      where: {
        companyId: session.companyId,
        status: { in: ["WAITING_FOR_MATERIAL", "WAITING_FOR_WEATHER"] },
      },
    }),
    db.planningItem.findMany({
      where: {
        companyId: session.companyId,
        startAt: { gte: todayStart, lte: todayEnd },
      },
      include: { job: { include: { customer: { select: { name: true } } } } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const stats = [
    { label: "Jobs vandaag", value: String(jobsToday.length), href: "/jobs" },
    { label: "Afspraken vandaag", value: String(todayPlanning.length), href: "/planning" },
    { label: "Open leads", value: String(openLeadsCount), href: "/leads" },
    { label: "Open offertes", value: String(openQuotesCount), href: "/quotes" },
    { label: "Actieve werkbonnen", value: String(activeJobs), href: "/jobs" },
    { label: "Wacht (materiaal/weer)", value: String(waitingJobs), href: "/jobs" },
    {
      label: "Openstaand factuurbedrag",
      value: `€${Number(openInvoices._sum.totalAmount ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 0 })}`,
      href: "/invoices",
    },
    { label: "Facturen open", value: String(openInvoices._count), href: "/invoices" },
  ];

  return (
    <div className="space-y-6">
      <MobileRedirect to="/mobile" />
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {today.toLocaleDateString("nl-NL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Link key={item.label} href={item.href} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-[var(--accent)] transition">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{item.value}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's jobs */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3 flex justify-between items-center">
            <h2 className="font-semibold text-[var(--primary)]">Jobs vandaag</h2>
            <Link href="/planning" className="text-xs text-[var(--accent)] hover:underline">Planning →</Link>
          </div>
          {jobsToday.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">Geen jobs gepland voor vandaag.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobsToday.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`} className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition border-l-2 ${STATUS_COLORS[job.status] ?? "border-slate-300"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--primary)] truncate">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.customer.name} &middot; {job.city ?? "—"}</p>
                    {job.scheduledStart && (
                      <p className="text-xs text-slate-400">
                        {new Date(job.scheduledStart).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 pt-0.5">{STATUS_LABELS[job.status] ?? job.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Today's planning */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3 flex justify-between items-center">
            <h2 className="font-semibold text-[var(--primary)]">Afspraken vandaag</h2>
            <Link href="/planning" className="text-xs text-[var(--accent)] hover:underline">Planning →</Link>
          </div>
          {todayPlanning.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">Geen afspraken vandaag.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayPlanning.map(p => (
                <div key={p.id} className="px-5 py-3">
                  {p.job ? (
                    <Link href={`/jobs/${p.job.id}`} className="block hover:underline">
                      <p className="font-medium text-[var(--primary)]">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.job.customer.name}</p>
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-700">{p.title}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(p.startAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(p.endAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <DashboardActions />
    </div>
  );
}

function DashboardActions() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--primary)]">Snel toevoegen</h2>
      <div className="flex flex-wrap gap-2">
        <Link href="/leads" className="btn-secondary text-sm">+ Nieuwe lead</Link>
        <Link href="/customers" className="btn-secondary text-sm">+ Nieuwe klant</Link>
        <Link href="/quotes" className="btn-secondary text-sm">+ Nieuwe offerte</Link>
        <Link href="/jobs" className="btn-secondary text-sm">+ Nieuwe werkbon</Link>
        <Link href="/planning" className="btn-secondary text-sm">Planning openen</Link>
        <Link href="/invoices" className="btn-secondary text-sm">+ Nieuwe factuur</Link>
      </div>
    </section>
  );
}
