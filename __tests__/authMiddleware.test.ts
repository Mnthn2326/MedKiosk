import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  publicRoutes,
  roleRouteMap,
  isPublicRoute,
  resolveAuthNavigation,
} from '../lib/authRoutes.ts';

describe('AUTH-01: Public Route Access & Middleware Authorization', () => {
  describe('publicRoutes configuration', () => {
    test('includes /forgot-password in the publicRoutes list', () => {
      assert.ok(
        publicRoutes.includes('/forgot-password'),
        'publicRoutes must explicitly contain /forgot-password'
      );
    });

    test('includes /reset-password in the publicRoutes list', () => {
      assert.ok(
        publicRoutes.includes('/reset-password'),
        'publicRoutes must explicitly contain /reset-password'
      );
    });

    test('preserves existing public routes (/login, /signup, /api/auth/callback)', () => {
      assert.ok(publicRoutes.includes('/login'));
      assert.ok(publicRoutes.includes('/signup'));
      assert.ok(publicRoutes.includes('/api/auth/callback'));
    });
  });

  describe('isPublicRoute matcher', () => {
    test('matches exact canonical public routes', () => {
      assert.strictEqual(isPublicRoute('/login'), true);
      assert.strictEqual(isPublicRoute('/signup'), true);
      assert.strictEqual(isPublicRoute('/forgot-password'), true);
      assert.strictEqual(isPublicRoute('/reset-password'), true);
      assert.strictEqual(isPublicRoute('/api/auth/callback'), true);
    });

    test('matches public routes with trailing slashes', () => {
      assert.strictEqual(isPublicRoute('/forgot-password/'), true);
      assert.strictEqual(isPublicRoute('/reset-password/'), true);
      assert.strictEqual(isPublicRoute('/login/'), true);
      assert.strictEqual(isPublicRoute('/signup/'), true);
    });

    test('matches public routes case-insensitively with whitespace handling', () => {
      assert.strictEqual(isPublicRoute('/Forgot-Password'), true);
      assert.strictEqual(isPublicRoute('/RESET-PASSWORD'), true);
      assert.strictEqual(isPublicRoute('  /login  '), true);
    });

    test('matches intended nested subpaths under public routes', () => {
      assert.strictEqual(isPublicRoute('/forgot-password/sent'), true);
      assert.strictEqual(isPublicRoute('/reset-password/confirmation'), true);
      assert.strictEqual(isPublicRoute('/api/auth/callback/verify'), true);
    });

    test('does NOT match unrelated routes that share a prefix collision', () => {
      // Prevents accidental exposure of protected routes
      assert.strictEqual(isPublicRoute('/forgot-password-admin'), false);
      assert.strictEqual(isPublicRoute('/reset-password-test'), false);
      assert.strictEqual(isPublicRoute('/login-admin'), false);
      assert.strictEqual(isPublicRoute('/signup-internal'), false);
      assert.strictEqual(isPublicRoute('/api/auth/callback-internal'), false);
    });

    test('does NOT match protected routes', () => {
      assert.strictEqual(isPublicRoute('/patient/timeline'), false);
      assert.strictEqual(isPublicRoute('/patient/chat'), false);
      assert.strictEqual(isPublicRoute('/doctor/patients'), false);
      assert.strictEqual(isPublicRoute('/contributor/add-event'), false);
      assert.strictEqual(isPublicRoute('/admin'), false);
      assert.strictEqual(isPublicRoute('/api/clinical-events'), false);
    });

    test('handles empty, null, or undefined values safely without crashing', () => {
      assert.strictEqual(isPublicRoute(''), false);
      assert.strictEqual(isPublicRoute(null as unknown as string), false);
      assert.strictEqual(isPublicRoute(undefined as unknown as string), false);
    });
  });

  describe('resolveAuthNavigation: Unauthenticated Access', () => {
    test('allows unauthenticated access to /forgot-password', () => {
      const decision = resolveAuthNavigation({
        pathname: '/forgot-password',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('allows unauthenticated access to /reset-password', () => {
      const decision = resolveAuthNavigation({
        pathname: '/reset-password',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('allows unauthenticated access to /login, /signup, and /api/auth/callback', () => {
      assert.strictEqual(
        resolveAuthNavigation({ pathname: '/login', isAuthenticated: false }).action,
        'allow'
      );
      assert.strictEqual(
        resolveAuthNavigation({ pathname: '/signup', isAuthenticated: false }).action,
        'allow'
      );
      assert.strictEqual(
        resolveAuthNavigation({ pathname: '/api/auth/callback', isAuthenticated: false }).action,
        'allow'
      );
    });

    test('redirects unauthenticated users attempting to access protected patient routes to /login', () => {
      const decision = resolveAuthNavigation({
        pathname: '/patient/timeline',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/login');
    });

    test('redirects unauthenticated users attempting to access protected doctor routes to /login', () => {
      const decision = resolveAuthNavigation({
        pathname: '/doctor/patients',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/login');
    });

    test('redirects unauthenticated users attempting to access protected contributor routes to /login', () => {
      const decision = resolveAuthNavigation({
        pathname: '/contributor/add-event',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/login');
    });

    test('redirects unauthenticated users attempting to access protected admin routes to /login', () => {
      const decision = resolveAuthNavigation({
        pathname: '/admin/audit',
        isAuthenticated: false,
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/login');
    });
  });

  describe('resolveAuthNavigation: Authenticated Role-Based Access', () => {
    test('allows patient to access /patient routes', () => {
      const decision = resolveAuthNavigation({
        pathname: '/patient/timeline',
        isAuthenticated: true,
        role: 'patient',
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('redirects patient attempting to access /doctor routes to /patient', () => {
      const decision = resolveAuthNavigation({
        pathname: '/doctor/patients',
        isAuthenticated: true,
        role: 'patient',
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/patient');
    });

    test('allows doctor to access /doctor routes', () => {
      const decision = resolveAuthNavigation({
        pathname: '/doctor/patients',
        isAuthenticated: true,
        role: 'doctor',
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('redirects doctor attempting to access /patient routes to /doctor', () => {
      const decision = resolveAuthNavigation({
        pathname: '/patient/timeline',
        isAuthenticated: true,
        role: 'doctor',
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/doctor');
    });

    test('allows lab contributor to access /contributor routes', () => {
      const decision = resolveAuthNavigation({
        pathname: '/contributor/add-event',
        isAuthenticated: true,
        role: 'lab',
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('allows diagnostic_center contributor to access /contributor routes', () => {
      const decision = resolveAuthNavigation({
        pathname: '/contributor/add-event',
        isAuthenticated: true,
        role: 'diagnostic_center',
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('redirects contributor attempting to access /doctor routes to /contributor', () => {
      const decision = resolveAuthNavigation({
        pathname: '/doctor/patients',
        isAuthenticated: true,
        role: 'lab',
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/contributor');
    });

    test('redirects authenticated user without profile to /login', () => {
      const decision = resolveAuthNavigation({
        pathname: '/doctor/patients',
        isAuthenticated: true,
        role: null,
      });
      assert.strictEqual(decision.action, 'redirect');
      assert.strictEqual(decision.target, '/login');
    });

    test('allows root route "/" to pass through to app/page.tsx', () => {
      const decision = resolveAuthNavigation({
        pathname: '/',
        isAuthenticated: true,
        role: 'patient',
      });
      assert.strictEqual(decision.action, 'allow');
    });

    test('allows API routes to pass through to route handlers', () => {
      const decision = resolveAuthNavigation({
        pathname: '/api/clinical-events',
        isAuthenticated: true,
        role: 'patient',
      });
      assert.strictEqual(decision.action, 'allow');
    });
  });

  describe('Password Recovery Lifecycle Scenarios', () => {
    test('unauthenticated user can enter recovery lifecycle via /forgot-password', () => {
      const step1 = resolveAuthNavigation({
        pathname: '/forgot-password',
        isAuthenticated: false,
      });
      assert.strictEqual(step1.action, 'allow');
    });

    test('user arriving with reset code at /api/auth/callback is allowed without redirect loop', () => {
      const step2 = resolveAuthNavigation({
        pathname: '/api/auth/callback',
        isAuthenticated: false,
      });
      assert.strictEqual(step2.action, 'allow');
    });

    test('user in recovery session can access /reset-password without role-based dashboard redirection', () => {
      // Even if the user is authenticated as a doctor or patient during recovery session,
      // /reset-password is a public route and must not be hijacked by allowedPrefix redirection.
      const step3Doctor = resolveAuthNavigation({
        pathname: '/reset-password',
        isAuthenticated: true,
        role: 'doctor',
      });
      assert.strictEqual(step3Doctor.action, 'allow');

      const step3Patient = resolveAuthNavigation({
        pathname: '/reset-password',
        isAuthenticated: true,
        role: 'patient',
      });
      assert.strictEqual(step3Patient.action, 'allow');
    });
  });
});
