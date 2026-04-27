import { redirect } from "next/navigation";
import { isSupabaseReady, createClient } from "@/lib/supabase/server";
import { hasDemoSession } from "@/lib/auth/demo-session";

export default async function Home() {
  const demoSession = await hasDemoSession();

  if (demoSession) {
    redirect("/dashboard");
  }

  if (!isSupabaseReady()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
