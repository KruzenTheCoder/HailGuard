import type { PlatformVerifications } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapDriverProfile, type DriverProfileRow } from '@/lib/mappers';
import { supabase } from '@/lib/supabase';

export const profileKeys = {
  current: ['driver-profile'] as const,
};

export function useDriverProfile() {
  return useQuery({
    queryKey: profileKeys.current,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .maybeSingle<DriverProfileRow>();
      if (error) throw error;
      return data ? mapDriverProfile(data) : null;
    },
  });
}

export type UpsertProfileInput = {
  idNumber?: string | null;
  licenseNumber?: string | null;
  idDocumentPath?: string | null;
  licenseDocumentPath?: string | null;
  prdpNumber?: string | null;
  prdpExpiresAt?: string | null;
  prdpDocumentPath?: string | null;
  platformVerifications?: PlatformVerifications;
};

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertProfileInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload: Record<string, unknown> = { user_id: user.id };
      if (input.idNumber !== undefined) payload.id_number = input.idNumber;
      if (input.licenseNumber !== undefined) payload.license_number = input.licenseNumber;
      if (input.idDocumentPath !== undefined) payload.id_document_path = input.idDocumentPath;
      if (input.licenseDocumentPath !== undefined)
        payload.license_document_path = input.licenseDocumentPath;
      if (input.prdpNumber !== undefined) payload.prdp_number = input.prdpNumber;
      if (input.prdpExpiresAt !== undefined) payload.prdp_expires_at = input.prdpExpiresAt;
      if (input.prdpDocumentPath !== undefined)
        payload.prdp_document_path = input.prdpDocumentPath;
      if (input.platformVerifications !== undefined)
        payload.platform_verifications = input.platformVerifications;

      const { data, error } = await supabase
        .from('driver_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single<DriverProfileRow>();
      if (error) throw error;
      return mapDriverProfile(data);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.current, profile);
    },
  });
}
