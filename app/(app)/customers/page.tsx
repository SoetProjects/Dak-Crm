import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Particulier",
  BUSINESS: "Zakelijk",
  HOA: "VvE",
  CONTRACTOR: "Aannemer",
};

async function createCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);
  await db.customer.create({
    data: {
      companyId: session.companyId,
      customerType: String(formData.get("customerType") ?? "PRIVATE") as never,
      name: String(formData.get("name") ?? ""),
      contactPerson: String(formData.get("contactPerson") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      billingAddress: String(formData.get("billingAddress") ?? "") || null,
      billingPostalCode: String(formData.get("billingPostalCode") ?? "") || null,
      billingCity: String(formData.get("billingCity") ?? "") || null,
      serviceAddress: String(formData.get("serviceAddress") ?? "") || null,
      servicePostalCode: String(formData.get("servicePostalCode") ?? "") || null,
      serviceCity: String(formData.get("serviceCity") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath("/customers");
}

export default async function CustomersPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Klanten</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const customers = await db.customer.findMany({
    where: { companyId: session.companyId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { jobs: true, quotes: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Klanten</h1>
          <p className="mt-1 text-sm text-slate-500">{customers.length} klanten</p>
        </div>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuwe klant</h2>
        <form action={createCustomer} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select name="customerType" className="input">
            <option value="PRIVATE">Particulier</option>
            <option value="BUSINESS">Zakelijk</option>
            <option value="HOA">VvE</option>
            <option value="CONTRACTOR">Aannemer</option>
          </select>
          <input name="name" required placeholder="Naam / bedrijfsnaam *" className="input" />
          <input name="contactPerson" placeholder="Contactpersoon" className="input" />
          <input name="phone" placeholder="Telefoon" className="input" />
          <input name="email" type="email" placeholder="E-mail" className="input" />

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide lg:col-span-3 md:col-span-2 mt-2">Factuuradres</p>
          <input name="billingAddress" placeholder="Adres" className="input" />
          <input name="billingPostalCode" placeholder="Postcode" className="input" />
          <input name="billingCity" placeholder="Stad" className="input" />

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide lg:col-span-3 md:col-span-2 mt-2">Serviceadres</p>
          <input name="serviceAddress" placeholder="Adres" className="input" />
          <input name="servicePostalCode" placeholder="Postcode" className="input" />
          <input name="serviceCity" placeholder="Stad" className="input" />

          <textarea name="notes" placeholder="Notities" className="input lg:col-span-3 md:col-span-2" rows={2} />
          <button type="submit" className="btn-primary lg:col-span-3 md:col-span-2">Klant opslaan</button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nog geen klanten.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--primary)] truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.phone ?? c.email ?? "—"} &middot; {c.billingCity ?? c.serviceCity ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="badge bg-slate-100 text-slate-600">{TYPE_LABELS[c.customerType] ?? c.customerType}</span>
                  <span className="text-xs text-slate-400">
                    {c._count.jobs} jobs &middot; {c._count.quotes} offertes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
