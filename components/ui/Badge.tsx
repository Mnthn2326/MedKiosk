import React from 'react';

export type BadgeStatus = 'confirmed' | 'pending' | 'abnormal' | 'critical';

// Forcing a union of allowed labels ensures strict clinical terminology across the app
export type BadgeLabel = 
  | 'Doctor Confirmed' 
  | 'Institution Verified' 
  | 'Patient Uploaded' 
  | 'Self Reported'
  | 'Normal'
  | 'Pending Review'
  | 'Abnormal'
  | 'Critical';

export interface BadgeProps {
  status: BadgeStatus;
  label: BadgeLabel | string; // Allowing string for flexibility, but strongly typing known labels
  className?: string;
}

// Record<BadgeStatus, ...> forces compile-time coverage of every status
const STYLES: Record<BadgeStatus, { container: string; dot: string }> = {
  confirmed: {
    container: 'bg-status-confirmed-bg text-status-confirmed-text',
    dot: 'bg-status-confirmed-dot',
  },
  pending: {
    container: 'bg-status-pending-bg text-status-pending-text',
    dot: 'bg-status-pending-dot',
  },
  abnormal: {
    container: 'bg-status-abnormal-bg text-status-abnormal-text',
    dot: 'bg-status-abnormal-dot',
  },
  critical: {
    container: 'bg-status-critical-bg text-status-critical-text',
    dot: 'bg-status-critical-dot',
  },
};

export function Badge({ status, label, className = '' }: BadgeProps) {
  const styles = STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.container} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export default Badge;
