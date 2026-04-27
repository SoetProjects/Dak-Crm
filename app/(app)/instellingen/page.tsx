import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Server actions
// ─────────────────────────────────────────────

async function saveSnelStartConfig(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;

  const administrationName = String(formData.get("administrationName") ?? "").trim() || null;
  // TODO: Encrypt connectionKey before storing — for now stored as placeholder only
  const connectionKey = String(formData.get("connectionKey") ?? "").trim() || null;
  const syncCustomers = formData.get("syncCustomers") === "on";
  const syncInvoices = formData.get("syncInvoices") === "on";
  const syncPayments = formData.get("syncPayments") === "on";

  const hasCredentials = Boolean(administrationName && connectionKey);
  const status = hasCredentials ? "ACTIVE" : "INACTIVE";

  await db.integration.upsert({
    where: { companyId_provider: { companyId: session.companyId, provider: "SNELSTART" } },
    update: {
      name: administrationName ?? "SnelStart",
      status: status as never,
      // TODO: Replace with encrypted storage before going live
      encryptedCredentials: connectionKey
        ? `TODO_ENCRYPT:${connectionKey.substring(0, 4)}****`
        : null,
      config: { administrationName, syncCustomers, syncInvoices, syncPayments },
    },
    create: {
      companyId: session.companyId,
      provider: "SNELSTART",
      name: administrationName ?? "SnelStart",
      status: status as never,
      encryptedCredentials: connectionKey
        ? `TODO_ENCRYPT:${connectionKey.substring(0, 4)}****`
        : null,
      config: { administrationName, syncCustomers, syncInvoices, syncPayments },
    },
  });

  revalidatePath("/instellingen");
}

async function saveIntegration(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const provider = String(formData.get("provider") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "").trim() || null;
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

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const OTHER_PROVIDERS = [
  { value: "MOLLIE", label: "Mollie", description: "Online betalingen verwerken via iDEAL, creditcard en meer." },
  { value: "OPENWEATHER", label: "OpenWeather", description: "Weersomstandigheden ophalen voor planningswaarschuwingen." },
  { value: "POSTCODE_API", label: "Postcode API", description: "Automatisch adres invullen op basis van postcode + huisnummer." },
  { value: "EMAIL", label: "E-mail (SMTP)", description: "Verstuur offertes en facturen per e-mail vanuit DakCRM." },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-slate-100 text-slate-500 border-slate-200",
  ERROR: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Verbonden",
  INACTIVE: "Niet verbonden",
  ERROR: "Fout",
};

export default async function InstellingenPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Instellingen</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">DATABASE_URL niet ingesteld — kan instellingen niet laden.</p>
        </div>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const integrations = await db.integration.findMany({
    where: { companyId: session.companyId },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const byProvider = integrations.reduce<Record<string, (typeof integrations)[0]>>((acc, i) => {
    acc[i.provider] = i;
    return acc;
  }, {});

  const snelstart = byProvider["SNELSTART"];
  const snelstartConfig = snelstart?.config as Record<string, unknown> | null | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Instellingen</h1>
        <p className="mt-1 text-sm text-slate-500">Integraties en systeeminstellingen</p>
      </div>

      {/* ─── SnelStart ─────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--primary)]">SnelStart</h2>
              <span className={`badge border text-xs ${STATUS_BADGE[snelstart?.status ?? "INACTIVE"]}`}>
                {STATUS_LABEL[snelstart?.status ?? "INACTIVE"]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Boekhoudkoppeling voor klanten, facturen en betalingen.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
            ⚠ API credentials nog niet beschikbaar — voorbereiding actief
          </div>
        </div>

        <div className="px-5 py-5">
          <form action={saveSnelStartConfig} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Administratienaam (in SnelStart)
                </label>
                <input
                  name="administrationName"
                  defaultValue={String(snelstartConfig?.administrationName ?? "")}
                  placeholder="bijv. Dak B.V. 2026"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Koppelsleutel (connection key)
                  <span className="ml-1 font-normal text-slate-400">— TODO: encryptie vereist</span>
                </label>
                <input
                  name="connectionKey"
                  type="password"
                  autoComplete="off"
                  placeholder="Koppelsleutel uit SnelStart portaal"
                  className="input"
                />
                {snelstart?.encryptedCredentials && (
                  <p className="mt-1 text-xs text-slate-400">
                    Opgeslagen sleutel: {snelstart.encryptedCredentials}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Synchronisatie-instellingen</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="syncCustomers"
                    defaultChecked={Boolean(snelstartConfig?.syncCustomers)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-slate-700">Klanten synchroniseren naar SnelStart (als Relaties)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="syncInvoices"
                    defaultChecked={Boolean(snelstartConfig?.syncInvoices)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-slate-700">Facturen synchroniseren naar SnelStart (als Verkoopfacturen)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="syncPayments"
                    defaultChecked={Boolean(snelstartConfig?.syncPayments)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-slate-700">Betalingsstatus ophalen uit SnelStart</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary">Instellingen opslaan</button>
          </form>
        </div>

        {/* Requirements block */}
        <div className="px-5 pb-5">
          <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Nodig voor live koppeling:</p>
            <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
              <li>SnelStart API portal account (client_id + client_secret)</li>
              <li>Koppelsleutel per administratie uit SnelStart portaal</li>
              <li>Bevestiging REST API endpoint + versie (v3 of nieuwer)</li>
              <li>Sandbox / testomgeving toegang</li>
              <li>Encryptie voor koppelsleutel (bijv. KMS of Vault)</li>
              <li>Veldmapping: Klant ↔ Relatie, Factuur ↔ Verkoopfactuur</li>
            </ul>
          </div>
        </div>

        {/* Integration logs */}
        {snelstart?.logs && snelstart.logs.length > 0 && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recente activiteit</p>
            <div className="space-y-2">
              {snelstart.logs.map(log => (
                <div key={log.id} className="flex items-start justify-between text-xs rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <span className="font-medium text-slate-700">{log.type}</span>
                    {log.entityType && (
                      <span className="text-slate-400 ml-1">({log.entityType})</span>
                    )}
                    {log.message && <p className="text-slate-500 mt-0.5">{log.message}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1 ml-3">
                    <span className={`badge text-xs ${log.status === "success" ? "bg-green-50 text-green-700" : log.status === "error" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                      {log.status}
                    </span>
                    <span className="text-slate-400">{new Date(log.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Other integrations ─────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-[var(--primary)]">Overige integraties</h2>

        {OTHER_PROVIDERS.map((p) => {
          const existing = byProvider[p.value];
          return (
            <div key={p.value} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[var(--primary)]">{p.label}</h3>
                    {existing && (
                      <span className={`badge border text-xs ${STATUS_BADGE[existing.status]}`}>
                        {STATUS_LABEL[existing.status] ?? existing.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{p.description}</p>
                </div>
              </div>
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
            </div>
          );
        })}
      </section>

      {/* ─── Session info ────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-[var(--primary)]">Sessie</h2>
        <p className="text-sm text-slate-500">
          Ingelogd als: <span className="font-medium text-slate-800">{session.email}</span>
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Bedrijf ID: <span className="font-mono text-xs text-slate-400">{session.companyId}</span>
        </p>
        {session.isDemo && (
          <p className="mt-2 text-xs text-orange-600">U gebruikt een demosessie.</p>
        )}
      </section>
    </div>
  );
}
