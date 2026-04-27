import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";
import { ensureCompany } from "@/lib/tenancy/company-context";

const UNIT_LABELS: Record<string, string> = {
  M2: "m²", M1: "m¹", STUK: "stuk", UUR: "uur", DAG: "dag", KG: "kg", L: "L", POST: "post",
};

async function createMaterial(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  await ensureCompany(session.companyId);
  const price = parseFloat(String(formData.get("defaultPrice") ?? "")) || null;
  const stock = parseFloat(String(formData.get("stockQuantity") ?? "")) || null;
  await db.material.create({
    data: {
      companyId: session.companyId,
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "") || null,
      unit: String(formData.get("unit") ?? "STUK") as never,
      defaultPrice: price,
      stockQuantity: stock,
    },
  });
  revalidatePath("/materials");
}

async function archiveMaterial(formData: FormData) {
  "use server";
  const session = await getAppSession();
  if (!session.isAuthenticated || !isDatabaseReady()) return;
  const id = String(formData.get("id") ?? "");
  await db.material.updateMany({
    where: { id, companyId: session.companyId },
    data: { isActive: false },
  });
  revalidatePath("/materials");
}

export default async function MaterialsPage() {
  const session = await getAppSession();

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Materialen</h1>
        <p className="mt-2 text-sm text-slate-500">DATABASE_URL niet ingesteld.</p>
      </div>
    );
  }

  await ensureCompany(session.companyId);
  const materials = await db.material.findMany({
    where: { companyId: session.companyId, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped = materials.reduce<Record<string, typeof materials>>((acc, m) => {
    const cat = m.category ?? "Overig";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Materialen</h1>
        <p className="mt-1 text-sm text-slate-500">{materials.length} materialen</p>
      </div>

      {/* Create form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-[var(--primary)]">Nieuw materiaal</h2>
        <form action={createMaterial} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input name="name" required placeholder="Naam *" className="input" />
          <input name="category" placeholder="Categorie (bijv. Isolatie)" className="input" />
          <select name="unit" className="input">
            <option value="STUK">stuk</option>
            <option value="M2">m²</option>
            <option value="M1">m¹</option>
            <option value="KG">kg</option>
            <option value="L">L</option>
            <option value="UUR">uur</option>
            <option value="DAG">dag</option>
            <option value="POST">post</option>
          </select>
          <input name="defaultPrice" type="number" step="0.01" placeholder="Standaardprijs" className="input" />
          <input name="stockQuantity" type="number" step="0.01" placeholder="Voorraad" className="input" />
          <button type="submit" className="btn-primary lg:col-span-3">Materiaal opslaan</button>
        </form>
      </section>

      {/* Material catalog */}
      {Object.keys(grouped).length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Nog geen materialen. Voeg standaardmaterialen toe zoals Bitumen, PIR isolatie, Daktrim, enz.</p>
        </section>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-[var(--primary)]">{category}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{UNIT_LABELS[m.unit] ?? m.unit}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {m.defaultPrice != null && (
                      <span className="text-sm text-slate-700">
                        €{Number(m.defaultPrice).toFixed(2)}
                      </span>
                    )}
                    {m.stockQuantity != null && (
                      <span className="text-xs text-slate-400">
                        Voorraad: {Number(m.stockQuantity)}
                      </span>
                    )}
                    <form action={archiveMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-xs text-slate-300 hover:text-red-500">✕</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
