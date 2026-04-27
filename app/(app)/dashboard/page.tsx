import Link from "next/link";

const stats = [
  { label: "Jobs vandaag", value: "0" },
  { label: "Afspraken vandaag", value: "0" },
  { label: "Open leads", value: "0" },
  { label: "Open offertes", value: "0" },
  { label: "Actieve jobs", value: "0" },
  { label: "Geplande medewerkers", value: "0" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vandaag in een oogopslag voor je dakdekkersbedrijf.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <Link href="/leads" className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Nieuwe lead toevoegen
        </Link>
        <Link href="/customers" className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Nieuwe klant toevoegen
        </Link>
        <Link href="/jobs" className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Nieuwe job aanmaken
        </Link>
      </section>
    </div>
  );
}
