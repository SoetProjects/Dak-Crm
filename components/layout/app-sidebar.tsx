"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Overzicht",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/planning", label: "Planning" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/leads", label: "Leads" },
      { href: "/customers", label: "Klanten" },
      { href: "/quotes", label: "Offertes" },
    ],
  },
  {
    label: "Uitvoering",
    items: [
      { href: "/jobs", label: "Werkbonnen" },
      { href: "/materials", label: "Materialen" },
    ],
  },
  {
    label: "Financieel",
    items: [
      { href: "/invoices", label: "Facturen" },
    ],
  },
  {
    label: "Systeem",
    items: [
      { href: "/instellingen", label: "Instellingen" },
    ],
  },
  // Mobile routes (/mobile/*) are intentionally excluded from desktop nav.
  // Field workers access them via their phone's browser automatically.
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:w-56 md:border-b-0 md:border-r md:min-h-screen">
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-lg font-bold text-[var(--primary)]">DakCRM</p>
        <p className="text-xs text-slate-400">ERP voor dakdekkers</p>
      </div>

      <nav className="px-2 py-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <div className="grid gap-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    isActive(item.href)
                      ? "bg-[var(--primary)] text-white font-medium"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
