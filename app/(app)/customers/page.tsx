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

const TYPE_FILTER_TABS = [
  { key: "all",        label: "Alle" },
  { key: "PRIVATE",    label: "Particulier" },
  { key: "BUSINESS",   label: "Zakelijk" },
  { key: "HOA",        label: "VvE" },
  { key: "CONTRACTOR", label: "Aannemer" },
];

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

type SearchParams = { search?: string; type?: string };
type Props = { searchParams: Promise<SearchParams> };

export default async function CustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
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

  const search = sp.search?.trim() ?? "";
  const typeFilter = TYPE_FILTER_TABS.find(t => t.key === sp.type) ? sp.type : "all";

  const customers = await db.customer.findMany({
    where: {
      companyId: session.companyId,
      isActive: true,
      ...(typeFilter !== "all" ? { customerType: typeFilter as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { billingCity: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { jobs: true, quotes: true, invoices: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header + search + filters */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Klanten</h1>
          <p className="mt-1 text-sm text-slate-500">{customers.length} klanten</p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {/* Search */}
          <form method="get" className="flex gap-2">
            {typeFilter !== "all" && <input type="hidden" name="type" value={typeFilter} />}
            <input
              name="search"
              defaultValue={search}
              placeholder="Zoeken op naam, e-mail, stad…"
              className="input flex-1 sm:w-64"
            />
            <button type="submit" className="btn-secondary text-sm shrink-0">Zoeken</button>
            {search && (
              <Link href={typeFilter !== "all" ? `/customers?type=${typeFilter}` : "/customers"} className="btn-secondary text-sm shrink-0">
                ✕
              </Link>
            )}
          </form>
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {TYPE_FILTER_TABS.map(t => (
              <Link
                key={t.key}
                href={t.key === "all"
                  ? (search ? `/customers?search=${encodeURIComponent(search)}` : "/customers")
                  : (search ? `/customers?type=${t.key}&search=${encodeURIComponent(search)}` : `/customers?type=${t.key}`)
                }
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  typeFilter === t.key
                    ? "bg-[var(--primary)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
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

          <textarea name="notes" placeholder="Notities" className="input lg:col-span-3 md:col-span-2" rows={2} />
          <button type="submit" className="btn-primary lg:col-span-3 md:col-span-2">Klant opslaan</button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">
              {search || typeFilter !== "all" ? "Geen klanten gevonden" : "Nog geen klanten"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search || typeFilter !== "all"
                ? "Probeer een andere zoekterm of filter."
                : "Maak je eerste klant aan via het formulier hierboven, of converteer een lead."}
            </p>
          </div>
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
                    {c._count.jobs} jobs &middot; {c._count.quotes} offertes &middot; {c._count.invoices} facturen
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
