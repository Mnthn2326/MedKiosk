/**
 * @file lib/signup.ts
 *
 * Core business logic, role validation, invitation verification,
 * and profile payload helpers for MedNotes account registration (AUTH-02).
 */

export const PUBLIC_REGISTRATION_ROLES = ['patient', 'lab', 'diagnostic_center'] as const;
export const PRIVILEGED_ROLES = ['doctor', 'admin'] as const;

export type PublicRole = (typeof PUBLIC_REGISTRATION_ROLES)[number];
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];
export type AppRole = PublicRole | PrivilegedRole;

/** Default pre-authorized doctor verification codes for testing and initial medical provisioning */
export const VALID_DOCTOR_INVITATION_CODES = new Set([
  'MEDNOTES-DOC-VERIFIED',
  'DOC-INVITE-2026',
  'CLINICAL-PARTNER-456',
]);

/**
 * Checks whether a role can be self-assigned through public registration.
 */
export function isPublicRole(role: string): boolean {
  return (PUBLIC_REGISTRATION_ROLES as readonly string[]).includes(role);
}

/**
 * Validates whether a doctor invitation code is valid.
 */
export function verifyDoctorInvitation(
  invitationCode?: string | null,
  _email?: string | null
): boolean {
  if (!invitationCode || typeof invitationCode !== 'string') return false;

  const normalized = invitationCode.trim().toUpperCase();

  // Check against server environment variable if defined
  const envCode = process.env.DOCTOR_INVITATION_CODE;
  if (envCode && normalized === envCode.trim().toUpperCase()) {
    return true;
  }

  return VALID_DOCTOR_INVITATION_CODES.has(normalized);
}

/**
 * Evaluates role assignment eligibility for an incoming signup request.
 * Enforces server-side authorization boundaries.
 */
export function validateRoleAssignment(
  role: string,
  invitationCode?: string | null
): { allowed: boolean; reason?: string } {
  if (!role || typeof role !== 'string') {
    return { allowed: false, reason: 'A valid role is required.' };
  }

  // Admin cannot be self-assigned under any circumstances
  if (role === 'admin') {
    return {
      allowed: false,
      reason: 'Administrative accounts cannot be self-assigned.',
    };
  }

  // Doctor accounts require verified invitation / administrative provisioning
  if (role === 'doctor') {
    if (!invitationCode || !invitationCode.trim()) {
      return {
        allowed: false,
        reason: 'Doctor registration requires a verified invitation code.',
      };
    }

    if (!verifyDoctorInvitation(invitationCode)) {
      return {
        allowed: false,
        reason: 'The provided doctor invitation code is invalid or expired.',
      };
    }

    return { allowed: true };
  }

  // Public roles
  if (isPublicRole(role)) {
    return { allowed: true };
  }

  return { allowed: false, reason: `Invalid role: ${role}` };
}

/**
 * Generates a unique de-identified patient tracking code (e.g. MK-A1B2C3D4).
 */
export function generateDeidentifiedCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'MK-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface SignupProfilePayloads {
  user: {
    auth_id: string;
    role: string;
    name: string;
    email: string;
  };
  patient?: {
    user_id?: string;
    deidentified_code: string;
  };
  contributor?: {
    user_id?: string;
    type: string;
    domain: string;
    verified_id: string;
  };
}

/**
 * Builds standard database profile payloads for atomic insertion.
 */
export function buildProfilePayloads({
  authUserId,
  name,
  email,
  role,
  domain,
  verifiedId,
}: {
  authUserId: string;
  name: string;
  email: string;
  role: string;
  domain?: string | null;
  verifiedId?: string | null;
}): SignupProfilePayloads {
  const user = {
    auth_id: authUserId,
    role,
    name: name.trim(),
    email: email.trim().toLowerCase(),
  };

  if (role === 'patient') {
    return {
      user,
      patient: {
        deidentified_code: generateDeidentifiedCode(),
      },
    };
  }

  return {
    user,
    contributor: {
      type: role,
      domain: domain?.trim() || '',
      verified_id: verifiedId?.trim() || '',
    },
  };
}
