import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

function toCurrencyAmount(value: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

async function createQuote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;

  await ensureCompany(session.companyId);

  const customerId = String(formData.get("customerId") ?? "");
  const quoteNumber = String(formData.get("quoteNumber") ?? "");
  const description = String(formData.get("lineDescription") ?? "");
  const unit = String(formData.get("lineUnit") ?? "m²") || "m²";
  const quantity = toCurrencyAmount(String(formData.get("lineQuantity") ?? "0"));
  const unitPrice = toCurrencyAmount(String(formData.get("lineUnitPrice") ?? "0"));
  const total = Math.round(quantity * unitPrice * 100) / 100;

  if (!customerId || !quoteNumber || !description) return;

  await db.quote.create({
    data: {
      companyId: session.companyId,
      customerId,
      quoteNumber,
      status: "DRAFT",
      totalAmount: total,
      lines: {
        create: [
          {
            companyId: session.companyId,
            description,
            quantity,
            unit,
            unitPrice,
            total,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  revalidatePath("/quotes");
}

async function deleteQuote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;

  const quoteId = String(formData.get("quoteId") ?? "");
  if (!quoteId) return;

  await db.quote.deleteMany({
    where: {
      id: quoteId,
      companyId: session.companyId,
    },
  });

  revalidatePath("/quotes");
}

export default async function QuotesPage() {
  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Offertes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om CRUD voor offertes te activeren.
        </p>
      </div>
    );
  }

  const session = await getAppSession();
  await ensureCompany(session.companyId);

  const [customers, quotes] = await Promise.all([
    db.customer.findMany({
      where: { companyId: session.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.quote.findMany({
      where: { companyId: session.companyId },
      include: {
        customer: { select: { name: true } },
        lines: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Offertes</h1>
        <p className="mt-1 text-sm text-slate-600">Basis offertebeheer met m²-regels.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Offerte toevoegen</h2>
        {customers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Voeg eerst een klant toe in het scherm Klanten.
          </p>
        ) : (
          <form action={createQuote} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              name="quoteNumber"
              required
              placeholder="Offertenummer (bijv. OFF-2026-001)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              name="customerId"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Kies klant</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <input
              name="lineDescription"
              required
              placeholder="Regel omschrijving"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="lineQuantity"
              type="number"
              step="0.01"
              defaultValue="1"
              required
              placeholder="Aantal (m²)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="lineUnitPrice"
              type="number"
              step="0.01"
              defaultValue="0"
              required
              placeholder="Prijs per eenheid"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              name="lineUnit"
              defaultValue="m²"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            >
              <option value="m²">m²</option>
              <option value="uur">uur</option>
              <option value="stuk">stuk</option>
            </select>
            <button
              type="submit"
              className="md:col-span-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Offerte opslaan
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-[var(--primary)]">Offertelijst</h2>
        <div className="mt-4 space-y-3">
          {quotes.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen offertes.</p>
          ) : (
            quotes.map((quote) => (
              <article
                key={quote.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--primary)]">
                      {quote.quoteNumber} · {quote.customer.name}
                    </p>
                    <p className="text-xs text-slate-500">Status: {quote.status}</p>
                  </div>
                  <form action={deleteQuote}>
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                    >
                      Verwijderen
                    </button>
                  </form>
                </div>
                {quote.lines[0] ? (
                  <p className="mt-2 text-xs text-slate-600">
                    {quote.lines[0].description} · {String(quote.lines[0].quantity)}{" "}
                    {quote.lines[0].unit} x EUR {String(quote.lines[0].unitPrice)}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
                  Totaal: EUR {String(quote.totalAmount)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
