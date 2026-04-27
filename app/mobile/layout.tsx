import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Content area — padded bottom for bottom nav */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
