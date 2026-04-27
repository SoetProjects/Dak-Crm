/**
 * Seed script — Demo data for Berteck Dakwerken (info@berteck.nl)
 *
 * Target: companyId = "demo-company" (all Supabase-authenticated users share this ID currently)
 * Safe: checks existence before creating — never overwrites existing business data.
 *
 * Run: npx tsx prisma/seed.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["warn", "error"] });
const COMPANY_ID = "demo-company";

function today(hour = 8, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
function yesterday(hour = 8) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function inDays(n: number, hour = 8) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("\n🏗  DakCRM — Demo seed voor Berteck Dakwerken\n");

  // ─────────────────────────────────────────────
  // 1. Company
  // ─────────────────────────────────────────────
  await db.company.upsert({
    where: { id: COMPANY_ID },
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
      id: COMPANY_ID,
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
  console.log("✓ Bedrijf: Berteck Dakwerken (Amsterdam)");

  // ─────────────────────────────────────────────
  // 2. Admin user for info@berteck.nl
  // ─────────────────────────────────────────────
  const adminUser = await db.user.upsert({
    where: { email: "info@berteck.nl" },
    update: { firstName: "Bert", lastName: "Eck", role: "ADMIN", companyId: COMPANY_ID },
    create: {
      companyId: COMPANY_ID,
      email: "info@berteck.nl",
      firstName: "Bert",
      lastName: "Eck",
      role: "ADMIN",
      phone: "+31 6 12 34 56 78",
    },
  });
  console.log("✓ Gebruiker: Bert Eck (info@berteck.nl)");

  // Field worker
  const fieldUser = await db.user.upsert({
    where: { email: "medewerker@berteck.nl" },
    update: { firstName: "Kevin", lastName: "Dak", role: "FIELD_WORKER", companyId: COMPANY_ID },
    create: {
      companyId: COMPANY_ID,
      email: "medewerker@berteck.nl",
      firstName: "Kevin",
      lastName: "Dak",
      role: "FIELD_WORKER",
      phone: "+31 6 98 76 54 32",
    },
  });
  console.log("✓ Medewerker: Kevin Dak (veldwerker)");

  // ─────────────────────────────────────────────
  // 3. Customers (skip if already exist by name)
  // ─────────────────────────────────────────────
  let customerJansen = await db.customer.findFirst({
    where: { companyId: COMPANY_ID, name: "Jansen B.V." },
  });
  if (!customerJansen) {
    customerJansen = await db.customer.create({
      data: {
        companyId: COMPANY_ID,
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
    console.log("✓ Klant: Jansen B.V. (zakelijk)");
  } else {
    console.log("↳ Klant Jansen B.V. bestaat al — overgeslagen");
  }

  let customerDeVries = await db.customer.findFirst({
    where: { companyId: COMPANY_ID, name: "P. de Vries" },
  });
  if (!customerDeVries) {
    customerDeVries = await db.customer.create({
      data: {
        companyId: COMPANY_ID,
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
    console.log("✓ Klant: P. de Vries (particulier)");
  } else {
    console.log("↳ Klant P. de Vries bestaat al — overgeslagen");
  }

  let customerVvE = await db.customer.findFirst({
    where: { companyId: COMPANY_ID, name: "VvE Zonstraat 12" },
  });
  if (!customerVvE) {
    customerVvE = await db.customer.create({
      data: {
        companyId: COMPANY_ID,
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
        notes: "VvE van 8 appartementen. Plat dak, bitumen, ~120 m².",
      },
    });
    console.log("✓ Klant: VvE Zonstraat 12 (VvE)");
  } else {
    console.log("↳ Klant VvE Zonstraat 12 bestaat al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 4. Leads
  // ─────────────────────────────────────────────
  let lead1 = await db.lead.findFirst({
    where: { companyId: COMPANY_ID, name: "H. Bakker" },
  });
  if (!lead1) {
    lead1 = await db.lead.create({
      data: {
        companyId: COMPANY_ID,
        name: "H. Bakker",
        phone: "+31 6 23 45 67 89",
        email: "h.bakker@hotmail.com",
        address: "Haarlemmerdijk 55",
        postalCode: "1013 KD",
        city: "Amsterdam",
        requestType: "LEAK",
        status: "NEW",
        source: "Google",
        description: "Lekkage aan binnenzijde dakrand, zichtbaar na regenval. Woning gebouwd in 1978.",
      },
    });
    console.log("✓ Lead: H. Bakker — Lekkage Amsterdam (Nieuw)");
  } else {
    console.log("↳ Lead H. Bakker bestaat al — overgeslagen");
  }

  let lead2 = await db.lead.findFirst({
    where: { companyId: COMPANY_ID, name: "T. Smit" },
  });
  if (!lead2) {
    lead2 = await db.lead.create({
      data: {
        companyId: COMPANY_ID,
        name: "T. Smit",
        phone: "+31 30 123 4567",
        email: "t.smit@bedrijf.nl",
        address: "Oudegracht 201",
        postalCode: "3511 NJ",
        city: "Utrecht",
        requestType: "INSPECTION",
        status: "CONTACTED",
        source: "Aanbeveling",
        description: "Jaarlijkse dakinspectie vereist door verzekeraar. Plat dak ~80 m².",
      },
    });
    console.log("✓ Lead: T. Smit — Dakinspectie Utrecht (Benaderd)");
  } else {
    console.log("↳ Lead T. Smit bestaat al — overgeslagen");
  }

  let lead3 = await db.lead.findFirst({
    where: { companyId: COMPANY_ID, name: "VvE Hoekstraat 34" },
  });
  if (!lead3) {
    lead3 = await db.lead.create({
      data: {
        companyId: COMPANY_ID,
        name: "VvE Hoekstraat 34",
        phone: "+31 10 456 7890",
        email: "admin@vveholekstraat.nl",
        address: "Hoekstraat 34",
        postalCode: "3011 XA",
        city: "Rotterdam",
        requestType: "BITUMEN_ROOF",
        status: "WON",
        source: "Website",
        description: "Volledige renovatie bitumen dak, ~200 m². Wordt klant geworden.",
        customerId: customerVvE.id,
      },
    });
    console.log("✓ Lead: VvE Hoekstraat 34 — Bitumen renovatie Rotterdam (Gewonnen → VvE klant)");
  } else {
    console.log("↳ Lead VvE Hoekstraat 34 bestaat al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 5. Materials
  // ─────────────────────────────────────────────
  const materialsToCreate = [
    { name: "Bitumen rol (3 mm)", category: "Afdichting", unit: "M2" as const, defaultPrice: 12.50, stockQuantity: 200 },
    { name: "PIR isolatie 100mm", category: "Isolatie", unit: "M2" as const, defaultPrice: 8.75, stockQuantity: 150 },
    { name: "Daktrim aluminium", category: "Afwerking", unit: "M1" as const, defaultPrice: 4.20, stockQuantity: 500 },
    { name: "Grind 8/16", category: "Afwerking", unit: "KG" as const, defaultPrice: 0.45, stockQuantity: 2000 },
    { name: "Dakfolie EPDM", category: "Afdichting", unit: "M2" as const, defaultPrice: 9.80, stockQuantity: 100 },
    { name: "Primer (emmer 10L)", category: "Afdichting", unit: "STUK" as const, defaultPrice: 45.00, stockQuantity: 20 },
  ];
  for (const mat of materialsToCreate) {
    const exists = await db.material.findFirst({
      where: { companyId: COMPANY_ID, name: mat.name },
    });
    if (!exists) {
      await db.material.create({ data: { companyId: COMPANY_ID, ...mat } });
      console.log(`✓ Materiaal: ${mat.name}`);
    } else {
      console.log(`↳ Materiaal "${mat.name}" bestaat al — overgeslagen`);
    }
  }

  // ─────────────────────────────────────────────
  // 6. Quotes
  // ─────────────────────────────────────────────
  let quote1 = await db.quote.findFirst({
    where: { companyId: COMPANY_ID, quoteNumber: "OFF-2026-0001" },
  });
  if (!quote1) {
    const sub1 = 45 * 38.00 + 45 * 22.00 + 18 * 14.50;  // 1710 + 990 + 261 = 2961
    const vat1 = Math.round(sub1 * 0.21 * 100) / 100;
    quote1 = await db.quote.create({
      data: {
        companyId: COMPANY_ID,
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
            { companyId: COMPANY_ID, description: "Bitumen afdichting (3 lagen)", quantity: 45, unit: "m2", unitPrice: 38.00, vatPercentage: 21, totalAmount: 45 * 38.00, sortOrder: 1 },
            { companyId: COMPANY_ID, description: "PIR isolatie 100mm", quantity: 45, unit: "m2", unitPrice: 22.00, vatPercentage: 21, totalAmount: 45 * 22.00, sortOrder: 2 },
            { companyId: COMPANY_ID, description: "Daktrim aluminium", quantity: 18, unit: "m1", unitPrice: 14.50, vatPercentage: 21, totalAmount: 18 * 14.50, sortOrder: 3 },
          ],
        },
      },
      include: { lines: true },
    });
    console.log(`✓ Offerte: OFF-2026-0001 — Bitumen dakrenovatie Jansen B.V. (€${(sub1 + vat1).toFixed(2)}, geaccepteerd)`);
  } else {
    console.log("↳ Offerte OFF-2026-0001 bestaat al — overgeslagen");
  }

  let quote2 = await db.quote.findFirst({
    where: { companyId: COMPANY_ID, quoteNumber: "OFF-2026-0002" },
  });
  if (!quote2) {
    const sub2 = 1 * 125.00 + 2 * 75.00 + 1 * 65.00;  // 125 + 150 + 65 = 340
    const vat2 = Math.round(sub2 * 0.21 * 100) / 100;
    quote2 = await db.quote.create({
      data: {
        companyId: COMPANY_ID,
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
            { companyId: COMPANY_ID, description: "Inspectie en diagnose lekkage", quantity: 1, unit: "post", unitPrice: 125.00, vatPercentage: 21, totalAmount: 125.00, sortOrder: 1 },
            { companyId: COMPANY_ID, description: "Herstelwerkzaamheden dakrand", quantity: 2, unit: "uur", unitPrice: 75.00, vatPercentage: 21, totalAmount: 150.00, sortOrder: 2 },
            { companyId: COMPANY_ID, description: "Materiaalkosten afdichting", quantity: 1, unit: "post", unitPrice: 65.00, vatPercentage: 21, totalAmount: 65.00, sortOrder: 3 },
          ],
        },
      },
      include: { lines: true },
    });
    console.log(`✓ Offerte: OFF-2026-0002 — Lekkage herstel P. de Vries (€${(sub2 + vat2).toFixed(2)}, verzonden)`);
  } else {
    console.log("↳ Offerte OFF-2026-0002 bestaat al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 7. Jobs
  // ─────────────────────────────────────────────

  // Job 1 — IN_PROGRESS today (De Vries, lekkage)
  let job1 = await db.job.findFirst({
    where: { companyId: COMPANY_ID, jobNumber: "JOB-2026-0001" },
  });
  if (!job1) {
    job1 = await db.job.create({
      data: {
        companyId: COMPANY_ID,
        customerId: customerDeVries.id,
        quoteId: quote2.id,
        jobNumber: "JOB-2026-0001",
        title: "Lekkage reparatie P. de Vries",
        description: "Afdichten dakrand en controleren dakdoorvoeren. Lekkage zichtbaar na vorige regenperiode.",
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
    console.log("✓ Werkbon: JOB-2026-0001 — Lekkage reparatie De Vries (In uitvoering, vandaag)");
  } else {
    console.log("↳ Werkbon JOB-2026-0001 bestaat al — overgeslagen");
  }

  // Job 2 — PLANNED today (Jansen B.V., bitumen)
  let job2 = await db.job.findFirst({
    where: { companyId: COMPANY_ID, jobNumber: "JOB-2026-0002" },
  });
  if (!job2) {
    job2 = await db.job.create({
      data: {
        companyId: COMPANY_ID,
        customerId: customerJansen.id,
        quoteId: quote1.id,
        jobNumber: "JOB-2026-0002",
        title: "Bitumen dakrenovatie Jansen B.V.",
        description: "Volledige dakrenovatie conform offerte OFF-2026-0001. Strippen oud dak, nieuwe PIR isolatie, 3 lagen bitumen.",
        jobType: "BITUMEN_ROOF",
        status: "PLANNED",
        address: "Prinsengracht 112",
        postalCode: "1015 EA",
        city: "Amsterdam",
        scheduledStart: today(13, 0),
        scheduledEnd: today(17, 0),
        internalNotes: "Dag 1 van 3. Vandaag: strippen en isolatie. Morgen: bitumen.",
        customerNotes: "Dak wordt volledig gestript. Materiaalopslag op binnenplaats.",
      },
    });
    console.log("✓ Werkbon: JOB-2026-0002 — Bitumen dakrenovatie Jansen B.V. (Gepland, vandaag 13:00)");
  } else {
    console.log("↳ Werkbon JOB-2026-0002 bestaat al — overgeslagen");
  }

  // Job 3 — COMPLETED yesterday (VvE Zonstraat)
  let job3 = await db.job.findFirst({
    where: { companyId: COMPANY_ID, jobNumber: "JOB-2026-0003" },
  });
  if (!job3) {
    job3 = await db.job.create({
      data: {
        companyId: COMPANY_ID,
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
        internalNotes: "Geen grote gebreken. Kleine slijtage bij dakrand, aanbeveling voor herstel in Q3.",
        customerNotes: "Inspectierapport volgt per e-mail.",
      },
    });
    console.log("✓ Werkbon: JOB-2026-0003 — Dakinspectie VvE Zonstraat 12 (Afgerond, gisteren)");
  } else {
    console.log("↳ Werkbon JOB-2026-0003 bestaat al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 8. Job notes
  // ─────────────────────────────────────────────
  const existingNotes = await db.jobNote.count({ where: { companyId: COMPANY_ID } });
  if (existingNotes === 0) {
    await db.jobNote.createMany({
      data: [
        { companyId: COMPANY_ID, jobId: job1.id, authorId: adminUser.id, content: "Lekkage gevonden bij de dakrand aan de noordzijde. EPDM folie gebarsten over ca. 30 cm.", createdAt: today(9, 30) },
        { companyId: COMPANY_ID, jobId: job1.id, authorId: fieldUser.id, content: "Begin gemaakt met afdichten. Extra materiaal nodig: 2m² EPDM folie.", createdAt: today(10, 15) },
        { companyId: COMPANY_ID, jobId: job3.id, authorId: adminUser.id, content: "Inspectie afgerond. Staat het dak er over het algemeen goed bij. Daktrim licht los aan de westzijde, aanraden om dit voor de winter te laten herstellen.", createdAt: yesterday(10) },
      ],
    });
    console.log("✓ Notities toegevoegd aan werkbonnen");
  } else {
    console.log("↳ Notities bestaan al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 9. Job materials (for completed job)
  // ─────────────────────────────────────────────
  const existingMats = await db.jobMaterial.count({ where: { companyId: COMPANY_ID, jobId: job3.id } });
  if (existingMats === 0) {
    await db.jobMaterial.createMany({
      data: [
        { companyId: COMPANY_ID, jobId: job3.id, description: "Inspectie-kit (UV-lamp, vochtmeter)", quantity: 1, unit: "stuk", unitPrice: 0, totalAmount: 0, usedAt: yesterday(9) },
        { companyId: COMPANY_ID, jobId: job3.id, description: "Reiskosten (heen en terug)", quantity: 1, unit: "post", unitPrice: 35, totalAmount: 35, usedAt: yesterday(9) },
      ],
    });
    console.log("✓ Materialen toegevoegd aan inspectie-werkbon");
  }

  // ─────────────────────────────────────────────
  // 10. Time entries
  // ─────────────────────────────────────────────
  const existingTime = await db.timeEntry.count({ where: { companyId: COMPANY_ID } });
  if (existingTime === 0) {
    await db.timeEntry.createMany({
      data: [
        { companyId: COMPANY_ID, jobId: job3.id, userId: adminUser.id, type: "TRAVEL", startedAt: yesterday(8), endedAt: yesterday(9), minutes: 60, notes: "Reistijd Amsterdam heen en terug" },
        { companyId: COMPANY_ID, jobId: job3.id, userId: adminUser.id, type: "WORK", startedAt: yesterday(9), endedAt: yesterday(11), minutes: 105, notes: "Dakinspectie uitgevoerd" },
      ],
    });
    console.log("✓ Urenregistratie toegevoegd");
  } else {
    console.log("↳ Uren bestaan al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // 11. Job assignments
  // ─────────────────────────────────────────────
  for (const [jobId, userId, isLead] of [
    [job1.id, adminUser.id, true],
    [job1.id, fieldUser.id, false],
    [job2.id, fieldUser.id, true],
    [job3.id, adminUser.id, true],
  ] as [string, string, boolean][]) {
    const exists = await db.jobAssignment.findFirst({ where: { jobId, userId } });
    if (!exists) {
      await db.jobAssignment.create({ data: { companyId: COMPANY_ID, jobId, userId, isLead } });
    }
  }
  console.log("✓ Medewerkers toegewezen aan werkbonnen");

  // ─────────────────────────────────────────────
  // 12. Planning items (today, visible on dashboard)
  // ─────────────────────────────────────────────
  const existingPlanning = await db.planningItem.count({
    where: { companyId: COMPANY_ID, jobId: job2.id },
  });
  if (existingPlanning === 0) {
    await db.planningItem.create({
      data: {
        companyId: COMPANY_ID,
        jobId: job2.id,
        userId: fieldUser.id,
        type: "JOB",
        title: "Bitumen dakrenovatie Jansen B.V. — Dag 1",
        description: "Strippen oud dak en plaatsen PIR isolatie.",
        startAt: today(13, 0),
        endAt: today(17, 0),
      },
    });
    console.log("✓ Planning: Bitumen dakrenovatie vandaag 13:00–17:00 (zichtbaar op dashboard)");
  } else {
    console.log("↳ Planning item bestaat al — overgeslagen");
  }

  // Morning planning slot for job1
  const existingPlanning1 = await db.planningItem.count({
    where: { companyId: COMPANY_ID, jobId: job1.id },
  });
  if (existingPlanning1 === 0) {
    await db.planningItem.create({
      data: {
        companyId: COMPANY_ID,
        jobId: job1.id,
        userId: adminUser.id,
        type: "JOB",
        title: "Lekkage reparatie De Vries — ochtend",
        startAt: today(8, 0),
        endAt: today(12, 0),
      },
    });
    console.log("✓ Planning: Lekkage reparatie vandaag 08:00–12:00 (zichtbaar op dashboard)");
  }

  // ─────────────────────────────────────────────
  // 13. Invoice (concept, linked to completed job)
  // ─────────────────────────────────────────────
  let invoice1 = await db.invoice.findFirst({
    where: { companyId: COMPANY_ID, invoiceNumber: "FAC-2026-0001" },
  });
  if (!invoice1) {
    const sub = 1 * 225.00 + 1 * 35.00;  // 260
    const vat = Math.round(sub * 0.21 * 100) / 100;
    invoice1 = await db.invoice.create({
      data: {
        companyId: COMPANY_ID,
        customerId: customerVvE.id,
        jobId: job3.id,
        invoiceNumber: "FAC-2026-0001",
        status: "DRAFT",
        invoiceDate: new Date(),
        dueDate: inDays(30),
        notes: "Dakinspectie uitgevoerd op " + yesterday().toLocaleDateString("nl-NL") + ". Rapport bijgevoegd.",
        subtotal: sub,
        vatPercentage: 21,
        vatAmount: vat,
        totalAmount: Math.round((sub + vat) * 100) / 100,
        lines: {
          create: [
            { companyId: COMPANY_ID, description: "Dakinspectie plat dak (~120 m²)", quantity: 1, unit: "post", unitPrice: 225.00, vatPercentage: 21, totalAmount: 225.00, sortOrder: 1 },
            { companyId: COMPANY_ID, description: "Reiskosten", quantity: 1, unit: "post", unitPrice: 35.00, vatPercentage: 21, totalAmount: 35.00, sortOrder: 2 },
          ],
        },
      },
    });
    console.log(`✓ Factuur: FAC-2026-0001 — Dakinspectie VvE Zonstraat 12 (€${(sub + vat).toFixed(2)}, concept)`);
  } else {
    console.log("↳ Factuur FAC-2026-0001 bestaat al — overgeslagen");
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  const counts = await Promise.all([
    db.customer.count({ where: { companyId: COMPANY_ID } }),
    db.lead.count({ where: { companyId: COMPANY_ID } }),
    db.quote.count({ where: { companyId: COMPANY_ID } }),
    db.job.count({ where: { companyId: COMPANY_ID } }),
    db.material.count({ where: { companyId: COMPANY_ID } }),
    db.invoice.count({ where: { companyId: COMPANY_ID } }),
    db.planningItem.count({ where: { companyId: COMPANY_ID } }),
  ]);

  console.log("\n✅ Seed voltooid voor Berteck Dakwerken\n");
  console.log(`   Klanten:    ${counts[0]}`);
  console.log(`   Leads:      ${counts[1]}`);
  console.log(`   Offertes:   ${counts[2]}`);
  console.log(`   Werkbonnen: ${counts[3]}`);
  console.log(`   Materialen: ${counts[4]}`);
  console.log(`   Facturen:   ${counts[5]}`);
  console.log(`   Planning:   ${counts[6]} items`);
  console.log("\n📊 Dashboard toont vandaag:");
  console.log("   • 2 jobs vandaag (JOB-2026-0001 + JOB-2026-0002)");
  console.log("   • 2 afspraken vandaag (planning items)");
  console.log("   • 2 open leads (nieuw + benaderd)");
  console.log("   • 1 open offerte (OFF-2026-0002 — verzonden)");
  console.log("   • 2 actieve werkbonnen (in uitvoering + gepland)\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed mislukt:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
