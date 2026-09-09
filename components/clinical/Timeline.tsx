'use client';

import React from 'react';
import type { ClinicalEvent, TrustTier, AiSummaryContent } from '@/types/database';
import { EventCard } from './EventCard';
import { SummaryCard } from './SummaryCard';

interface TimelineProps {
  events: ClinicalEvent[];
  onReview?: (eventId: string, action: 'accept' | 'edit' | 'reject', content?: AiSummaryContent) => void;
  readOnly?: boolean;
}

const TIER_ORDER: TrustTier[] = [
  'doctor_confirmed',
  'institution_verified',
  'patient_uploaded',
  'self_reported',
];

const TIER_LABELS: Record<TrustTier, string> = {
  doctor_confirmed: 'Doctor Confirmed',
  institution_verified: 'Institution Verified',
  patient_uploaded: 'Patient Uploaded',
  self_reported: 'Self Reported',
};

export function Timeline({ events, onReview, readOnly = false }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-10 text-text-muted">
        No clinical events found for this patient.
      </div>
    );
  }

  // Group events by trust tier
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.trust_tier]) acc[event.trust_tier] = [];
    acc[event.trust_tier].push(event);
    return acc;
  }, {} as Record<TrustTier, ClinicalEvent[]>);

  // Sort each group by created_at desc
  Object.values(groupedEvents).forEach(group => {
    group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  return (
    <div className="space-y-8">
      {TIER_ORDER.map((tier) => {
        const tierEvents = groupedEvents[tier];
        if (!tierEvents || tierEvents.length === 0) return null;

        return (
          <div key={tier} className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary border-b border-border pb-2">
              {TIER_LABELS[tier]}
            </h2>
            <div className="space-y-4">
              {tierEvents.map((event) => {
                if (event.event_type === 'ai_summary') {
                  return (
                    <SummaryCard 
                      key={event.id} 
                      event={event} 
                      onReview={onReview} 
                      readOnly={readOnly} 
                    />
                  );
                }
                return <EventCard key={event.id} event={event} readOnly={readOnly} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Timeline;
