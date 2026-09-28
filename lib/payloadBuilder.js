export function buildConsultationPayload(soap, patientId) {
    const events = [
        {
            event_type: 'diagnosis',
            content: {
                title: soap.assessment.diagnosisTitle,
                icd_code: soap.assessment.icdCode,
                severity: soap.assessment.severity,
                status: soap.assessment.status,
                chief_complaint: soap.subjective.chiefComplaint,
                clinical_observation: soap.objective.clinicalObservation,
            },
        },
    ];
    const validMedications = (soap.plan.medications || []).filter(m => m.name.trim() !== '');
    if (validMedications.length > 0) {
        events.push({
            event_type: 'prescription',
            content: {
                medications: validMedications,
            },
        });
    }
    if (soap.objective.bloodPressure || soap.objective.heartRate || soap.objective.temperature || soap.objective.spo2 || soap.objective.weight) {
        events.push({
            event_type: 'note',
            content: {
                title: 'Vitals',
                bp: soap.objective.bloodPressure,
                heart_rate: soap.objective.heartRate,
                temperature: soap.objective.temperature,
                spo2: soap.objective.spo2,
                weight: soap.objective.weight,
            },
        });
    }
    return {
        patient_id: patientId,
        events,
    };
}
