'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Timeline from '@/components/clinical/Timeline';
import Button from '@/components/ui/Button';
import DoctorConsultationModal from '@/components/clinical/DoctorConsultationModal';
import { createClient } from '@/lib/supabase/client';
import type { ClinicalEvent, AiSummaryContent } from '@/types/database';

interface DoctorTimelineClientProps {
  patientId: string;
  patientCode: string;
  contributorId: string;
  initialEvents: ClinicalEvent[];
}

export default function DoctorTimelineClient({
  patientId,
  patientCode,
  contributorId,
  initialEvents,
}: DoctorTimelineClientProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<ClinicalEvent[]>(initialEvents);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConsultation, setShowConsultation] = useState(
    searchParams.get('consult') === 'true'
  );
  const [successMessage, setSuccessMessage] = useState('');
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
          setEvents((prev) => {
            if (prev.find((e) => e.id === newEvent.id)) return prev;
            return [newEvent, ...prev];
          });
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

  // Clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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

  // Handle consultation success
  const handleConsultationSuccess = () => {
    setSuccessMessage('Consultation recorded successfully!');
    // Refresh events from the server to pick up the new entries with contributor info
    const refreshEvents = async () => {
      try {
        const res = await fetch(`/api/clinical-events?patient_id=${patientId}`);
        if (res.ok) {
          // Realtime subscription will pick up the new events
        }
      } catch {
        // Ignore — realtime will handle it
      }
    };
    refreshEvents();
  };

  return (
    <div>
      {/* Success Banner */}
      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Primary: Record Consultation */}
        <button
          onClick={() => setShowConsultation(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          🩺 Record Consultation / Diagnosis
        </button>

        {/* Secondary: Generate AI Summary */}
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

      {/* Consultation Modal */}
      <DoctorConsultationModal
        isOpen={showConsultation}
        onClose={() => setShowConsultation(false)}
        patientId={patientId}
        patientCode={patientCode}
        contributorId={contributorId}
        onSuccess={handleConsultationSuccess}
      />
    </div>
  );
}
