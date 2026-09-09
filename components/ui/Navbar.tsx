'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';

interface NavbarProps {
  role?: UserRole;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ role, userName }) => {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight">MediKiosk+</span>
            </Link>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {role === 'patient' && (
                <>
                  <Link href="/patient/timeline" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-light hover:text-primary transition-colors">Timeline</Link>
                  <Link href="/patient/chat" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-light hover:text-primary transition-colors">Chat</Link>
                </>
              )}
              {role === 'doctor' && (
                <Link href="/doctor/patients" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-light hover:text-primary transition-colors">Patients</Link>
              )}
              {(role === 'lab' || role === 'diagnostic_center') && (
                <Link href="/contributor/add-event" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-light hover:text-primary transition-colors">Add Event</Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {userName && <span className="text-sm hidden sm:block">Hello, {userName}</span>}
            <button
              onClick={handleSignOut}
              className="text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
