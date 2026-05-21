import { createClient } from "@/lib/supabase/server";

export const BUCKETS = {
  driver: "driver-documents",
  vehicle: "vehicle-documents",
} as const;

/**
 * Time-limited URL for an admin to view a private compliance document.
 * Returns null if there is no path or the object can't be signed.
 */
export async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
