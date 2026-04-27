"use server";

import { db as prisma } from "@/lib/db/prisma";

export type SeedResult = {
  ok: boolean;
  message: string;
  created: string[];
  skipped: string[];
  error?: string;
};

function today(hour = 8, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
function yesterday(hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function inDays(n: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function runDemoSeed(companyId: string): Promise<SeedResult> {
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    // ─────────────────────────────────────────────
    // 1. Company
    // ─────────────────────────────────────────────
    await prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: "Berteck Dakwerken",
        city: "Amsterdam",
        address: "Dakstraat 14",
        postalCode: "1011 AB",
        phone: "+31 20 555 0147",
        email: "info@berteck.nl",
        kvkNumber: "12345678",
        vatNumber: "NL123456789B01",
      },
      create: {
        id: companyId,
        name: "Berteck Dakwerken",
        city: "Amsterdam",
        address: "Dakstraat 14",
        postalCode: "1011 AB",
        phone: "+31 20 555 0147",
        email: "info@berteck.nl",
        kvkNumber: "12345678",
        vatNumber: "NL123456789B01",
      },
    });
    created.push("Bedrijf: Berteck Dakwerken (Amsterdam)");

    // ─────────────────────────────────────────────
    // 2. Users
    // ─────────────────────────────────────────────
    const adminUser = await prisma.user.upsert({
      where: { email: "info@berteck.nl" },
      update: { firstName: "Bert", lastName: "Eck", role: "ADMIN", companyId },
      create: {
        companyId,
        email: "info@berteck.nl",
        firstName: "Bert",
        lastName: "Eck",
        role: "ADMIN",
        phone: "+31 6 12 34 56 78",
      },
    });
    created.push("Gebruiker: Bert Eck — ADMIN");

    const fieldUser = await prisma.user.upsert({
      where: { email: "medewerker@berteck.nl" },
      update: { firstName: "Kevin", lastName: "Dak", role: "FIELD_WORKER", companyId },
      create: {
        companyId,
        email: "medewerker@berteck.nl",
        firstName: "Kevin",
        lastName: "Dak",
        role: "FIELD_WORKER",
        phone: "+31 6 98 76 54 32",
      },
    });
    created.push("Medewerker: Kevin Dak — FIELD_WORKER");

    // ─────────────────────────────────────────────
    // 3. Customers
    // ─────────────────────────────────────────────
    let customerJansen = await prisma.customer.findFirst({
      where: { companyId, name: "Jansen B.V." },
    });
    if (!customerJansen) {
      customerJansen = await prisma.customer.create({
        data: {
          companyId,
          customerType: "BUSINESS",
          name: "Jansen B.V.",
          contactPerson: "R. Jansen",
          phone: "+31 20 301 1234",
          email: "r.jansen@jansenbv.nl",
          billingAddress: "Prinsengracht 112",
          billingPostalCode: "1015 EA",
          billingCity: "Amsterdam",
          serviceAddress: "Prinsengracht 112",
          servicePostalCode: "1015 EA",
          serviceCity: "Amsterdam",
          kvkNumber: "56789012",
          vatNumber: "NL567890123B01",
          notes: "Vaste klant. Groot dakoppervlak ~450 m².",
        },
      });
      created.push("Klant: Jansen B.V. (Zakelijk)");
    } else {
      skipped.push("Klant: Jansen B.V.");
    }

    let customerDeVries = await prisma.customer.findFirst({
      where: { companyId, name: "P. de Vries" },
    });
    if (!customerDeVries) {
      customerDeVries = await prisma.customer.create({
        data: {
          companyId,
          customerType: "PRIVATE",
          name: "P. de Vries",
          phone: "+31 20 412 5678",
          email: "p.devries@gmail.com",
          billingAddress: "Vondelstraat 88",
          billingPostalCode: "1054 GK",
          billingCity: "Amsterdam",
          serviceAddress: "Vondelstraat 88",
          servicePostalCode: "1054 GK",
          serviceCity: "Amsterdam",
          notes: "Lekkage bij dakkapel. Vorig jaar ook gemeld.",
        },
      });
      created.push("Klant: P. de Vries (Particulier)");
    } else {
      skipped.push("Klant: P. de Vries");
    }

    let customerVvE = await prisma.customer.findFirst({
      where: { companyId, name: "VvE Zonstraat 12" },
    });
    if (!customerVvE) {
      customerVvE = await prisma.customer.create({
        data: {
          companyId,
          customerType: "HOA",
          name: "VvE Zonstraat 12",
          contactPerson: "M. Hoekstra (bestuurder)",
          phone: "+31 20 665 9900",
          email: "bestuur@vvezonstraat12.nl",
          billingAddress: "Zonstraat 12",
          billingPostalCode: "1013 WD",
          billingCity: "Amsterdam",
          serviceAddress: "Zonstraat 12",
          servicePostalCode: "1013 WD",
          serviceCity: "Amsterdam",
          notes: "VvE van 8 appartementen. Plat dak ~120 m².",
        },
      });
      created.push("Klant: VvE Zonstraat 12 (VvE)");
    } else {
      skipped.push("Klant: VvE Zonstraat 12");
    }

    // ─────────────────────────────────────────────
    // 4. Leads
    // ─────────────────────────────────────────────
    const leadsData = [
      {
        name: "H. Bakker",
        phone: "+31 6 23 45 67 89",
        email: "h.bakker@hotmail.com",
        address: "Haarlemmerdijk 55",
        postalCode: "1013 KD",
        city: "Amsterdam",
        requestType: "LEAK" as const,
        status: "NEW" as const,
        source: "Google",
        description: "Lekkage aan binnenzijde dakrand, zichtbaar na regenval.",
        customerId: undefined as string | undefined,
      },
      {
        name: "T. Smit",
        phone: "+31 30 123 4567",
        email: "t.smit@bedrijf.nl",
        address: "Oudegracht 201",
        postalCode: "3511 NJ",
        city: "Utrecht",
        requestType: "INSPECTION" as const,
        status: "CONTACTED" as const,
        source: "Aanbeveling",
        description: "Jaarlijkse dakinspectie vereist door verzekeraar. Plat dak ~80 m².",
        customerId: undefined as string | undefined,
      },
      {
        name: "VvE Hoekstraat 34",
        phone: "+31 10 456 7890",
        email: "admin@vvehoekstraat.nl",
        address: "Hoekstraat 34",
        postalCode: "3011 XA",
        city: "Rotterdam",
        requestType: "BITUMEN_ROOF" as const,
        status: "WON" as const,
        source: "Website",
        description: "Volledige renovatie bitumen dak, ~200 m². Klant geworden.",
        customerId: customerVvE.id,
      },
    ];
    for (const lead of leadsData) {
      const exists = await prisma.lead.findFirst({ where: { companyId, name: lead.name } });
      if (!exists) {
        await prisma.lead.create({ data: { companyId, ...lead } });
        created.push(`Lead: ${lead.name} — ${lead.city} (${lead.status})`);
      } else {
        skipped.push(`Lead: ${lead.name}`);
      }
    }

    // ─────────────────────────────────────────────
    // 5. Materials
    // ─────────────────────────────────────────────
    const materialsData = [
      { name: "Bitumen rol (3 mm)", category: "Afdichting", unit: "M2" as const, defaultPrice: 12.5, stockQuantity: 200 },
      { name: "PIR isolatie 100mm", category: "Isolatie", unit: "M2" as const, defaultPrice: 8.75, stockQuantity: 150 },
      { name: "Daktrim aluminium", category: "Afwerking", unit: "M1" as const, defaultPrice: 4.2, stockQuantity: 500 },
      { name: "Grind 8/16", category: "Afwerking", unit: "KG" as const, defaultPrice: 0.45, stockQuantity: 2000 },
    ];
    for (const mat of materialsData) {
      const exists = await prisma.material.findFirst({ where: { companyId, name: mat.name } });
      if (!exists) {
        await prisma.material.create({ data: { companyId, ...mat } });
        created.push(`Materiaal: ${mat.name}`);
      } else {
        skipped.push(`Materiaal: ${mat.name}`);
      }
    }

    // ─────────────────────────────────────────────
    // 6. Quotes
    // ─────────────────────────────────────────────
    let quote1 = await prisma.quote.findFirst({ where: { companyId, quoteNumber: "OFF-2026-0001" } });
    if (!quote1) {
      const sub1 = 45 * 38.0 + 45 * 22.0 + 18 * 14.5; // 2961
      const vat1 = Math.round(sub1 * 0.21 * 100) / 100;
      quote1 = await prisma.quote.create({
        data: {
          companyId,
          customerId: customerJansen.id,
          quoteNumber: "OFF-2026-0001",
          title: "Bitumen dakrenovatie Prinsengracht 112",
          status: "ACCEPTED",
          notes: "Inclusief strippen oud dak, nieuwe PIR isolatie en bitumen afdichting. Garantie 10 jaar.",
          validUntil: inDays(30),
          subtotal: sub1,
          vatPercentage: 21,
          vatAmount: vat1,
          totalAmount: Math.round((sub1 + vat1) * 100) / 100,
          lines: {
            create: [
              { companyId, description: "Bitumen afdichting (3 lagen)", quantity: 45, unit: "m2", unitPrice: 38.0, vatPercentage: 21, totalAmount: 45 * 38.0, sortOrder: 1 },
              { companyId, description: "PIR isolatie 100mm", quantity: 45, unit: "m2", unitPrice: 22.0, vatPercentage: 21, totalAmount: 45 * 22.0, sortOrder: 2 },
              { companyId, description: "Daktrim aluminium", quantity: 18, unit: "m1", unitPrice: 14.5, vatPercentage: 21, totalAmount: 18 * 14.5, sortOrder: 3 },
            ],
          },
        },
      });
      created.push(`Offerte: OFF-2026-0001 — Bitumen renovatie Jansen B.V. (Geaccepteerd, €${(sub1 + vat1).toFixed(2)})`);
    } else {
      skipped.push("Offerte: OFF-2026-0001");
    }

    let quote2 = await prisma.quote.findFirst({ where: { companyId, quoteNumber: "OFF-2026-0002" } });
    if (!quote2) {
      const sub2 = 125.0 + 2 * 75.0 + 65.0; // 340
      const vat2 = Math.round(sub2 * 0.21 * 100) / 100;
      quote2 = await prisma.quote.create({
        data: {
          companyId,
          customerId: customerDeVries.id,
          quoteNumber: "OFF-2026-0002",
          title: "Lekkage herstel Vondelstraat 88",
          status: "SENT",
          notes: "Nader onderzoek vereist na herstel om oorzaak definitief te bevestigen.",
          validUntil: inDays(14),
          subtotal: sub2,
          vatPercentage: 21,
          vatAmount: vat2,
          totalAmount: Math.round((sub2 + vat2) * 100) / 100,
          lines: {
            create: [
              { companyId, description: "Inspectie en diagnose lekkage", quantity: 1, unit: "post", unitPrice: 125.0, vatPercentage: 21, totalAmount: 125.0, sortOrder: 1 },
              { companyId, description: "Herstelwerkzaamheden dakrand", quantity: 2, unit: "uur", unitPrice: 75.0, vatPercentage: 21, totalAmount: 150.0, sortOrder: 2 },
              { companyId, description: "Materiaalkosten afdichting", quantity: 1, unit: "post", unitPrice: 65.0, vatPercentage: 21, totalAmount: 65.0, sortOrder: 3 },
            ],
          },
        },
      });
      created.push(`Offerte: OFF-2026-0002 — Lekkage herstel P. de Vries (Verzonden, €${(sub2 + vat2).toFixed(2)})`);
    } else {
      skipped.push("Offerte: OFF-2026-0002");
    }

    // ─────────────────────────────────────────────
    // 7. Jobs
    // ─────────────────────────────────────────────

    // Job 1 — IN_PROGRESS today (De Vries, lekkage reparatie)
    let job1 = await prisma.job.findFirst({ where: { companyId, jobNumber: "JOB-2026-0001" } });
    if (!job1) {
      job1 = await prisma.job.create({
        data: {
          companyId,
          customerId: customerDeVries.id,
          quoteId: quote2.id,
          jobNumber: "JOB-2026-0001",
          title: "Lekkage reparatie P. de Vries",
          description: "Afdichten dakrand en controleren dakdoorvoeren.",
          jobType: "LEAK",
          status: "IN_PROGRESS",
          address: "Vondelstraat 88",
          postalCode: "1054 GK",
          city: "Amsterdam",
          scheduledStart: today(8, 0),
          scheduledEnd: today(12, 0),
          internalNotes: "Neem extra EPDM folie mee. Klant is aanwezig tot 13:00.",
          customerNotes: "Toegang via achterdeur. Bellen bij aankomst.",
        },
      });
      created.push("Werkbon: JOB-2026-0001 — Lekkage reparatie De Vries (In uitvoering, vandaag 08:00)");
    } else {
      skipped.push("Werkbon: JOB-2026-0001");
    }

    // Job 2 — PLANNED today (Jansen B.V., bitumen renovatie)
    let job2 = await prisma.job.findFirst({ where: { companyId, jobNumber: "JOB-2026-0002" } });
    if (!job2) {
      job2 = await prisma.job.create({
        data: {
          companyId,
          customerId: customerJansen.id,
          quoteId: quote1.id,
          jobNumber: "JOB-2026-0002",
          title: "Bitumen dakrenovatie Jansen B.V.",
          description: "Volledige dakrenovatie conform offerte OFF-2026-0001.",
          jobType: "BITUMEN_ROOF",
          status: "PLANNED",
          address: "Prinsengracht 112",
          postalCode: "1015 EA",
          city: "Amsterdam",
          scheduledStart: today(13, 0),
          scheduledEnd: today(17, 0),
          internalNotes: "Dag 1 van 3. Vandaag: strippen en isolatie.",
          customerNotes: "Dak wordt volledig gestript. Materiaalopslag op binnenplaats.",
        },
      });
      created.push("Werkbon: JOB-2026-0002 — Bitumen renovatie Jansen B.V. (Gepland, vandaag 13:00)");
    } else {
      skipped.push("Werkbon: JOB-2026-0002");
    }

    // Job 3 — COMPLETED yesterday (VvE Zonstraat)
    let job3 = await prisma.job.findFirst({ where: { companyId, jobNumber: "JOB-2026-0003" } });
    if (!job3) {
      job3 = await prisma.job.create({
        data: {
          companyId,
          customerId: customerVvE.id,
          jobNumber: "JOB-2026-0003",
          title: "Dakinspectie VvE Zonstraat 12",
          description: "Jaarlijkse inspectie plat dak. Controle bitumen, dakrand, doorvoeren en afvoer.",
          jobType: "INSPECTION",
          status: "COMPLETED",
          address: "Zonstraat 12",
          postalCode: "1013 WD",
          city: "Amsterdam",
          scheduledStart: yesterday(9),
          scheduledEnd: yesterday(11),
          completedAt: yesterday(10),
          internalNotes: "Geen grote gebreken. Kleine slijtage bij dakrand.",
          customerNotes: "Inspectierapport volgt per e-mail.",
        },
      });
      created.push("Werkbon: JOB-2026-0003 — Dakinspectie VvE Zonstraat 12 (Afgerond, gisteren)");
    } else {
      skipped.push("Werkbon: JOB-2026-0003");
    }

    // ─────────────────────────────────────────────
    // 8. Job assignments
    // ─────────────────────────────────────────────
    const assignments: [string, string, boolean][] = [
      [job1.id, adminUser.id, true],
      [job1.id, fieldUser.id, false],
      [job2.id, fieldUser.id, true],
      [job3.id, adminUser.id, true],
    ];
    for (const [jobId, userId, isLead] of assignments) {
      const exists = await prisma.jobAssignment.findFirst({ where: { jobId, userId } });
      if (!exists) {
        await prisma.jobAssignment.create({ data: { companyId, jobId, userId, isLead } });
      }
    }
    created.push("Medewerkers toegewezen aan 3 werkbonnen");

    // ─────────────────────────────────────────────
    // 9. Job notes
    // ─────────────────────────────────────────────
    const notesCount = await prisma.jobNote.count({ where: { companyId } });
    if (notesCount === 0) {
      await prisma.jobNote.createMany({
        data: [
          { companyId, jobId: job1.id, authorId: adminUser.id, content: "Lekkage gevonden bij de dakrand aan de noordzijde. EPDM folie gebarsten over ca. 30 cm.", createdAt: today(9, 30) },
          { companyId, jobId: job1.id, authorId: fieldUser.id, content: "Begin gemaakt met afdichten. Extra materiaal nodig: 2m² EPDM folie.", createdAt: today(10, 15) },
          { companyId, jobId: job3.id, authorId: adminUser.id, content: "Inspectie afgerond. Dak staat er goed bij. Daktrim licht los aan de westzijde.", createdAt: yesterday(10) },
        ],
      });
      created.push("3 notities toegevoegd aan werkbonnen");
    } else {
      skipped.push("Notities (al aanwezig)");
    }

    // ─────────────────────────────────────────────
    // 10. Time entries
    // ─────────────────────────────────────────────
    const timeCount = await prisma.timeEntry.count({ where: { companyId } });
    if (timeCount === 0) {
      await prisma.timeEntry.createMany({
        data: [
          { companyId, jobId: job3.id, userId: adminUser.id, type: "TRAVEL", startedAt: yesterday(8), endedAt: yesterday(9), minutes: 60, notes: "Reistijd Amsterdam heen en terug" },
          { companyId, jobId: job3.id, userId: adminUser.id, type: "WORK", startedAt: yesterday(9), endedAt: yesterday(11), minutes: 105, notes: "Dakinspectie uitgevoerd" },
        ],
      });
      created.push("2 urenregistraties toegevoegd");
    } else {
      skipped.push("Uren (al aanwezig)");
    }

    // ─────────────────────────────────────────────
    // 11. Job materials (for completed job)
    // ─────────────────────────────────────────────
    const matsCount = await prisma.jobMaterial.count({ where: { companyId, jobId: job3.id } });
    if (matsCount === 0) {
      await prisma.jobMaterial.createMany({
        data: [
          { companyId, jobId: job3.id, description: "Inspectie-kit (UV-lamp, vochtmeter)", quantity: 1, unit: "stuk", unitPrice: 0, totalAmount: 0, usedAt: yesterday(9) },
          { companyId, jobId: job3.id, description: "Reiskosten Amsterdam", quantity: 1, unit: "post", unitPrice: 35, totalAmount: 35, usedAt: yesterday(9) },
        ],
      });
      created.push("Materialen toegevoegd aan inspectie-werkbon");
    }

    // ─────────────────────────────────────────────
    // 12. Planning items (visible on dashboard today)
    // ─────────────────────────────────────────────
    const planCount1 = await prisma.planningItem.count({ where: { companyId, jobId: job1.id } });
    if (planCount1 === 0) {
      await prisma.planningItem.create({
        data: {
          companyId,
          jobId: job1.id,
          userId: adminUser.id,
          type: "JOB",
          title: "Lekkage reparatie De Vries — ochtend",
          startAt: today(8, 0),
          endAt: today(12, 0),
        },
      });
      created.push("Planning: Lekkage reparatie vandaag 08:00–12:00");
    }
    const planCount2 = await prisma.planningItem.count({ where: { companyId, jobId: job2.id } });
    if (planCount2 === 0) {
      await prisma.planningItem.create({
        data: {
          companyId,
          jobId: job2.id,
          userId: fieldUser.id,
          type: "JOB",
          title: "Bitumen dakrenovatie Jansen B.V. — Dag 1",
          description: "Strippen oud dak en plaatsen PIR isolatie.",
          startAt: today(13, 0),
          endAt: today(17, 0),
        },
      });
      created.push("Planning: Bitumen renovatie vandaag 13:00–17:00");
    }

    // ─────────────────────────────────────────────
    // 13. Invoice (DRAFT, linked to completed job)
    // ─────────────────────────────────────────────
    let invoice1 = await prisma.invoice.findFirst({ where: { companyId, invoiceNumber: "FAC-2026-0001" } });
    if (!invoice1) {
      const sub = 225.0 + 35.0; // 260
      const vat = Math.round(sub * 0.21 * 100) / 100;
      invoice1 = await prisma.invoice.create({
        data: {
          companyId,
          customerId: customerVvE.id,
          jobId: job3.id,
          invoiceNumber: "FAC-2026-0001",
          status: "DRAFT",
          invoiceDate: new Date(),
          dueDate: inDays(30),
          notes: `Dakinspectie uitgevoerd op ${yesterday().toLocaleDateString("nl-NL")}. Rapport bijgevoegd.`,
          subtotal: sub,
          vatPercentage: 21,
          vatAmount: vat,
          totalAmount: Math.round((sub + vat) * 100) / 100,
          lines: {
            create: [
              { companyId, description: "Dakinspectie plat dak (~120 m²)", quantity: 1, unit: "post", unitPrice: 225.0, vatPercentage: 21, totalAmount: 225.0, sortOrder: 1 },
              { companyId, description: "Reiskosten", quantity: 1, unit: "post", unitPrice: 35.0, vatPercentage: 21, totalAmount: 35.0, sortOrder: 2 },
            ],
          },
        },
      });
      created.push(`Factuur: FAC-2026-0001 — Dakinspectie VvE Zonstraat 12 (Concept, €${(sub + vat).toFixed(2)})`);
    } else {
      skipped.push("Factuur: FAC-2026-0001");
    }

    return {
      ok: true,
      message: `Demo data aangemaakt voor ${companyId}. Dashboard toont: 2 jobs vandaag, 2 open leads, 1 offerte open.`,
      created,
      skipped,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: "Seed mislukt", created, skipped, error: msg };
  }
}
