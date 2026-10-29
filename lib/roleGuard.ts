/**
 * @file lib/roleGuard.ts
 *
 * Authoritative evaluation helper for UI RoleGuard and client-side access control (AUTH-04).
 * Ensures strict mapping to the canonical `users` table identity model.
 */

import { roleRouteMap } from './authRoutes.ts';
import type { UserRole } from '../types/database.ts';

export type RoleGuardStatus =
  | 'authorized'
  | 'unauthorized'
  | 'unauthenticated'
  | 'missing_profile'
  | 'error';

export interface RoleEvaluationResult {
  status: RoleGuardStatus;
  role?: UserRole;
  redirectTarget?: string;
  errorMessage?: string;
}

/**
 * Pure evaluation function for client role-based access gating.
 */
export function evaluateRoleAccess({
  isAuthenticated,
  userRole,
  allowedRoles,
  error,
  customRedirect,
}: {
  isAuthenticated: boolean;
  userRole?: UserRole | string | null;
  allowedRoles: (UserRole | string)[];
  error?: unknown;
  customRedirect?: string;
}): RoleEvaluationResult {
  // 1. If an unhandled database error occurred, never silently authorize
  if (error) {
    return {
      status: 'error',
      redirectTarget: customRedirect || '/login?error=auth_lookup_failed',
      errorMessage: 'Failed to verify account permissions due to a database error.',
    };
  }

  // 2. Unauthenticated user must not see protected content
  if (!isAuthenticated) {
    return {
      status: 'unauthenticated',
      redirectTarget: customRedirect || '/login',
      errorMessage: 'You must be signed in to view this content.',
    };
  }

  // 3. User authenticated in Supabase Auth but missing public.users record
  if (!userRole) {
    return {
      status: 'missing_profile',
      redirectTarget: customRedirect || '/login?error=profile_not_found',
      errorMessage: 'Account profile could not be found. Please complete registration.',
    };
  }

  const role = userRole as UserRole;

  // 4. Authorized role matches guard
  if (allowedRoles.includes(role)) {
    return {
      status: 'authorized',
      role,
    };
  }

  // 5. Authenticated but unauthorized for this specific role area
  const authorizedDestination = roleRouteMap[role] || '/';
  return {
    status: 'unauthorized',
    role,
    redirectTarget: customRedirect || authorizedDestination,
    errorMessage: `Access denied. Role "${role}" is not authorized for this section.`,
  };
}
