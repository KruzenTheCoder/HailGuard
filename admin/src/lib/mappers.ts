import type {
  DriverProfile,
  PlatformVerifications,
  ReviewStatus,
  Vehicle,
  VehicleStatus,
} from "@hailguard/shared";

export type UserLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
};

export type DriverProfileRow = {
  id: string;
  user_id: string;
  id_number: string | null;
  license_number: string | null;
  id_document_path: string | null;
  license_document_path: string | null;
  platform_verifications: PlatformVerifications | null;
  status: ReviewStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  registration_document_path: string | null;
  roadworthy_certificate_path: string | null;
  roadworthy_expires_at: string | null;
  status: VehicleStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export function mapDriverProfile(row: DriverProfileRow): DriverProfile {
  return {
    id: row.id,
    userId: row.user_id,
    idNumber: row.id_number,
    licenseNumber: row.license_number,
    idDocumentPath: row.id_document_path,
    licenseDocumentPath: row.license_document_path,
    platformVerifications: row.platform_verifications ?? {},
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    driverId: row.driver_id,
    make: row.make,
    model: row.model,
    year: row.year,
    licensePlate: row.license_plate,
    registrationDocumentPath: row.registration_document_path,
    roadworthyCertificatePath: row.roadworthy_certificate_path,
    roadworthyExpiresAt: row.roadworthy_expires_at,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
