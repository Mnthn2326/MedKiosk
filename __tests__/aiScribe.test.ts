import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateAndMapAiScribe,
  hasSoapContent,
  mergeSoapStates,
} from '../lib/aiScribe.ts';
import type { RawAiScribeResponse } from '../lib/aiScribe.ts';
import { aiScribeSchema } from '../lib/validations/index.ts';
import type { SoapState } from '../lib/payloadBuilder.ts';

const EMPTY_SOAP: SoapState = {
  subjective: { chiefComplaint: '' },
  objective: {
    clinicalObservation: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    spo2: '',
    weight: '',
  },
  assessment: {
    diagnosisTitle: '',
    icdCode: '',
    severity: 'Mild',
    status: 'Suspected',
  },
  plan: { medications: [] },
};

describe('CC-06: AI Scribe Integration & SOAP Structuring', () => {
  describe('aiScribeSchema validation', () => {
    it('validates unstructured notes of sufficient length', () => {
      const valid = aiScribeSchema.safeParse({
        raw_notes: 'Patient reports 3 days of fever and productive cough.',
      });
      assert.strictEqual(valid.success, true);
      if (valid.success) {
        assert.ok(valid.data.raw_notes.includes('fever and productive cough'));
      }
    });

    it('rejects raw_notes shorter than 5 characters', () => {
      const tooShort = aiScribeSchema.safeParse({
        raw_notes: 'Cold',
      });
      assert.strictEqual(tooShort.success, false);
      if (!tooShort.success) {
        const issues = tooShort.error.issues;
        assert.ok(issues.some(i => i.message.includes('at least 5 characters')));
      }
    });

    it('rejects empty raw_notes', () => {
      const empty = aiScribeSchema.safeParse({
        raw_notes: '   ',
      });
      assert.strictEqual(empty.success, false);
    });

    it('accepts valid UUID patient_id and rejects invalid UUID', () => {
      const validUuid = aiScribeSchema.safeParse({
        raw_notes: 'Patient feels fatigued with elevated blood pressure.',
        patient_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      assert.strictEqual(validUuid.success, true);

      const invalidUuid = aiScribeSchema.safeParse({
        raw_notes: 'Patient feels fatigued with elevated blood pressure.',
        patient_id: 'not-a-valid-uuid',
      });
      assert.strictEqual(invalidUuid.success, false);
    });
  });

  describe('validateAndMapAiScribe', () => {
    it('correctly maps a full AI scribe response to SoapState', () => {
      const aiResponse: RawAiScribeResponse = {
        diagnosis: {
          title: 'Essential Hypertension',
          icd_code: 'I10',
          severity: 'Moderate',
          clinical_impression: 'Elevated blood pressure observed during exam.',
        },
        symptoms: {
          chief_complaint: 'Occipital headache',
          duration: '4 days',
          details: 'Worse in the morning',
        },
        vitals: {
          bp: '142/90',
          heart_rate: '82 bpm',
          temperature: '98.6 F',
          spo2: '99%',
          weight: '78 kg',
        },
        prescriptions: [
          {
            medication: 'Amlodipine',
            dosage: '5mg',
            frequency: 'OD',
            duration: '30 days',
            instructions: 'Take once daily in morning',
          },
        ],
      };

      const mapped = validateAndMapAiScribe(aiResponse);
      assert.notStrictEqual(mapped, null);
      if (!mapped) return;

      assert.strictEqual(
        mapped.subjective.chiefComplaint,
        'Occipital headache (4 days) Worse in the morning'
      );
      assert.strictEqual(mapped.objective.bloodPressure, '142/90');
      assert.strictEqual(mapped.objective.heartRate, '82 bpm');
      assert.strictEqual(mapped.objective.temperature, '98.6 F');
      assert.strictEqual(mapped.objective.spo2, '99%');
      assert.strictEqual(mapped.objective.weight, '78 kg');
      assert.strictEqual(
        mapped.objective.clinicalObservation,
        'Elevated blood pressure observed during exam.'
      );
      assert.strictEqual(mapped.assessment.diagnosisTitle, 'Essential Hypertension');
      assert.strictEqual(mapped.assessment.icdCode, 'I10');
      assert.strictEqual(mapped.assessment.severity, 'Moderate');
      assert.strictEqual(mapped.assessment.status, 'Suspected');
      assert.strictEqual(mapped.plan.medications.length, 1);
      assert.strictEqual(mapped.plan.medications[0].name, 'Amlodipine');
      assert.strictEqual(mapped.plan.medications[0].dosage, '5mg');
    });

    it('handles legacy or alternative medication name field (name vs medication)', () => {
      const aiResponse = {
        prescriptions: [
          { name: 'Metformin', dosage: '500mg' },
          { medication: 'Lisinopril', dosage: '10mg' },
        ],
      };

      const mapped = validateAndMapAiScribe(aiResponse);
      assert.notStrictEqual(mapped, null);
      if (!mapped) return;

      assert.strictEqual(mapped.plan.medications.length, 2);
      assert.strictEqual(mapped.plan.medications[0].name, 'Metformin');
      assert.strictEqual(mapped.plan.medications[1].name, 'Lisinopril');
    });

    it('maps severe and critical severity indicators to Severe', () => {
      const severeResp = validateAndMapAiScribe({
        diagnosis: { severity: 'Critical / High Risk' },
      });
      assert.strictEqual(severeResp?.assessment.severity, 'Severe');

      const modResp = validateAndMapAiScribe({
        diagnosis: { severity: 'Moderate' },
      });
      assert.strictEqual(modResp?.assessment.severity, 'Moderate');

      const defaultResp = validateAndMapAiScribe({});
      assert.strictEqual(defaultResp?.assessment.severity, 'Mild');
    });

    it('returns null for null, undefined, and non-object inputs', () => {
      assert.strictEqual(validateAndMapAiScribe(null), null);
      assert.strictEqual(validateAndMapAiScribe(undefined), null);
      assert.strictEqual(validateAndMapAiScribe('invalid string'), null);
      assert.strictEqual(validateAndMapAiScribe(42), null);
    });

    it('safely handles empty or missing sub-objects without throwing', () => {
      const mapped = validateAndMapAiScribe({});
      assert.notStrictEqual(mapped, null);
      if (!mapped) return;
      assert.strictEqual(mapped.subjective.chiefComplaint, '');
      assert.strictEqual(mapped.objective.bloodPressure, '');
      assert.strictEqual(mapped.assessment.diagnosisTitle, '');
      assert.deepStrictEqual(mapped.plan.medications, []);
    });
  });

  describe('hasSoapContent safeguard check', () => {
    it('returns false for fresh empty SOAP state', () => {
      assert.strictEqual(hasSoapContent(EMPTY_SOAP), false);
    });

    it('returns true when clinician entered chief complaint', () => {
      const state: SoapState = {
        ...EMPTY_SOAP,
        subjective: { chiefComplaint: 'Severe headache' },
      };
      assert.strictEqual(hasSoapContent(state), true);
    });

    it('returns true when clinician entered vitals or clinical observation', () => {
      const state: SoapState = {
        ...EMPTY_SOAP,
        objective: { ...EMPTY_SOAP.objective, bloodPressure: '120/80' },
      };
      assert.strictEqual(hasSoapContent(state), true);
    });

    it('returns true when clinician entered diagnosis title', () => {
      const state: SoapState = {
        ...EMPTY_SOAP,
        assessment: { ...EMPTY_SOAP.assessment, diagnosisTitle: 'Migraine' },
      };
      assert.strictEqual(hasSoapContent(state), true);
    });

    it('returns true when clinician entered a prescription', () => {
      const state: SoapState = {
        ...EMPTY_SOAP,
        plan: {
          medications: [
            { name: 'Paracetamol', dosage: '500mg', frequency: 'TDS', duration: '3d', instructions: '' },
          ],
        },
      };
      assert.strictEqual(hasSoapContent(state), true);
    });
  });

  describe('mergeSoapStates safeguard review', () => {
    it('concatenates clinician notes and incoming AI notes without duplicates', () => {
      const current: SoapState = {
        ...EMPTY_SOAP,
        subjective: { chiefComplaint: 'Patient states chest tightness.' },
        objective: { ...EMPTY_SOAP.objective, clinicalObservation: 'Heart sounds normal.' },
      };

      const incoming: SoapState = {
        ...EMPTY_SOAP,
        subjective: { chiefComplaint: 'Mild dyspnea upon exertion.' },
        objective: { ...EMPTY_SOAP.objective, clinicalObservation: 'Bilateral lung clear to auscultation.' },
      };

      const merged = mergeSoapStates(current, incoming);
      assert.strictEqual(
        merged.subjective.chiefComplaint,
        'Patient states chest tightness.\nMild dyspnea upon exertion.'
      );
      assert.strictEqual(
        merged.objective.clinicalObservation,
        'Heart sounds normal.\nBilateral lung clear to auscultation.'
      );
    });

    it('does not duplicate existing strings if already present in draft', () => {
      const current: SoapState = {
        ...EMPTY_SOAP,
        subjective: { chiefComplaint: 'Patient states chest tightness.' },
      };

      const incoming: SoapState = {
        ...EMPTY_SOAP,
        subjective: { chiefComplaint: 'chest tightness' },
      };

      const merged = mergeSoapStates(current, incoming);
      assert.strictEqual(merged.subjective.chiefComplaint, 'Patient states chest tightness.');
    });

    it('preserves clinician vitals and diagnosis title over AI incoming values', () => {
      const current: SoapState = {
        ...EMPTY_SOAP,
        objective: {
          ...EMPTY_SOAP.objective,
          bloodPressure: '130/85',
        },
        assessment: {
          ...EMPTY_SOAP.assessment,
          diagnosisTitle: 'Clinician Diagnosis: Angina Pectoris',
          icdCode: 'I20.9',
        },
      };

      const incoming: SoapState = {
        ...EMPTY_SOAP,
        objective: {
          ...EMPTY_SOAP.objective,
          bloodPressure: '140/90',
          heartRate: '78 bpm',
        },
        assessment: {
          ...EMPTY_SOAP.assessment,
          diagnosisTitle: 'AI Diagnosis: CAD',
          icdCode: 'I25.1',
        },
      };

      const merged = mergeSoapStates(current, incoming);
      // Clinician BP & Assessment preserved
      assert.strictEqual(merged.objective.bloodPressure, '130/85');
      assert.strictEqual(merged.assessment.diagnosisTitle, 'Clinician Diagnosis: Angina Pectoris');
      assert.strictEqual(merged.assessment.icdCode, 'I20.9');
      // Empty clinician HR populated from incoming
      assert.strictEqual(merged.objective.heartRate, '78 bpm');
    });

    it('merges prescriptions without duplicate medication names', () => {
      const current: SoapState = {
        ...EMPTY_SOAP,
        plan: {
          medications: [
            { name: 'Aspirin', dosage: '81mg', frequency: 'OD', duration: '30d', instructions: 'Oral' },
          ],
        },
      };

      const incoming: SoapState = {
        ...EMPTY_SOAP,
        plan: {
          medications: [
            { name: 'aspirin', dosage: '100mg', frequency: 'OD', duration: '30d', instructions: '' }, // duplicate
            { name: 'Atorvastatin', dosage: '20mg', frequency: 'HS', duration: '30d', instructions: 'Oral' },
          ],
        },
      };

      const merged = mergeSoapStates(current, incoming);
      assert.strictEqual(merged.plan.medications.length, 2);
      assert.strictEqual(merged.plan.medications[0].name, 'Aspirin');
      assert.strictEqual(merged.plan.medications[0].dosage, '81mg');
      assert.strictEqual(merged.plan.medications[1].name, 'Atorvastatin');
    });
  });
});
