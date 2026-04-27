import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Gepland",
  IN_PROGRESS: "In uitvoering",
  WAITING_FOR_MATERIAL: "Wacht op materiaal",
  WAITING_FOR_WEATHER: "Wacht op weer",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
};
const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700",
  WAITING_FOR_MATERIAL: "bg-orange-50 text-orange-700",
  WAITING_FOR_WEATHER: "bg-sky-50 text-sky-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

// ─────────────────────────────────────────────
// Server actions
// ─────────────────────────────────────────────

async function addNote(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;

  const jobId = String(formData.get("jobId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  let user = await db.user.findFirst({ where: { email: session.email } });
  if (!user) {
    user = await db.user.create({
      data: {
        companyId: session.companyId,
        email: session.email,
        firstName: "Medewerker",
        lastName: "",
        role: "FIELD_WORKER",
      },
    });
  }

  await db.jobNote.create({
    data: { companyId: session.companyId, jobId, authorId: user.id, content },
  });
  revalidatePath(`/mobile/jobs/${jobId}`);
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
  revalidatePath(`/mobile/jobs/${id}`);
  revalidatePath("/mobile");
  revalidatePath("/mobile/jobs");
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> };

export default async function MobileJobDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getAppSession();

  if (!isDatabaseReady()) return notFound();

  const job = await db.job.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true, phone: true, serviceAddress: true, serviceCity: true } },
      quote: { select: { id: true, quoteNumber: true } },
      jobNotes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      jobMaterials: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!job) return notFound();

  const isCompleted = job.status === "COMPLETED" || job.status === "CANCELLED";

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link href="/mobile/jobs" className="text-[var(--primary)] p-1 -ml-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400 font-mono">{job.jobNumber}</p>
          <h1 className="text-base font-bold text-[var(--primary)] truncate">{job.title}</h1>
        </div>
        <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[job.status] ?? "bg-slate-100"}`}>
          {STATUS_LABELS[job.status] ?? job.status}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer info */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Klant</h2>
          <p className="font-semibold text-slate-900">{job.customer.name}</p>
          {job.customer.phone && (
            <a
              href={`tel:${job.customer.phone}`}
              className="flex items-center gap-2 text-sm text-[var(--accent)] font-medium"
            >
              <span>📞</span> {job.customer.phone}
            </a>
          )}
          {(job.address || job.customer.serviceAddress) && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent((job.address ?? job.customer.serviceAddress ?? "") + " " + (job.city ?? job.customer.serviceCity ?? ""))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--accent)]"
            >
              <span>📍</span>{" "}
              {job.address ?? job.customer.serviceAddress}
              {(job.city ?? job.customer.serviceCity) ? `, ${job.city ?? job.customer.serviceCity}` : ""}
            </a>
          )}
        </section>

        {/* Planned time */}
        {(job.scheduledStart || job.scheduledEnd) && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Geplande tijd</h2>
            <p className="text-sm text-slate-800">
              {job.scheduledStart &&
                new Date(job.scheduledStart).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              {job.scheduledEnd &&
                ` — ${new Date(job.scheduledEnd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </section>
        )}

        {/* Description */}
        {job.description && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Omschrijving</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
          </section>
        )}

        {/* Customer notes */}
        {job.customerNotes && (
          <section className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Opmerkingen klant</h2>
            <p className="text-sm text-amber-900">{job.customerNotes}</p>
          </section>
        )}

        {/* Status buttons */}
        {!isCompleted && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status wijzigen</h2>
            <div className="grid grid-cols-2 gap-2">
              {job.status !== "IN_PROGRESS" && (
                <form action={setStatus}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="IN_PROGRESS" />
                  <button className="w-full rounded-xl bg-yellow-400 text-yellow-900 font-semibold text-sm py-3 active:scale-[0.97] transition-transform">
                    ▶ Starten
                  </button>
                </form>
              )}
              {job.status === "IN_PROGRESS" && (
                <form action={setStatus}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="WAITING_FOR_MATERIAL" />
                  <button className="w-full rounded-xl bg-orange-50 border border-orange-300 text-orange-700 font-medium text-sm py-3 active:scale-[0.97] transition-transform">
                    Wacht materiaal
                  </button>
                </form>
              )}
              <form action={setStatus}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="COMPLETED" />
                <button className="w-full rounded-xl bg-green-600 text-white font-semibold text-sm py-3 active:scale-[0.97] transition-transform">
                  ✓ Afronden
                </button>
              </form>
            </div>
          </section>
        )}

        {isCompleted && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-green-700 font-semibold">✓ Werkbon afgerond</p>
            {job.completedAt && (
              <p className="text-green-600 text-xs mt-1">
                {new Date(job.completedAt).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Notities ({job.jobNotes.length})
          </h2>

          {job.jobNotes.length > 0 && (
            <div className="space-y-2 mb-4">
              {job.jobNotes.map((note) => (
                <div key={note.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{note.author.firstName} {note.author.lastName}</span>
                    <span>{new Date(note.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          {!isCompleted && (
            <form action={addNote} className="flex gap-2 items-end">
              <input type="hidden" name="jobId" value={job.id} />
              <textarea
                name="content"
                required
                rows={2}
                placeholder="Notitie toevoegen…"
                className="input flex-1 text-sm"
              />
              <button type="submit" className="btn-primary shrink-0 py-2.5 text-sm">Opslaan</button>
            </form>
          )}
        </section>

        {/* Materials used */}
        {job.jobMaterials.length > 0 && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Materialen</h2>
            <div className="space-y-1">
              {job.jobMaterials.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{m.description}</span>
                  <span className="text-slate-500 shrink-0 ml-2">{Number(m.quantity)} {m.unit}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo placeholder */}
        <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <p className="text-2xl">📷</p>
          <p className="text-sm font-medium text-slate-500 mt-1">Foto toevoegen</p>
          <p className="text-xs text-slate-400 mt-0.5">Beschikbaar zodra Supabase Storage geconfigureerd is</p>
        </section>

        {/* Link to desktop detail */}
        <div className="text-center pt-2">
          <Link href={`/jobs/${job.id}`} className="text-xs text-slate-400 hover:underline">
            Volledige werkbon openen →
          </Link>
        </div>
      </div>
    </div>
  );
}
