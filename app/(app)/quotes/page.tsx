import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  ACCEPTED: "Geaccepteerd",
  REJECTED: "Afgewezen",
  EXPIRED: "Verlopen",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-600",
  EXPIRED: "bg-orange-50 text-orange-600",
};

async function createQuote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);

  const last = await db.quote.findFirst({
    where: { companyId: session.companyId },
    orderBy: { quoteNumber: "desc" },
  });
  const seq = last ? parseInt(last.quoteNumber.replace(/\D/g, "")) + 1 : 1;
  const quoteNumber = `OFF-${String(seq).padStart(4, "0")}`;

  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return;

  const quote = await db.quote.create({
    data: {
      companyId: session.companyId,
      customerId,
      quoteNumber,
      title: String(formData.get("title") ?? "") || "Offerte",
      notes: String(formData.get("notes") ?? "") || null,
      validUntil: formData.get("validUntil")
        ? new Date(String(formData.get("validUntil")))
        : null,
    },
  });
  redirect(`/quotes/${quote.id}`);
}

export default async function QuotesPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Offertes</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const [quotes, customers] = await Promise.all([
    db.quote.findMany({
      where: { companyId: session.companyId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.customer.findMany({
      where: { companyId: session.companyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Offertes</h1>
          <p className="mt-1 text-sm text-slate-500">{quotes.length} offertes</p>
        </div>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuwe offerte</h2>
        <form action={createQuote} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select name="customerId" required className="input">
            <option value="">Klant kiezen *</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="title" placeholder="Titel" className="input" />
          <input name="validUntil" type="date" className="input" placeholder="Geldig tot" />
          <button type="submit" className="btn-primary">Offerte aanmaken</button>
        </form>
        {customers.length === 0 && (
          <p className="mt-2 text-xs text-orange-600">
            Eerst een <Link href="/customers" className="underline">klant aanmaken</Link> voordat je een offerte kunt maken.
          </p>
        )}
      </section>

      {/* List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {quotes.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nog geen offertes.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--primary)]">{q.quoteNumber} — {q.title}</p>
                  <p className="text-xs text-slate-500">{q.customer.name}</p>
                  {q.validUntil && (
                    <p className="text-xs text-slate-400">
                      Geldig tot: {new Date(q.validUntil).toLocaleDateString("nl-NL")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`badge ${STATUS_COLORS[q.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[q.status] ?? q.status}
                  </span>
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    €{Number(q.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
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
