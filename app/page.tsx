import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user role and redirect to appropriate dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  switch (profile.role) {
    case 'patient':
      redirect('/patient/timeline');
    case 'doctor':
      redirect('/doctor/patients');
    case 'lab':
    case 'diagnostic_center':
      redirect('/contributor/add-event');
    default:
      redirect('/login');
  }
}
