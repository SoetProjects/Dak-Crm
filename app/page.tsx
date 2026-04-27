import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasDemoSession } from "@/lib/auth/demo-session";

export default async function Home() {
  const supabase = await createClient();
  const demoSession = await hasDemoSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user || demoSession) {
    redirect("/dashboard");
  }

  redirect("/login");
}
