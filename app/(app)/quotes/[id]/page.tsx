import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
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

async function recalculateTotals(quoteId: string, companyId: string) {
  const lines = await db.quoteLine.findMany({ where: { quoteId } });
  const subtotal = lines.reduce((sum, l) => sum + Number(l.totalAmount), 0);
  const vatPct = lines.length > 0 ? Number(lines[0].vatPercentage) : 21;
  const vatAmount = subtotal * (vatPct / 100);
  const totalAmount = subtotal + vatAmount;
  await db.quote.update({
    where: { id: quoteId },
    data: {
      subtotal,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    },
  });
}

async function updateQuote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  await db.quote.updateMany({
    where: { id, companyId: session.companyId },
    data: {
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? "") || null,
      validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : null,
    },
  });
  revalidatePath(`/quotes/${id}`);
}

async function updateStatus(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  await db.quote.updateMany({
    where: { id, companyId: session.companyId },
    data: { status: status as never },
  });
  revalidatePath(`/quotes/${id}`);
}

async function addLine(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const quoteId = String(formData.get("quoteId") ?? "");
  const quantity = parseFloat(String(formData.get("quantity") ?? "1")) || 1;
  const unitPrice = parseFloat(String(formData.get("unitPrice") ?? "0")) || 0;
  const vatPct = parseFloat(String(formData.get("vatPercentage") ?? "21")) || 21;
  const totalAmount = quantity * unitPrice;

  await db.quoteLine.create({
    data: {
      companyId: session.companyId,
      quoteId,
      description: String(formData.get("description") ?? ""),
      quantity,
      unit: String(formData.get("unit") ?? "stuk"),
      unitPrice,
      vatPercentage: vatPct,
      totalAmount: Math.round(totalAmount * 100) / 100,
    },
  });
  await recalculateTotals(quoteId, session.companyId);
  revalidatePath(`/quotes/${quoteId}`);
}

async function deleteLine(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const lineId = String(formData.get("lineId") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "");
  await db.quoteLine.deleteMany({ where: { id: lineId, companyId: session.companyId } });
  await recalculateTotals(quoteId, session.companyId);
  revalidatePath(`/quotes/${quoteId}`);
}

// Maps lead.requestType to the closest job.jobType value
const REQUEST_TO_JOB_TYPE: Record<string, string> = {
  LEAK:       "LEAK",
  RENOVATION: "ROOF_RENOVATION",
  INSPECTION: "INSPECTION",
  BITUMEN_ROOF: "BITUMEN_ROOF",
  ROOF_TERRACE: "ROOF_TERRACE",
  OTHER:      "OTHER",
};

async function createJobFromQuote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const quoteId = String(formData.get("quoteId") ?? "");
  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: session.companyId },
  });
  if (!quote) return;

  // Derive jobType from the linked lead's requestType when available
  let jobType = "OTHER";
  if (quote.leadId) {
    const lead = await db.lead.findFirst({
      where: { id: quote.leadId },
      select: { requestType: true },
    });
    if (lead?.requestType) {
      jobType = REQUEST_TO_JOB_TYPE[lead.requestType] ?? "OTHER";
    }
  }

  const year = new Date().getFullYear();
  const last = await db.job.findFirst({
    where: { companyId: session.companyId, jobNumber: { startsWith: `JOB-${year}-` } },
    orderBy: { jobNumber: "desc" },
  });
  const seq = last?.jobNumber ? parseInt(last.jobNumber.split("-").pop() ?? "0") + 1 : 1;
  const jobNumber = `JOB-${year}-${String(seq).padStart(4, "0")}`;

  const job = await db.job.create({
    data: {
      companyId: session.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      jobNumber,
      title: quote.title,
      jobType: jobType as never,
      status: "PLANNED",
    },
  });
  await db.quote.updateMany({
    where: { id: quoteId, companyId: session.companyId },
    data: { status: "ACCEPTED" },
  });
  redirect(`/jobs/${job.id}`);
}

type Props = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const quote = await db.quote.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) return notFound();

  const validUntilStr = quote.validUntil
    ? new Date(quote.validUntil).toISOString().split("T")[0]
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/quotes" className="text-sm text-slate-500 hover:underline">← Offertes</Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--primary)]">
            {quote.quoteNumber} — {quote.title}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`badge ${STATUS_COLORS[quote.status] ?? "bg-slate-100"}`}>
              {STATUS_LABELS[quote.status] ?? quote.status}
            </span>
            <Link href={`/customers/${quote.customer.id}`} className="text-sm text-slate-500 hover:underline">
              {quote.customer.name}
            </Link>
          </div>
        </div>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/quotes/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            Print / PDF
          </Link>
          {quote.status === "DRAFT" && (
            <form action={updateStatus}>
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="status" value="SENT" />
              <button type="submit" className="btn-secondary text-sm">Verzenden</button>
            </form>
          )}
          {(quote.status === "SENT" || quote.status === "DRAFT") && (
            <form action={updateStatus}>
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="status" value="ACCEPTED" />
              <button type="submit" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Accepteren</button>
            </form>
          )}
          {quote.status === "ACCEPTED" && (
            <form action={createJobFromQuote}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <button type="submit" className="btn-primary text-sm">Werkbon aanmaken</button>
            </form>
          )}
          {quote.status !== "REJECTED" && (
            <form action={updateStatus}>
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="status" value="REJECTED" />
              <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Afwijzen</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Quote meta */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-[var(--primary)]">Details</h2>
            <form action={updateQuote} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={quote.id} />
              <input name="title" defaultValue={quote.title} placeholder="Titel" className="input md:col-span-2" />
              <input name="validUntil" type="date" defaultValue={validUntilStr} className="input" />
              <div />
              <textarea name="notes" defaultValue={quote.notes ?? ""} placeholder="Notities" className="input md:col-span-2" rows={2} />
              <button type="submit" className="btn-secondary">Opslaan</button>
            </form>
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Regels</h2>

            {quote.lines.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 pr-3">Omschrijving</th>
                      <th className="pb-2 pr-3 text-right w-16">Aantal</th>
                      <th className="pb-2 pr-3 w-20">Eenheid</th>
                      <th className="pb-2 pr-3 text-right w-24">Stukprijs</th>
                      <th className="pb-2 pr-3 text-right w-16">BTW%</th>
                      <th className="pb-2 text-right w-24">Totaal</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {quote.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2 pr-3">{line.description}</td>
                        <td className="py-2 pr-3 text-right">{Number(line.quantity)}</td>
                        <td className="py-2 pr-3 text-slate-500">{line.unit}</td>
                        <td className="py-2 pr-3 text-right">€{Number(line.unitPrice).toFixed(2)}</td>
                        <td className="py-2 pr-3 text-right text-slate-500">{Number(line.vatPercentage)}%</td>
                        <td className="py-2 text-right font-medium">€{Number(line.totalAmount).toFixed(2)}</td>
                        <td className="py-2 pl-2">
                          <form action={deleteLine}>
                            <input type="hidden" name="lineId" value={line.id} />
                            <input type="hidden" name="quoteId" value={quote.id} />
                            <button className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add line form */}
            <form action={addLine} className="grid gap-2 md:grid-cols-6 items-end border-t border-slate-100 pt-4">
              <input type="hidden" name="quoteId" value={quote.id} />
              <input name="description" required placeholder="Omschrijving *" className="input md:col-span-2" />
              <input name="quantity" type="number" step="0.01" defaultValue="1" placeholder="Aantal" className="input" />
              <select name="unit" className="input">
                <option value="stuk">stuk</option>
                <option value="m2">m²</option>
                <option value="m1">m¹</option>
                <option value="uur">uur</option>
                <option value="dag">dag</option>
                <option value="post">post</option>
              </select>
              <input name="unitPrice" type="number" step="0.01" placeholder="Stukprijs" className="input" />
              <button type="submit" className="btn-primary">Toevoegen</button>
            </form>
          </section>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-[var(--primary)]">Totalen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotaal (excl. BTW)</span>
                <span>€{Number(quote.subtotal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>BTW {Number(quote.vatPercentage)}%</span>
                <span>€{Number(quote.vatAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-[var(--primary)]">
                <span>Totaal (incl. BTW)</span>
                <span>€{Number(quote.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400 space-y-1">
            <p>Aangemaakt: {quote.createdAt.toLocaleDateString("nl-NL")}</p>
            {quote.validUntil && (
              <p>Geldig tot: {new Date(quote.validUntil).toLocaleDateString("nl-NL")}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
