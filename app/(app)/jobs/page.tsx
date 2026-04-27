import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

async function createJob(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  await ensureCompany(session.companyId);

  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return;

  await db.job.create({
    data: {
      companyId: session.companyId,
      customerId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      jobType: "OTHER",
      status: "PLANNED",
      scheduledStart: formData.get("scheduledStart")
        ? new Date(String(formData.get("scheduledStart")))
        : null,
      scheduledEnd: formData.get("scheduledEnd")
        ? new Date(String(formData.get("scheduledEnd")))
        : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidatePath("/jobs");
}

async function deleteJob(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  await db.job.deleteMany({
    where: { id: jobId, companyId: session.companyId },
  });

  revalidatePath("/jobs");
}

export default async function JobsPage() {
  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Jobs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om CRUD voor jobs te activeren.
        </p>
      </div>
    );
  }

  const session = await getAppSession();
  await ensureCompany(session.companyId);

  const [customers, jobs] = await Promise.all([
    db.customer.findMany({
      where: { companyId: session.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.job.findMany({
      where: { companyId: session.companyId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Jobs</h1>
        <p className="mt-1 text-sm text-slate-600">Werkorders plannen en beheren.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Job toevoegen</h2>
        {customers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Voeg eerst een klant toe in het scherm Klanten.
          </p>
        ) : (
          <form action={createJob} className="mt-4 grid gap-3 md:grid-cols-2">
            <input name="title" required placeholder="Titel job" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="customerId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Kies klant</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <input name="address" placeholder="Adres job" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <textarea name="description" placeholder="Omschrijving" className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="scheduledStart" type="datetime-local" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="scheduledEnd" type="datetime-local" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notities" className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="submit" className="md:col-span-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">
              Opslaan
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Joblijst</h2>
        <div className="mt-4 space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen jobs.</p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-slate-500">{job.customer.name} · {job.status}</p>
                  <p className="mt-1 text-xs text-slate-600">{job.address ?? "Geen adres"}</p>
                </div>
                <form action={deleteJob}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">
                    Verwijderen
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
