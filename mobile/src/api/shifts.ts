import type { DriverShift } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

type ShiftRow = {
  id: string;
  driver_id: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  created_at: string;
};

function mapShift(row: ShiftRow): DriverShift {
  return {
    id: row.id,
    driverId: row.driver_id,
    startTime: row.start_time,
    endTime: row.end_time,
    totalHours: row.total_hours === null ? null : Number(row.total_hours),
    createdAt: row.created_at,
  };
}

async function currentProfileId(): Promise<string> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error('Create your driver profile first.');
  return data.id;
}

export const shiftKeys = {
  active: ['shift', 'active'] as const,
  recent: ['shift', 'recent'] as const,
};

/** The driver's currently-open shift, or null if clocked out. */
export function useActiveShift() {
  return useQuery({
    queryKey: shiftKeys.active,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_shifts')
        .select('*')
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle<ShiftRow>();
      if (error) throw error;
      return data ? mapShift(data) : null;
    },
  });
}

export function useRecentShifts() {
  return useQuery({
    queryKey: shiftKeys.recent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_shifts')
        .select('*')
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(10)
        .returns<ShiftRow[]>();
      if (error) throw error;
      return data.map(mapShift);
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const driverId = await currentProfileId();
      const { error } = await supabase
        .from('driver_shifts')
        .insert({ driver_id: driverId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shiftKeys.active }),
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from('driver_shifts')
        .update({ end_time: new Date().toISOString() })
        .eq('id', shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.active });
      queryClient.invalidateQueries({ queryKey: shiftKeys.recent });
    },
  });
}
