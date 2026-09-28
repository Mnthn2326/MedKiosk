import { Suspense } from 'react';
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
    .select('id, deidentified_code, gender, dob')
    .eq('id', patientId)
    .single();

  if (!patient) {
    redirect('/doctor/patients');
  }

  // Get the logged-in doctor's contributor record
  const { data: profile } = await supabase
    .from('users')
    .select('id, name')
    .eq('auth_id', user.id)
    .single();

  let contributorId = '';
  let contributorDomain = '';

  if (profile) {
    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, domain')
      .eq('user_id', profile.id)
      .single();

    if (contributor) {
      contributorId = contributor.id;
      contributorDomain = contributor.domain || '';
    }
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

  // Compute patient age from DOB server-side (never pass DOB to client)
  let patientAge: string | null = null;
  if (patient.dob) {
    const dob = new Date(patient.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    patientAge = age > 89 ? '90+' : `${age} yrs`;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Sticky Patient header with metadata */}
      <div className="mb-6 sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border/50 pb-4 pt-2 -mx-2 px-2">
        <h1 className="text-2xl font-bold text-primary">Patient Timeline</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary/10 text-primary font-mono font-semibold text-sm">
            {patient.deidentified_code}
          </span>
          {patient.gender && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-text-muted text-xs font-medium">
              {patient.gender}
            </span>
          )}
          {patientAge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-text-muted text-xs font-medium">
              Age: {patientAge}
            </span>
          )}
          {contributorDomain && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-medium capitalize">
              {contributorDomain}
            </span>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="p-4 text-center text-text-muted animate-pulse">Loading timeline...</div>}>
        <DoctorTimelineClient
          patientId={patientId}
          patientCode={patient.deidentified_code}
          contributorId={contributorId}
          initialEvents={transformedEvents}
        />
      </Suspense>
    </div>
  );
}
