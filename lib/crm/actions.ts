"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  ok: boolean;
  message: string;
};

const success = (message: string): ActionState => ({ ok: true, message });
const failure = (message: string): ActionState => ({ ok: false, message });

export async function createKlantAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const payload = {
    naam: String(formData.get("naam") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefoon: String(formData.get("telefoon") ?? ""),
    plaats: String(formData.get("plaats") ?? ""),
  };

  const { error } = await supabase.from("klanten").insert(payload);
  if (error) {
    return failure(`Klant niet opgeslagen: ${error.message}`);
  }
  revalidatePath("/klanten");
  return success("Klant opgeslagen");
}

export async function createJobAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const payload = {
    klant_id: String(formData.get("klant_id") ?? ""),
    titel: String(formData.get("titel") ?? ""),
    status: String(formData.get("status") ?? "nieuw"),
    prijs: Number(formData.get("prijs") ?? 0),
  };

  const { error } = await supabase.from("jobs").insert(payload);
  if (error) {
    return failure(`Job niet opgeslagen: ${error.message}`);
  }
  revalidatePath("/jobs");
  return success("Job opgeslagen");
}

export async function createAfsprakAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const payload = {
    job_id: String(formData.get("job_id") ?? ""),
    onderwerp: String(formData.get("onderwerp") ?? ""),
    datum: String(formData.get("datum") ?? ""),
    tijd: String(formData.get("tijd") ?? ""),
  };

  const { error } = await supabase.from("afspraken").insert(payload);
  if (error) {
    return failure(`Afspraak niet opgeslagen: ${error.message}`);
  }
  revalidatePath("/planning");
  return success("Afspraak toegevoegd");
}

export async function addNotitieAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const payload = {
    klant_id: String(formData.get("klant_id") ?? ""),
    job_id: String(formData.get("job_id") ?? ""),
    tekst: String(formData.get("tekst") ?? ""),
    type: "notitie",
  };

  const { error } = await supabase.from("notities").insert(payload);
  if (error) {
    return failure(`Notitie niet opgeslagen: ${error.message}`);
  }
  const klantId = String(formData.get("klant_id") ?? "");
  revalidatePath(klantId ? `/klanten/${klantId}` : "/klanten");
  return success("Notitie toegevoegd");
}

export async function updateJobStatusAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "");

  const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
  if (error) {
    return failure(`Status niet aangepast: ${error.message}`);
  }
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  return success("Status bijgewerkt");
}

export async function markFactuurBetaaldAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("job_id") ?? "");
  const { error } = await supabase
    .from("jobs")
    .update({ factuur_status: "betaald", factuur_betaald: true })
    .eq("id", id);

  if (error) {
    return failure(`Factuur niet bijgewerkt: ${error.message}`);
  }
  revalidatePath("/facturen");
  revalidatePath("/dashboard");
  return success("Factuur op betaald gezet");
}

export async function saveOpBezoekAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("job_id") ?? "");
  const m2 = Number(formData.get("m2") ?? 0);
  const extras = String(formData.get("extras") ?? "");
  const totaal = Number(formData.get("totaal") ?? 0);

  const { error } = await supabase
    .from("jobs")
    .update({ m2, extras, prijs: totaal, werkbon: "Op bezoek ingevuld" })
    .eq("id", id);

  if (error) {
    return failure(`Op bezoek niet opgeslagen: ${error.message}`);
  }

  revalidatePath(`/jobs/${id}`);
  revalidatePath("/op-bezoek");
  return success("Werkbon opgeslagen");
}
