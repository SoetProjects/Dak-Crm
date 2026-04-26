import { notFound } from "next/navigation";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { addNotitieAction } from "@/lib/crm/actions";
import { asText, pickField } from "@/lib/crm/types";
import { getKlantDetail } from "@/lib/crm/data";

export default async function KlantDetailPage({ params }: { params: { id: string } }) {
  const { klant, jobs, notes } = await getKlantDetail(params.id);
  if (!klant) {
    notFound();
  }

  const klantNaam = asText(pickField(klant, ["naam", "bedrijfsnaam", "name"]));

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-primary">{klantNaam}</h2>
        <p className="mt-1 text-sm text-blue-700">Klantdetail met jobs en notities.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Jobs</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {jobs.map((job) => (
              <li key={String(pickField(job, ["id"], ""))} className="rounded-lg border border-blue-50 px-3 py-2">
                <p className="font-medium text-primary">{asText(pickField(job, ["titel", "naam", "omschrijving"]))}</p>
                <p className="text-blue-700">Status: {asText(pickField(job, ["status"], "nieuw"))}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Notities</h3>
          <ActionForm action={addNotitieAction} className="mt-3 space-y-3">
            <input type="hidden" name="klant_id" value={params.id} />
            <textarea
              name="tekst"
              required
              rows={3}
              placeholder="Nieuwe notitie..."
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
            />
            <FormSubmit label="Notitie toevoegen" />
          </ActionForm>
          <ul className="mt-4 space-y-2 text-sm">
            {notes.map((note) => (
              <li key={String(pickField(note, ["id"], ""))} className="rounded-lg border border-blue-50 px-3 py-2">
                {asText(pickField(note, ["tekst", "inhoud", "omschrijving"]))}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
