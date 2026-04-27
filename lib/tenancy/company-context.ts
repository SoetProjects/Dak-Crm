import { db } from "@/lib/db/prisma";

export async function ensureCompany(companyId: string) {
  await db.company.upsert({
    where: { id: companyId },
    update: {},
    create: {
      id: companyId,
      name: "Demo Dakdekkersbedrijf",
    },
  });
}
