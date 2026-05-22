// Canonical domain model shared across the mobile app and admin portal.
// These mirror the Supabase schema (see supabase/migrations). Raw
// generated row types live in database.types.ts; these are the curated,
// app-facing shapes.

export type UserRole =
  | "driver"
  | "admin"
  | "super_admin"
  | "compliance_admin"
  | "reviewer";

/** Backoffice roles (everything except driver). */
export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "super_admin",
  "compliance_admin",
  "reviewer",
] as const;

export type PrdpStatus = "pending" | "verified" | "expired";

export type VehicleCategory = "Hatchback" | "Sedan" | "7-Seater/MPV" | "Minibus";

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
  /** Professional Driving Permit. */
  prdpNumber: string | null;
  prdpDocumentPath: string | null;
  prdpExpiresAt: string | null;
  prdpStatus: PrdpStatus;
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
  vinNumber: string | null;
  engineNumber: string | null;
  passengerCapacity: number | null;
  vehicleCategory: VehicleCategory | null;
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
  province: string | null;
  maxPassengerCapacity: number | null;
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

// --- Phase 7: reporting & regulatory compliance ---

export type IncidentType =
  | "sos_triggered"
  | "passenger_dispute"
  | "accident"
  | "compliance_violation";

export type IncidentStatus = "open" | "under_investigation" | "resolved";

export interface ComplianceLog {
  id: string;
  driverId: string | null;
  vehicleId: string | null;
  actionType: string;
  /** User id of the admin who acted, or null for system actions. */
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Incident {
  id: string;
  driverId: string;
  vehicleId: string | null;
  incidentType: IncidentType;
  status: IncidentStatus;
  notes: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverShift {
  id: string;
  driverId: string;
  startTime: string;
  endTime: string | null;
  totalHours: number | null;
  createdAt: string;
}

/** Legally-mandated maximum continuous working hours before a rest period. */
export const MAX_SHIFT_HOURS = 12;

/** Traffic-light status for a compliance document's expiry. */
export type ExpiryStatus = "valid" | "expiring" | "expired" | "missing";

/** Map a date (or null) to a traffic-light status. expiring ≤ 30 days out. */
export function expiryStatus(
  date: string | null | undefined,
  warnWithinDays = 30
): { status: ExpiryStatus; daysLeft: number | null } {
  if (!date) return { status: "missing", daysLeft: null };
  const ms = Date.parse(date);
  if (Number.isNaN(ms)) return { status: "missing", daysLeft: null };
  const daysLeft = Math.ceil((ms - Date.now()) / 86_400_000);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= warnWithinDays) return { status: "expiring", daysLeft };
  return { status: "valid", daysLeft };
}
