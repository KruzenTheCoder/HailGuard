import type {
  DriverProfile,
  PlatformVerifications,
  PrdpStatus,
  ReviewStatus,
  Vehicle,
  VehicleCategory,
  VehicleStatus,
} from '@hailguard/shared';

// Raw row shapes returned by Supabase (snake_case).
export type DriverProfileRow = {
  id: string;
  user_id: string;
  id_number: string | null;
  license_number: string | null;
  id_document_path: string | null;
  license_document_path: string | null;
  prdp_number: string | null;
  prdp_document_path: string | null;
  prdp_expires_at: string | null;
  prdp_status: PrdpStatus | null;
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
  vin_number: string | null;
  engine_number: string | null;
  passenger_capacity: number | null;
  vehicle_category: VehicleCategory | null;
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
    prdpNumber: row.prdp_number,
    prdpDocumentPath: row.prdp_document_path,
    prdpExpiresAt: row.prdp_expires_at,
    prdpStatus: row.prdp_status ?? 'pending',
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
    vinNumber: row.vin_number,
    engineNumber: row.engine_number,
    passengerCapacity: row.passenger_capacity,
    vehicleCategory: row.vehicle_category,
    registrationDocumentPath: row.registration_document_path,
    roadworthyCertificatePath: row.roadworthy_certificate_path,
    roadworthyExpiresAt: row.roadworthy_expires_at,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
