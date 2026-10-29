import test, { describe } from 'node:test';
import assert from 'node:assert';
import { getMedicationName } from '../lib/prescription.ts';
import fs from 'fs';

describe('CC-03: Clinical Prescription Medication Name Resolution', () => {
  test('resolves medication name using "medication" field (contributor & legacy format)', () => {
    const med = {
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'TID',
      duration: '7 days',
    };
    const resolvedName = getMedicationName(med);
    assert.strictEqual(resolvedName, 'Amoxicillin');
  });

  test('resolves medication name using "name" field (doctor consultation & payloadBuilder format)', () => {
    const med = {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'daily',
      duration: '30 days',
      instructions: 'Take in morning',
    };
    const resolvedName = getMedicationName(med);
    assert.strictEqual(resolvedName, 'Lisinopril');
  });

  test('prefers canonical "name" field when both "name" and "medication" are present', () => {
    const med = {
      name: 'Canonical Name (Atorvastatin)',
      medication: 'Legacy Medication Field (Lipitor)',
    };
    const resolvedName = getMedicationName(med);
    assert.strictEqual(resolvedName, 'Canonical Name (Atorvastatin)');
  });

  test('trims whitespace and ignores whitespace-only strings', () => {
    assert.strictEqual(getMedicationName({ name: '  Omeprazole  ' }), 'Omeprazole');
    assert.strictEqual(getMedicationName({ name: '   ', medication: 'Metformin' }), 'Metformin');
    assert.strictEqual(getMedicationName({ name: '   ', medication: '   ' }), 'Unnamed Medication');
  });

  test('handles missing medication names with safe fallback', () => {
    const medWithoutName = { dosage: '10mg', frequency: 'daily' };
    assert.strictEqual(getMedicationName(medWithoutName), 'Unnamed Medication');
  });

  test('handles null, undefined, and non-object medication entries safely', () => {
    assert.strictEqual(getMedicationName(null), 'Unnamed Medication');
    assert.strictEqual(getMedicationName(undefined), 'Unnamed Medication');
    assert.strictEqual(
      getMedicationName('invalid string' as unknown as Record<string, unknown>),
      'Unnamed Medication'
    );
    assert.strictEqual(
      getMedicationName(12345 as unknown as Record<string, unknown>),
      'Unnamed Medication'
    );
  });

  test('correctly processes prescriptions containing multiple medications with mixed schemas', () => {
    const multiRxPayload = {
      medications: [
        { name: 'Lisinopril', dosage: '10mg', frequency: 'daily', duration: '30 days', instructions: 'Morning' },
        { medication: 'Metformin', dosage: '500mg', frequency: 'BID', duration: '90 days', notes: 'With meals' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'QPM', duration: '30 days', instructions: 'At bedtime' },
        { dosage: '5mg' }, // missing name entry
      ],
    };

    const names = multiRxPayload.medications.map((m) => getMedicationName(m));
    assert.deepStrictEqual(names, [
      'Lisinopril',
      'Metformin',
      'Atorvastatin',
      'Unnamed Medication',
    ]);
  });

  test('validates against golden_payload.json fixture preserving doctor consultation medications', () => {
    const fixture = JSON.parse(fs.readFileSync('__tests__/golden_payload.json', 'utf8'));
    const rxEvent = fixture.expectedPayload.events.find(
      (e: { event_type: string }) => e.event_type === 'prescription'
    );

    assert.ok(rxEvent, 'Golden fixture must have prescription event');
    assert.ok(Array.isArray(rxEvent.content.medications), 'Medications must be an array');

    const resolvedMeds = rxEvent.content.medications.map(
      (med: Record<string, unknown>) => ({
        name: getMedicationName(med),
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })
    );

    assert.strictEqual(resolvedMeds[0].name, 'Lisinopril');
    assert.strictEqual(resolvedMeds[0].dosage, '10mg');
    assert.strictEqual(resolvedMeds[0].frequency, 'daily');
    assert.strictEqual(resolvedMeds[0].duration, '30 days');
    assert.strictEqual(resolvedMeds[0].instructions, 'Take in morning');
  });

  test('preserves details for single-drug legacy records', () => {
    const singleMedicationRecord = {
      medication: 'Amoxicillin-Clavulanate',
      dosage: '875mg',
      frequency: 'BID',
      duration: '10 days',
      notes: 'Take with full glass of water',
    };

    const resolvedName = getMedicationName(singleMedicationRecord);
    assert.strictEqual(resolvedName, 'Amoxicillin-Clavulanate');
    assert.strictEqual(singleMedicationRecord.dosage, '875mg');
    assert.strictEqual(singleMedicationRecord.frequency, 'BID');
    assert.strictEqual(singleMedicationRecord.duration, '10 days');
    assert.strictEqual(singleMedicationRecord.notes, 'Take with full glass of water');
  });
});
