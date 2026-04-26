import Link from "next/link";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { markFactuurBetaaldAction } from "@/lib/crm/actions";
import { getJobs } from "@/lib/crm/data";

const isPaid = (status: string) => ["betaald", "paid"].includes(status.toLowerCase());

export default async function FacturenPage() {
  const jobs = await getJobs();
  const facturen = jobs.map((job) => {
    const status = job.status.toLowerCase().includes("betaald") ? "betaald" : "open";
    return { ...job, factuurStatus: status };
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Facturen</h2>
        <p className="text-sm text-blue-700">Facturen op basis van jobs, met betaalstatus.</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <ul className="space-y-2">
          {facturen.map((factuur) => (
            <li key={factuur.id} className="rounded-lg border border-blue-50 p-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/jobs/${factuur.id}`} className="font-medium text-primary hover:text-accent">
                    Job #{factuur.id}
                  </Link>
                  <p className="text-blue-700">{factuur.klantNaam}</p>
                  <p className="text-blue-700">Bedrag: EUR {factuur.prijs.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">
                    {factuur.factuurStatus}
                  </span>
                  {!isPaid(factuur.factuurStatus) ? (
                    <ActionForm action={markFactuurBetaaldAction}>
                      <input type="hidden" name="job_id" value={factuur.id} />
                      <FormSubmit label="Markeer betaald" loadingLabel="..." />
                    </ActionForm>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
