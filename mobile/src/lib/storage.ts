import { decode } from 'base64-arraybuffer';

import { supabase } from './supabase';

export const BUCKETS = {
  driver: 'driver-documents',
  vehicle: 'vehicle-documents',
} as const;

export type PickedDocument = {
  base64: string;
  uri: string;
  mimeType: string;
  ext: string;
};

/** Upload a picked document to a private bucket. Returns the stored path. */
export async function uploadDocument(
  bucket: string,
  path: string,
  doc: PickedDocument
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, decode(doc.base64), {
    contentType: doc.mimeType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/** Time-limited URL for viewing a private document. */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
