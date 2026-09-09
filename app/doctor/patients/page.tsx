import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DoctorPatientsClient from './DoctorPatientsClient';

export default async function DoctorPatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all patients (doctor sees deidentified_code only, never real names)
  const { data: patients } = await supabase
    .from('patients')
    .select('id, deidentified_code, gender, dob');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Patients</h1>
      <DoctorPatientsClient patients={patients || []} />
    </div>
  );
}
