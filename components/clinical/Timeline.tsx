'use client';

import React, { useState, useMemo } from 'react';
import type { ClinicalEvent, TrustTier, AiSummaryContent } from '@/types/database';
import { EventCard } from './EventCard';
import { SummaryCard } from './SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  sortEventsChronologically,
  filterEventsByTier,
  SortOrder,
} from '@/lib/timeline';

export { sortEventsChronologically, getEventTimestamp } from '@/lib/timeline';

interface TimelineProps {
  events: ClinicalEvent[];
  onReview?: (
    eventId: string,
    action: 'accept' | 'edit' | 'reject',
    content?: AiSummaryContent
  ) => void;
  readOnly?: boolean;
  order?: SortOrder;
  initialTierFilter?: TrustTier | 'all';
}

const TIER_FILTER_OPTIONS: Array<{ tier: TrustTier | 'all'; label: string }> = [
  { tier: 'all', label: 'All Events' },
  { tier: 'doctor_confirmed', label: 'Doctor Confirmed' },
  { tier: 'institution_verified', label: 'Institution Verified' },
  { tier: 'patient_uploaded', label: 'Patient Uploaded' },
  { tier: 'self_reported', label: 'Self Reported' },
];

export function Timeline({
  events,
  onReview,
  readOnly = false,
  order = 'desc',
  initialTierFilter = 'all',
}: TimelineProps) {
  const [selectedTier, setSelectedTier] = useState<TrustTier | 'all'>(initialTierFilter);

  // 1. Sort chronologically (non-mutating)
  const sortedEvents = useMemo(() => {
    return sortEventsChronologically(events || [], order);
  }, [events, order]);

  // 2. Secondary trust-tier filtering
  const displayedEvents = useMemo(() => {
    return filterEventsByTier(sortedEvents, selectedTier);
  }, [sortedEvents, selectedTier]);

  // 3. Count occurrences per tier for badge counters in filter bar
  const tierCounts = useMemo(() => {
    if (!events || !Array.isArray(events)) return { all: 0 };
    const counts: Record<string, number> = { all: events.length };
    events.forEach((e) => {
      if (e.trust_tier) {
        counts[e.trust_tier] = (counts[e.trust_tier] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon="notes"
        title="No Clinical History Recorded Yet"
        description="Clinical events and diagnostic reports will automatically appear here as authorized doctors and laboratories contribute to this record."
        variant="subtle"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Secondary Trust-Tier Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border">
        {TIER_FILTER_OPTIONS.map(({ tier, label }) => {
          const count = tierCounts[tier] || 0;
          if (tier !== 'all' && count === 0) return null;
          const isActive = selectedTier === tier;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200 hover:text-text-primary'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chronological Event Cards List */}
      {displayedEvents.length === 0 ? (
        <div className="p-6 text-center text-sm text-text-muted italic bg-gray-50 rounded-xl border border-dashed border-border">
          No events found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {displayedEvents.map((event) => {
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
      )}
    </div>
  );
}

export default Timeline;
