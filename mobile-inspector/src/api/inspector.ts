import type { PrdpStatus, ReviewStatus, VehicleStatus } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type DossierVehicle = {
  id: string;
  make: string;
  model: string;
  plate: string;
  status: VehicleStatus;
  capacity: number | null;
  category: string | null;
  roadworthyExpiresAt: string | null;
};

export type DossierSubscription = {
  id: string;
  zone: string;
  plate: string;
  status: string;
  endDate: string | null;
};

export type Dossier = {
  driverId: string;
  driver: {
    name: string;
    phone: string | null;
    idNumber: string | null;
    licenseNumber: string | null;
    prdpStatus: PrdpStatus;
    prdpExpiresAt: string | null;
    profileStatus: ReviewStatus;
  };
  vehicles: DossierVehicle[];
  activeSubscriptions: DossierSubscription[];
};

export type LookupKind = 'subscription' | 'plate' | 'id';

export function useLookup() {
  return useMutation({
    mutationFn: async ({ kind, value }: { kind: LookupKind; value: string }) => {
      const { data, error } = await supabase.rpc('inspector_lookup', {
        p_kind: kind,
        p_value: value,
      });
      if (error) throw error;
      return (data as Dossier | null) ?? null;
    },
  });
}

export const dossierKey = (driverId: string) => ['dossier', driverId] as const;

export function useDossier(driverId: string) {
  return useQuery({
    queryKey: dossierKey(driverId),
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('inspector_dossier', { p_driver_id: driverId });
      if (error) throw error;
      return data as Dossier | null;
    },
  });
}

export function useSuspendVehicle(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, reason }: { vehicleId: string; reason: string }) => {
      const { error } = await supabase.rpc('inspector_suspend_vehicle', {
        p_vehicle_id: vehicleId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKey(driverId) }),
  });
}

export function useRevokeCompliance(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('revoke_compliance', { p_driver_id: driverId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKey(driverId) }),
  });
}

export function useReportIncident(driverId: string) {
  return useMutation({
    mutationFn: async ({
      vehicleId,
      type,
      notes,
    }: {
      vehicleId: string | null;
      type: string;
      notes: string;
    }) => {
      const { error } = await supabase.rpc('inspector_report_incident', {
        p_driver_id: driverId,
        p_vehicle_id: vehicleId,
        p_type: type,
        p_notes: notes,
      });
      if (error) throw error;
    },
  });
}
