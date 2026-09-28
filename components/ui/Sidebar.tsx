'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { GuardedLink } from '@/components/ui/GuardedLink';

interface SidebarProps {
  role?: UserRole;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, userName }) => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('mednotes_sidebar_collapsed');
    if (stored === 'true') {
      setCollapsed(true);
    }
    
    // App-start sweep deleting expired or other-user drafts
    const sweepDrafts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('draft:v1:')) {
            const val = localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val);
              const parts = key.split(':');
              const draftUserId = parts[2];
              
              // Clear if expired (> 24h) or belongs to a different user
              if (
                Date.now() - parsed.savedAt > 86400000 ||
                (currentUserId && draftUserId !== currentUserId)
              ) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      } catch (e) {
        console.error('Draft sweep failed', e);
      }
    };
    sweepDrafts();
  }, [supabase]);

  const toggleCollapse = () => {
    const val = !collapsed;
    setCollapsed(val);
    localStorage.setItem('mednotes_sidebar_collapsed', String(val));
  };

  const handleSignOut = async () => {
    // Clear drafts on logout
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft:v1:')) {
        localStorage.removeItem(key);
      }
    }
    
    await supabase.auth.signOut();
    router.push('/login');
  };

  const links: Array<{ href: string; label: string; icon: IconName }> = [];
  if (role === 'patient') {
    links.push({ href: '/patient/timeline', label: 'My Timeline', icon: 'notes' });
    links.push({ href: '/patient/chat', label: 'AI Chat', icon: 'chat' });
  } else if (role === 'doctor') {
    links.push({ href: '/doctor/patients', label: 'Patients', icon: 'diagnosis' });
  } else if (role === 'lab' || role === 'diagnostic_center') {
    links.push({ href: '/contributor/add-event', label: 'Add Event', icon: 'lab' });
  }

  // Prevent hydration mismatch on the first render for `collapsed` state
  const isCollapsed = mounted ? collapsed : false;

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Icon name="diagnosis" size={24} />
          MediKiosk+
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -mr-2 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-primary text-white transition-all duration-300 z-50 flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64 w-64'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 h-16">
          <GuardedLink href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Icon name="diagnosis" size={24} className="shrink-0" />
            <span className={`font-bold text-xl transition-opacity duration-300 ${isCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
              MediKiosk+
            </span>
          </GuardedLink>
          {/* Desktop collapse toggle */}
          <button 
            onClick={toggleCollapse} 
            className="hidden md:flex p-1.5 hover:bg-white/10 rounded-lg shrink-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto overflow-x-hidden">
          {links.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <GuardedLink
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap overflow-hidden ${
                  active ? 'bg-white/20 text-white font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon name={link.icon} size={20} className="shrink-0" />
                <span className={`transition-opacity duration-300 ${isCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
                  {link.label}
                </span>
              </GuardedLink>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-between'}`}>
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>
              <span className="text-sm font-medium text-white truncate max-w-[140px]">{userName}</span>
              <span className="text-xs text-white/60 capitalize">{role?.replace('_', ' ')}</span>
            </div>
            <button
              onClick={handleSignOut}
              className={`p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white shrink-0 ${isCollapsed ? 'md:w-full md:flex md:justify-center' : ''}`}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
