import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DesktopSidebar, MobileBottomNav } from "@/components/crm/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white text-primary">
      <div className="mx-auto flex max-w-[1400px]">
        <DesktopSidebar />
        <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0">
          <header className="flex items-center justify-between border-b border-blue-100 px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-700">Roofing CRM</p>
              <h1 className="text-lg font-semibold text-primary">Welkom terug</h1>
            </div>
            <SignOutButton />
          </header>
          <main className="flex-1 px-4 py-4 sm:px-6">{children}</main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
