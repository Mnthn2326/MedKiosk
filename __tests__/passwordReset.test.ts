import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  resetPasswordSchema,
  validatePasswordReset,
} from '../lib/passwordReset.ts';

describe('AUTH-06: Enforce Minimum Password Length in Password Reset', () => {
  describe('Password Policy Configuration', () => {
    test('enforces MIN_PASSWORD_LENGTH of 8 characters', () => {
      assert.strictEqual(MIN_PASSWORD_LENGTH, 8);
    });
  });

  describe('Password Length Below 8 Characters (Rejection)', () => {
    test('rejects empty password string', () => {
      const res = validatePasswordReset('', '');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Password must be at least 8 characters');
      assert.strictEqual(res.field, 'password');
    });

    test('rejects password with 1 character', () => {
      const res = validatePasswordReset('a', 'a');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Password must be at least 8 characters');
    });

    test('rejects password with 6 characters (legacy threshold)', () => {
      const res = validatePasswordReset('123456', '123456');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Password must be at least 8 characters');
      assert.strictEqual(res.field, 'password');
    });

    test('rejects password with 7 characters (boundary failure)', () => {
      const res = validatePasswordReset('1234567', '1234567');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Password must be at least 8 characters');
      assert.strictEqual(res.field, 'password');
    });

    test('rejects null, undefined, and non-string inputs safely without crashing', () => {
      const nullRes = validatePasswordReset(null, null);
      assert.strictEqual(nullRes.valid, false);
      assert.strictEqual(nullRes.error, 'Password must be at least 8 characters');

      const undefRes = validatePasswordReset(undefined, undefined);
      assert.strictEqual(undefRes.valid, false);
      assert.strictEqual(undefRes.error, 'Password must be at least 8 characters');

      const numRes = validatePasswordReset(12345678, 12345678);
      assert.strictEqual(numRes.valid, false);
      assert.strictEqual(numRes.error, 'Password must be at least 8 characters');
    });
  });

  describe('Password Length of Exactly 8 Characters (Boundary Pass)', () => {
    test('accepts password with exactly 8 alphanumeric characters and matching confirmation', () => {
      const res = validatePasswordReset('pass1234', 'pass1234');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });

    test('accepts password with exactly 8 characters containing symbols and mixed case', () => {
      const res = validatePasswordReset('P@ssw0rd', 'P@ssw0rd');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });
  });

  describe('Password Length Above 8 Characters (Pass)', () => {
    test('accepts password with 9 characters (boundary condition immediately above 8)', () => {
      const res = validatePasswordReset('pass12345', 'pass12345');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });

    test('accepts password with 20 characters', () => {
      const res = validatePasswordReset('SuperLongSecurePass!2026', 'SuperLongSecurePass!2026');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });

    test('preserves whitespace in passphrases without silent trimming or truncation', () => {
      const passphrase = 'correct horse battery staple';
      const res = validatePasswordReset(passphrase, passphrase);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });
  });

  describe('Password and Confirmation Mismatch (Rejection)', () => {
    test('rejects mismatched password and confirmation fields', () => {
      const res = validatePasswordReset('ValidPassword1', 'DifferentPassword2');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Passwords do not match');
      assert.strictEqual(res.field, 'confirmPassword');
    });

    test('rejects empty confirmation password when password is valid', () => {
      const res = validatePasswordReset('ValidPassword1', '');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Please confirm your password');
      assert.strictEqual(res.field, 'confirmPassword');
    });

    test('rejects confirmation differing by a single character or case', () => {
      const res = validatePasswordReset('Password123', 'password123');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, 'Passwords do not match');
      assert.strictEqual(res.field, 'confirmPassword');
    });
  });

  describe('Zod Schema Integration (passwordSchema & resetPasswordSchema)', () => {
    test('passwordSchema rejects fewer than 8 characters', () => {
      assert.strictEqual(passwordSchema.safeParse('1234567').success, false);
      assert.strictEqual(passwordSchema.safeParse('123456').success, false);
      assert.strictEqual(passwordSchema.safeParse('').success, false);
    });

    test('passwordSchema accepts 8 or more characters', () => {
      assert.strictEqual(passwordSchema.safeParse('12345678').success, true);
      assert.strictEqual(passwordSchema.safeParse('SuperSecret123').success, true);
    });

    test('resetPasswordSchema validates matching passwords of 8+ characters', () => {
      const parsed = resetPasswordSchema.safeParse({
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123',
      });
      assert.strictEqual(parsed.success, true);
    });

    test('resetPasswordSchema rejects mismatching confirmation', () => {
      const parsed = resetPasswordSchema.safeParse({
        password: 'ValidPassword123',
        confirmPassword: 'MismatchPassword999',
      });
      assert.strictEqual(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.issues.some((i) => i.message === 'Passwords do not match'));
      }
    });

    test('resetPasswordSchema rejects password under 8 characters even if matching', () => {
      const parsed = resetPasswordSchema.safeParse({
        password: '1234567',
        confirmPassword: '1234567',
      });
      assert.strictEqual(parsed.success, false);
      if (!parsed.success) {
        assert.ok(
          parsed.error.issues.some((i) => i.message.includes('at least 8 characters'))
        );
      }
    });
  });

  describe('Mocked Unit Tests: Submission Prevention & Supabase Error Handling', () => {
    interface MockSupabaseClient {
      updateUserCalls: Array<{ password: string }>;
      updateUser: (opts: { password: string }) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    }

    const createMockSupabase = (
      mockResponse: { error: { message: string } | null; data?: unknown } = { error: null, data: {} }
    ): MockSupabaseClient => {
      const client: MockSupabaseClient = {
        updateUserCalls: [],
        updateUser: async (opts) => {
          client.updateUserCalls.push(opts);
          return { data: mockResponse.data ?? null, error: mockResponse.error };
        },
      };
      return client;
    };

    /**
     * Simulates the exact client component submit flow from ResetPasswordPage
     */
    async function simulateResetPasswordSubmit(
      passwordInput: string,
      confirmPasswordInput: string,
      supabase: MockSupabaseClient
    ): Promise<{
      submitted: boolean;
      toastError?: string;
      toastSuccess?: string;
      redirected: boolean;
    }> {
      const validation = validatePasswordReset(passwordInput, confirmPasswordInput);
      if (!validation.valid) {
        return {
          submitted: false,
          toastError: validation.error,
          redirected: false,
        };
      }

      try {
        const { error } = await supabase.updateUser({
          password: passwordInput,
        });

        if (error) {
          return {
            submitted: true,
            toastError: error.message || 'Failed to update password',
            redirected: false,
          };
        }

        return {
          submitted: true,
          toastSuccess: 'Password updated successfully! Redirecting...',
          redirected: true,
        };
      } catch {
        return {
          submitted: true,
          toastError: 'An unexpected error occurred while updating your password',
          redirected: false,
        };
      }
    }

    test('prevents submission when password has 7 characters (never calls Supabase updateUser)', async () => {
      const supabase = createMockSupabase();
      const result = await simulateResetPasswordSubmit('short77', 'short77', supabase);

      assert.strictEqual(result.submitted, false);
      assert.strictEqual(result.toastError, 'Password must be at least 8 characters');
      assert.strictEqual(supabase.updateUserCalls.length, 0); // Crucial: Supabase was NOT called
    });

    test('prevents submission when password has 6 characters (never calls Supabase updateUser)', async () => {
      const supabase = createMockSupabase();
      const result = await simulateResetPasswordSubmit('legacy', 'legacy', supabase);

      assert.strictEqual(result.submitted, false);
      assert.strictEqual(result.toastError, 'Password must be at least 8 characters');
      assert.strictEqual(supabase.updateUserCalls.length, 0);
    });

    test('prevents submission when password and confirmation mismatch (never calls Supabase updateUser)', async () => {
      const supabase = createMockSupabase();
      const result = await simulateResetPasswordSubmit('ValidPassword123', 'Mismatched456', supabase);

      assert.strictEqual(result.submitted, false);
      assert.strictEqual(result.toastError, 'Passwords do not match');
      assert.strictEqual(supabase.updateUserCalls.length, 0);
    });

    test('submits exact unaltered password to Supabase when validation passes', async () => {
      const supabase = createMockSupabase();
      const validPass = 'Secure P@ssword 2026!';
      const result = await simulateResetPasswordSubmit(validPass, validPass, supabase);

      assert.strictEqual(result.submitted, true);
      assert.strictEqual(result.redirected, true);
      assert.strictEqual(result.toastSuccess, 'Password updated successfully! Redirecting...');
      assert.strictEqual(supabase.updateUserCalls.length, 1);
      assert.strictEqual(supabase.updateUserCalls[0].password, validPass); // Password unaltered
    });

    test('handles Supabase provider-side update failure gracefully', async () => {
      const supabase = createMockSupabase({
        error: { message: 'New password should be different from the old password.' },
      });
      const validPass = 'ValidNewPass123';
      const result = await simulateResetPasswordSubmit(validPass, validPass, supabase);

      assert.strictEqual(result.submitted, true);
      assert.strictEqual(result.redirected, false);
      assert.strictEqual(
        result.toastError,
        'New password should be different from the old password.'
      );
      assert.strictEqual(supabase.updateUserCalls.length, 1);
    });

    test('handles Supabase unexpected exception/network failure gracefully', async () => {
      const throwingClient: MockSupabaseClient = {
        updateUserCalls: [],
        updateUser: async () => {
          throw new Error('Network failure: fetch failed');
        },
      };

      const validPass = 'ValidNewPass123';
      const result = await simulateResetPasswordSubmit(validPass, validPass, throwingClient);

      assert.strictEqual(result.submitted, true);
      assert.strictEqual(result.redirected, false);
      assert.strictEqual(
        result.toastError,
        'An unexpected error occurred while updating your password'
      );
    });
  });
});
