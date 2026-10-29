import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  isValidInternalRedirect,
  sanitizeRedirectPath,
} from '../lib/authRoutes.ts';

describe('AUTH-05: Prevent Open Redirect Vulnerability in Auth Callback', () => {
  describe('isValidInternalRedirect: Legitimate Internal Destinations', () => {
    test('allows legitimate internal path /doctor/dashboard', () => {
      assert.strictEqual(isValidInternalRedirect('/doctor/dashboard'), true);
      assert.strictEqual(sanitizeRedirectPath('/doctor/dashboard'), '/doctor/dashboard');
    });

    test('allows legitimate internal path /patient/timeline', () => {
      assert.strictEqual(isValidInternalRedirect('/patient/timeline'), true);
      assert.strictEqual(sanitizeRedirectPath('/patient/timeline'), '/patient/timeline');
    });

    test('allows password reset route /reset-password', () => {
      assert.strictEqual(isValidInternalRedirect('/reset-password'), true);
      assert.strictEqual(sanitizeRedirectPath('/reset-password'), '/reset-password');
    });

    test('allows internal path with valid query strings', () => {
      const target = '/doctor/timeline/123?consult=true&tab=notes';
      assert.strictEqual(isValidInternalRedirect(target), true);
      assert.strictEqual(sanitizeRedirectPath(target), target);
    });

    test('allows internal path with hash anchors', () => {
      const target = '/patient/timeline#recent-diagnosis';
      assert.strictEqual(isValidInternalRedirect(target), true);
      assert.strictEqual(sanitizeRedirectPath(target), target);
    });
  });

  describe('Missing, Empty, or Non-String Inputs Fallback', () => {
    test('falls back to "/" when next is null or undefined', () => {
      assert.strictEqual(isValidInternalRedirect(null), false);
      assert.strictEqual(sanitizeRedirectPath(null), '/');

      assert.strictEqual(isValidInternalRedirect(undefined), false);
      assert.strictEqual(sanitizeRedirectPath(undefined), '/');
    });

    test('falls back to "/" when next is an empty string or whitespace', () => {
      assert.strictEqual(isValidInternalRedirect(''), false);
      assert.strictEqual(sanitizeRedirectPath(''), '/');

      assert.strictEqual(isValidInternalRedirect('   '), false);
      assert.strictEqual(sanitizeRedirectPath('   '), '/');
    });

    test('uses custom fallback if specified', () => {
      assert.strictEqual(sanitizeRedirectPath('', '/custom-fallback'), '/custom-fallback');
      assert.strictEqual(
        sanitizeRedirectPath('https://attacker.example', '/login'),
        '/login'
      );
    });
  });

  describe('Rejection of External and Dangerous Open Redirect Attacks', () => {
    test('rejects absolute external URLs (https://attacker.example)', () => {
      assert.strictEqual(isValidInternalRedirect('https://attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('https://attacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('http://attacker.example/evil'), false);
      assert.strictEqual(sanitizeRedirectPath('http://attacker.example/evil'), '/');
    });

    test('rejects protocol-relative URLs (//attacker.example)', () => {
      assert.strictEqual(isValidInternalRedirect('//attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('//attacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('///attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('///attacker.example'), '/');
    });

    test('rejects dangerous URL schemes (javascript:, data:, vbscript:)', () => {
      assert.strictEqual(isValidInternalRedirect('javascript:alert(1)'), false);
      assert.strictEqual(sanitizeRedirectPath('javascript:alert(1)'), '/');

      assert.strictEqual(isValidInternalRedirect('data:text/html,<script>alert(1)</script>'), false);
      assert.strictEqual(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>'), '/');

      assert.strictEqual(isValidInternalRedirect('vbscript:msgbox(1)'), false);
      assert.strictEqual(sanitizeRedirectPath('vbscript:msgbox(1)'), '/');
    });

    test('rejects backslash-based external URL evasion variants', () => {
      // In web browsers, backslashes in origins get normalized to slashes
      assert.strictEqual(isValidInternalRedirect('/\\attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('/\\attacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('\\\\attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('\\\\attacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('/path\\..\\attacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('/path\\..\\attacker.example'), '/');
    });

    test('rejects encoded or malformed redirect evasion variants', () => {
      // %2F is encoded /; %5C is encoded \
      assert.strictEqual(isValidInternalRedirect('/%2Fattacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('/%2Fattacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('/%5Cattacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('/%5Cattacker.example'), '/');

      assert.strictEqual(isValidInternalRedirect('https%3A%2F%2Fattacker.example'), false);
      assert.strictEqual(sanitizeRedirectPath('https%3A%2F%2Fattacker.example'), '/');

      // Malformed URI sequence that crashes decodeURIComponent
      assert.strictEqual(isValidInternalRedirect('/%E0%A4%A'), false);
      assert.strictEqual(sanitizeRedirectPath('/%E0%A4%A'), '/');
    });

    test('rejects control characters, newlines, and carriage returns (CRLF injection)', () => {
      assert.strictEqual(isValidInternalRedirect('/path\r\nSet-Cookie: evil=1'), false);
      assert.strictEqual(isValidInternalRedirect('/path\x00extra'), false);
    });
  });

  describe('Integration: Safe Absolute URL Construction with Application Origin', () => {
    test('guarantees constructed redirect URL stays strictly on the trusted origin', () => {
      const trustedOrigin = 'https://mednotes.example.org';

      const validTarget = '/doctor/dashboard';
      const safeTarget = sanitizeRedirectPath(validTarget, '/');
      const constructedValid = new URL(safeTarget, trustedOrigin).toString();
      assert.strictEqual(constructedValid, 'https://mednotes.example.org/doctor/dashboard');

      const attackTargets = [
        'https://attacker.example',
        '//attacker.example/phish',
        '/\\attacker.example',
        'javascript:alert(1)',
        '/%5Cattacker.example',
        '',
      ];

      for (const attack of attackTargets) {
        const sanitized = sanitizeRedirectPath(attack, '/');
        const constructed = new URL(sanitized, trustedOrigin).toString();
        assert.strictEqual(
          constructed,
          'https://mednotes.example.org/',
          `Target "${attack}" must resolve strictly to application home`
        );
      }
    });

    test('preserves valid query parameters on the trusted origin', () => {
      const trustedOrigin = 'http://localhost:3000';
      const targetWithParams = '/doctor/timeline/patient-1?consult=true';
      const sanitized = sanitizeRedirectPath(targetWithParams, '/');
      const constructed = new URL(sanitized, trustedOrigin).toString();

      assert.strictEqual(
        constructed,
        'http://localhost:3000/doctor/timeline/patient-1?consult=true'
      );
    });
  });
});
