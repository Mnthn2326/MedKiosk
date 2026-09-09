'use client';

import { useState, useEffect, useCallback } from 'react';
import Timeline from '@/components/clinical/Timeline';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import type { ClinicalEvent, AiSummaryContent } from '@/types/database';

interface DoctorTimelineClientProps {
  patientId: string;
  initialEvents: ClinicalEvent[];
}

export default function DoctorTimelineClient({
  patientId,
  initialEvents,
}: DoctorTimelineClientProps) {
  const [events, setEvents] = useState<ClinicalEvent[]>(initialEvents);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel(`clinical_events_${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clinical_events',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const newEvent = payload.new as ClinicalEvent;
          setEvents((prev) => [newEvent, ...prev]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clinical_events',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const updated = payload.new as ClinicalEvent;
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, supabase]);

  // Generate RAG summary
  const handleGenerateSummary = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/rag/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const { event } = await res.json();
      // The realtime subscription should pick it up, but add it just in case
      setEvents((prev) => {
        if (prev.find((e) => e.id === event.id)) return prev;
        return [event, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  // Handle doctor review (Accept / Edit / Reject)
  const handleReview = useCallback(
    async (eventId: string, action: 'accept' | 'edit' | 'reject', content?: AiSummaryContent) => {
      try {
        const res = await fetch('/api/review', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            action,
            edited_content: content,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Review failed');
        }

        const { event: updatedEvent } = await res.json();
        setEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Review action failed');
      }
    },
    [],
  );

  return (
    <div>
      {/* Generate Summary button */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="accent"
          onClick={handleGenerateSummary}
          loading={generating}
          disabled={generating || events.filter((e) => e.event_type !== 'ai_summary').length === 0}
        >
          {generating ? 'Generating Summary...' : '✨ Generate AI Summary'}
        </Button>
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>

      {/* Timeline */}
      <Timeline events={events} onReview={handleReview} readOnly={false} />
    </div>
  );
}
