import type { VehicleCategory } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapVehicle, type VehicleRow } from '@/lib/mappers';
import { supabase } from '@/lib/supabase';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  detail: (id: string) => ['vehicle', id] as const,
};

async function currentProfileId(): Promise<string> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) {
    throw new Error('Create your driver profile before adding a vehicle.');
  }
  return data.id;
}

export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<VehicleRow[]>();
      if (error) throw error;
      return data.map(mapVehicle);
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single<VehicleRow>();
      if (error) throw error;
      return mapVehicle(data);
    },
  });
}

export type VehicleInput = {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vinNumber?: string | null;
  engineNumber?: string | null;
  passengerCapacity?: number | null;
  vehicleCategory?: VehicleCategory | null;
  roadworthyExpiresAt?: string | null;
  registrationDocumentPath?: string | null;
  roadworthyCertificatePath?: string | null;
};

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VehicleInput) => {
      const driverId = await currentProfileId();
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          driver_id: driverId,
          make: input.make,
          model: input.model,
          year: input.year,
          license_plate: input.licensePlate,
          vin_number: input.vinNumber ?? null,
          engine_number: input.engineNumber ?? null,
          passenger_capacity: input.passengerCapacity ?? null,
          vehicle_category: input.vehicleCategory ?? null,
          roadworthy_expires_at: input.roadworthyExpiresAt ?? null,
          registration_document_path: input.registrationDocumentPath ?? null,
          roadworthy_certificate_path: input.roadworthyCertificatePath ?? null,
        })
        .select('*')
        .single<VehicleRow>();
      if (error) throw error;
      return mapVehicle(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single<VehicleRow>();
      if (error) throw error;
      return mapVehicle(data);
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}
