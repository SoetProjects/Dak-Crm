import { notFound } from "next/navigation";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { updateJobStatusAction } from "@/lib/crm/actions";
import { getJobDetail } from "@/lib/crm/data";
import { asNumber, asText, pickField } from "@/lib/crm/types";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const { job, fotos, afspraken } = await getJobDetail(params.id);
  if (!job) {
    notFound();
  }

  const m2 = asNumber(pickField(job, ["m2"], 0));
  const extras = asText(pickField(job, ["extras"], ""), "");
  const prijs = asNumber(pickField(job, ["prijs", "totaal_bedrag"], 0));

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-semibold text-primary">
          {asText(pickField(job, ["titel", "naam", "omschrijving"]))}
        </h2>
        <p className="text-sm text-blue-700">Werkbon en planning overzicht.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Werkbon</h3>
          <div className="mt-3 space-y-1 text-sm">
            <p>m²: {m2}</p>
            <p>Extras: {extras || "-"}</p>
            <p>Totaal: EUR {prijs.toFixed(2)}</p>
          </div>

          <ActionForm action={updateJobStatusAction} className="mt-4 space-y-2">
            <input type="hidden" name="job_id" value={params.id} />
            <select name="status" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm">
              <option value="nieuw">nieuw</option>
              <option value="gepland">gepland</option>
              <option value="in_behandeling">in_behandeling</option>
              <option value="afgerond">afgerond</option>
            </select>
            <FormSubmit label="Status bijwerken" />
          </ActionForm>
        </article>

        <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Afspraken</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {afspraken.map((item) => (
              <li key={String(pickField(item, ["id"], ""))} className="rounded-lg border border-blue-50 px-3 py-2">
                <p>{asText(pickField(item, ["datum"]))}</p>
                <p className="text-blue-700">{asText(pickField(item, ["onderwerp", "titel", "omschrijving"]))}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-primary">Fotos</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((foto) => (
            <li key={String(pickField(foto, ["id"], ""))} className="rounded-lg border border-blue-50 px-3 py-2 text-sm">
              {asText(pickField(foto, ["url", "pad", "naam", "bestandsnaam"]))}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
