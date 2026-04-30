import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept", SENT: "Verzonden", PAID: "Betaald", OVERDUE: "Te laat", CANCELLED: "Geannuleerd",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-green-700",
  OVERDUE: "bg-red-50 text-red-600",
  CANCELLED: "bg-slate-100 text-slate-500",
};

async function setStatus(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const data: Record<string, unknown> = { status };
  if (status === "PAID") data.paidAt = new Date();
  await db.invoice.updateMany({ where: { id, companyId: session.companyId }, data });
  revalidatePath(`/invoices/${id}`);
}

async function addLine(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const qty = parseFloat(String(formData.get("quantity") ?? "1")) || 1;
  const price = parseFloat(String(formData.get("unitPrice") ?? "0")) || 0;
  const vat = parseFloat(String(formData.get("vatPercentage") ?? "21")) || 21;
  const total = qty * price;

  await db.invoiceLine.create({
    data: {
      companyId: session.companyId,
      invoiceId,
      description: String(formData.get("description") ?? ""),
      quantity: qty,
      unit: String(formData.get("unit") ?? "stuk"),
      unitPrice: price,
      vatPercentage: vat,
      totalAmount: Math.round(total * 100) / 100,
    },
  });

  // Recalculate
  const lines = await db.invoiceLine.findMany({ where: { invoiceId } });
  const subtotal = lines.reduce((s, l) => s + Number(l.totalAmount), 0);
  const vatAmount = lines.reduce((s, l) => s + Number(l.totalAmount) * (Number(l.vatPercentage) / 100), 0);
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round((subtotal + vatAmount) * 100) / 100,
    },
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

async function deleteLine(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const lineId = String(formData.get("lineId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  await db.invoiceLine.deleteMany({ where: { id: lineId, companyId: session.companyId } });

  const lines = await db.invoiceLine.findMany({ where: { invoiceId } });
  const subtotal = lines.reduce((s, l) => s + Number(l.totalAmount), 0);
  const vatAmount = lines.reduce((s, l) => s + Number(l.totalAmount) * (Number(l.vatPercentage) / 100), 0);
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round((subtotal + vatAmount) * 100) / 100,
    },
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true, billingAddress: true, billingPostalCode: true, billingCity: true } },
      job: { select: { id: true, jobNumber: true, title: true } },
      quote: { select: { id: true, quoteNumber: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/invoices" className="text-sm text-slate-500 hover:underline">← Facturen</Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--primary)]">{invoice.invoiceNumber}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`badge ${STATUS_COLORS[invoice.status] ?? "bg-slate-100"}`}>
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </span>
            <Link href={`/customers/${invoice.customer.id}`} className="text-sm text-slate-500 hover:underline">
              {invoice.customer.name}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            Print / PDF
          </Link>
          {invoice.status === "DRAFT" && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={invoice.id} />
              <input type="hidden" name="status" value="SENT" />
              <button className="btn-secondary text-sm">Verzenden</button>
            </form>
          )}
          {invoice.status === "SENT" && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={invoice.id} />
              <input type="hidden" name="status" value="OVERDUE" />
              <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600">Te laat markeren</button>
            </form>
          )}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={invoice.id} />
              <input type="hidden" name="status" value="PAID" />
              <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Betaald markeren</button>
            </form>
          )}
          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <form action={setStatus}>
              <input type="hidden" name="id" value={invoice.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Annuleren</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Factuurregels</h2>

            {invoice.lines.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 pr-3">Omschrijving</th>
                      <th className="pb-2 pr-3 text-right w-16">Aantal</th>
                      <th className="pb-2 pr-3 w-16">Eenheid</th>
                      <th className="pb-2 pr-3 text-right w-24">Stukprijs</th>
                      <th className="pb-2 pr-3 text-right w-16">BTW%</th>
                      <th className="pb-2 text-right w-24">Totaal</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoice.lines.map(l => (
                      <tr key={l.id}>
                        <td className="py-2 pr-3">{l.description}</td>
                        <td className="py-2 pr-3 text-right">{Number(l.quantity)}</td>
                        <td className="py-2 pr-3 text-slate-500">{l.unit}</td>
                        <td className="py-2 pr-3 text-right">€{Number(l.unitPrice).toFixed(2)}</td>
                        <td className="py-2 pr-3 text-right text-slate-500">{Number(l.vatPercentage)}%</td>
                        <td className="py-2 text-right font-medium">€{Number(l.totalAmount).toFixed(2)}</td>
                        <td className="py-2 pl-2">
                          <form action={deleteLine}>
                            <input type="hidden" name="lineId" value={l.id} />
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <button className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form action={addLine} className="grid gap-2 md:grid-cols-6 items-end border-t border-slate-100 pt-4">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <input name="description" required placeholder="Omschrijving *" className="input md:col-span-2" />
              <input name="quantity" type="number" step="0.01" defaultValue="1" className="input" />
              <select name="unit" className="input">
                <option value="stuk">stuk</option>
                <option value="m2">m²</option>
                <option value="m1">m¹</option>
                <option value="uur">uur</option>
                <option value="dag">dag</option>
                <option value="post">post</option>
              </select>
              <input name="unitPrice" type="number" step="0.01" placeholder="Prijs" className="input" />
              <button type="submit" className="btn-primary">+</button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-[var(--primary)]">Totalen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotaal</span>
                <span>€{Number(invoice.subtotal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>BTW {Number(invoice.vatPercentage)}%</span>
                <span>€{Number(invoice.vatAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-[var(--primary)]">
                <span>Totaal</span>
                <span>€{Number(invoice.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            {invoice.job && (
              <div>
                <p className="text-xs text-slate-400">Werkbon</p>
                <Link href={`/jobs/${invoice.job.id}`} className="text-sm text-[var(--accent)] hover:underline">
                  {invoice.job.jobNumber} — {invoice.job.title}
                </Link>
              </div>
            )}
            {invoice.quote && (
              <div>
                <p className="text-xs text-slate-400">Offerte</p>
                <Link href={`/quotes/${invoice.quote.id}`} className="text-sm text-[var(--accent)] hover:underline">
                  {invoice.quote.quoteNumber}
                </Link>
              </div>
            )}
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-slate-400">Vervaldatum</p>
                <p className="text-sm text-slate-700">{new Date(invoice.dueDate).toLocaleDateString("nl-NL")}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-slate-400">Betaald op</p>
                <p className="text-sm text-green-700">{new Date(invoice.paidAt).toLocaleDateString("nl-NL")}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
