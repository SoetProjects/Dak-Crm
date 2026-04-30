import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { PrintButton } from "@/components/print-button";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  PAID: "Betaald",
  OVERDUE: "Te laat",
  CANCELLED: "Geannuleerd",
};

type Props = { params: Promise<{ id: string }> };

export default async function InvoicePrintPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      company: {
        select: {
          name: true,
          address: true,
          postalCode: true,
          city: true,
          phone: true,
          email: true,
          website: true,
          kvkNumber: true,
          vatNumber: true,
          bankAccount: true,
        },
      },
      customer: {
        select: {
          name: true,
          contactPerson: true,
          billingAddress: true,
          billingPostalCode: true,
          billingCity: true,
          email: true,
          phone: true,
          vatNumber: true,
        },
      },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) return notFound();

  const { company, customer, lines } = invoice;
  const invoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("nl-NL")
    : invoice.createdAt.toLocaleDateString("nl-NL");
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("nl-NL")
    : null;
  const paidAt = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString("nl-NL")
    : null;
  const isOverdue = invoice.status === "OVERDUE" || (
    invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status === "SENT"
  );

  return (
    <>
      {/* Screen-only toolbar — hidden when printing */}
      <div className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <Link href={`/invoices/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Terug naar factuur
        </Link>
        <PrintButton />
        <p className="ml-auto text-xs text-slate-400">
          Gebruik &ldquo;Opslaan als PDF&rdquo; in het printvenster om een PDF te genereren.
        </p>
      </div>

      {/* Print document */}
      <div className="print-page mx-auto max-w-3xl px-8 py-10 text-sm text-slate-900">

        {/* Header row: company left, document info right */}
        <div className="flex justify-between gap-6">
          <div>
            <p className="text-xl font-bold text-[#1b3a6b]">{company.name}</p>
            {company.address && <p className="mt-1 text-slate-600">{company.address}</p>}
            {(company.postalCode || company.city) && (
              <p className="text-slate-600">
                {[company.postalCode, company.city].filter(Boolean).join("  ")}
              </p>
            )}
            {company.phone && <p className="mt-1 text-slate-600">{company.phone}</p>}
            {company.email && <p className="text-slate-600">{company.email}</p>}
            {company.website && <p className="text-slate-600">{company.website}</p>}
            <div className="mt-2 space-y-0.5 text-xs text-slate-400">
              {company.kvkNumber && <p>KvK: {company.kvkNumber}</p>}
              {company.vatNumber && <p>BTW: {company.vatNumber}</p>}
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-[#1b3a6b]">FACTUUR</p>
            <p className="mt-2 font-mono text-base font-semibold">{invoice.invoiceNumber}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>Datum: <span className="text-slate-800">{invoiceDate}</span></p>
              {dueDate && (
                <p className={isOverdue ? "text-red-600 font-semibold" : ""}>
                  Vervaldatum: <span>{dueDate}</span>
                  {isOverdue && " (te laat)"}
                </p>
              )}
              <p>
                Status:{" "}
                <span className="font-medium text-slate-800">
                  {STATUS_LABELS[invoice.status] ?? invoice.status}
                </span>
              </p>
              {paidAt && (
                <p>Betaald op: <span className="text-green-700 font-medium">{paidAt}</span></p>
              )}
            </div>
          </div>
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Customer */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Aan</p>
          <p className="mt-1 font-semibold text-slate-900">{customer.name}</p>
          {customer.contactPerson && (
            <p className="text-slate-600">t.a.v. {customer.contactPerson}</p>
          )}
          {customer.billingAddress && (
            <p className="text-slate-600">{customer.billingAddress}</p>
          )}
          {(customer.billingPostalCode || customer.billingCity) && (
            <p className="text-slate-600">
              {[customer.billingPostalCode, customer.billingCity].filter(Boolean).join("  ")}
            </p>
          )}
          {customer.email && <p className="text-slate-500 text-xs mt-1">{customer.email}</p>}
          {customer.vatNumber && (
            <p className="text-xs text-slate-400">BTW: {customer.vatNumber}</p>
          )}
        </div>

        <hr className="my-6 border-slate-200" />

        {/* Line items */}
        {lines.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3">Omschrijving</th>
                <th className="pb-2 pr-3 text-right w-16">Aantal</th>
                <th className="pb-2 pr-3 w-16">Eenheid</th>
                <th className="pb-2 pr-3 text-right w-24">Stukprijs</th>
                <th className="pb-2 pr-3 text-right w-14">BTW%</th>
                <th className="pb-2 text-right w-24">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-800">{line.description}</td>
                  <td className="py-2 pr-3 text-right">{Number(line.quantity)}</td>
                  <td className="py-2 pr-3 text-slate-500">{line.unit}</td>
                  <td className="py-2 pr-3 text-right">
                    €{Number(line.unitPrice).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-500">{Number(line.vatPercentage)}%</td>
                  <td className="py-2 text-right font-medium">
                    €{Number(line.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-400 italic">Geen factuurregels toegevoegd.</p>
        )}

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotaal (excl. BTW)</span>
              <span>€{Number(invoice.subtotal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>BTW {Number(invoice.vatPercentage)}%</span>
              <span>€{Number(invoice.vatAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-bold text-slate-900">
              <span>Totaal (incl. BTW)</span>
              <span>€{Number(invoice.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
          <>
            <hr className="my-6 border-slate-200" />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Betalingsinstructie</p>
              <p className="text-slate-700">
                Gelieve het totaalbedrag van{" "}
                <strong>€{Number(invoice.totalAmount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</strong>{" "}
                te voldoen onder vermelding van het factuurnummer{" "}
                <strong>{invoice.invoiceNumber}</strong>
                {dueDate && <>, uiterlijk vóór <strong>{dueDate}</strong></>}.
              </p>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {company.bankAccount && (
                  <p>IBAN: <span className="font-mono font-medium text-slate-800">{company.bankAccount}</span></p>
                )}
                {company.name && (
                  <p>Ten name van: <span className="font-medium text-slate-800">{company.name}</span></p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {invoice.notes && (
          <>
            <hr className="my-6 border-slate-200" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Opmerkingen
              </p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700 leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-400 text-center">
          {company.name}
          {company.kvkNumber && ` · KvK ${company.kvkNumber}`}
          {company.vatNumber && ` · BTW ${company.vatNumber}`}
          {company.email && ` · ${company.email}`}
          {company.phone && ` · ${company.phone}`}
        </div>
      </div>
    </>
  );
}
