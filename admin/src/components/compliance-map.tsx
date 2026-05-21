"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";

import type { ZoneFleetSummary } from "@/lib/queries";

// Leaflet relies on `window`, so the client-only map is loaded with SSR off.
const ComplianceMapClient = dynamic(() => import("./compliance-map-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-md border border-border bg-muted/30 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function ComplianceMap({ zones }: { zones: ZoneFleetSummary[] }) {
  const withPolygons = zones.filter(
    (z) => Array.isArray(z.polygon) && (z.polygon?.length ?? 0) >= 3,
  );
  const totalActiveVehicles = withPolygons.reduce(
    (sum, z) => sum + z.activeVehicleCount,
    0,
  );
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Compliance map</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {withPolygons.length} active zone{withPolygons.length === 1 ? "" : "s"} ·{" "}
            {totalActiveVehicles} compliant vehicle
            {totalActiveVehicles === 1 ? "" : "s"} on map
          </p>
        </div>
        <Legend />
      </header>

      {withPolygons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
          <MapPinOff className="h-8 w-8" />
          <p>
            No zones have polygon coordinates yet. Add geometry to your zones to see them on
            the map.
          </p>
        </div>
      ) : (
        <ComplianceMapClient zones={zones} />
      )}

      {withPolygons.length > 0 ? (
        <ul className="grid grid-cols-1 gap-px overflow-hidden border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {withPolygons
            .slice()
            .sort((a, b) => b.activeVehicleCount - a.activeVehicleCount)
            .map((z) => (
              <li key={z.id} className="bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium tracking-tight">{z.name}</p>
                  <span className="text-sm font-semibold tabular-nums">
                    {z.activeVehicleCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {z.activeSubscriptionCount} subscription
                  {z.activeSubscriptionCount === 1 ? "" : "s"} · {z.currency}{" "}
                  {z.monthlyFee.toFixed(0)}/mo
                </p>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="block h-3 w-6 rounded-sm bg-emerald-200" />
        Quiet
      </span>
      <span className="flex items-center gap-1.5">
        <span className="block h-3 w-6 rounded-sm bg-emerald-400" />
        Busy
      </span>
      <span className="flex items-center gap-1.5">
        <span className="block h-3 w-6 rounded-sm bg-emerald-600" />
        Most active
      </span>
    </div>
  );
}
