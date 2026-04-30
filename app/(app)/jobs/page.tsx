import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileRedirect } from "@/components/mobile/mobile-redirect";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal",
  WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};
const STATUS_COLORS: Record<string, string> = {
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

async function createJob(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return;

  const year = new Date().getFullYear();
  const last = await db.job.findFirst({
    where: { companyId: session.companyId, jobNumber: { startsWith: `JOB-${year}-` } },
    orderBy: { jobNumber: "desc" },
  });
  const seq = last?.jobNumber ? parseInt(last.jobNumber.split("-").pop() ?? "0") + 1 : 1;
  const jobNumber = `JOB-${year}-${String(seq).padStart(4, "0")}`;

  const raw = {
    scheduledStart: String(formData.get("scheduledStart") ?? ""),
    scheduledEnd: String(formData.get("scheduledEnd") ?? ""),
  };

  const job = await db.job.create({
    data: {
      companyId: session.companyId,
      customerId,
      jobNumber,
      title: String(formData.get("title") ?? "") || "Werkbon",
      jobType: String(formData.get("jobType") ?? "OTHER") as never,
      status: "PLANNED",
      address: String(formData.get("address") ?? "") || null,
      postalCode: String(formData.get("postalCode") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      scheduledStart: raw.scheduledStart ? new Date(raw.scheduledStart) : null,
      scheduledEnd: raw.scheduledEnd ? new Date(raw.scheduledEnd) : null,
    },
  });
  redirect(`/jobs/${job.id}`);
}

type SearchParams = { customerId?: string };
type Props = { searchParams: Promise<SearchParams> };

export default async function JobsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Werkbonnen</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const [jobs, customers] = await Promise.all([
    db.job.findMany({
      where: { companyId: session.companyId },
      include: { customer: { select: { name: true } } },
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    }),
    db.customer.findMany({
      where: { companyId: session.companyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const active = jobs.filter(j => j.status !== "COMPLETED" && j.status !== "CANCELLED");
  const closed = jobs.filter(j => j.status === "COMPLETED" || j.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <MobileRedirect to="/mobile/jobs" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Werkbonnen</h1>
          <p className="mt-1 text-sm text-slate-500">{active.length} actief &middot; {closed.length} gesloten</p>
        </div>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuwe werkbon</h2>
        <form action={createJob} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select name="customerId" required className="input" defaultValue={sp.customerId ?? ""}>
            <option value="">Klant kiezen *</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="title" placeholder="Titel" className="input" />
          <select name="jobType" className="input">
            <option value="LEAK">Lekkage</option>
            <option value="INSPECTION">Inspectie</option>
            <option value="BITUMEN_ROOF">Bitumen dak</option>
            <option value="ROOF_RENOVATION">Dakrenovatie</option>
            <option value="ROOF_TERRACE">Dakterras</option>
            <option value="MAINTENANCE">Onderhoud</option>
            <option value="OTHER">Overig</option>
          </select>
          <input name="address" placeholder="Adres" className="input" />
          <input name="postalCode" placeholder="Postcode" className="input" />
          <input name="city" placeholder="Stad" className="input" />
          <input name="scheduledStart" type="datetime-local" className="input" placeholder="Start" />
          <input name="scheduledEnd" type="datetime-local" className="input" placeholder="Einde" />
          <button type="submit" className="btn-primary">Werkbon aanmaken</button>
        </form>
        {customers.length === 0 && (
          <p className="mt-2 text-xs text-orange-600">
            Eerst een <Link href="/customers" className="underline">klant aanmaken</Link>.
          </p>
        )}
      </section>

      {/* Active jobs */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-[var(--primary)]">Actieve werkbonnen</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">Geen actieve werkbonnen</p>
            <p className="mt-1 text-xs text-slate-400">Maak een werkbon vanuit een geaccepteerde offerte, of gebruik het formulier hierboven.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">{j.jobNumber}</span>
                    <p className="font-medium text-[var(--primary)] truncate">{j.title}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {j.customer.name} &middot; {j.city ?? "—"}
                  </p>
                  {j.scheduledStart && (
                    <p className="text-xs text-slate-400">
                      {new Date(j.scheduledStart).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`badge ${STATUS_COLORS[j.status] ?? "bg-slate-100"}`}>
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                  <span className="text-xs text-slate-400">{TYPE_LABELS[j.jobType] ?? j.jobType}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Closed jobs */}
      {closed.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-500">Gesloten werkbonnen</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {closed.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition opacity-70"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 truncate">{j.jobNumber} — {j.title}</p>
                  <p className="text-xs text-slate-500">{j.customer.name}</p>
                </div>
                <span className={`badge ${STATUS_COLORS[j.status] ?? "bg-slate-100"}`}>
                  {STATUS_LABELS[j.status] ?? j.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
