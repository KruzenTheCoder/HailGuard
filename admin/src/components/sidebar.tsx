"use client";

import { ClipboardList, LayoutDashboard, Map, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/drivers", label: "Drivers", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Wallet },
  { href: "/admin/zones", label: "Zones", icon: Map },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-12 items-center justify-center rounded-lg bg-white px-2 py-1">
          <BrandLogo height={36} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-white">HAILGUARD</span>
          <span className="text-[10px] font-medium tracking-[0.2em] text-emerald-400">
            FLEET PORTAL
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {email ? (
          <p className="truncate px-3 pb-2 text-xs text-sidebar-foreground/60">{email}</p>
        ) : null}
        <SignOutButton />
      </div>
    </aside>
  );
}
