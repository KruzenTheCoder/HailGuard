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

export type VehicleDetail = {
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    status: VehicleStatus;
    reviewNote: string | null;
    vinNumber: string | null;
    engineNumber: string | null;
    capacity: number | null;
    category: string | null;
    roadworthyExpiresAt: string | null;
    hasRoadworthyCertificate: boolean;
    hasRegistrationDocument: boolean;
    createdAt: string;
    updatedAt: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string | null;
    idNumber: string | null;
    licenseNumber: string | null;
    prdpStatus: PrdpStatus;
    prdpExpiresAt: string | null;
    profileStatus: ReviewStatus;
  };
  subscriptions: {
    id: string;
    zone: string;
    planType: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    amount: number;
    currency: string;
    createdAt: string;
  }[];
  incidents: {
    id: string;
    type: string;
    status: string;
    notes: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }[];
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

export type LookupKind = 'subscription' | 'plate' | 'id' | 'auto';

export function useLookup() {
  return useMutation({
    mutationFn: async ({ kind, value }: { kind: LookupKind; value: string }) => {
      const { data, error } = await supabase.rpc('inspector_lookup', {
        p_kind: kind,
        p_value: value,
      });
      // Supabase errors are plain objects (not Error instances); surface the
      // real message/details so failures aren't masked as a generic alert.
      if (error) {
        throw new Error(error.message || error.details || error.hint || 'Lookup failed.');
      }
      return (data as Dossier | null) ?? null;
    },
  });
}

export const dossierKey = (driverId: string) => ['dossier', driverId] as const;
export const vehicleDetailKey = (vehicleId: string) => ['vehicle-detail', vehicleId] as const;

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

export function useVehicleDetail(vehicleId: string) {
  return useQuery({
    queryKey: vehicleDetailKey(vehicleId),
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('inspector_vehicle_detail', {
        p_vehicle_id: vehicleId,
      });
      if (error) {
        throw new Error(error.message || error.details || error.hint || 'Lookup failed.');
      }
      return (data as VehicleDetail | null) ?? null;
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
      return vehicleId;
    },
    onSuccess: (vehicleId) => {
      qc.invalidateQueries({ queryKey: dossierKey(driverId) });
      qc.invalidateQueries({ queryKey: vehicleDetailKey(vehicleId) });
    },
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
