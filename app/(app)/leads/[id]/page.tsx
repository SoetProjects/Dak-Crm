import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const STATUS_OPTIONS = [
  { value: "NEW", label: "Nieuw" },
  { value: "CONTACTED", label: "Benaderd" },
  { value: "APPOINTMENT_PLANNED", label: "Afspraak gepland" },
  { value: "QUOTED", label: "Offerte uitgebracht" },
  { value: "WON", label: "Gewonnen" },
  { value: "LOST", label: "Verloren" },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-yellow-50 text-yellow-700",
  APPOINTMENT_PLANNED: "bg-purple-50 text-purple-700",
  QUOTED: "bg-orange-50 text-orange-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-slate-100 text-slate-500",
};

async function updateLead(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const followUpRaw = String(formData.get("followUpAt") ?? "");
  await db.lead.updateMany({
    where: { id, companyId: session.companyId },
    data: {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      postalCode: String(formData.get("postalCode") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      requestType: String(formData.get("requestType") ?? "OTHER") as never,
      status: String(formData.get("status") ?? "NEW") as never,
      source: String(formData.get("source") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      followUpAt: followUpRaw ? new Date(followUpRaw) : null,
    },
  });
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

async function quickStatus(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  await db.lead.updateMany({
    where: { id, companyId: session.companyId },
    data: { status: status as never },
  });
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

async function archiveLead(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  // Soft-delete: mark as LOST rather than hard-deleting business data
  await db.lead.updateMany({
    where: { id, companyId: session.companyId },
    data: { status: "LOST" },
  });
  redirect("/leads");
}

async function convertToCustomer(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const customerType = String(formData.get("customerType") ?? "PRIVATE") as never;
  const lead = await db.lead.findFirst({ where: { id, companyId: session.companyId } });
  if (!lead) return;
  const customer = await db.customer.create({
    data: {
      companyId: session.companyId,
      customerType,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      serviceAddress: lead.address,
      servicePostalCode: lead.postalCode,
      serviceCity: lead.city,
    },
  });
  await db.lead.updateMany({
    where: { id, companyId: session.companyId },
    data: { status: "WON", customerId: customer.id },
  });
  redirect(`/customers/${customer.id}`);
}

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const lead = await db.lead.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true } },
      quotes: { select: { id: true, quoteNumber: true, status: true, totalAmount: true } },
    },
  });
  if (!lead) return notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/leads" className="text-sm text-slate-500 hover:underline">← Leads</Link>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--primary)]">{lead.name}</h1>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? "bg-slate-100 text-slate-500"}`}>
            {STATUS_OPTIONS.find(s => s.value === lead.status)?.label ?? lead.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!lead.customerId && (
            <form action={convertToCustomer} className="flex items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <select name="customerType" className="input text-sm py-1.5 h-auto">
                <option value="PRIVATE">Particulier</option>
                <option value="BUSINESS">Zakelijk</option>
                <option value="HOA">VvE</option>
                <option value="CONTRACTOR">Aannemer</option>
              </select>
              <button type="submit" className="btn-secondary text-sm shrink-0">Omzetten naar klant</button>
            </form>
          )}
          <form action={archiveLead}>
              <input type="hidden" name="id" value={lead.id} />
              <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              Archiveren
            </button>
          </form>
        </div>
      </div>

      {/* Quick status buttons */}
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Snelle statuswijziging</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter(s => s.value !== lead.status).map(s => (
            <form key={s.value} action={quickStatus}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="status" value={s.value} />
              <button type="submit" className={`rounded-full px-3 py-1 text-xs font-medium cursor-pointer border hover:opacity-80 ${STATUS_COLORS[s.value] ?? "bg-slate-100 text-slate-500"}`}>
                → {s.label}
              </button>
            </form>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-[var(--primary)]">Gegevens</h2>
          <form action={updateLead} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={lead.id} />
            <input name="name" defaultValue={lead.name} required placeholder="Naam *" className="input" />
            <input name="phone" defaultValue={lead.phone ?? ""} placeholder="Telefoon" className="input" />
            <input name="email" type="email" defaultValue={lead.email ?? ""} placeholder="E-mail" className="input" />
            <input name="address" defaultValue={lead.address ?? ""} placeholder="Adres" className="input" />
            <input name="postalCode" defaultValue={lead.postalCode ?? ""} placeholder="Postcode" className="input" />
            <input name="city" defaultValue={lead.city ?? ""} placeholder="Stad" className="input" />
            <select name="requestType" defaultValue={lead.requestType} className="input">
              <option value="LEAK">Lekkage</option>
              <option value="RENOVATION">Renovatie</option>
              <option value="INSPECTION">Inspectie</option>
              <option value="BITUMEN_ROOF">Bitumen dak</option>
              <option value="ROOF_TERRACE">Dakterras</option>
              <option value="OTHER">Overig</option>
            </select>
            <select name="status" defaultValue={lead.status} className="input">
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input name="source" defaultValue={lead.source ?? ""} placeholder="Bron" className="input md:col-span-2" />
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Opvolgdatum (optioneel)</label>
              <input
                name="followUpAt"
                type="date"
                defaultValue={lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 10) : ""}
                className="input"
              />
            </div>
            <textarea name="description" defaultValue={lead.description ?? ""} placeholder="Omschrijving" className="input md:col-span-2" rows={3} />
            <button type="submit" className="btn-primary md:col-span-2">Opslaan</button>
          </form>
        </section>

        {/* Sidebar info */}
        <div className="space-y-4">
          {lead.customer && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--primary)]">Klant</h3>
              <Link href={`/customers/${lead.customer.id}`} className="text-sm text-[var(--accent)] hover:underline">
                {lead.customer.name}
              </Link>
            </section>
          )}

          {lead.quotes.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--primary)]">Offertes</h3>
              <div className="space-y-1">
                {lead.quotes.map(q => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex justify-between text-sm hover:underline">
                    <span className="text-[var(--accent)]">{q.quoteNumber}</span>
                    <span className="text-slate-500">€{Number(q.totalAmount).toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {lead.followUpAt && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">Opvolgdatum</p>
              <p className="mt-1 text-sm text-amber-800">
                {new Date(lead.followUpAt).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400 space-y-1">
            <p>Aangemaakt: {lead.createdAt.toLocaleDateString("nl-NL")}</p>
            <p>Gewijzigd: {lead.updatedAt.toLocaleDateString("nl-NL")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
