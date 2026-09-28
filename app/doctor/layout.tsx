import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/ui/Sidebar';
import { DraftProvider } from '@/components/ui/GuardedLink';

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, name')
    .eq('auth_id', user.id)
    .single();

  if (!userData || userData.role !== 'doctor') {
    redirect('/');
  }

  return (
    <DraftProvider>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        <Sidebar role="doctor" userName={userData.name} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </DraftProvider>
  );
}
