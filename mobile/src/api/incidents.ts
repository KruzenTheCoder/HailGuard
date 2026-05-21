import type { IncidentType } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

async function currentProfileId(): Promise<string> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error('Create your driver profile first.');
  return data.id;
}

export const incidentKeys = {
  mine: ['incidents', 'mine'] as const,
};

export type IncidentInput = {
  type: IncidentType;
  vehicleId?: string | null;
  notes?: string | null;
};

export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: IncidentInput) => {
      const driverId = await currentProfileId();
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          driver_id: driverId,
          vehicle_id: input.vehicleId ?? null,
          incident_type: input.type,
          notes: input.notes ?? null,
        })
        .select('id')
        .single<{ id: string }>();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.mine });
    },
  });
}

export type MyIncident = {
  id: string;
  incidentType: IncidentType;
  status: string;
  createdAt: string;
};

export function useMyIncidents() {
  return useQuery({
    queryKey: incidentKeys.mine,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, incident_type, status, created_at')
        .order('created_at', { ascending: false })
        .returns<
          { id: string; incident_type: IncidentType; status: string; created_at: string }[]
        >();
      if (error) throw error;
      return data.map((r) => ({
        id: r.id,
        incidentType: r.incident_type,
        status: r.status,
        createdAt: r.created_at,
      }));
    },
  });
}
