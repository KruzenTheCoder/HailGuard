import type {
  DriverProfile,
  EHailingPlatform,
  ReviewStatus,
  Vehicle,
} from '@hailguard/shared';
import { E_HAILING_PLATFORMS } from '@hailguard/shared';

import type { SubscriptionView } from '@/api/subscriptions';

export type ComplianceLevel = 'compliant' | 'partial' | 'noncompliant';

export type ComplianceSummary = {
  level: ComplianceLevel;
  /** Weighted score, 0–100. */
  score: number;
  profile: {
    exists: boolean;
    complete: boolean;
    status: ReviewStatus | 'missing';
  };
  platforms: {
    verifiedCount: number;
    totalCount: number;
    verified: EHailingPlatform[];
  };
  vehicles: {
    total: number;
    active: number;
    pending: number;
  };
  subscriptions: {
    activeCount: number;
    /** Next-to-expire active subscription (drives the headline). */
    primary: SubscriptionView | null;
    daysUntilExpiry: number | null;
    /** All active subscriptions, soonest-to-expire first. */
    active: SubscriptionView[];
  };
};

const MS_PER_DAY = 86_400_000;

export function summarise({
  profile,
  vehicles,
  subscriptions,
}: {
  profile: DriverProfile | null | undefined;
  vehicles: Vehicle[] | null | undefined;
  subscriptions: SubscriptionView[] | null | undefined;
}): ComplianceSummary {
  const profileExists = !!profile;
  const profileComplete = !!(
    profile?.idNumber &&
    profile?.licenseNumber &&
    profile?.idDocumentPath &&
    profile?.licenseDocumentPath
  );
  const profileStatus: ReviewStatus | 'missing' = profile ? profile.status : 'missing';

  const verifications = profile?.platformVerifications ?? {};
  const verified = E_HAILING_PLATFORMS.filter(
    (p) => verifications[p]?.status === 'approved',
  );

  const vs = vehicles ?? [];
  const active = vs.filter((v) => v.status === 'active');
  const pending = vs.filter((v) => v.status === 'pending');

  const subs = subscriptions ?? [];
  const activeSubs = subs
    .filter((s) => s.status === 'active')
    .slice()
    .sort((a, b) => {
      const ae = a.endDate ? Date.parse(a.endDate) : Infinity;
      const be = b.endDate ? Date.parse(b.endDate) : Infinity;
      return ae - be;
    });
  const primary = activeSubs[0] ?? null;
  const daysUntilExpiry = primary?.endDate
    ? Math.max(0, Math.ceil((Date.parse(primary.endDate) - Date.now()) / MS_PER_DAY))
    : null;

  // Composite score: each pillar contributes up to 25 points.
  //   profile:        approved=1, complete=0.5, otherwise=0
  //   platforms:      proportional to # verified / total
  //   vehicles:       any active=1, none active but some pending=0.4
  //   subscriptions:  any active=1
  const profileScore =
    profileComplete && profileStatus === 'approved' ? 1 : profileComplete ? 0.5 : 0;
  const platformScore = verified.length / E_HAILING_PLATFORMS.length;
  const vehicleScore = active.length > 0 ? 1 : pending.length > 0 ? 0.4 : 0;
  const subScore = activeSubs.length > 0 ? 1 : 0;
  const score = Math.round((profileScore + platformScore + vehicleScore + subScore) * 25);

  const level: ComplianceLevel =
    score >= 90 ? 'compliant' : score >= 50 ? 'partial' : 'noncompliant';

  return {
    level,
    score,
    profile: { exists: profileExists, complete: profileComplete, status: profileStatus },
    platforms: {
      verifiedCount: verified.length,
      totalCount: E_HAILING_PLATFORMS.length,
      verified,
    },
    vehicles: {
      total: vs.length,
      active: active.length,
      pending: pending.length,
    },
    subscriptions: {
      activeCount: activeSubs.length,
      primary,
      daysUntilExpiry,
      active: activeSubs,
    },
  };
}
