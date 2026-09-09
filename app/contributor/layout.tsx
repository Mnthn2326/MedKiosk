import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/ui/Navbar';

export default async function ContributorLayout({
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

  if (!userData || !['lab', 'diagnostic_center', 'doctor'].includes(userData.role)) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={userData.role} userName={userData.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
