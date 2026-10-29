import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  evaluateRoleAccess,
} from '../lib/roleGuard.ts';
import type { UserRole } from '../types/database.ts';

describe('AUTH-04: RoleGuard Identity Resolution & Client Access Control', () => {
  describe('Identity Resolution & Profile Mapping', () => {
    test('resolves an authorized patient role successfully', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'patient',
        allowedRoles: ['patient'],
      });

      assert.strictEqual(result.status, 'authorized');
      assert.strictEqual(result.role, 'patient');
      assert.strictEqual(result.redirectTarget, undefined);
    });

    test('resolves an authorized doctor role successfully', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'doctor',
        allowedRoles: ['doctor'],
      });

      assert.strictEqual(result.status, 'authorized');
      assert.strictEqual(result.role, 'doctor');
    });

    test('resolves authorized contributor roles (lab, diagnostic_center)', () => {
      const labResult = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'lab',
        allowedRoles: ['lab', 'diagnostic_center', 'doctor'],
      });
      assert.strictEqual(labResult.status, 'authorized');

      const diagResult = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'diagnostic_center',
        allowedRoles: ['lab', 'diagnostic_center'],
      });
      assert.strictEqual(diagResult.status, 'authorized');
    });

    test('handles missing application profile safely without crashing or granting access', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: null, // User has an auth session, but no row in public.users
        allowedRoles: ['patient', 'doctor'],
      });

      assert.strictEqual(result.status, 'missing_profile');
      assert.strictEqual(result.role, undefined);
      assert.strictEqual(result.redirectTarget, '/login?error=profile_not_found');
      assert.ok(result.errorMessage?.includes('Account profile could not be found'));
    });

    test('handles database error explicitly without granting access', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'doctor', // Even if some client state claims doctor
        allowedRoles: ['doctor'],
        error: new Error('Postgres connection timeout'),
      });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.redirectTarget, '/login?error=auth_lookup_failed');
      assert.ok(result.errorMessage?.includes('database error'));
    });
  });

  describe('Access Control & Unauthenticated Rejection', () => {
    test('denies unauthenticated users from viewing protected content and targets /login', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: false,
        userRole: null,
        allowedRoles: ['patient'],
      });

      assert.strictEqual(result.status, 'unauthenticated');
      assert.strictEqual(result.redirectTarget, '/login');
      assert.ok(result.errorMessage?.includes('signed in'));
    });

    test('denies unauthorized patient attempting to access doctor-only section', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'patient',
        allowedRoles: ['doctor'],
      });

      assert.strictEqual(result.status, 'unauthorized');
      assert.strictEqual(result.role, 'patient');
      // Must redirect to patient's authorized area, not create a loop
      assert.strictEqual(result.redirectTarget, '/patient');
    });

    test('denies unauthorized doctor attempting to access patient-only section', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'doctor',
        allowedRoles: ['patient'],
      });

      assert.strictEqual(result.status, 'unauthorized');
      assert.strictEqual(result.role, 'doctor');
      // Must redirect to doctor's authorized area
      assert.strictEqual(result.redirectTarget, '/doctor');
    });

    test('denies unauthorized contributor attempting to access doctor consultation workspace', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'lab',
        allowedRoles: ['doctor'],
      });

      assert.strictEqual(result.status, 'unauthorized');
      assert.strictEqual(result.role, 'lab');
      assert.strictEqual(result.redirectTarget, '/contributor');
    });
  });

  describe('Custom Redirects and Loop Prevention', () => {
    test('respects custom redirect target when specified', () => {
      const result = evaluateRoleAccess({
        isAuthenticated: false,
        allowedRoles: ['patient'],
        customRedirect: '/custom-landing',
      });

      assert.strictEqual(result.redirectTarget, '/custom-landing');
    });

    test('prevents redirect loops by never targeting the guarded page itself', () => {
      const resultUnauthorized = evaluateRoleAccess({
        isAuthenticated: true,
        userRole: 'patient',
        allowedRoles: ['doctor'],
      });

      // Target must be a safe known root or role home
      assert.notStrictEqual(resultUnauthorized.redirectTarget, '/doctor/patients');
      assert.strictEqual(resultUnauthorized.redirectTarget, '/patient');
    });
  });

  describe('Integration with Identity Model Constants', () => {
    test('internal application ID is distinct from auth UUID representation', () => {
      // In MedNotes data model:
      // auth_id = Supabase Auth UUID (session.user.id)
      // id = Internal users.id UUID (profile.id)
      const mockSession = { user: { id: 'auth-session-uuid-1111' } };
      const mockProfile = { id: 'internal-user-uuid-9999', auth_id: 'auth-session-uuid-1111', role: 'doctor' as UserRole };

      assert.notStrictEqual(mockSession.user.id, mockProfile.id);
      assert.strictEqual(mockSession.user.id, mockProfile.auth_id);
    });
  });
});
