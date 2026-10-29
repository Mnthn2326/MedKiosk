import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EmergencyClient from './EmergencyClient';

export const metadata = {
  title: 'Emergency SOS & Live Dispatch | MediKiosk+',
  description: 'Instant trauma dispatch with live GPS ambulance tracking',
};

export default async function EmergencyPage() {
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

  return (
    <EmergencyClient
      patientCode={patient.deidentified_code}
      patientName={profile.name}
      patientId={patient.id}
    />
  );
}
