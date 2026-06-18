"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Allgemein", href: "/admin/einstellungen" },
  { label: "Wohnungen", href: "/admin/einstellungen/wohnungen" },
  { label: "Fotos", href: "/admin/einstellungen/fotos" },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin/einstellungen"
      ? pathname === "/admin/einstellungen"
      : pathname?.startsWith(href);

  return (
    <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            isActive(t.href)
              ? "border-[#c8a96e] text-[#c8a96e]"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
