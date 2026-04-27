import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getAppSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <AppSidebar />
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div>
            <p className="text-sm font-medium text-[var(--primary)]">{session.email}</p>
            <p className="text-xs text-slate-500">
              {session.isDemo ? "Demo sessie" : "Ingelogd"}
            </p>
          </div>
          <SignOutButton />
        </header>
        <div className="px-4 py-6 md:px-6">{children}</div>
      </main>
    </div>
  );
}
