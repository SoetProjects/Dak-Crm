import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

async function createLead(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  await ensureCompany(session.companyId);

  await db.lead.create({
    data: {
      companyId: session.companyId,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      requestType: "OTHER",
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidatePath("/leads");
}

async function deleteLead(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;

  await db.lead.deleteMany({
    where: { id: leadId, companyId: session.companyId },
  });

  revalidatePath("/leads");
}

export default async function LeadsPage() {
  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Leads</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om CRUD voor leads te activeren.
        </p>
      </div>
    );
  }

  const session = await getAppSession();
  await ensureCompany(session.companyId);

  const leads = await db.lead.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">Nieuwe aanvragen en opvolging.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Lead toevoegen</h2>
        <form action={createLead} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Naam" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="phone" placeholder="Telefoon" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="E-mail" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="address" placeholder="Adres" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea name="notes" placeholder="Notities" className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="md:col-span-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">
            Opslaan
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Leadlijst</h2>
        <div className="mt-4 space-y-2">
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen leads.</p>
          ) : (
            leads.map((lead) => (
              <article key={lead.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--primary)]">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.email ?? "-"} · {lead.phone ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-600">{lead.address ?? "Geen adres"}</p>
                </div>
                <form action={deleteLead}>
                  <input type="hidden" name="leadId" value={lead.id} />
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
