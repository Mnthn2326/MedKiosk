'use client';

import { useState, useEffect } from 'react';
import Timeline from '@/components/clinical/Timeline';
import { createClient } from '@/lib/supabase/client';
import type { ClinicalEvent } from '@/types/database';

interface PatientTimelineClientProps {
  patientId: string;
  initialEvents: ClinicalEvent[];
}

export default function PatientTimelineClient({
  patientId,
  initialEvents,
}: PatientTimelineClientProps) {
  const [events, setEvents] = useState<ClinicalEvent[]>(initialEvents);
  const supabase = createClient();

  // Supabase Realtime subscription — new contributor entries appear instantly
  useEffect(() => {
    const channel = supabase
      .channel(`patient_timeline_${patientId}`)
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

  return (
    <Timeline events={events} readOnly={true} />
  );
}
