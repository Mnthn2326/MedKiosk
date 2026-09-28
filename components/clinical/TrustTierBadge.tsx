import React from 'react';
import type { TrustTier } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import type { BadgeStatus, BadgeLabel } from '@/components/ui/Badge';

interface TrustTierBadgeProps {
  tier: TrustTier;
}

// Map database trust tiers to our semantic Badge statuses and labels
const TIER_MAP: Record<TrustTier, { status: BadgeStatus; label: BadgeLabel }> = {
  self_reported: {
    status: 'pending',
    label: 'Self Reported',
  },
  patient_uploaded: {
    status: 'abnormal',
    label: 'Patient Uploaded',
  },
  institution_verified: {
    status: 'pending', // Teal / Primary
    label: 'Institution Verified',
  },
  doctor_confirmed: {
    status: 'confirmed',
    label: 'Doctor Confirmed',
  },
};

export function TrustTierBadge({ tier }: TrustTierBadgeProps) {
  const config = TIER_MAP[tier] || TIER_MAP.self_reported;
  
  return <Badge status={config.status} label={config.label} />;
}

export default TrustTierBadge;
