"use client";

import "leaflet/dist/leaflet.css";

import L, { type LatLngBoundsExpression, type LatLngTuple } from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { ZoneFleetSummary } from "@/lib/queries";

const BRAND_NAVY = "#0D2236";
const BRAND_GREEN = "#16BE66";

function polygonCentroid(points: LatLngTuple[]): LatLngTuple | null {
  if (points.length === 0) return null;
  // Strip duplicate closing point if present.
  const ring =
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
      ? points.slice(0, -1)
      : points;
  if (ring.length === 0) return null;
  if (ring.length < 3) return ring[0];

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lat0, lng0] = ring[i];
    const [lat1, lng1] = ring[(i + 1) % ring.length];
    const cross = lng0 * lat1 - lng1 * lat0;
    area += cross;
    cx += (lng0 + lng1) * cross;
    cy += (lat0 + lat1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const meanLat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const meanLng = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [meanLat, meanLng];
  }
  return [cy / (6 * area), cx / (6 * area)];
}

function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [bounds, map]);
  return null;
}

function makePinIcon() {
  // Classic teardrop location pin — small, green, drop-shadowed. Matches the
  // mockup style: pin shape with a white dot at its centre.
  const html = `
    <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="hg-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#0D2236" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path
        d="M13 1.5 C6.65 1.5 1.5 6.65 1.5 13 c0 8.6 11.5 19.5 11.5 19.5 s11.5 -10.9 11.5 -19.5 c0 -6.35 -5.15 -11.5 -11.5 -11.5 z"
        fill="#16BE66"
        stroke="#0E8F4E"
        stroke-width="1"
        filter="url(#hg-pin-shadow)"
      />
      <circle cx="13" cy="13" r="4" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    html,
    className: "hg-pin-wrapper",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

type Props = {
  zones: ZoneFleetSummary[];
};

export default function ComplianceMapClient({ zones }: Props) {
  const withPolygons = zones.filter(
    (z) => Array.isArray(z.polygon) && (z.polygon?.length ?? 0) >= 3,
  );

  const maxActivity = Math.max(1, ...withPolygons.map((z) => z.activeVehicleCount));

  // Convert [lng, lat] GeoJSON-style coords to Leaflet's [lat, lng].
  const projected = withPolygons.map((zone) => {
    const ring = (zone.polygon ?? []).map(([lng, lat]) => [lat, lng] as LatLngTuple);
    const centroid = polygonCentroid(ring);
    return { zone, ring, centroid };
  });

  const allPoints = projected.flatMap((p) => p.ring);
  const bounds: LatLngBoundsExpression | null =
    allPoints.length > 0 ? L.latLngBounds(allPoints) : null;

  // Sensible fallback for the centre: Johannesburg CBD.
  const fallbackCentre: LatLngTuple = [-26.2041, 28.0473];

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-md border border-border">
      <style>{`
        .hg-pin-wrapper { background: transparent !important; border: none !important; }
      `}</style>
      <MapContainer
        center={fallbackCentre}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {projected.map(({ zone, ring }) => {
          const activityFraction = zone.activeVehicleCount / maxActivity;
          const fillOpacity = 0.22 + 0.45 * activityFraction;
          return (
            <Polygon
              key={`poly-${zone.id}`}
              positions={ring}
              pathOptions={{
                color: BRAND_NAVY,
                weight: 2,
                opacity: 0.85,
                fillColor: BRAND_GREEN,
                fillOpacity,
              }}
            >
              <Popup>
                <PopupCard zone={zone} />
              </Popup>
            </Polygon>
          );
        })}

        {projected.map(({ zone, centroid }) =>
          centroid ? (
            <Marker
              key={`pin-${zone.id}`}
              position={centroid}
              icon={makePinIcon()}
            >
              <Popup>
                <PopupCard zone={zone} />
              </Popup>
            </Marker>
          ) : null,
        )}

        <FitToBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}

function PopupCard({ zone }: { zone: ZoneFleetSummary }) {
  return (
    <div style={{ minWidth: 180 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, opacity: 0.7, margin: 0 }}>
        ZONE
      </p>
      <p style={{ fontSize: 16, fontWeight: 700, margin: "2px 0 8px" }}>{zone.name}</p>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        <div>
          <strong>{zone.activeVehicleCount}</strong> active vehicle
          {zone.activeVehicleCount === 1 ? "" : "s"}
        </div>
        <div>
          <strong>{zone.activeSubscriptionCount}</strong> active subscription
          {zone.activeSubscriptionCount === 1 ? "" : "s"}
        </div>
        <div style={{ marginTop: 6, opacity: 0.7 }}>
          R{zone.monthlyFee.toFixed(0)} / month
        </div>
      </div>
    </div>
  );
}
