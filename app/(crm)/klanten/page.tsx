import Link from "next/link";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { createKlantAction } from "@/lib/crm/actions";
import { getKlanten } from "@/lib/crm/data";

export default async function KlantenPage() {
  const klanten = await getKlanten();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary">Klanten</h2>
        <p className="text-sm text-blue-700">Bekijk alle klanten en voeg nieuwe toe.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 text-left text-blue-700">
                  <th className="py-2">Naam</th>
                  <th className="py-2">E-mail</th>
                  <th className="py-2">Telefoon</th>
                  <th className="py-2">Plaats</th>
                </tr>
              </thead>
              <tbody>
                {klanten.map((klant) => (
                  <tr key={klant.id} className="border-b border-blue-50">
                    <td className="py-2 font-medium text-primary">
                      <Link href={`/klanten/${klant.id}`} className="hover:text-accent">
                        {klant.naam}
                      </Link>
                    </td>
                    <td className="py-2">{klant.email}</td>
                    <td className="py-2">{klant.telefoon}</td>
                    <td className="py-2">{klant.plaats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-primary">Nieuwe klant</h3>
          <ActionForm action={createKlantAction} className="mt-3 space-y-3">
            <input name="naam" required placeholder="Naam" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="E-mail" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <input name="telefoon" placeholder="Telefoon" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <input name="plaats" placeholder="Plaats" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm" />
            <FormSubmit label="Klant opslaan" />
          </ActionForm>
        </div>
      </div>
    </section>
  );
}
