"use client";

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  Map,
  Siren,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { heading: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    heading: "Compliance",
    items: [
      { href: "/admin/applications", label: "Applications", icon: ClipboardList },
      { href: "/admin/drivers", label: "Drivers", icon: Users },
      { href: "/admin/incidents", label: "Incidents", icon: Siren },
    ],
  },
  {
    heading: "Operations",
    items: [
      { href: "/admin/subscriptions", label: "Subscriptions", icon: Wallet },
      { href: "/admin/zones", label: "Zones", icon: Map },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const initial = (email?.[0] ?? "A").toUpperCase();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 items-center justify-center rounded-lg bg-white px-2">
          <BrandLogo height={32} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-white">HAILGUARD</span>
          <span className="text-[10px] font-medium tracking-[0.2em] text-emerald-400">
            FLEET PORTAL
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              {group.heading}
            </p>
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{email ?? "Administrator"}</p>
            <p className="text-[10px] text-sidebar-foreground/50">Administrator</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
