"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
    label: "Relatiebeheer",
    items: [
      { href: "/leads", label: "Leads" },
      { href: "/customers", label: "Klanten" },
      { href: "/quotes", label: "Offertes" },
      { href: "/quotes/genereren", label: "AI Offerte" },
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
      { href: "/assistant", label: "AI Assistent" },
      { href: "/followup", label: "Opvolging" },
      { href: "/instellingen", label: "Instellingen" },
    ],
  },
  // Mobile routes (/mobile/*) are intentionally excluded from desktop nav.
  // Field workers access them via their phone's browser automatically.
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:w-56 md:border-b-0 md:border-r md:min-h-screen">
      {/* Logo + mobile hamburger button */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex flex-col leading-tight">
          <p className="text-lg font-bold text-[var(--primary)]">DakERP</p>
          <p className="text-xs text-slate-400">ERP voor dakdekkers</p>
        </Link>

        {/* Hamburger — only visible on mobile */}
        <button
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
        >
          {open ? (
            // Close icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          ) : (
            // Hamburger icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation — always visible on md+, toggleable on mobile */}
      <nav className={`px-2 py-3 space-y-4 ${open ? "block" : "hidden"} md:block`}>
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
                  className={`rounded-lg px-3 py-2.5 text-sm transition ${
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
