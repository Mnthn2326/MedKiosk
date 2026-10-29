/**
 * @file lib/authRoutes.ts
 *
 * Core route definitions, safe redirect validation, and authorization navigation
 * logic for MedNotes middleware and auth callbacks (AUTH-01 & AUTH-05).
 * Ensures public authentication routes are accessible, protected application
 * areas are guarded, and open redirects to untrusted origins are strictly prevented.
 */

export const publicRoutes: readonly string[] = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth/callback',
  '/api/auth/signup',
];

export const roleRouteMap: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  lab: '/contributor',
  diagnostic_center: '/contributor',
};

/**
 * Checks whether a requested pathname matches any designated public route.
 * Matches exact paths or proper subpaths (e.g. `/forgot-password` or `/forgot-password/help`),
 * while preventing accidental matching of unrelated prefixed routes (e.g. `/login-admin`).
 */
export function isPublicRoute(pathname: string): boolean {
  if (!pathname || typeof pathname !== 'string') return false;

  const normalized = pathname.trim().toLowerCase();

  return publicRoutes.some((route) => {
    const lowerRoute = route.toLowerCase();
    return normalized === lowerRoute || normalized.startsWith(`${lowerRoute}/`);
  });
}

/**
 * Validates whether a target redirect destination is a safe, relative internal path.
 * Rejects external URLs, protocol-relative URLs, schemes (javascript, etc.),
 * backslash tricks, and encoded evasion techniques.
 */
export function isValidInternalRedirect(target: string | null | undefined): boolean {
  if (!target || typeof target !== 'string') return false;

  const trimmed = target.trim();
  if (!trimmed) return false;

  // 1. Must start with a single forward slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return false;
  }

  // 2. Reject backslashes (which browsers normalize to forward slashes, e.g. /\ or \\)
  if (trimmed.includes('\\')) {
    return false;
  }

  // 3. Reject any control characters, newlines, or tabs
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return false;
  }

  // 4. Decode URI components to catch encoded evasion attempts (e.g. %2f%2f, %5c)
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return false; // Malformed percent encoding
  }

  // Re-verify decoded content
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) {
    return false;
  }

  // 5. Reject URL schemes (e.g. javascript:, data:, http:, https:, vbscript:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  // 6. Parse against a strict dummy base URL using WHATWG URL parser
  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);

    // Host must remain strictly localhost
    if (parsed.host !== 'localhost' || parsed.origin !== dummyOrigin) {
      return false;
    }

    // Protocol must be http:
    if (parsed.protocol !== 'http:') {
      return false;
    }

    // Pathname must begin with a single '/'
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Normalizes and sanitizes a target redirect parameter.
 * Returns the validated internal destination or the safe fallback route.
 */
export function sanitizeRedirectPath(
  target: string | null | undefined,
  fallback = '/'
): string {
  if (isValidInternalRedirect(target)) {
    return target!.trim();
  }
  return fallback;
}

export interface AuthNavigationDecision {
  action: 'allow' | 'redirect';
  target?: string;
}

/**
 * Pure evaluation function for middleware routing decisions.
 * Used by middleware and verified by automated unit tests.
 */
export function resolveAuthNavigation({
  pathname,
  isAuthenticated,
  role,
}: {
  pathname: string;
  isAuthenticated: boolean;
  role?: string | null;
}): AuthNavigationDecision {
  // 1. Allow public routes unconditionally
  if (isPublicRoute(pathname)) {
    return { action: 'allow' };
  }

  // 2. Unauthenticated requests to protected routes redirect to /login
  if (!isAuthenticated) {
    return { action: 'redirect', target: '/login' };
  }

  // 3. Root path '/' delegates to page.tsx for role dispatching
  if (pathname === '/') {
    return { action: 'allow' };
  }

  // 4. Authenticated user without a profile role cannot proceed to role areas
  if (!role) {
    return { action: 'redirect', target: '/login' };
  }

  // 5. API routes perform their own granular authorization
  if (pathname.startsWith('/api')) {
    return { action: 'allow' };
  }

  // 6. Check role-based route protection
  const allowedPrefix = roleRouteMap[role];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return { action: 'redirect', target: allowedPrefix };
  }

  return { action: 'allow' };
}
