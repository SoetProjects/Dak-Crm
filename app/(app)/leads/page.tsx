import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nieuw",
  CONTACTED: "Benaderd",
  APPOINTMENT_PLANNED: "Afspraak",
  QUOTED: "Offerte",
  WON: "Gewonnen",
  LOST: "Verloren",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-yellow-50 text-yellow-700",
  APPOINTMENT_PLANNED: "bg-purple-50 text-purple-700",
  QUOTED: "bg-orange-50 text-orange-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-slate-100 text-slate-500",
};

const REQUEST_LABELS: Record<string, string> = {
  LEAK: "Lekkage",
  RENOVATION: "Renovatie",
  INSPECTION: "Inspectie",
  BITUMEN_ROOF: "Bitumen dak",
  ROOF_TERRACE: "Dakterras",
  OTHER: "Overig",
};

async function createLead(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);
  await db.lead.create({
    data: {
      companyId: session.companyId,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      postalCode: String(formData.get("postalCode") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      requestType: String(formData.get("requestType") ?? "OTHER") as never,
      source: String(formData.get("source") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
    },
  });
  revalidatePath("/leads");
}

type SearchParams = { alles?: string };
type Props = { searchParams: Promise<SearchParams> };

export default async function LeadsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const showAll = sp.alles === "1";
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Leads</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);

  const leads = await db.lead.findMany({
    where: {
      companyId: session.companyId,
      // Hide archived (LOST/WON) by default unless user requests all
      ...(!showAll ? { status: { notIn: ["LOST", "WON"] } } : {}),
    },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">{leads.length} leads {showAll ? "(alle)" : "(actief)"}</p>
        </div>
        <Link
          href={showAll ? "/leads" : "/leads?alles=1"}
          className="text-sm text-slate-500 hover:underline"
        >
          {showAll ? "Verberg verloren/gewonnen" : "Toon alle leads"}
        </Link>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuwe lead</h2>
        <form action={createLead} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input name="name" required placeholder="Naam *" className="input" />
          <input name="phone" placeholder="Telefoon" className="input" />
          <input name="email" type="email" placeholder="E-mail" className="input" />
          <input name="address" placeholder="Adres" className="input" />
          <input name="postalCode" placeholder="Postcode" className="input" />
          <input name="city" placeholder="Stad" className="input" />
          <select name="requestType" className="input">
            <option value="LEAK">Lekkage</option>
            <option value="RENOVATION">Renovatie</option>
            <option value="INSPECTION">Inspectie</option>
            <option value="BITUMEN_ROOF">Bitumen dak</option>
            <option value="ROOF_TERRACE">Dakterras</option>
            <option value="OTHER">Overig</option>
          </select>
          <input name="source" placeholder="Bron (Google, aanbeveling…)" className="input" />
          <textarea name="description" placeholder="Omschrijving" className="input md:col-span-2" rows={2} />
          <button type="submit" className="btn-primary lg:col-span-3 md:col-span-2">
            Lead opslaan
          </button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {leads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">Nog geen leads</p>
            <p className="mt-1 text-xs text-slate-400">Maak je eerste lead aan via het formulier hierboven.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--primary)] truncate">{lead.name}</p>
                  <p className="text-xs text-slate-500">
                    {lead.phone ?? lead.email ?? "—"} &middot; {lead.city ?? "—"}
                  </p>
                  {lead.customer && (
                    <p className="mt-0.5 text-xs text-slate-400">Klant: {lead.customer.name}</p>
                  )}
                  {lead.followUpAt && (
                    <p className={`mt-0.5 text-xs font-medium ${new Date(lead.followUpAt) < new Date() ? "text-red-500" : "text-amber-600"}`}>
                      Opvolgen: {new Date(lead.followUpAt).toLocaleDateString("nl-NL")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {REQUEST_LABELS[lead.requestType] ?? lead.requestType}
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
