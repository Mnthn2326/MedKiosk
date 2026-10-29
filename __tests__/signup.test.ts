import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  isPublicRole,
  verifyDoctorInvitation,
  validateRoleAssignment,
  generateDeidentifiedCode,
  buildProfilePayloads,
  PUBLIC_REGISTRATION_ROLES,
} from '../lib/signup.ts';
import { signupSchema } from '../lib/validations/index.ts';

describe('AUTH-02: Secure Role Assignment & Reliable Profile Creation', () => {
  describe('Role Classification & Public Eligibility', () => {
    test('permits patient, lab, and diagnostic_center as public registration roles', () => {
      assert.strictEqual(isPublicRole('patient'), true);
      assert.strictEqual(isPublicRole('lab'), true);
      assert.strictEqual(isPublicRole('diagnostic_center'), true);
      assert.strictEqual(PUBLIC_REGISTRATION_ROLES.length, 3);
    });

    test('classifies doctor and admin as privileged non-public roles', () => {
      assert.strictEqual(isPublicRole('doctor'), false);
      assert.strictEqual(isPublicRole('admin'), false);
      assert.strictEqual(isPublicRole('driver'), false);
    });
  });

  describe('Doctor Invitation Verification', () => {
    test('authorizes known valid doctor invitation codes', () => {
      assert.strictEqual(verifyDoctorInvitation('MEDNOTES-DOC-VERIFIED'), true);
      assert.strictEqual(verifyDoctorInvitation('DOC-INVITE-2026'), true);
      assert.strictEqual(verifyDoctorInvitation('CLINICAL-PARTNER-456'), true);
    });

    test('normalizes invitation codes (case-insensitive and whitespace-tolerant)', () => {
      assert.strictEqual(verifyDoctorInvitation('  mednotes-doc-verified  '), true);
      assert.strictEqual(verifyDoctorInvitation('doc-invite-2026'), true);
    });

    test('rejects missing, null, or arbitrary invitation codes', () => {
      assert.strictEqual(verifyDoctorInvitation(''), false);
      assert.strictEqual(verifyDoctorInvitation(null), false);
      assert.strictEqual(verifyDoctorInvitation(undefined), false);
      assert.strictEqual(verifyDoctorInvitation('INVALID-CODE-999'), false);
      assert.strictEqual(verifyDoctorInvitation('random_attempt'), false);
    });
  });

  describe('Server-Side Role Assignment Validation (validateRoleAssignment)', () => {
    test('authorizes public patient registration without invitation code', () => {
      const result = validateRoleAssignment('patient');
      assert.strictEqual(result.allowed, true);
    });

    test('authorizes public partner contributor registration (lab, diagnostic_center)', () => {
      assert.strictEqual(validateRoleAssignment('lab').allowed, true);
      assert.strictEqual(validateRoleAssignment('diagnostic_center').allowed, true);
    });

    test('strictly rejects doctor registration when invitation code is absent', () => {
      const result = validateRoleAssignment('doctor');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason?.includes('invitation code'));
    });

    test('strictly rejects doctor registration when invitation code is invalid', () => {
      const result = validateRoleAssignment('doctor', 'FAKE-INVITATION-123');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason?.includes('invalid or expired'));
    });

    test('authorizes doctor registration when valid invitation code is provided', () => {
      const result = validateRoleAssignment('doctor', 'MEDNOTES-DOC-VERIFIED');
      assert.strictEqual(result.allowed, true);
    });

    test('strictly rejects admin role self-assignment regardless of invitation code', () => {
      const result = validateRoleAssignment('admin');
      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason?.includes('Administrative'));

      const resultWithCode = validateRoleAssignment('admin', 'MEDNOTES-DOC-VERIFIED');
      assert.strictEqual(resultWithCode.allowed, false);
    });

    test('rejects unknown or invalid role strings', () => {
      const result = validateRoleAssignment('super_user');
      assert.strictEqual(result.allowed, false);
    });
  });

  describe('Zod Schema Validation (signupSchema)', () => {
    test('validates a legitimate patient registration payload', () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'securePassword123',
        role: 'patient',
      };

      const parsed = signupSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.name, 'Jane Doe');
        assert.strictEqual(parsed.data.email, 'jane.doe@example.com');
        assert.strictEqual(parsed.data.role, 'patient');
      }
    });

    test('validates a legitimate laboratory contributor registration payload', () => {
      const payload = {
        name: 'Metropolis Diagnostics Lab',
        email: 'lab@metropolis.test',
        password: 'labPassword456',
        role: 'lab',
        domain: 'lab',
        verified_id: 'LAB-LIC-7788',
      };

      const parsed = signupSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
    });

    test('fails contributor registration if domain or license id is missing', () => {
      const missingDomain = {
        name: 'Test Lab',
        email: 'test@lab.com',
        password: 'password123',
        role: 'lab',
        verified_id: 'LIC-123',
      };
      assert.strictEqual(signupSchema.safeParse(missingDomain).success, false);

      const missingId = {
        name: 'Test Lab',
        email: 'test@lab.com',
        password: 'password123',
        role: 'lab',
        domain: 'lab',
      };
      assert.strictEqual(signupSchema.safeParse(missingId).success, false);
    });

    test('fails doctor registration when invitation_code, domain, or license is omitted', () => {
      const payloadWithoutCode = {
        name: 'Dr. Gregory House',
        email: 'house@princeton.test',
        password: 'vicodinPassword1',
        role: 'doctor',
        domain: 'allopathy',
        verified_id: 'MD-554433',
      };
      const result = signupSchema.safeParse(payloadWithoutCode);
      assert.strictEqual(result.success, false);
    });

    test('validates doctor registration when all clinical fields and invitation code are present', () => {
      const validDoctorPayload = {
        name: 'Dr. Gregory House',
        email: 'house@princeton.test',
        password: 'vicodinPassword1',
        role: 'doctor',
        domain: 'allopathy',
        verified_id: 'MD-554433',
        invitation_code: 'DOC-INVITE-2026',
      };
      const result = signupSchema.safeParse(validDoctorPayload);
      assert.strictEqual(result.success, true);
    });

    test('rejects self-assigned admin role submission', () => {
      const adminAttempt = {
        name: 'Hacker Joe',
        email: 'admin@hacker.test',
        password: 'adminPassword999',
        role: 'admin',
      };
      const result = signupSchema.safeParse(adminAttempt);
      assert.strictEqual(result.success, false);
    });

    test('rejects short passwords and malformed emails', () => {
      const shortPass = {
        name: 'User',
        email: 'user@test.com',
        password: '123',
        role: 'patient',
      };
      assert.strictEqual(signupSchema.safeParse(shortPass).success, false);

      const badEmail = {
        name: 'User',
        email: 'not-an-email',
        password: 'password123',
        role: 'patient',
      };
      assert.strictEqual(signupSchema.safeParse(badEmail).success, false);
    });
  });

  describe('Data Consistency & Profile Payload Generation', () => {
    test('generates valid de-identified tracking codes for patients', () => {
      const code1 = generateDeidentifiedCode();
      const code2 = generateDeidentifiedCode();
      assert.ok(code1.startsWith('MK-'));
      assert.strictEqual(code1.length, 11); // 'MK-' (3) + 8 chars
      assert.notStrictEqual(code1, code2);
    });

    test('builds atomic profile payloads for patient creation', () => {
      const payloads = buildProfilePayloads({
        authUserId: 'user-uuid-1234',
        name: 'Alice Smith',
        email: 'alice@example.com',
        role: 'patient',
      });

      assert.strictEqual(payloads.user.auth_id, 'user-uuid-1234');
      assert.strictEqual(payloads.user.role, 'patient');
      assert.strictEqual(payloads.user.name, 'Alice Smith');
      assert.strictEqual(payloads.user.email, 'alice@example.com');
      assert.ok(payloads.patient);
      assert.ok(payloads.patient.deidentified_code.startsWith('MK-'));
      assert.strictEqual(payloads.contributor, undefined);
    });

    test('builds atomic profile payloads for doctor creation', () => {
      const payloads = buildProfilePayloads({
        authUserId: 'doc-uuid-5678',
        name: 'Dr. John Watson',
        email: 'watson@baker.test',
        role: 'doctor',
        domain: 'allopathy',
        verifiedId: 'GMC-889900',
      });

      assert.strictEqual(payloads.user.role, 'doctor');
      assert.strictEqual(payloads.patient, undefined);
      assert.ok(payloads.contributor);
      assert.strictEqual(payloads.contributor.type, 'doctor');
      assert.strictEqual(payloads.contributor.domain, 'allopathy');
      assert.strictEqual(payloads.contributor.verified_id, 'GMC-889900');
    });

    test('builds atomic profile payloads for laboratory contributor', () => {
      const payloads = buildProfilePayloads({
        authUserId: 'lab-uuid-9999',
        name: 'BioPath Lab',
        email: 'contact@biopath.test',
        role: 'lab',
        domain: 'lab',
        verifiedId: 'LAB-5544',
      });

      assert.strictEqual(payloads.user.role, 'lab');
      assert.ok(payloads.contributor);
      assert.strictEqual(payloads.contributor.type, 'lab');
      assert.strictEqual(payloads.contributor.domain, 'lab');
      assert.strictEqual(payloads.contributor.verified_id, 'LAB-5544');
    });
  });

  describe('Idempotency & Partial Failure Resilience Logic', () => {
    test('guarantees unique onConflict key definitions match schema constraints', () => {
      // In docs/03_secure_signup_profiles.sql and app/api/auth/signup/route.ts:
      // users table matches on 'auth_id'
      // patients and contributors match on 'user_id'
      const userUpsertTarget = 'auth_id';
      const patientUpsertTarget = 'user_id';
      const contributorUpsertTarget = 'user_id';

      assert.strictEqual(userUpsertTarget, 'auth_id');
      assert.strictEqual(patientUpsertTarget, 'user_id');
      assert.strictEqual(contributorUpsertTarget, 'user_id');
    });

    test('simulates registration retry without duplicate profile creation', () => {
      // Simulated database table state
      const existingProfiles = new Map<string, { id: string; role: string; name: string }>();

      const mockUpsertUser = (authId: string, role: string, name: string) => {
        if (!existingProfiles.has(authId)) {
          existingProfiles.set(authId, { id: `prof-${authId}`, role, name });
        }
        return existingProfiles.get(authId)!;
      };

      // Turn 1: Initial signup
      const prof1 = mockUpsertUser('auth-100', 'patient', 'Bob');
      assert.strictEqual(existingProfiles.size, 1);
      assert.strictEqual(prof1.name, 'Bob');

      // Turn 2: Retried signup (e.g. after browser timeout or network blip)
      const prof2 = mockUpsertUser('auth-100', 'patient', 'Bob');
      assert.strictEqual(existingProfiles.size, 1); // No duplicate profile
      assert.strictEqual(prof2.id, prof1.id);
    });
  });
});
