import { OpBezoekForm } from "@/components/crm/op-bezoek-form";
import { getJobs } from "@/lib/crm/data";

export default async function OpBezoekPage() {
  const jobs = await getJobs();
  const options = jobs.map((job) => ({ id: job.id, titel: job.titel }));

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Op bezoek</h2>
        <p className="text-sm text-blue-700">Mobiele werkbon: fotos, m², extras en prijs.</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <OpBezoekForm jobs={options} />
      </div>
    </section>
  );
}
