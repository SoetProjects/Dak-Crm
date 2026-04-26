import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { updateJobStatusAction } from "@/lib/crm/actions";
import { getJobs } from "@/lib/crm/data";

const columns = ["nieuw", "offerte", "gewonnen", "verloren"] as const;

export default async function LeadsOffertesPage() {
  const jobs = await getJobs();
  const byStatus = columns.reduce<Record<string, typeof jobs>>((acc, status) => {
    acc[status] = jobs.filter((job) => job.status.toLowerCase() === status);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Leads & offertes</h2>
        <p className="text-sm text-blue-700">Pipeline op basis van jobstatus.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((status) => (
          <article key={status} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <h3 className="font-semibold capitalize text-primary">{status}</h3>
            <ul className="mt-3 space-y-2">
              {byStatus[status].map((job) => (
                <li key={job.id} className="rounded-lg border border-blue-50 p-2 text-sm">
                  <p className="font-medium">{job.titel}</p>
                  <p className="text-blue-700">{job.klantNaam}</p>
                  <ActionForm action={updateJobStatusAction} className="mt-2 space-y-2">
                    <input type="hidden" name="job_id" value={job.id} />
                    <select name="status" defaultValue={job.status} className="w-full rounded border border-blue-200 px-2 py-1 text-xs">
                      {columns.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FormSubmit label="Opslaan" loadingLabel="..." />
                  </ActionForm>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
