"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/klanten", label: "Klanten" },
  { href: "/jobs", label: "Jobs" },
  { href: "/planning", label: "Planning" },
  { href: "/leads-offertes", label: "Leads" },
  { href: "/facturen", label: "Facturen" },
  { href: "/op-bezoek", label: "Op bezoek" },
];

const linkClasses = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    active ? "bg-accent text-white" : "text-primary hover:bg-blue-50"
  }`;

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-blue-100 bg-white p-4 md:block">
      <h2 className="mb-6 text-xl font-semibold text-primary">DakERP</h2>
      <nav className="space-y-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={linkClasses(pathname.startsWith(item.href))}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const visible = items.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-blue-100 bg-white px-2 py-2 md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-2 py-2 text-center text-xs font-medium ${
              pathname.startsWith(item.href) ? "bg-accent text-white" : "text-primary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
