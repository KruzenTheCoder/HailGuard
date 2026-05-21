import { MapOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ZoneFleetSummary } from "@/lib/queries";

const VIEW_W = 1000;
const VIEW_H = 560;
const PADDING_PCT = 0.18;

const BRAND_NAVY = "#0D2236";
const BRAND_GREEN = "#16BE66";

type Projected = {
  zone: ZoneFleetSummary;
  pathD: string;
  centroid: { x: number; y: number };
  activityFraction: number;
};

function polygonCentroid(points: [number, number][]): [number, number] | null {
  if (points.length === 0) return null;
  // Strip duplicate closing point if present.
  const ring = points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
    ? points.slice(0, -1)
    : points;
  if (ring.length === 0) return null;
  if (ring.length === 1) return ring[0];

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    // Degenerate (collinear) — fall back to mean.
    const mx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const my = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [mx, my];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

export function ComplianceMap({ zones }: { zones: ZoneFleetSummary[] }) {
  const withPolygons = zones.filter((z) => Array.isArray(z.polygon) && z.polygon.length >= 3);

  if (withPolygons.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <header className="border-b border-border p-4">
          <h2 className="text-base font-semibold tracking-tight">Compliance map</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active zones plotted with live driver counts.
          </p>
        </header>
        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
          <MapOff className="h-8 w-8" />
          <p>
            No zones have polygon coordinates yet. Add geometry to your zones to see them on the
            map.
          </p>
        </div>
      </section>
    );
  }

  // Bounding box across all rendered polygons.
  const allCoords = withPolygons.flatMap((z) => z.polygon ?? []);
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of allCoords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const rangeLng = (maxLng - minLng) || 0.01;
  const rangeLat = (maxLat - minLat) || 0.01;
  const padLng = rangeLng * PADDING_PCT;
  const padLat = rangeLat * PADDING_PCT;
  minLng -= padLng;
  maxLng += padLng;
  minLat -= padLat;
  maxLat += padLat;

  // Preserve aspect ratio so polygons aren't squashed.
  const dataAspect = (maxLng - minLng) / (maxLat - minLat);
  const viewAspect = VIEW_W / VIEW_H;
  let dataWidth = maxLng - minLng;
  let dataHeight = maxLat - minLat;
  if (dataAspect > viewAspect) {
    const targetHeight = dataWidth / viewAspect;
    const extra = (targetHeight - dataHeight) / 2;
    minLat -= extra;
    maxLat += extra;
    dataHeight = targetHeight;
  } else {
    const targetWidth = dataHeight * viewAspect;
    const extra = (targetWidth - dataWidth) / 2;
    minLng -= extra;
    maxLng += extra;
    dataWidth = targetWidth;
  }

  const sx = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * VIEW_W;
  const sy = (lat: number) => VIEW_H - ((lat - minLat) / (maxLat - minLat)) * VIEW_H;

  const maxActivity = Math.max(1, ...withPolygons.map((z) => z.activeVehicleCount));

  const projected: Projected[] = withPolygons.map((zone) => {
    const ring = zone.polygon!;
    const pathD =
      ring
        .map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${sx(lng).toFixed(2)} ${sy(lat).toFixed(2)}`)
        .join(" ") + " Z";
    const centroidLngLat = polygonCentroid(ring);
    const centroid = centroidLngLat
      ? { x: sx(centroidLngLat[0]), y: sy(centroidLngLat[1]) }
      : { x: VIEW_W / 2, y: VIEW_H / 2 };
    const activityFraction = zone.activeVehicleCount / maxActivity;
    return { zone, pathD, centroid, activityFraction };
  });

  const totalActiveVehicles = withPolygons.reduce((s, z) => s + z.activeVehicleCount, 0);

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Compliance map</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {withPolygons.length} active zone{withPolygons.length === 1 ? "" : "s"} ·{" "}
            {totalActiveVehicles} compliant vehicle{totalActiveVehicles === 1 ? "" : "s"} on map
          </p>
        </div>
        <Legend />
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full text-card"
          role="img"
          aria-label="Compliance map of active zones"
        >
          <title>HailGuard compliance map</title>

          <defs>
            <pattern
              id="map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(0)"
            >
              <path
                d="M40 0 L0 0 0 40"
                fill="none"
                stroke="rgba(13,34,54,0.06)"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="map-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={0.18} />
              <stop offset="100%" stopColor={BRAND_GREEN} stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Map background */}
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#F4F6F8" />
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#map-grid)" />

          {/* Polygons */}
          {projected.map(({ zone, pathD, activityFraction }) => {
            const fillOpacity = 0.18 + 0.55 * activityFraction;
            return (
              <g key={`poly-${zone.id}`}>
                <path
                  d={pathD}
                  fill={BRAND_GREEN}
                  fillOpacity={fillOpacity}
                  stroke={BRAND_NAVY}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                >
                  <title>
                    {zone.name} — {zone.activeVehicleCount} active vehicle
                    {zone.activeVehicleCount === 1 ? "" : "s"}
                  </title>
                </path>
              </g>
            );
          })}

          {/* Centroid pins + labels */}
          {projected.map(({ zone, centroid }) => {
            const count = zone.activeVehicleCount;
            const radius = 18;
            return (
              <g key={`pin-${zone.id}`} transform={`translate(${centroid.x}, ${centroid.y})`}>
                <circle r={radius + 12} fill="url(#map-glow)" />
                <circle r={radius} fill={BRAND_NAVY} stroke="#FFFFFF" strokeWidth={2} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="system-ui, sans-serif"
                  fontWeight={700}
                  fontSize={14}
                  fill="#FFFFFF"
                >
                  {count}
                </text>
                <text
                  y={radius + 16}
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                  fontWeight={600}
                  fontSize={13}
                  fill={BRAND_NAVY}
                >
                  {zone.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

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
