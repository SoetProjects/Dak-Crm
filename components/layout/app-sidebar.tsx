"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/customers", label: "Klanten" },
  { href: "/quotes", label: "Offertes" },
  { href: "/jobs", label: "Jobs" },
  { href: "/planning", label: "Planning" },
  { href: "/mobile/jobs", label: "Mobiele weergave" },
  { href: "/instellingen", label: "Instellingen" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white md:w-64 md:border-b-0 md:border-r">
      <div className="px-4 py-4">
        <p className="text-xl font-semibold text-[var(--primary)]">DakCRM</p>
        <p className="text-xs text-slate-500">ERP voor dakdekkers</p>
      </div>

      <nav className="grid gap-1 px-2 pb-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--primary)] hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
