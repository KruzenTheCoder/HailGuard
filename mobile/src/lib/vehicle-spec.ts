import type { VehicleCategory } from '@hailguard/shared';

// Live vehicle-specification lookup. Uses the free NHTSA vPIC VIN decoder as
// the concrete provider — swap the fetch for a SA source (NaTIS / a commercial
// VIN/registration API) behind this same `decodeVin` interface for production
// accuracy. Returns best-effort fields; the driver confirms before saving.

export type VehicleSpec = {
  make: string | null;
  model: string | null;
  year: number | null;
  passengerCapacity: number | null;
  vehicleCategory: VehicleCategory | null;
};

function mapCategory(bodyClass: string): VehicleCategory | null {
  const b = bodyClass.toLowerCase();
  if (!b) return null;
  if (b.includes('hatchback')) return 'Hatchback';
  if (b.includes('sedan') || b.includes('saloon')) return 'Sedan';
  if (b.includes('bus')) return 'Minibus';
  if (b.includes('mpv') || b.includes('minivan') || b.includes('van') || b.includes('multi-purpose'))
    return '7-Seater/MPV';
  if (b.includes('suv') || b.includes('crossover')) return '7-Seater/MPV';
  return null;
}

export async function decodeVin(vin: string): Promise<VehicleSpec | null> {
  const clean = vin.trim().toUpperCase();
  if (clean.length < 11) return null;
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(clean)}?format=json`
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { Results?: Record<string, string>[] };
    const r = json.Results?.[0];
    if (!r) return null;
    const seats = parseInt(r.Seats || '', 10);
    return {
      make: r.Make || null,
      model: r.Model || null,
      year: r.ModelYear ? Number(r.ModelYear) : null,
      passengerCapacity: Number.isFinite(seats) && seats > 0 ? seats : null,
      vehicleCategory: mapCategory(r.BodyClass || ''),
    };
  } catch {
    return null;
  }
}
