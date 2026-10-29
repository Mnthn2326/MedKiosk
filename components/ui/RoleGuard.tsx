'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';
import { evaluateRoleAccess, type RoleGuardStatus } from '@/lib/roleGuard';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback,
  redirectTo,
}) => {
  const [status, setStatus] = useState<RoleGuardStatus | 'loading'>('loading');
  const [, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          if (!isMounted) return;
          setStatus('error');
          setErrorMessage('Session lookup error');
          router.push(redirectTo || '/login?error=session_error');
          return;
        }

        if (!session?.user) {
          if (!isMounted) return;
          setStatus('unauthenticated');
          router.push(redirectTo || '/login');
          return;
        }

        // Authoritative query: users table matching auth_id = session.user.id
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, role')
          .eq('auth_id', session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        const evaluation = evaluateRoleAccess({
          isAuthenticated: true,
          userRole: profile?.role as UserRole | undefined,
          allowedRoles,
          error: profileError,
          customRedirect: redirectTo,
        });

        setStatus(evaluation.status);
        if (evaluation.errorMessage) {
          setErrorMessage(evaluation.errorMessage);
        }

        if (evaluation.status !== 'authorized') {
          // If fallback is provided for unauthorized state, display fallback instead of redirecting
          if (evaluation.status === 'unauthorized' && fallback) {
            return;
          }
          if (evaluation.redirectTarget) {
            router.push(evaluation.redirectTarget);
          }
        }
      } catch {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage('Unexpected authorization error');
        router.push(redirectTo || '/login?error=guard_error');
      }
    };

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles, redirectTo, router, supabase, fallback]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background" aria-label="Loading authentication">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (status === 'unauthorized' && fallback) {
    return <>{fallback}</>;
  }

  if (status !== 'authorized') {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
