import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DoctorTimelineClient from './DoctorTimelineClient';
import type { ClinicalEvent } from '@/types/database';

interface PageProps {
  params: Promise<{ patientId: string }>;
}

export default async function DoctorTimelinePage({ params }: PageProps) {
  const { patientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get patient info (deidentified only)
  const { data: patient } = await supabase
    .from('patients')
    .select('id, deidentified_code')
    .eq('id', patientId)
    .single();

  if (!patient) {
    redirect('/doctor/patients');
  }

  // Fetch clinical events for this patient with contributor info
  const { data: events } = await supabase
    .from('clinical_events')
    .select(`
      id,
      patient_id,
      contributor_id,
      event_type,
      trust_tier,
      content,
      created_at,
      contributors:contributor_id (
        id,
        type,
        domain,
        users:user_id (
          name
        )
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  // Transform the joined data to match ClinicalEvent type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedEvents = (events || []).map((event: any) => {
    const contrib = event.contributors;
    return {
      id: event.id,
      patient_id: event.patient_id,
      contributor_id: event.contributor_id,
      event_type: event.event_type,
      trust_tier: event.trust_tier,
      content: event.content,
      created_at: event.created_at,
      contributor: contrib
        ? {
            id: contrib.id,
            type: contrib.type,
            domain: contrib.domain,
            user: Array.isArray(contrib.users) ? contrib.users[0] : contrib.users,
          }
        : undefined,
    };
  }) as ClinicalEvent[];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Patient Timeline</h1>
        <p className="text-text-muted mt-1">
          Patient: <span className="font-mono font-semibold">{patient.deidentified_code}</span>
        </p>
      </div>

      <DoctorTimelineClient
        patientId={patientId}
        initialEvents={transformedEvents}
      />
    </div>
  );
}
