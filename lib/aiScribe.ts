/**
 * @file lib/aiScribe.ts
 *
 * Client and Server Utilities for AI Medical Scribe SOAP Structuring in MedNotes.
 */

import type { SoapState } from './payloadBuilder';

export interface RawAiScribeResponse {
  diagnosis?: {
    title?: string;
    icd_code?: string;
    severity?: string;
    clinical_impression?: string;
  };
  symptoms?: {
    chief_complaint?: string;
    duration?: string;
    details?: string;
  };
  vitals?: {
    bp?: string;
    heart_rate?: string;
    temperature?: string;
    spo2?: string;
    weight?: string;
  };
  prescriptions?: Array<{
    medication?: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
}

/**
 * Checks whether a SOAP state has any clinician-entered content.
 */
export function hasSoapContent(soap: SoapState): boolean {
  if (!soap) return false;
  return Boolean(
    (soap.subjective?.chiefComplaint && soap.subjective.chiefComplaint.trim()) ||
    (soap.objective?.clinicalObservation && soap.objective.clinicalObservation.trim()) ||
    (soap.objective?.bloodPressure && soap.objective.bloodPressure.trim()) ||
    (soap.objective?.heartRate && soap.objective.heartRate.trim()) ||
    (soap.objective?.temperature && soap.objective.temperature.trim()) ||
    (soap.objective?.spo2 && soap.objective.spo2.trim()) ||
    (soap.objective?.weight && soap.objective.weight.trim()) ||
    (soap.assessment?.diagnosisTitle && soap.assessment.diagnosisTitle.trim()) ||
    (soap.assessment?.icdCode && soap.assessment.icdCode.trim()) ||
    (Array.isArray(soap.plan?.medications) && soap.plan.medications.length > 0)
  );
}

/**
 * Validates and safely maps raw AI Scribe JSON into a valid SoapState.
 */
export function validateAndMapAiScribe(data: unknown): SoapState | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as RawAiScribeResponse;

  const symptoms = raw.symptoms && typeof raw.symptoms === 'object' ? raw.symptoms : {};
  const diagnosis = raw.diagnosis && typeof raw.diagnosis === 'object' ? raw.diagnosis : {};
  const vitals = raw.vitals && typeof raw.vitals === 'object' ? raw.vitals : {};
  const rawPrescriptions = Array.isArray(raw.prescriptions) ? raw.prescriptions : [];

  // Subjective
  const ccParts = [
    typeof symptoms.chief_complaint === 'string' ? symptoms.chief_complaint.trim() : '',
    typeof symptoms.duration === 'string' && symptoms.duration.trim() ? `(${symptoms.duration.trim()})` : '',
    typeof symptoms.details === 'string' ? symptoms.details.trim() : '',
  ].filter(Boolean);

  const chiefComplaint = ccParts.join(' ');

  // Objective
  const clinicalObservation =
    typeof diagnosis.clinical_impression === 'string' ? diagnosis.clinical_impression.trim() : '';
  const bloodPressure = typeof vitals.bp === 'string' ? vitals.bp.trim() : '';
  const heartRate = typeof vitals.heart_rate === 'string' ? vitals.heart_rate.trim() : '';
  const temperature = typeof vitals.temperature === 'string' ? vitals.temperature.trim() : '';
  const spo2 = typeof vitals.spo2 === 'string' ? vitals.spo2.trim() : '';
  const weight = typeof vitals.weight === 'string' ? vitals.weight.trim() : '';

  // Assessment
  const diagnosisTitle = typeof diagnosis.title === 'string' ? diagnosis.title.trim() : '';
  const icdCode = typeof diagnosis.icd_code === 'string' ? diagnosis.icd_code.trim() : '';

  let severity = 'Mild';
  if (typeof diagnosis.severity === 'string') {
    const sLower = diagnosis.severity.toLowerCase();
    if (sLower.includes('severe') || sLower.includes('critical') || sLower.includes('high')) {
      severity = 'Severe';
    } else if (sLower.includes('moderate')) {
      severity = 'Moderate';
    }
  }

  // Plan Medications
  const medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }> = [];

  for (const item of rawPrescriptions) {
    if (item && typeof item === 'object') {
      const name =
        (typeof item.medication === 'string' && item.medication.trim()) ||
        (typeof item.name === 'string' && item.name.trim()) ||
        '';

      if (name) {
        medications.push({
          name,
          dosage: typeof item.dosage === 'string' ? item.dosage.trim() : '',
          frequency: typeof item.frequency === 'string' ? item.frequency.trim() : '',
          duration: typeof item.duration === 'string' ? item.duration.trim() : '',
          instructions: typeof item.instructions === 'string' ? item.instructions.trim() : '',
        });
      }
    }
  }

  return {
    subjective: { chiefComplaint },
    objective: {
      clinicalObservation,
      bloodPressure,
      heartRate,
      temperature,
      spo2,
      weight,
    },
    assessment: {
      diagnosisTitle,
      icdCode,
      severity,
      status: 'Suspected',
    },
    plan: { medications },
  };
}

/**
 * Merges structured AI Scribe fields with existing clinician-entered notes.
 * Preserves clinician text, concatenating new observations and appending non-duplicate medications.
 */
export function mergeSoapStates(current: SoapState, incoming: SoapState): SoapState {
  const mergeString = (curr: string, next: string) => {
    if (!curr) return next;
    if (!next) return curr;
    if (curr.includes(next)) return curr;
    return `${curr}\n${next}`;
  };

  const pickFirst = (curr: string, next: string) => (curr && curr.trim() ? curr : next);

  // Merge medications without duplicate names
  const existingNames = new Set(
    current.plan.medications.map((m) => m.name.toLowerCase().trim())
  );
  const additionalMeds = incoming.plan.medications.filter(
    (m) => !existingNames.has(m.name.toLowerCase().trim())
  );

  return {
    subjective: {
      chiefComplaint: mergeString(current.subjective.chiefComplaint, incoming.subjective.chiefComplaint),
    },
    objective: {
      clinicalObservation: mergeString(
        current.objective.clinicalObservation,
        incoming.objective.clinicalObservation
      ),
      bloodPressure: pickFirst(current.objective.bloodPressure, incoming.objective.bloodPressure),
      heartRate: pickFirst(current.objective.heartRate, incoming.objective.heartRate),
      temperature: pickFirst(current.objective.temperature, incoming.objective.temperature),
      spo2: pickFirst(current.objective.spo2, incoming.objective.spo2),
      weight: pickFirst(current.objective.weight, incoming.objective.weight),
    },
    assessment: {
      diagnosisTitle: pickFirst(current.assessment.diagnosisTitle, incoming.assessment.diagnosisTitle),
      icdCode: pickFirst(current.assessment.icdCode, incoming.assessment.icdCode),
      severity:
        current.assessment.severity !== 'Mild'
          ? current.assessment.severity
          : incoming.assessment.severity || current.assessment.severity,
      status: current.assessment.status,
    },
    plan: {
      medications: [...current.plan.medications, ...additionalMeds],
    },
  };
}
