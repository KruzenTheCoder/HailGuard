import { ChevronDown, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ZoneFleetSummary } from "@/lib/queries";

export function ZonesByProvince({ zones }: { zones: ZoneFleetSummary[] }) {
  const groups = new Map<string, ZoneFleetSummary[]>();
  for (const z of zones) {
    const key = z.province ?? "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(z);
  }
  const provinces = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Coverage by province
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {provinces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active zones yet.</p>
        ) : (
          provinces.map(([province, items]) => {
            const vehicles = items.reduce((s, z) => s + z.activeVehicleCount, 0);
            return (
              <details key={province} className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    {province}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{items.length} zones</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {vehicles} active
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="border-t border-border">
                  {items.map((z) => (
                    <div
                      key={z.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm even:bg-muted/30"
                    >
                      <span>{z.name}</span>
                      <span className="text-muted-foreground">
                        {z.activeVehicleCount} vehicle{z.activeVehicleCount === 1 ? "" : "s"} ·{" "}
                        R{z.monthlyFee.toFixed(0)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
