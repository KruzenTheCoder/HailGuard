import type { Zone } from '@hailguard/shared';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

type ZoneRow = {
  id: string;
  name: string;
  description: string | null;
  province: string | null;
  max_passenger_capacity: number | null;
  monthly_fee: number;
  yearly_fee: number;
  polygon_coordinates: Zone['polygonCoordinates'];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapZone(row: ZoneRow): Zone {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    province: row.province,
    maxPassengerCapacity: row.max_passenger_capacity,
    monthlyFee: Number(row.monthly_fee),
    yearlyFee: Number(row.yearly_fee),
    polygonCoordinates: row.polygon_coordinates,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const zoneKeys = {
  all: ['zones'] as const,
  detail: (id: string) => ['zone', id] as const,
};

export function useZones() {
  return useQuery({
    queryKey: zoneKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .returns<ZoneRow[]>();
      if (error) throw error;
      return data.map(mapZone);
    },
  });
}

export function useZone(id: string) {
  return useQuery({
    queryKey: zoneKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('id', id)
        .single<ZoneRow>();
      if (error) throw error;
      return mapZone(data);
    },
  });
}
