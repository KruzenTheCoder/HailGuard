// Canonical domain model shared across the mobile app and admin portal.
// These mirror the Supabase schema (see supabase/migrations). Raw
// generated row types live in database.types.ts; these are the curated,
// app-facing shapes.

export type UserRole = "driver" | "admin";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type VehicleStatus = "pending" | "active" | "suspended" | "rejected";

export type SubscriptionStatus =
  | "pending_payment"
  | "active"
  | "expired"
  | "cancelled";

export type PlanType = "monthly" | "yearly";

export type EHailingPlatform = "uber" | "bolt" | "indrive";

export const E_HAILING_PLATFORMS: readonly EHailingPlatform[] = [
  "uber",
  "bolt",
  "indrive",
] as const;

export type DocumentType =
  | "id_document"
  | "drivers_license"
  | "platform_proof"
  | "vehicle_registration"
  | "roadworthy_certificate";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";

export interface AppUser {
  id: string;
  role: UserRole;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  createdAt: string;
}

/** Per-platform verification record stored in driver_profiles.platform_verifications JSONB. */
export interface PlatformVerification {
  status: ReviewStatus;
  /** Storage path of the uploaded proof, if any. */
  proofPath?: string;
  verifiedAt?: string | null;
  note?: string | null;
}

export type PlatformVerifications = Partial<
  Record<EHailingPlatform, PlatformVerification>
>;

export interface DriverProfile {
  id: string;
  userId: string;
  idNumber: string | null;
  licenseNumber: string | null;
  idDocumentPath: string | null;
  licenseDocumentPath: string | null;
  platformVerifications: PlatformVerifications;
  status: ReviewStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  registrationDocumentPath: string | null;
  roadworthyCertificatePath: string | null;
  roadworthyExpiresAt: string | null;
  status: VehicleStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** [lng, lat] pairs forming a closed ring (GeoJSON-style). */
export type PolygonCoordinates = [number, number][];

export interface Zone {
  id: string;
  name: string;
  description: string | null;
  monthlyFee: number;
  yearlyFee: number;
  polygonCoordinates: PolygonCoordinates | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  vehicleId: string;
  zoneId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  subscriptionId: string;
  provider: string;
  providerReference: string | null;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}
