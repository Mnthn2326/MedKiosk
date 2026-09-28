import fs from 'fs';
import assert from 'assert';

import { buildConsultationPayload } from '../lib/payloadBuilder.js';

const fixture = JSON.parse(fs.readFileSync('__tests__/golden_payload.json', 'utf8'));
const patientId = 'p-123';

const soapState = {
  subjective: { chiefComplaint: fixture.inputs.chiefComplaint },
  objective: {
    clinicalObservation: fixture.inputs.clinicalObservation,
    bloodPressure: fixture.inputs.bloodPressure,
    heartRate: fixture.inputs.heartRate,
    temperature: fixture.inputs.temperature,
    spo2: fixture.inputs.spo2,
    weight: fixture.inputs.weight
  },
  assessment: {
    diagnosisTitle: fixture.inputs.diagnosisTitle,
    icdCode: fixture.inputs.icdCode,
    severity: fixture.inputs.severity,
    status: fixture.inputs.status
  },
  plan: { medications: fixture.inputs.medications }
};

const newPayload = buildConsultationPayload(soapState, patientId);

try {
  assert.deepStrictEqual(fixture.expectedPayload, newPayload);
  console.log('✅ PASS: buildConsultationPayload() precisely reproduced the golden fixture.');
} catch (err) {
  console.error('❌ FAIL: Payloads do not match.');
  console.error(err);
  process.exit(1);
}
