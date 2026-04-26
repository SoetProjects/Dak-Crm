import Link from "next/link";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { createJobAction } from "@/lib/crm/actions";
import { getJobs, getKlanten } from "@/lib/crm/data";

export default async function JobsPage() {
  const [jobs, klanten] = await Promise.all([getJobs(), getKlanten()]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Jobs</h2>
        <p className="text-sm text-blue-700">Alle jobs met status en gekoppelde klant.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-blue-50 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/jobs/${job.id}`} className="font-medium text-primary hover:text-accent">
                      {job.titel}
                    </Link>
                    <p className="text-blue-700">{job.klantNaam}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">
                    {job.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Nieuwe job</h3>
          <ActionForm action={createJobAction} className="mt-3 space-y-3">
            <input name="titel" required placeholder="Titel / omschrijving" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <select name="klant_id" required className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm">
              <option value="">Selecteer klant</option>
              {klanten.map((klant) => (
                <option key={klant.id} value={klant.id}>
                  {klant.naam}
                </option>
              ))}
            </select>
            <select name="status" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm">
              <option value="nieuw">nieuw</option>
              <option value="gepland">gepland</option>
              <option value="in_behandeling">in_behandeling</option>
              <option value="afgerond">afgerond</option>
            </select>
            <input name="prijs" type="number" step="0.01" min="0" placeholder="Prijs" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <FormSubmit label="Job opslaan" />
          </ActionForm>
        </div>
      </div>
    </section>
  );
}
