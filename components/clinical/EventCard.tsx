import React from 'react';
import type { ClinicalEvent } from '@/types/database';
import { TrustTierBadge } from './TrustTierBadge';

interface EventCardProps {
  event: ClinicalEvent;
  readOnly?: boolean;
}

export function EventCard({ event, readOnly: _readOnly = false }: EventCardProps) {
  const isAiSummary = event.event_type === 'ai_summary';
  const borderClass = isAiSummary ? 'border-l-4 border-accent' : 'border-border';

  const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className={`bg-white border shadow-sm rounded-xl overflow-hidden ${borderClass}`}>
      <div className="px-6 py-4 flex flex-row items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-sm font-semibold capitalize text-text-primary">
          {event.event_type.replace('_', ' ')}
        </h3>
        <TrustTierBadge tier={event.trust_tier} />
      </div>
      
      {event.contributor && (
        <div className="px-6 pt-2 text-sm text-text-muted">
          Contributor: {event.contributor.type || 'Unknown'} {event.contributor.domain ? `• ${event.contributor.domain}` : ''}
        </div>
      )}

      <div className="px-6 py-4">
        <div className="space-y-2 text-sm">
          {Object.entries(event.content).map(([key, value]) => {
            if (key === 'rejected') return null;
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium text-text-muted w-1/3">{formatKey(key)}:</span>
                <span className="text-text-primary flex-1">{String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 text-xs text-text-muted border-t border-border/50">
        {new Date(event.created_at).toLocaleString()}
      </div>
    </div>
  );
}

export default EventCard;
