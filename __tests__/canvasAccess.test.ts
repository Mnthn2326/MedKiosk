import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  isGrantActive,
  filterActiveGrants,
  extractAuthorizedPatientIds,
  type CanvasAccessGrant,
} from '../lib/canvasAccess.ts';

describe('AUTH-03: Doctor-Patient Canvas Access Control & Isolation', () => {
  describe('isGrantActive validation', () => {
    test('authorizes an active, non-revoked access grant', () => {
      const grant: CanvasAccessGrant = {
        id: 'grant-1',
        patient_id: 'patient-100',
        doctor_id: 'doc-user-1',
        access_level: 'read_write',
        revoked: false,
        revoked_at: null,
        created_at: '2026-10-29T10:00:00Z',
      };

      assert.strictEqual(isGrantActive(grant), true);
    });

    test('authorizes grant when revoked_at is in the future', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const grant: CanvasAccessGrant = {
        id: 'grant-2',
        patient_id: 'patient-200',
        doctor_id: 'doc-user-1',
        access_level: 'read',
        revoked: false,
        revoked_at: futureDate,
        created_at: '2026-10-29T10:00:00Z',
      };

      assert.strictEqual(isGrantActive(grant), true);
    });

    test('strictly denies grant when revoked is true', () => {
      const grant: CanvasAccessGrant = {
        id: 'grant-3',
        patient_id: 'patient-100',
        doctor_id: 'doc-user-1',
        access_level: 'read_write',
        revoked: true,
        revoked_at: '2026-10-29T12:00:00Z',
        created_at: '2026-10-29T10:00:00Z',
      };

      assert.strictEqual(isGrantActive(grant), false);
    });

    test('strictly denies grant when revoked_at timestamp has passed', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const grant: CanvasAccessGrant = {
        id: 'grant-4',
        patient_id: 'patient-300',
        doctor_id: 'doc-user-1',
        access_level: 'read_write',
        revoked: false,
        revoked_at: pastDate,
        created_at: '2026-10-20T10:00:00Z',
      };

      assert.strictEqual(isGrantActive(grant), false);
    });

    test('handles null, undefined, or empty objects safely', () => {
      assert.strictEqual(isGrantActive(null), false);
      assert.strictEqual(isGrantActive(undefined), false);
      assert.strictEqual(isGrantActive({} as CanvasAccessGrant), true);
    });
  });

  describe('filterActiveGrants', () => {
    test('filters out revoked or expired grants from the grant collection', () => {
      const active1: CanvasAccessGrant = {
        id: 'g1',
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        access_level: 'read_write',
        revoked: false,
      };
      const revoked: CanvasAccessGrant = {
        id: 'g2',
        patient_id: 'pat-2',
        doctor_id: 'doc-1',
        access_level: 'read',
        revoked: true,
      };
      const active2: CanvasAccessGrant = {
        id: 'g3',
        patient_id: 'pat-3',
        doctor_id: 'doc-1',
        access_level: 'emergency',
        revoked: false,
      };
      const expired: CanvasAccessGrant = {
        id: 'g4',
        patient_id: 'pat-4',
        doctor_id: 'doc-1',
        access_level: 'read',
        revoked: false,
        revoked_at: '2026-01-01T00:00:00Z', // past
      };

      const result = filterActiveGrants([active1, revoked, active2, expired]);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'g1');
      assert.strictEqual(result[1].id, 'g3');
    });

    test('does not mutate the original grant array', () => {
      const original: CanvasAccessGrant[] = [
        { id: '1', patient_id: 'p1', doctor_id: 'd1', access_level: 'read', revoked: true },
      ];
      const snapshot = [...original];

      filterActiveGrants(original);
      assert.deepStrictEqual(original, snapshot);
    });

    test('handles empty or non-array inputs safely', () => {
      assert.deepStrictEqual(filterActiveGrants([]), []);
      assert.deepStrictEqual(filterActiveGrants(null), []);
      assert.deepStrictEqual(filterActiveGrants(undefined), []);
    });
  });

  describe('extractAuthorizedPatientIds', () => {
    test('extracts deduplicated patient IDs from active grants only', () => {
      const grants: CanvasAccessGrant[] = [
        { id: '1', patient_id: 'pat-A', doctor_id: 'doc-1', access_level: 'read', revoked: false },
        { id: '2', patient_id: 'pat-B', doctor_id: 'doc-1', access_level: 'read_write', revoked: false },
        { id: '3', patient_id: 'pat-A', doctor_id: 'doc-1', access_level: 'emergency', revoked: false }, // duplicate patient
        { id: '4', patient_id: 'pat-C', doctor_id: 'doc-1', access_level: 'read', revoked: true }, // revoked
      ];

      const patientIds = extractAuthorizedPatientIds(grants);
      assert.strictEqual(patientIds.length, 2);
      assert.ok(patientIds.includes('pat-A'));
      assert.ok(patientIds.includes('pat-B'));
      assert.strictEqual(patientIds.includes('pat-C'), false);
    });
  });

  describe('Doctor Registry & Timeline Isolation Scenarios (TS_23 & TS_34)', () => {
    test('TS_23: Doctor sees only patients covered by their active access grants', () => {
      const allPatientsInSystem = [
        { id: 'pat-allowed-1', deidentified_code: 'MK-11111111' },
        { id: 'pat-allowed-2', deidentified_code: 'MK-22222222' },
        { id: 'pat-unauthorized-3', deidentified_code: 'MK-33333333' },
        { id: 'pat-revoked-4', deidentified_code: 'MK-44444444' },
      ];

      const doctorGrants: CanvasAccessGrant[] = [
        { id: 'g1', patient_id: 'pat-allowed-1', doctor_id: 'doc-1', access_level: 'read_write', revoked: false },
        { id: 'g2', patient_id: 'pat-allowed-2', doctor_id: 'doc-1', access_level: 'read', revoked: false },
        { id: 'g3', patient_id: 'pat-revoked-4', doctor_id: 'doc-1', access_level: 'read', revoked: true },
      ];

      const authorizedIds = extractAuthorizedPatientIds(doctorGrants);
      const visiblePatients = allPatientsInSystem.filter((p) => authorizedIds.includes(p.id));

      assert.strictEqual(visiblePatients.length, 2);
      assert.strictEqual(visiblePatients[0].id, 'pat-allowed-1');
      assert.strictEqual(visiblePatients[1].id, 'pat-allowed-2');
      assert.strictEqual(visiblePatients.some((p) => p.id === 'pat-unauthorized-3'), false);
      assert.strictEqual(visiblePatients.some((p) => p.id === 'pat-revoked-4'), false);
    });

    test('TS_34: URL tampering with unauthorized patient ID is denied access', () => {
      const doctorId = 'doc-user-123';
      const authorizedPatientId = 'pat-authorized-uuid';
      const unauthorizedPatientId = 'pat-victim-uuid';

      const doctorGrants: CanvasAccessGrant[] = [
        { id: 'g1', patient_id: authorizedPatientId, doctor_id: doctorId, access_level: 'read_write', revoked: false },
      ];

      // Legitimate access
      const hasAccessLegitimate = doctorGrants.some(
        (g) => g.doctor_id === doctorId && g.patient_id === authorizedPatientId && isGrantActive(g)
      );
      assert.strictEqual(hasAccessLegitimate, true);

      // Attempt to access unauthorized patient by modifying URL parameter
      const hasAccessTampered = doctorGrants.some(
        (g) => g.doctor_id === doctorId && g.patient_id === unauthorizedPatientId && isGrantActive(g)
      );
      assert.strictEqual(hasAccessTampered, false);
    });

    test('Access Revocation: Previously authorized patient immediately becomes inaccessible', () => {
      const doctorId = 'doc-user-123';
      const patientId = 'pat-999';

      // Phase 1: Active Grant
      const activeGrant: CanvasAccessGrant = {
        id: 'g-revocable',
        patient_id: patientId,
        doctor_id: doctorId,
        access_level: 'read_write',
        revoked: false,
      };

      assert.strictEqual(isGrantActive(activeGrant), true);
      assert.deepStrictEqual(extractAuthorizedPatientIds([activeGrant]), [patientId]);

      // Phase 2: Grant is Revoked
      const revokedGrant: CanvasAccessGrant = {
        ...activeGrant,
        revoked: true,
        revoked_at: new Date().toISOString(),
      };

      assert.strictEqual(isGrantActive(revokedGrant), false);
      assert.deepStrictEqual(extractAuthorizedPatientIds([revokedGrant]), []);
    });
  });
});
