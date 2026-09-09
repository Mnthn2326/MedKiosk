import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PatientTimelineClient from './PatientTimelineClient';
import type { ClinicalEvent } from '@/types/database';

export default async function PatientTimelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile (patient sees their real name)
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('auth_id', user.id)
    .single();

  if (!profile || profile.role !== 'patient') {
    redirect('/');
  }

  // Get patient record
  const { data: patient } = await supabase
    .from('patients')
    .select('id, deidentified_code')
    .eq('user_id', profile.id)
    .single();

  if (!patient) {
    redirect('/');
  }

  // Fetch clinical events for this patient
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
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false });

  // Transform joined data
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
        <h1 className="text-2xl font-bold text-primary">My Health Timeline</h1>
        <p className="text-text-muted mt-1">
          Welcome, <span className="font-semibold">{profile.name}</span>
        </p>
        <p className="text-xs text-text-muted mt-1">
          Your de-identified code: <span className="font-mono">{patient.deidentified_code}</span>
        </p>
      </div>

      <PatientTimelineClient
        patientId={patient.id}
        initialEvents={transformedEvents}
      />
    </div>
  );
}
