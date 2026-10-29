import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FinHealthClient from './FinHealthClient';
import type { Claim, PatientCredit } from '@/types/database';

export const metadata = {
  title: 'FinHealth & Claims | MediKiosk+',
  description: 'Cashless medical credit and insurance claim adjudication bridge',
};

export default async function FinHealthPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
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
    .select('id, deidentified_code, dob, gender')
    .eq('user_id', profile.id)
    .single();

  if (!patient) {
    redirect('/');
  }

  // Fetch claims from Supabase
  let initialClaims: Claim[] = [];
  try {
    const { data: claimsData } = await supabase
      .from('claims')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (claimsData && claimsData.length > 0) {
      initialClaims = claimsData as Claim[];
    }
  } catch (err) {
    console.error('Failed to query claims table:', err);
  }

  // Fetch credit from Supabase
  let initialCredit: PatientCredit | null = null;
  try {
    const { data: creditData } = await supabase
      .from('patient_credit')
      .select('*')
      .eq('patient_id', patient.id)
      .single();

    if (creditData) {
      initialCredit = creditData as PatientCredit;
    }
  } catch (err) {
    console.error('Failed to query patient_credit table:', err);
  }

  return (
    <FinHealthClient
      initialClaims={initialClaims}
      initialCredit={
        initialCredit || {
          patient_id: patient.id,
          credit_limit: 50000,
          used_amount: 14200,
        }
      }
      patientCode={patient.deidentified_code}
      patientName={profile.name}
      patientId={patient.id}
    />
  );
}
