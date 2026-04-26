import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { createAfsprakAction } from "@/lib/crm/actions";
import { getJobs, getMonteursByAfspraak, getPlanningItems } from "@/lib/crm/data";

const toDateKey = (isoLike: string) => (isoLike ? isoLike.slice(0, 10) : "Onbekend");

export default async function PlanningPage() {
  const [items, jobs, monteursMap] = await Promise.all([
    getPlanningItems(),
    getJobs(),
    getMonteursByAfspraak(),
  ]);

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = toDateKey(item.datum);
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  const days = Object.keys(grouped).sort();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Planning</h2>
        <p className="text-sm text-blue-700">Agendaweergave per dag met jobs en monteurs.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {days.map((day) => (
            <article key={day} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-primary">{day}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {grouped[day].map((item) => (
                  <li key={item.id} className="rounded-lg border border-blue-50 px-3 py-2">
                    <p className="font-medium text-primary">
                      {item.tijd || "--:--"} - {item.onderwerp}
                    </p>
                    <p className="text-blue-700">Job: {item.jobTitel}</p>
                    <p className="text-blue-700">
                      Monteurs: {(monteursMap.get(item.id) ?? []).join(", ") || "-"}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Nieuwe afspraak</h3>
          <ActionForm action={createAfsprakAction} className="mt-3 space-y-3">
            <select name="job_id" required className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm">
              <option value="">Kies job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.titel}
                </option>
              ))}
            </select>
            <input name="onderwerp" required placeholder="Onderwerp" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <input name="datum" type="date" required className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <input name="tijd" type="time" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <FormSubmit label="Afspraak toevoegen" />
          </ActionForm>
        </article>
      </div>
    </section>
  );
}
