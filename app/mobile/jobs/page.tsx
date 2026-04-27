import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

export default async function MobileJobsPage() {
  const session = await getAppSession();
  if (!session.isAuthenticated) {
    redirect("/login");
  }

  if (!isDatabaseReady()) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <h1 className="text-xl font-semibold text-[var(--primary)]">Mobiele jobs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om mobiele jobs te laden.
        </p>
      </main>
    );
  }

  await ensureCompany(session.companyId);

  const jobs = await db.job.findMany({
    where: { companyId: session.companyId },
    include: { customer: { select: { name: true, phone: true } } },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <h1 className="text-xl font-semibold text-[var(--primary)]">Mobiele jobs</h1>
      <p className="mt-1 text-sm text-slate-600">Voor veldwerkers (MVP weergave).</p>

      <section className="mt-4 space-y-3">
        {jobs.length === 0 ? (
          <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Geen jobs beschikbaar.
          </article>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-[var(--primary)]">{job.title}</p>
              <p className="mt-1 text-xs text-slate-600">{job.address ?? "Geen adres"}</p>
              <p className="mt-1 text-xs text-slate-500">Klant: {job.customer.name}</p>
              <p className="text-xs text-slate-500">Telefoon: {job.customer.phone ?? "-"}</p>
              <p className="mt-2 text-xs text-slate-600">{job.description ?? "Geen omschrijving"}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
