import React from 'react';
import type { TrustTier } from '@/types/database';

interface TrustTierBadgeProps {
  tier: TrustTier;
}

const tierConfig: Record<TrustTier, { label: string; bg: string; textClass: string }> = {
  self_reported: {
    label: 'Self Reported',
    bg: '#94A3B8',
    textClass: 'text-gray-900',
  },
  patient_uploaded: {
    label: 'Patient Uploaded',
    bg: '#E0A106',
    textClass: 'text-gray-900',
  },
  institution_verified: {
    label: 'Institution Verified',
    bg: '#0F4C5C',
    textClass: 'text-white',
  },
  doctor_confirmed: {
    label: 'Doctor Confirmed',
    bg: '#1B8A5A',
    textClass: 'text-white',
  },
};

export function TrustTierBadge({ tier }: TrustTierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.self_reported;
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.textClass}`}
      style={{ backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  );
}

export default TrustTierBadge;
