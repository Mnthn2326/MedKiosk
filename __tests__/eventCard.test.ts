import test, { describe } from 'node:test';
import assert from 'node:assert';
import { getDiagnosisTitle } from '../lib/diagnosis.ts';

describe('CC-02: Clinical Diagnosis Title Resolution', () => {
  test('resolves a diagnosis stored under content.diagnosis', () => {
    const content = { diagnosis: 'Type 1 Diabetes Mellitus' };
    const title = getDiagnosisTitle(content);
    assert.strictEqual(title, 'Type 1 Diabetes Mellitus');
  });

  test('resolves a diagnosis stored under content.title', () => {
    const content = {
      title: 'Essential Hypertension',
      icd_code: 'I10',
      severity: 'Moderate',
      status: 'Active',
    };
    const title = getDiagnosisTitle(content);
    assert.strictEqual(title, 'Essential Hypertension');
  });

  test('prefers canonical content.title when both content.title and content.diagnosis exist', () => {
    const content = {
      title: 'Primary Canonical Title',
      diagnosis: 'Legacy Secondary Field',
    };
    const title = getDiagnosisTitle(content);
    assert.strictEqual(title, 'Primary Canonical Title');
  });

  test('falls back to "Clinical Diagnosis" when diagnosis content is an empty object', () => {
    const content = {};
    const title = getDiagnosisTitle(content);
    assert.strictEqual(title, 'Clinical Diagnosis');
  });

  test('falls back to "Clinical Diagnosis" when title and diagnosis are empty strings or whitespace', () => {
    assert.strictEqual(getDiagnosisTitle({ title: '' }), 'Clinical Diagnosis');
    assert.strictEqual(getDiagnosisTitle({ diagnosis: '' }), 'Clinical Diagnosis');
    assert.strictEqual(getDiagnosisTitle({ title: '   ', diagnosis: '   ' }), 'Clinical Diagnosis');
  });

  test('falls back to "Clinical Diagnosis" when content is null or undefined', () => {
    assert.strictEqual(getDiagnosisTitle(null), 'Clinical Diagnosis');
    assert.strictEqual(getDiagnosisTitle(undefined), 'Clinical Diagnosis');
  });

  test('handles malformed or non-object content without crashing', () => {
    assert.strictEqual(
      getDiagnosisTitle('raw string instead of object' as unknown as Record<string, unknown>),
      'Clinical Diagnosis'
    );
    assert.strictEqual(
      getDiagnosisTitle(12345 as unknown as Record<string, unknown>),
      'Clinical Diagnosis'
    );
    assert.strictEqual(
      getDiagnosisTitle(true as unknown as Record<string, unknown>),
      'Clinical Diagnosis'
    );
    assert.strictEqual(
      getDiagnosisTitle([] as unknown as Record<string, unknown>),
      'Clinical Diagnosis'
    );
  });

  test('supports doctor consultation payload format (from payloadBuilder and golden_payload)', () => {
    const goldenDiagnosisContent = {
      title: 'Hypertension',
      icd_code: 'I10',
      severity: 'Moderate',
      status: 'Active',
      chief_complaint: 'Headaches and dizziness',
      clinical_observation: 'Elevated BP reading',
    };
    const title = getDiagnosisTitle(goldenDiagnosisContent);
    assert.strictEqual(title, 'Hypertension');
  });

  test('supports contributor form diagnosis format (from ContributorForm)', () => {
    const contributorContent = {
      title: 'Streptococcal Pharyngitis',
      description: 'Rapid strep screen positive with tonsillar exudate',
      icd_code: 'J02.0',
    };
    const title = getDiagnosisTitle(contributorContent);
    assert.strictEqual(title, 'Streptococcal Pharyngitis');
  });
});
