import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  PAID: "Betaald",
  OVERDUE: "Te laat",
  CANCELLED: "Geannuleerd",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-green-700",
  OVERDUE: "bg-red-50 text-red-600",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const FILTER_STATUSES: Record<string, string[]> = {
  open:     ["DRAFT", "SENT"],
  overdue:  ["OVERDUE"],
  paid:     ["PAID"],
  all:      [],
};

const FILTER_LABELS: Array<{ key: string; label: string }> = [
  { key: "all",     label: "Alle" },
  { key: "open",    label: "Open" },
  { key: "overdue", label: "Te laat" },
  { key: "paid",    label: "Betaald" },
];

async function createInvoice(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);

  const customerId = String(formData.get("customerId") ?? "");
  const jobId = String(formData.get("jobId") ?? "") || null;
  if (!customerId) return;

  const year = new Date().getFullYear();
  const last = await db.invoice.findFirst({
    where: { companyId: session.companyId, invoiceNumber: { startsWith: `FAC-${year}-` } },
    orderBy: { invoiceNumber: "desc" },
  });
  const seq = last ? parseInt(last.invoiceNumber.split("-").pop() ?? "0") + 1 : 1;
  const invoiceNumber = `FAC-${year}-${String(seq).padStart(4, "0")}`;

  // If creating from a job, copy job materials as lines
  let lines: Array<{ description: string; quantity: number; unit: string; unitPrice: number; vatPercentage: number; totalAmount: number; sortOrder: number }> = [];
  if (jobId) {
    const job = await db.job.findFirst({
      where: { id: jobId, companyId: session.companyId },
      include: { jobMaterials: true, quote: { include: { lines: true } } },
    });
    if (job?.quote?.lines) {
      lines = job.quote.lines.map((l, i) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        vatPercentage: Number(l.vatPercentage),
        totalAmount: Number(l.totalAmount),
        sortOrder: i,
      }));
    } else if (job?.jobMaterials?.length) {
      lines = job.jobMaterials.map((m, i) => ({
        description: m.description,
        quantity: Number(m.quantity),
        unit: m.unit,
        unitPrice: Number(m.unitPrice),
        vatPercentage: 21,
        totalAmount: Number(m.totalAmount),
        sortOrder: i,
      }));
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.totalAmount, 0);
  const vatAmount = lines.reduce((s, l) => s + l.totalAmount * (l.vatPercentage / 100), 0);
  const totalAmount = subtotal + vatAmount;
  const dueDate = formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null;

  const invoice = await db.invoice.create({
    data: {
      companyId: session.companyId,
      customerId,
      jobId,
      invoiceNumber,
      dueDate,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      lines: {
        create: lines.map(l => ({
          companyId: session.companyId,
          ...l,
        })),
      },
    },
  });
  redirect(`/invoices/${invoice.id}`);
}

type SearchParams = { jobId?: string; customerId?: string; filter?: string };
type Props = { searchParams: Promise<SearchParams> };

export default async function InvoicesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Facturen</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);

  const activeFilter = FILTER_STATUSES[sp.filter ?? "all"] !== undefined ? (sp.filter ?? "all") : "all";
  const statusFilter = FILTER_STATUSES[activeFilter];

  // Sequential queries: Supabase transaction pooler uses connection_limit=1
  const invoices = await db.invoice.findMany({
    where: {
      companyId: session.companyId,
      ...(statusFilter && statusFilter.length > 0 ? { status: { in: statusFilter as never[] } } : {}),
    },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const customers = await db.customer.findMany({
    where: { companyId: session.companyId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const jobs = await db.job.findMany({
    where: { companyId: session.companyId, status: { notIn: ["CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, jobNumber: true, title: true, customerId: true },
  });

  const openTotal = invoices
    .filter(i => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary)]">Facturen</h1>
          <p className="mt-1 text-sm text-slate-500">
            {invoices.length} facturen &middot; Openstaand: €{openTotal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
          </p>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {FILTER_LABELS.map(f => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/invoices" : `/invoices?filter=${f.key}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === f.key
                  ? "bg-[var(--primary)] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuwe factuur</h2>
        <form action={createInvoice} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select name="customerId" required className="input" defaultValue={sp.customerId ?? ""}>
            <option value="">Klant kiezen *</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="jobId" defaultValue={sp.jobId ?? ""} className="input">
            <option value="">Werkbon (optioneel)</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.jobNumber} — {j.title}</option>
            ))}
          </select>
          <input name="dueDate" type="date" className="input" placeholder="Vervaldatum" />
          <button type="submit" className="btn-primary">Factuur aanmaken</button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">
              {activeFilter === "all" ? "Nog geen facturen" : "Geen facturen in deze categorie"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {activeFilter === "all"
                ? "Maak een factuur vanuit een werkbon via het formulier hierboven."
                : "Probeer een andere filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--primary)]">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{inv.customer.name}</p>
                  {inv.dueDate && (
                    <p className="text-xs text-slate-400">
                      Vervalt: {new Date(inv.dueDate).toLocaleDateString("nl-NL")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`badge ${STATUS_COLORS[inv.status] ?? "bg-slate-100"}`}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    €{Number(inv.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
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
