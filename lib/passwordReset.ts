/**
 * @file lib/passwordReset.ts
 *
 * Password reset validation and policy enforcement (AUTH-06).
 * Enforces an 8-character minimum password length and confirmation matching
 * across client and server contexts, maintaining consistency with the application's
 * password policy without silently trimming or altering user credentials.
 */

import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Shared password schema enforcing the canonical minimum length policy.
 * Does NOT trim or alter passwords to allow intentional whitespace/passphrases.
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

/**
 * Zod schema for password reset forms and payloads.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface PasswordResetValidationResult {
  valid: boolean;
  error?: string;
  field?: 'password' | 'confirmPassword';
}

/**
 * Validates password reset inputs against application password security rules.
 * - Rejects non-string, null, or undefined inputs.
 * - Rejects passwords with fewer than 8 characters.
 * - Rejects missing or empty confirmation passwords.
 * - Rejects mismatched confirmation passwords.
 * - Preserves password content without modification (no silent trimming or truncation).
 */
export function validatePasswordReset(
  password: unknown,
  confirmPassword: unknown
): PasswordResetValidationResult {
  if (typeof password !== 'string' || password.length === 0) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      field: 'password',
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      field: 'password',
    };
  }

  if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
    return {
      valid: false,
      error: 'Please confirm your password',
      field: 'confirmPassword',
    };
  }

  if (password !== confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match',
      field: 'confirmPassword',
    };
  }

  return { valid: true };
}
