import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DoctorPatientsClient from './DoctorPatientsClient';
import { getAuthorizedPatientsForDoctor } from '@/lib/canvasAccess';

export default async function DoctorPatientsPage() {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Verify doctor role and resolve internal user ID
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!profile || profile.role !== 'doctor') {
    redirect('/login');
  }

  // 3. Fetch strictly authorized patients with active, non-revoked access grants
  const patients = await getAuthorizedPatientsForDoctor(supabase, profile.id);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Patients</h1>
      <DoctorPatientsClient patients={patients} />
    </div>
  );
}
