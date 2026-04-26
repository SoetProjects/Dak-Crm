import { getDashboardStats } from "@/lib/crm/data";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Totaal klanten", value: stats.klanten },
    { label: "Open jobs", value: stats.openJobs },
    { label: "Afspraken vandaag", value: stats.afsprakenVandaag },
    { label: "Open facturen", value: stats.openFacturen },
  ];

  return (
    <section>
      <h2 className="text-2xl font-semibold text-primary">Dashboard</h2>
      <p className="mt-1 text-sm text-blue-700">Live kerncijfers uit Supabase.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-blue-700">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
