import { createClient } from "@/lib/supabase/server";
import { asNumber, asText, pickField, type RowData } from "@/lib/crm/types";

const todayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getDashboardStats = async () => {
  const supabase = createClient();
  const { start, end } = todayRange();

  const [{ count: klantenCount }, { count: openJobsCount }, { count: afsprakenCount }, jobsForInvoices] =
    await Promise.all([
      supabase.from("klanten").select("*", { count: "exact", head: true }),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "nieuw", "gepland", "in_behandeling"]),
      supabase
        .from("afspraken")
        .select("*", { count: "exact", head: true })
        .gte("datum", start)
        .lte("datum", end),
      supabase.from("jobs").select("*").limit(500),
    ]);

  const jobsRows = (jobsForInvoices.data ?? []) as RowData[];
  const openFacturen = jobsRows.filter((row) => {
    const invoiceStatus = asText(
      pickField(row, ["factuur_status", "invoice_status", "betaal_status"], "open"),
      "open",
    ).toLowerCase();
    const isPaidFlag = Boolean(pickField(row, ["factuur_betaald", "invoice_paid", "betaald"], false));
    return !isPaidFlag && invoiceStatus !== "betaald" && invoiceStatus !== "paid";
  }).length;

  return {
    klanten: klantenCount ?? 0,
    openJobs: openJobsCount ?? 0,
    afsprakenVandaag: afsprakenCount ?? 0,
    openFacturen,
  };
};

export const getKlanten = async () => {
  const supabase = createClient();
  const { data } = await supabase.from("klanten").select("*").order("id", { ascending: false });
  const rows = (data ?? []) as RowData[];

  return rows.map((row) => ({
    id: String(pickField(row, ["id"], "")),
    naam: asText(pickField(row, ["naam", "bedrijfsnaam", "name"])),
    email: asText(pickField(row, ["email"])),
    telefoon: asText(pickField(row, ["telefoon", "phone"])),
    plaats: asText(pickField(row, ["plaats", "stad", "city"])),
  }));
};

export const getKlantDetail = async (id: string) => {
  const supabase = createClient();
  const [klant, jobs, notes] = await Promise.all([
    supabase.from("klanten").select("*").eq("id", id).maybeSingle(),
    supabase.from("jobs").select("*").eq("klant_id", id).order("id", { ascending: false }),
    supabase.from("notities").select("*").eq("klant_id", id).order("id", { ascending: false }),
  ]);

  return {
    klant: (klant.data ?? null) as RowData | null,
    jobs: (jobs.data ?? []) as RowData[],
    notes: (notes.data ?? []) as RowData[],
  };
};

export const getJobs = async () => {
  const supabase = createClient();
  const [jobsRes, klantenRes] = await Promise.all([
    supabase.from("jobs").select("*").order("id", { ascending: false }),
    supabase.from("klanten").select("*"),
  ]);
  const klantMap = new Map<string, string>();
  for (const row of (klantenRes.data ?? []) as RowData[]) {
    const key = String(pickField(row, ["id"], ""));
    if (key) {
      klantMap.set(key, asText(pickField(row, ["naam", "bedrijfsnaam", "name"])));
    }
  }

  return ((jobsRes.data ?? []) as RowData[]).map((row) => {
    const klantId = String(pickField(row, ["klant_id"], ""));
    return {
      id: String(pickField(row, ["id"], "")),
      titel: asText(pickField(row, ["titel", "naam", "omschrijving", "subject"])),
      status: asText(pickField(row, ["status"], "nieuw")),
      klantNaam: klantMap.get(klantId) ?? "-",
      klantId,
      prijs: asNumber(pickField(row, ["prijs", "totaal_bedrag", "bedrag"], 0)),
    };
  });
};

export const getJobDetail = async (id: string) => {
  const supabase = createClient();
  const [job, fotos, afspraken] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase.from("fotos").select("*").eq("job_id", id).order("id", { ascending: false }),
    supabase.from("afspraken").select("*").eq("job_id", id).order("datum", { ascending: true }),
  ]);
  return {
    job: (job.data ?? null) as RowData | null,
    fotos: (fotos.data ?? []) as RowData[],
    afspraken: (afspraken.data ?? []) as RowData[],
  };
};

export const getPlanningItems = async () => {
  const supabase = createClient();
  const [appointments, jobRes] = await Promise.all([
    supabase.from("afspraken").select("*").order("datum", { ascending: true }).limit(200),
    supabase.from("jobs").select("*"),
  ]);

  const jobs = new Map<string, string>();
  for (const job of (jobRes.data ?? []) as RowData[]) {
    jobs.set(String(pickField(job, ["id"], "")), asText(pickField(job, ["titel", "naam", "omschrijving"])));
  }

  return ((appointments.data ?? []) as RowData[]).map((row) => ({
    id: String(pickField(row, ["id"], "")),
    datum: asText(pickField(row, ["datum", "start_datum", "start"])),
    tijd: asText(pickField(row, ["tijd", "start_tijd"]), ""),
    jobId: String(pickField(row, ["job_id"], "")),
    onderwerp: asText(pickField(row, ["onderwerp", "titel", "omschrijving"])),
    jobTitel: jobs.get(String(pickField(row, ["job_id"], ""))) ?? "-",
  }));
};

export const getMonteursByAfspraak = async () => {
  const supabase = createClient();
  const [linksRes, usersRes] = await Promise.all([
    supabase.from("afspraak_monteurs").select("*"),
    supabase.from("gebruikers").select("*"),
  ]);
  const userMap = new Map<string, string>();
  for (const user of (usersRes.data ?? []) as RowData[]) {
    userMap.set(
      String(pickField(user, ["id"], "")),
      asText(pickField(user, ["naam", "voornaam", "email"])),
    );
  }

  const grouped = new Map<string, string[]>();
  for (const link of (linksRes.data ?? []) as RowData[]) {
    const afspraakId = String(pickField(link, ["afspraak_id"], ""));
    const gebruikerId = String(pickField(link, ["gebruiker_id", "monteur_id"], ""));
    if (!afspraakId) {
      continue;
    }
    const name = userMap.get(gebruikerId) ?? "Monteur";
    const existing = grouped.get(afspraakId) ?? [];
    grouped.set(afspraakId, [...existing, name]);
  }
  return grouped;
};
