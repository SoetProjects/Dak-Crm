import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const JOB_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal",
  WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};

async function updateCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  await db.customer.updateMany({
    where: { id, companyId: session.companyId },
    data: {
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
      kvkNumber: String(formData.get("kvkNumber") ?? "") || null,
      vatNumber: String(formData.get("vatNumber") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath(`/customers/${id}`);
}

async function archiveCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  await db.customer.updateMany({ where: { id, companyId: session.companyId }, data: { isActive: false } });
  redirect("/customers");
}

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const customer = await db.customer.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, status: true, scheduledStart: true, jobType: true },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, quoteNumber: true, status: true, totalAmount: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true },
      },
    },
  });
  if (!customer) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:underline">← Klanten</Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--primary)]">{customer.name}</h1>
          <p className="text-sm text-slate-500">{customer.email ?? customer.phone ?? ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/quotes?customerId=${customer.id}`} className="btn-secondary text-sm">Nieuwe offerte</Link>
          <Link href={`/jobs?customerId=${customer.id}`} className="btn-primary text-sm">Nieuwe werkbon</Link>
          <form action={archiveCustomer}>
            <input type="hidden" name="id" value={customer.id} />
            <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Archiveren</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-[var(--primary)]">Klantgegevens</h2>
          <form action={updateCustomer} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={customer.id} />
            <select name="customerType" defaultValue={customer.customerType} className="input">
              <option value="PRIVATE">Particulier</option>
              <option value="BUSINESS">Zakelijk</option>
              <option value="HOA">VvE</option>
              <option value="CONTRACTOR">Aannemer</option>
            </select>
            <input name="name" defaultValue={customer.name} required placeholder="Naam *" className="input" />
            <input name="contactPerson" defaultValue={customer.contactPerson ?? ""} placeholder="Contactpersoon" className="input" />
            <input name="phone" defaultValue={customer.phone ?? ""} placeholder="Telefoon" className="input" />
            <input name="email" type="email" defaultValue={customer.email ?? ""} placeholder="E-mail" className="input" />
            <input name="kvkNumber" defaultValue={customer.kvkNumber ?? ""} placeholder="KVK-nummer" className="input" />
            <input name="vatNumber" defaultValue={customer.vatNumber ?? ""} placeholder="BTW-nummer" className="input" />

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide md:col-span-2 mt-2">Factuuradres</p>
            <input name="billingAddress" defaultValue={customer.billingAddress ?? ""} placeholder="Adres" className="input" />
            <input name="billingPostalCode" defaultValue={customer.billingPostalCode ?? ""} placeholder="Postcode" className="input" />
            <input name="billingCity" defaultValue={customer.billingCity ?? ""} placeholder="Stad" className="input" />

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide md:col-span-2 mt-2">Serviceadres</p>
            <input name="serviceAddress" defaultValue={customer.serviceAddress ?? ""} placeholder="Adres" className="input" />
            <input name="servicePostalCode" defaultValue={customer.servicePostalCode ?? ""} placeholder="Postcode" className="input" />
            <input name="serviceCity" defaultValue={customer.serviceCity ?? ""} placeholder="Stad" className="input" />

            <textarea name="notes" defaultValue={customer.notes ?? ""} placeholder="Notities" className="input md:col-span-2" rows={3} />
            <button type="submit" className="btn-primary md:col-span-2">Opslaan</button>
          </form>
        </section>

        {/* Activity sidebar */}
        <div className="space-y-4">
          {/* Jobs */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Werkbonnen ({customer.jobs.length})</h3>
            {customer.jobs.length === 0 ? (
              <p className="text-xs text-slate-400">Geen werkbonnen.</p>
            ) : (
              <div className="space-y-2">
                {customer.jobs.map(j => (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="block rounded-lg border border-slate-100 p-2 hover:bg-slate-50 text-sm">
                    <p className="font-medium text-[var(--primary)] truncate">{j.title}</p>
                    <p className="text-xs text-slate-500">{JOB_STATUS_LABELS[j.status] ?? j.status}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quotes */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Offertes ({customer.quotes.length})</h3>
            {customer.quotes.length === 0 ? (
              <p className="text-xs text-slate-400">Geen offertes.</p>
            ) : (
              <div className="space-y-1">
                {customer.quotes.map(q => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex justify-between text-sm hover:underline py-1">
                    <span className="text-[var(--accent)]">{q.quoteNumber}</span>
                    <span className="text-slate-500">€{Number(q.totalAmount).toFixed(0)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Invoices */}
          {customer.invoices.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Facturen ({customer.invoices.length})</h3>
              <div className="space-y-1">
                {customer.invoices.map(inv => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex justify-between text-sm hover:underline py-1">
                    <span className="text-[var(--accent)]">{inv.invoiceNumber}</span>
                    <span className="text-slate-500">€{Number(inv.totalAmount).toFixed(0)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
