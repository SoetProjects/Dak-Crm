import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Gepland", color: "bg-blue-50 text-blue-700" },
  { value: "IN_PROGRESS", label: "In uitvoering", color: "bg-yellow-50 text-yellow-700" },
  { value: "WAITING_FOR_MATERIAL", label: "Wacht op materiaal", color: "bg-orange-50 text-orange-700" },
  { value: "WAITING_FOR_WEATHER", label: "Wacht op weer", color: "bg-sky-50 text-sky-700" },
  { value: "COMPLETED", label: "Afgerond", color: "bg-green-50 text-green-700" },
  { value: "CANCELLED", label: "Geannuleerd", color: "bg-slate-100 text-slate-500" },
];

const TYPE_LABELS: Record<string, string> = {
  LEAK: "Lekkage", INSPECTION: "Inspectie", BITUMEN_ROOF: "Bitumen dak",
  ROOF_RENOVATION: "Dakrenovatie", ROOF_TERRACE: "Dakterras", MAINTENANCE: "Onderhoud", OTHER: "Overig",
};

async function updateJob(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const ss = String(formData.get("scheduledStart") ?? "");
  const se = String(formData.get("scheduledEnd") ?? "");
  await db.job.updateMany({
    where: { id, companyId: session.companyId },
    data: {
      title: String(formData.get("title") ?? ""),
      jobType: String(formData.get("jobType") ?? "OTHER") as never,
      address: String(formData.get("address") ?? "") || null,
      postalCode: String(formData.get("postalCode") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      scheduledStart: ss ? new Date(ss) : null,
      scheduledEnd: se ? new Date(se) : null,
      description: String(formData.get("description") ?? "") || null,
      internalNotes: String(formData.get("internalNotes") ?? "") || null,
      customerNotes: String(formData.get("customerNotes") ?? "") || null,
    },
  });
  revalidatePath(`/jobs/${id}`);
}

async function setStatus(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") data.completedAt = new Date();
  await db.job.updateMany({ where: { id, companyId: session.companyId }, data });
  revalidatePath(`/jobs/${id}`);
}

async function addNote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const jobId = String(formData.get("jobId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  // Ensure a user row exists for this session
  let user = await db.user.findFirst({ where: { email: session.email } });
  if (!user) {
    user = await db.user.create({
      data: {
        companyId: session.companyId,
        email: session.email,
        firstName: "Demo",
        lastName: "Gebruiker",
        role: "ADMIN",
      },
    });
  }

  await db.jobNote.create({
    data: {
      companyId: session.companyId,
      jobId,
      authorId: user.id,
      content,
    },
  });
  revalidatePath(`/jobs/${jobId}`);
}

async function addTimeEntry(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const jobId = String(formData.get("jobId") ?? "");
  const minutes = parseInt(String(formData.get("minutes") ?? "0")) || 0;
  if (minutes <= 0) return;

  let user = await db.user.findFirst({ where: { email: session.email } });
  if (!user) {
    user = await db.user.create({
      data: {
        companyId: session.companyId,
        email: session.email,
        firstName: "Demo",
        lastName: "Gebruiker",
        role: "ADMIN",
      },
    });
  }

  await db.timeEntry.create({
    data: {
      companyId: session.companyId,
      jobId,
      userId: user.id,
      type: String(formData.get("type") ?? "WORK") as never,
      startedAt: new Date(),
      minutes,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath(`/jobs/${jobId}`);
}

async function addMaterial(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const jobId = String(formData.get("jobId") ?? "");
  const qty = parseFloat(String(formData.get("quantity") ?? "1")) || 1;
  const price = parseFloat(String(formData.get("unitPrice") ?? "0")) || 0;
  await db.jobMaterial.create({
    data: {
      companyId: session.companyId,
      jobId,
      description: String(formData.get("description") ?? ""),
      quantity: qty,
      unit: String(formData.get("unit") ?? "stuk"),
      unitPrice: price,
      totalAmount: Math.round(qty * price * 100) / 100,
    },
  });
  revalidatePath(`/jobs/${jobId}`);
}

async function deleteNote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const noteId = String(formData.get("noteId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  await db.jobNote.deleteMany({ where: { id: noteId, companyId: session.companyId } });
  revalidatePath(`/jobs/${jobId}`);
}

type Props = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();
  if (!isDatabaseReady()) return notFound();

  const job = await db.job.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      quote: { select: { id: true, quoteNumber: true } },
      jobNotes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      timeEntries: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { startedAt: "desc" },
      },
      jobMaterials: { orderBy: { createdAt: "asc" } },
      planningItems: { orderBy: { startAt: "asc" }, take: 5 },
    },
  });
  if (!job) return notFound();

  const currentStatus = STATUS_OPTIONS.find(s => s.value === job.status);
  const totalHours = job.timeEntries.reduce((s, t) => s + (t.minutes ?? 0), 0);
  const totalMaterialCost = job.jobMaterials.reduce((s, m) => s + Number(m.totalAmount), 0);

  const toDatetimeLocal = (d: Date | null) =>
    d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="text-sm text-slate-500 hover:underline">← Werkbonnen</Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm text-slate-400">{job.jobNumber}</span>
            <h1 className="text-2xl font-semibold text-[var(--primary)]">{job.title}</h1>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`badge ${currentStatus?.color ?? "bg-slate-100 text-slate-600"}`}>
              {currentStatus?.label ?? job.status}
            </span>
            <span className="text-xs text-slate-500">{TYPE_LABELS[job.jobType] ?? job.jobType}</span>
          </div>
        </div>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter(s => s.value !== job.status).map(s => (
            <form key={s.value} action={setStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value={s.value} />
              <button type="submit" className={`badge cursor-pointer border border-slate-200 hover:opacity-80 ${s.color}`}>
                → {s.label}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Edit form */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-[var(--primary)]">Werkbon details</h2>
            <form action={updateJob} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={job.id} />
              <input name="title" defaultValue={job.title} required placeholder="Titel *" className="input md:col-span-2" />
              <select name="jobType" defaultValue={job.jobType} className="input">
                <option value="LEAK">Lekkage</option>
                <option value="INSPECTION">Inspectie</option>
                <option value="BITUMEN_ROOF">Bitumen dak</option>
                <option value="ROOF_RENOVATION">Dakrenovatie</option>
                <option value="ROOF_TERRACE">Dakterras</option>
                <option value="MAINTENANCE">Onderhoud</option>
                <option value="OTHER">Overig</option>
              </select>
              <div />
              <input name="address" defaultValue={job.address ?? ""} placeholder="Adres" className="input" />
              <input name="postalCode" defaultValue={job.postalCode ?? ""} placeholder="Postcode" className="input" />
              <input name="city" defaultValue={job.city ?? ""} placeholder="Stad" className="input" />
              <div />
              <input name="scheduledStart" type="datetime-local" defaultValue={toDatetimeLocal(job.scheduledStart)} className="input" />
              <input name="scheduledEnd" type="datetime-local" defaultValue={toDatetimeLocal(job.scheduledEnd)} className="input" />
              <textarea name="description" defaultValue={job.description ?? ""} placeholder="Omschrijving" className="input md:col-span-2" rows={2} />
              <textarea name="internalNotes" defaultValue={job.internalNotes ?? ""} placeholder="Interne notities (niet zichtbaar voor klant)" className="input md:col-span-2" rows={2} />
              <textarea name="customerNotes" defaultValue={job.customerNotes ?? ""} placeholder="Opmerkingen voor klant" className="input md:col-span-2" rows={2} />
              <button type="submit" className="btn-primary md:col-span-2">Opslaan</button>
            </form>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Notities</h2>
            <div className="mb-4 space-y-3">
              {job.jobNotes.map(note => (
                <div key={note.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">
                      {note.author.firstName} {note.author.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{note.createdAt.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}</span>
                      <form action={deleteNote}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="jobId" value={job.id} />
                        <button className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                      </form>
                    </div>
                  </div>
                  <p className="mt-1 text-slate-600 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
              {job.jobNotes.length === 0 && <p className="text-sm text-slate-400">Nog geen notities.</p>}
            </div>
            <form action={addNote} className="flex gap-2">
              <input type="hidden" name="jobId" value={job.id} />
              <input name="content" placeholder="Notitie toevoegen…" className="input flex-1" required />
              <button type="submit" className="btn-primary shrink-0">Toevoegen</button>
            </form>
          </section>

          {/* Uren */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Uren ({Math.floor(totalHours / 60)}u {totalHours % 60}m)</h2>
            {job.timeEntries.length > 0 && (
              <div className="mb-4 space-y-2">
                {job.timeEntries.map(t => (
                  <div key={t.id} className="flex justify-between text-sm rounded-lg bg-slate-50 p-2">
                    <span className="text-slate-700">{t.user.firstName} {t.user.lastName} — {t.notes ?? "—"}</span>
                    <span className="text-slate-500 shrink-0">{Math.floor((t.minutes ?? 0) / 60)}u {(t.minutes ?? 0) % 60}m</span>
                  </div>
                ))}
              </div>
            )}
            <form action={addTimeEntry} className="grid gap-2 md:grid-cols-4 items-end">
              <input type="hidden" name="jobId" value={job.id} />
              <input name="minutes" type="number" min="1" placeholder="Minuten" className="input" required />
              <select name="type" className="input">
                <option value="WORK">Werk</option>
                <option value="TRAVEL">Reistijd</option>
                <option value="BREAK">Pauze</option>
              </select>
              <input name="notes" placeholder="Omschrijving" className="input" />
              <button type="submit" className="btn-primary">Toevoegen</button>
            </form>
          </section>

          {/* Materials */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-[var(--primary)]">Materialen (€{totalMaterialCost.toFixed(2)})</h2>
            {job.jobMaterials.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 pr-3">Omschrijving</th>
                      <th className="pb-2 pr-3 text-right">Aantal</th>
                      <th className="pb-2 pr-3">Eenheid</th>
                      <th className="pb-2 text-right">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {job.jobMaterials.map(m => (
                      <tr key={m.id}>
                        <td className="py-2 pr-3">{m.description}</td>
                        <td className="py-2 pr-3 text-right">{Number(m.quantity)}</td>
                        <td className="py-2 pr-3 text-slate-500">{m.unit}</td>
                        <td className="py-2 text-right font-medium">€{Number(m.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form action={addMaterial} className="grid gap-2 md:grid-cols-5 items-end">
              <input type="hidden" name="jobId" value={job.id} />
              <input name="description" placeholder="Omschrijving *" className="input md:col-span-2" required />
              <input name="quantity" type="number" step="0.01" defaultValue="1" placeholder="Aantal" className="input" />
              <select name="unit" className="input">
                <option value="stuk">stuk</option>
                <option value="m2">m²</option>
                <option value="m1">m¹</option>
                <option value="kg">kg</option>
                <option value="l">L</option>
              </select>
              <input name="unitPrice" type="number" step="0.01" placeholder="Stukprijs" className="input" />
              <button type="submit" className="btn-primary md:col-span-5 md:w-auto">Toevoegen</button>
            </form>
          </section>

          {/* Photo placeholder */}
          <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-500">Foto&apos;s</p>
            <p className="mt-1 text-xs text-slate-400">Foto-upload volgt zodra Supabase Storage geconfigureerd is.</p>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--primary)]">Klant</h3>
            <Link href={`/customers/${job.customer.id}`} className="block text-sm text-[var(--accent)] hover:underline font-medium">
              {job.customer.name}
            </Link>
            {job.customer.phone && (
              <p className="mt-1 text-xs text-slate-500">{job.customer.phone}</p>
            )}
          </section>

          {/* Quote */}
          {job.quote && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--primary)]">Offerte</h3>
              <Link href={`/quotes/${job.quote.id}`} className="text-sm text-[var(--accent)] hover:underline">
                {job.quote.quoteNumber}
              </Link>
            </section>
          )}

          {/* Planning */}
          {job.planningItems.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--primary)]">Planning</h3>
              <div className="space-y-1">
                {job.planningItems.map(p => (
                  <div key={p.id} className="text-xs text-slate-600">
                    {new Date(p.startAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    {" — "}
                    {new Date(p.endAt).toLocaleString("nl-NL", { timeStyle: "short" })}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Uren</span>
              <span>{Math.floor(totalHours / 60)}u {totalHours % 60}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Materiaalkosten</span>
              <span>€{totalMaterialCost.toFixed(2)}</span>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400 space-y-1">
            <p>Aangemaakt: {job.createdAt.toLocaleDateString("nl-NL")}</p>
            {job.completedAt && <p>Afgerond: {job.completedAt.toLocaleDateString("nl-NL")}</p>}
          </section>

          {/* Create invoice */}
          <Link
            href={`/invoices?jobId=${job.id}`}
            className="block w-full text-center btn-secondary text-sm"
          >
            Factuur aanmaken
          </Link>
        </div>
      </div>
    </div>
  );
}
