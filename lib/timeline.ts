/**
 * @file lib/timeline.ts
 *
 * Clinical Timeline Chronological Ordering and Filter Utilities for MedNotes.
 *
 * ARCHITECTURAL CONTRACT:
 * - Primary Organization: Strict chronological sequence based on clinical event timestamps (`created_at`).
 * - Default Sort Order: Descending (`desc`, newest first), ensuring acute and recent findings appear
 *   at the top of the consultation timeline while maintaining continuous chronological progression.
 * - Non-mutating: Original arrays are never mutated in-place.
 * - Robust Fallback: Missing (`undefined`/`null`) or unparseable timestamps evaluate to timestamp 0,
 *   with event ID utilized as a deterministic secondary tie-breaker.
 */

import type { ClinicalEvent, TrustTier } from '@/types/database';

export type SortOrder = 'desc' | 'asc';

/**
 * Safely resolves the millisecond timestamp for a clinical event.
 * Returns 0 if missing, null, or invalid date string.
 */
export function getEventTimestamp(event?: Partial<ClinicalEvent> | null): number {
  if (!event || !event.created_at) return 0;
  const time = new Date(event.created_at).getTime();
  return isNaN(time) ? 0 : time;
}

/**
 * Sorts clinical events in deterministic chronological order without mutating the input array.
 * Default order: 'desc' (newest first, matching MedNotes clinical review standard).
 * Uses event.id as deterministic tie-breaker for equal or invalid timestamps.
 */
export function sortEventsChronologically(
  events: ClinicalEvent[],
  order: SortOrder = 'desc'
): ClinicalEvent[] {
  if (!events || !Array.isArray(events)) return [];

  // Clone array to avoid in-place mutation
  return [...events].sort((a, b) => {
    const timeA = getEventTimestamp(a);
    const timeB = getEventTimestamp(b);

    if (timeA !== timeB) {
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    }

    // Deterministic tie-breaker for identical timestamps
    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return order === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });
}

/**
 * Filters events by trust tier while preserving chronological ordering.
 */
export function filterEventsByTier(
  events: ClinicalEvent[],
  tier: TrustTier | 'all' = 'all'
): ClinicalEvent[] {
  if (!events || !Array.isArray(events)) return [];
  if (tier === 'all') return events;
  return events.filter((e) => e.trust_tier === tier);
}
