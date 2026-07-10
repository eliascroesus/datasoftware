"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cable,
  SlidersHorizontal,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Summary", icon: LayoutDashboard },
  { href: "/integrations", label: "Integrations", icon: Cable },
  { href: "/metrics", label: "Metrics", icon: SlidersHorizontal },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 border-b border-panel-border bg-bg-soft lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
          <Layers size={15} className="text-black" />
        </div>
        <span className="font-bold text-white">NamziLabs</span>
      </div>
      <div className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                active ? "bg-bg-raise text-white" : "text-muted",
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
