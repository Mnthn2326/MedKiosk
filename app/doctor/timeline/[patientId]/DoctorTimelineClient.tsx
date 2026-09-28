'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Timeline from '@/components/clinical/Timeline';
import Button from '@/components/ui/Button';
import { Icon } from "@/components/ui/Icon";

import SoapWorkspace from '@/components/clinical/SoapWorkspace';
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
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'timeline' | 'consultation'>('timeline');

  const [successMessage, setSuccessMessage] = useState('');
  const supabase = createClient();

  // Switch tab if query param demands
  useEffect(() => {
    if (searchParams.get('consult') === 'true') {
      setActiveTab('consultation');
    }
  }, [searchParams]);

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

  const handleConsultationSuccess = () => {
    setSuccessMessage('Consultation recorded successfully!');
    if (window.innerWidth < 768) {
      setActiveTab('timeline'); // Switch back to timeline on mobile
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-6 md:mx-0 px-2 md:px-0">
      
      {/* Mobile Tabs */}
      <div className="md:hidden flex border-b border-border mb-4 px-2">
        <button 
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'consultation' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          onClick={() => setActiveTab('consultation')}
        >
          Consultation Note
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 px-4 py-3 mx-2 md:mx-0 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 mx-2 md:mx-0 bg-danger/10 text-danger rounded-lg border border-danger/20 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden h-full gap-4 relative">
        {/* Left Pane: Timeline (hidden on mobile if tab is consultation) */}
        <div className={`w-full md:w-1/2 flex flex-col h-full overflow-y-auto pr-0 md:pr-4 md:border-r border-border transition-all ${activeTab === 'timeline' ? 'block' : 'hidden md:flex'}`}>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              onClick={handleGenerateSummary}
              loading={generating}
              disabled={generating || events.filter((e) => e.event_type !== 'ai_summary').length === 0}
            >
              {generating ? 'Generating Summary...' : (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="ai" size={16} /> Generate AI Summary
                </span>
              )}
            </Button>
            
            {/* Show "Record Consultation" button on mobile timeline view only to quickly switch to consultation */}
            <button
              onClick={() => setActiveTab('consultation')}
              className="md:hidden inline-flex items-center gap-2 px-5 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm ml-auto"
            >
              <Icon name="diagnosis" size={14} /> New Note
            </button>
          </div>

          <div className="flex-1 pb-20 md:pb-0">
            <Timeline events={events} onReview={handleReview} readOnly={false} />
          </div>
        </div>

        {/* Right Pane: SOAP Workspace (hidden on mobile if tab is timeline) */}
        <div className={`w-full md:w-1/2 h-full flex flex-col transition-all ${activeTab === 'consultation' ? 'block' : 'hidden md:flex'}`}>
          <SoapWorkspace 
            patientId={patientId}
            userId={contributorId}
            onSuccess={handleConsultationSuccess}
          />
        </div>
      </div>
    </div>
  );
}
