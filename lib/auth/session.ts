import { createClient } from "@/lib/supabase/server";
import { hasDemoSession } from "@/lib/auth/demo-session";

export type AppSession = {
  isAuthenticated: boolean;
  isDemo: boolean;
  email: string;
  companyId: string;
};

export async function getAppSession(): Promise<AppSession> {
  const supabase = await createClient();
  const demoSession = await hasDemoSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      isAuthenticated: true,
      isDemo: false,
      email: user.email ?? "gebruiker@dakcrm.local",
      companyId: "demo-company",
    };
  }

  if (demoSession) {
    return {
      isAuthenticated: true,
      isDemo: true,
      email: "demo@dakcrm.local",
      companyId: "demo-company",
    };
  }

  return {
    isAuthenticated: false,
    isDemo: false,
    email: "",
    companyId: "",
  };
}
