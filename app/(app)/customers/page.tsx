import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

async function createCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  await ensureCompany(session.companyId);

  await db.customer.create({
    data: {
      companyId: session.companyId,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      billingAddress: String(formData.get("billingAddress") ?? "") || null,
      serviceAddress: String(formData.get("serviceAddress") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidatePath("/customers");
}

async function deleteCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated) return;
  if (!isDatabaseReady()) return;

  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return;

  await db.customer.deleteMany({
    where: { id: customerId, companyId: session.companyId },
  });

  revalidatePath("/customers");
}

export default async function CustomersPage() {
  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Klanten</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om CRUD voor klanten te activeren.
        </p>
      </div>
    );
  }

  const session = await getAppSession();
  await ensureCompany(session.companyId);

  const customers = await db.customer.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Klanten</h1>
        <p className="mt-1 text-sm text-slate-600">Beheer je klantenbestand.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Klant toevoegen</h2>
        <form action={createCustomer} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Naam" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="phone" placeholder="Telefoon" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="E-mail" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="billingAddress" placeholder="Factuuradres" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="serviceAddress" placeholder="Serviceadres" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          <textarea name="notes" placeholder="Notities" className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="md:col-span-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">
            Opslaan
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Klantenlijst</h2>
        <div className="mt-4 space-y-2">
          {customers.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen klanten.</p>
          ) : (
            customers.map((customer) => (
              <article key={customer.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--primary)]">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.email ?? "-"} · {customer.phone ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-600">{customer.serviceAddress ?? "Geen serviceadres"}</p>
                </div>
                <form action={deleteCustomer}>
                  <input type="hidden" name="customerId" value={customer.id} />
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
