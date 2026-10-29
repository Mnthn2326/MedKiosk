import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  clinicalEventSchema,
  baseClinicalEventSchema,
  normalizePrescriptionContent,
} from '../lib/validations/index.ts';
import { getMedicationName } from '../lib/prescription.ts';

describe('CC-04: Prescription Payload Normalization & Validation', () => {
  describe('normalizePrescriptionContent helper', () => {
    test('normalizes legacy single-medication object into canonical medications array', () => {
      const legacy = {
        medication: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'TID',
        duration: '7 days',
        notes: 'Take with food',
      };

      const normalized = normalizePrescriptionContent(legacy) as Record<string, unknown>;
      assert.ok(Array.isArray(normalized.medications), 'Must have medications array');
      assert.strictEqual(normalized.medications.length, 1);

      const item = (normalized.medications as Array<Record<string, unknown>>)[0];
      assert.strictEqual(item.medication, 'Amoxicillin');
      assert.strictEqual(item.name, 'Amoxicillin');
      assert.strictEqual(item.dosage, '500mg');
      assert.strictEqual(item.frequency, 'TID');
      assert.strictEqual(item.duration, '7 days');
      assert.strictEqual(item.notes, 'Take with food');
    });

    test('normalizes single-medication using "name" field', () => {
      const legacy = {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'daily',
      };

      const normalized = normalizePrescriptionContent(legacy) as Record<string, unknown>;
      assert.ok(Array.isArray(normalized.medications));
      const item = (normalized.medications as Array<Record<string, unknown>>)[0];
      assert.strictEqual(item.name, 'Lisinopril');
      assert.strictEqual(item.medication, 'Lisinopril');
      assert.strictEqual(item.dosage, '10mg');
    });

    test('preserves already canonical { medications: [...] } payloads', () => {
      const canonical = {
        medications: [
          { name: 'Drug A', dosage: '10mg' },
          { name: 'Drug B', dosage: '20mg' },
        ],
      };

      const result = normalizePrescriptionContent(canonical);
      assert.deepStrictEqual(result, canonical);
    });

    test('returns unmapped content safely if neither array nor single medication is present', () => {
      const unmapped = { test_report: 'some lab' };
      assert.deepStrictEqual(normalizePrescriptionContent(unmapped), unmapped);
      assert.strictEqual(normalizePrescriptionContent(null), null);
    });
  });

  describe('Zod Validation: clinicalEventSchema & baseClinicalEventSchema', () => {
    test('validates a canonical prescription containing one medication', () => {
      const payload = {
        deidentified_code: 'MN-P-123456',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [
            {
              medication: 'Amoxicillin',
              dosage: '500mg',
              frequency: 'TID',
              duration: '7 days',
            },
          ],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.ok(result.success, `Validation should succeed: ${JSON.stringify(result)}`);
    });

    test('validates a canonical prescription containing multiple medications', () => {
      const payload = {
        patient_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
            { medication: 'Metformin', dosage: '500mg', frequency: 'BID' },
            { name: 'Atorvastatin', dosage: '20mg', frequency: 'QPM' },
          ],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.ok(result.success, `Multi-medication prescription should pass validation`);
      if (result.success) {
        const content = result.data.content as { medications: unknown[] };
        assert.strictEqual(content.medications.length, 3);
      }
    });

    test('validates and normalizes legacy single-medication payload via API schema', () => {
      const payload = {
        deidentified_code: 'MN-P-999999',
        event_type: 'prescription',
        trust_tier: 'institution_verified',
        content: {
          medication: 'Azithromycin',
          dosage: '250mg',
          frequency: 'daily',
          duration: '5 days',
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.ok(result.success, 'Legacy single medication payload should pass and normalize');
      if (result.success) {
        const content = result.data.content as { medications: Array<Record<string, unknown>> };
        assert.ok(Array.isArray(content.medications));
        assert.strictEqual(content.medications[0].medication, 'Azithromycin');
        assert.strictEqual(content.medications[0].dosage, '250mg');
      }
    });

    test('fails validation when medication dosage is missing', () => {
      const payload = {
        deidentified_code: 'MN-P-123456',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [
            {
              medication: 'Amoxicillin',
              // missing dosage
            },
          ],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasDosageError = result.error.issues.some((i) => i.message.includes('Dosage is required'));
        assert.ok(hasDosageError, 'Should report "Dosage is required" error');
      }
    });

    test('fails validation when medication name is missing', () => {
      const payload = {
        deidentified_code: 'MN-P-123456',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [
            {
              dosage: '500mg',
              // missing medication name
            },
          ],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasNameError = result.error.issues.some((i) => i.message.includes('Medication name is required'));
        assert.ok(hasNameError, 'Should report "Medication name is required" error');
      }
    });

    test('fails validation when medications array is empty', () => {
      const payload = {
        deidentified_code: 'MN-P-123456',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasEmptyError = result.error.issues.some((i) =>
          i.message.includes('Prescriptions must have at least one medication')
        );
        assert.ok(hasEmptyError, 'Should report empty medications error');
      }
    });

    test('fails validation when content is not an object or lacks prescription structure', () => {
      const payload = {
        deidentified_code: 'MN-P-123456',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          random_field: 'no medications here',
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasArrayError = result.error.issues.some((i) =>
          i.message.includes('Prescriptions must have a medications array')
        );
        assert.ok(hasArrayError, 'Should report "Prescriptions must have a medications array" error');
      }
    });

    test('fails when neither patient_id nor deidentified_code is provided', () => {
      const payload = {
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [{ name: 'Aspirin', dosage: '81mg' }],
        },
      };

      const result = clinicalEventSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        const hasPatientError = result.error.issues.some((i) =>
          i.message.includes('Must provide either patient_id or deidentified_code')
        );
        assert.ok(hasPatientError);
      }
    });

    test('ensures validated payload can be seamlessly read by prescription resolver', () => {
      const payload = {
        deidentified_code: 'MN-P-555555',
        event_type: 'prescription',
        trust_tier: 'doctor_confirmed',
        content: {
          medications: [
            { medication: 'Clopidogrel', dosage: '75mg', frequency: 'daily' },
            { name: 'Metoprolol Succinate', dosage: '50mg', frequency: 'daily' },
          ],
        },
      };

      const parseResult = clinicalEventSchema.safeParse(payload);
      assert.ok(parseResult.success);

      if (parseResult.success) {
        const content = parseResult.data.content as { medications: Array<Record<string, unknown>> };
        const medNames = content.medications.map(getMedicationName);
        assert.deepStrictEqual(medNames, ['Clopidogrel', 'Metoprolol Succinate']);
      }
    });
  });
});
