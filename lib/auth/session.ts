import { createClient, isSupabaseReady } from "@/lib/supabase/server";
import { hasDemoSession } from "@/lib/auth/demo-session";

export type AppSession = {
  isAuthenticated: boolean;
  isDemo: boolean;
  email: string;
  companyId: string;
};

const UNAUTHENTICATED: AppSession = {
  isAuthenticated: false,
  isDemo: false,
  email: "",
  companyId: "",
};

export async function getAppSession(): Promise<AppSession> {
  const demoSession = await hasDemoSession();

  if (demoSession) {
    return {
      isAuthenticated: true,
      isDemo: true,
      email: "demo@dakcrm.local",
      companyId: "demo-company",
    };
  }

  if (!isSupabaseReady()) {
    return UNAUTHENTICATED;
  }

  const supabase = await createClient();
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

  return UNAUTHENTICATED;
}
