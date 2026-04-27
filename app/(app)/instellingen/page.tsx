import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";
import { revalidatePath } from "next/cache";

const PROVIDERS = [
  { value: "MOLLIE", label: "Mollie", description: "Online betalingen verwerken" },
  { value: "OPENWEATHER", label: "OpenWeather", description: "Weersomstandigheden voor planning" },
  { value: "POSTCODE_API", label: "Postcode API", description: "Adresvalidatie via postcode" },
  { value: "EMAIL", label: "E-mail", description: "Automatische e-mailinstellingen" },
  { value: "SNELSTART", label: "SnelStart", description: "Boekhoudkoppeling (nog niet beschikbaar)" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actief",
  INACTIVE: "Inactief",
  ERROR: "Fout",
};

async function saveIntegration(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const provider = String(formData.get("provider") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "") || null;
  const status = accessToken ? "ACTIVE" : "INACTIVE";

  await db.integration.upsert({
    where: { companyId_provider: { companyId: session.companyId, provider: provider as never } },
    update: { accessToken, status: status as never },
    create: {
      companyId: session.companyId,
      provider: provider as never,
      accessToken,
      status: status as never,
    },
  });
  revalidatePath("/instellingen");
}

export default async function InstellingenPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Instellingen</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const integrations = await db.integration.findMany({
    where: { companyId: session.companyId },
  });

  const integrationsByProvider = integrations.reduce<Record<string, typeof integrations[0]>>((acc, i) => {
    acc[i.provider] = i;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Instellingen</h1>
        <p className="mt-1 text-sm text-slate-500">Integraties en systeeminstellingen</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-[var(--primary)]">Integraties</h2>

        {PROVIDERS.map((p) => {
          const existing = integrationsByProvider[p.value];
          const isSnelStart = p.value === "SNELSTART";

          return (
            <div key={p.value} className={`rounded-xl border border-slate-200 bg-white p-5 ${isSnelStart ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--primary)]">{p.label}</h3>
                    {existing && (
                      <span className={`badge text-xs ${existing.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABELS[existing.status] ?? existing.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{p.description}</p>
                  {isSnelStart && <p className="mt-1 text-xs text-orange-600">Nog niet beschikbaar in deze versie.</p>}
                </div>
              </div>

              {!isSnelStart && (
                <form action={saveIntegration} className="mt-4 flex gap-3 items-end">
                  <input type="hidden" name="provider" value={p.value} />
                  <input
                    name="accessToken"
                    type="password"
                    defaultValue={existing?.accessToken ?? ""}
                    placeholder={`API sleutel voor ${p.label}`}
                    className="input flex-1"
                    autoComplete="off"
                  />
                  <button type="submit" className="btn-secondary shrink-0">Opslaan</button>
                </form>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-[var(--primary)]">Sessie</h2>
        <p className="text-sm text-slate-500">Ingelogd als: <span className="font-medium text-slate-800">{session.email}</span></p>
        <p className="text-sm text-slate-500 mt-1">Bedrijf ID: <span className="font-mono text-xs text-slate-400">{session.companyId}</span></p>
        {session.isDemo && <p className="mt-2 text-xs text-orange-600">U gebruikt een demosessie.</p>}
      </section>
    </div>
  );
}
