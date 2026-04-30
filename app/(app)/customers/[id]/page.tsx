import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Particulier",
  BUSINESS: "Zakelijk",
  HOA: "VvE",
  CONTRACTOR: "Aannemer",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nieuw", CONTACTED: "Benaderd", APPOINTMENT_PLANNED: "Afspraak",
  QUOTED: "Offerte", WON: "Gewonnen", LOST: "Verloren",
};
const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700", CONTACTED: "bg-yellow-50 text-yellow-700",
  APPOINTMENT_PLANNED: "bg-purple-50 text-purple-700", QUOTED: "bg-orange-50 text-orange-700",
  WON: "bg-green-50 text-green-700", LOST: "bg-slate-100 text-slate-500",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept", SENT: "Verzonden", ACCEPTED: "Geaccepteerd",
  REJECTED: "Afgewezen", EXPIRED: "Verlopen",
};
const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-green-50 text-green-700", REJECTED: "bg-red-50 text-red-600",
  EXPIRED: "bg-orange-50 text-orange-600",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland", IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal", WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond", CANCELLED: "Geannuleerd",
};
const JOB_STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-50 text-blue-700", IN_PROGRESS: "bg-yellow-50 text-yellow-700",
  WAITING_FOR_MATERIAL: "bg-orange-50 text-orange-700", WAITING_FOR_WEATHER: "bg-sky-50 text-sky-700",
  COMPLETED: "bg-green-50 text-green-700", CANCELLED: "bg-slate-100 text-slate-500",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept", SENT: "Verzonden", PAID: "Betaald",
  OVERDUE: "Te laat", CANCELLED: "Geannuleerd",
};
const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-green-700", OVERDUE: "bg-red-50 text-red-600",
  CANCELLED: "bg-slate-100 text-slate-500",
};

async function updateCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  await db.customer.updateMany({
    where: { id, companyId: session.companyId },
    data: {
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
      leads: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, requestType: true, followUpAt: true },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, quoteNumber: true, status: true, totalAmount: true },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, jobNumber: true, status: true, scheduledStart: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true },
      },
    },
  });
  if (!customer) return notFound();

  const openInvoicesTotal = customer.invoices
    .filter(i => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:underline">← Klanten</Link>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-[var(--primary)]">{customer.name}</h1>
            <span className="badge bg-slate-100 text-slate-600 text-xs">
              {CUSTOMER_TYPE_LABELS[customer.customerType] ?? customer.customerType}
            </span>
          </div>
          {(customer.email || customer.phone) && (
            <p className="text-sm text-slate-500">{customer.email ?? customer.phone}</p>
          )}
          {openInvoicesTotal > 0 && (
            <p className="mt-0.5 text-xs font-medium text-orange-600">
              Openstaand: €{openInvoicesTotal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/quotes?customerId=${customer.id}`} className="btn-secondary text-sm">+ Offerte</Link>
          <Link href={`/jobs?customerId=${customer.id}`} className="btn-secondary text-sm">+ Werkbon</Link>
          <Link href={`/invoices?customerId=${customer.id}`} className="btn-primary text-sm">+ Factuur</Link>
          <form action={archiveCustomer}>
            <input type="hidden" name="id" value={customer.id} />
            <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              Archiveren
            </button>
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

          {/* Leads */}
          {customer.leads.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Leads ({customer.leads.length})</h3>
              <div className="space-y-2">
                {customer.leads.map(l => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 hover:bg-slate-50 text-sm">
                    <span className="truncate text-[var(--primary)] font-medium">{l.name}</span>
                    <span className={`badge shrink-0 text-xs ${LEAD_STATUS_COLORS[l.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {LEAD_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quotes */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Offertes ({customer.quotes.length})</h3>
            {customer.quotes.length === 0 ? (
              <div>
                <p className="text-xs text-slate-400">Nog geen offertes.</p>
                <Link href={`/quotes?customerId=${customer.id}`} className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline">
                  + Nieuwe offerte aanmaken
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {customer.quotes.map(q => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-2 py-1 hover:underline text-sm">
                    <span className="text-[var(--accent)]">{q.quoteNumber}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-xs ${QUOTE_STATUS_COLORS[q.status] ?? "bg-slate-100"}`}>
                        {QUOTE_STATUS_LABELS[q.status] ?? q.status}
                      </span>
                      <span className="text-slate-500 tabular-nums">€{Number(q.totalAmount).toFixed(0)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Jobs */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Werkbonnen ({customer.jobs.length})</h3>
            {customer.jobs.length === 0 ? (
              <div>
                <p className="text-xs text-slate-400">Nog geen werkbonnen.</p>
                <Link href={`/jobs?customerId=${customer.id}`} className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline">
                  + Nieuwe werkbon aanmaken
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.jobs.map(j => (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 hover:bg-slate-50 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--primary)] truncate">{j.title}</p>
                      {j.scheduledStart && (
                        <p className="text-xs text-slate-400">{new Date(j.scheduledStart).toLocaleDateString("nl-NL")}</p>
                      )}
                    </div>
                    <span className={`badge shrink-0 text-xs ${JOB_STATUS_COLORS[j.status] ?? "bg-slate-100"}`}>
                      {JOB_STATUS_LABELS[j.status] ?? j.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Invoices */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--primary)]">Facturen ({customer.invoices.length})</h3>
            {customer.invoices.length === 0 ? (
              <div>
                <p className="text-xs text-slate-400">Nog geen facturen.</p>
                <Link href={`/invoices?customerId=${customer.id}`} className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline">
                  + Nieuwe factuur aanmaken
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {customer.invoices.map(inv => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-2 py-1 hover:underline text-sm">
                    <span className="text-[var(--accent)]">{inv.invoiceNumber}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-xs ${INVOICE_STATUS_COLORS[inv.status] ?? "bg-slate-100"}`}>
                        {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                      <span className="text-slate-500 tabular-nums">€{Number(inv.totalAmount).toFixed(0)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400 space-y-1">
            <p>Aangemaakt: {customer.createdAt.toLocaleDateString("nl-NL")}</p>
            <p>Gewijzigd: {customer.updatedAt.toLocaleDateString("nl-NL")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
