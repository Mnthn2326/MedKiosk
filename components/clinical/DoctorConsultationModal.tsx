'use client';

import React, { useState } from 'react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface DoctorConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientCode: string;
  contributorId: string;
  onSuccess: () => void;
}

export default function DoctorConsultationModal({
  isOpen,
  onClose,
  patientId,
  patientCode,
  contributorId,
  onSuccess,
}: DoctorConsultationModalProps) {
  // Section 1: Diagnosis & Clinical Impression
  const [diagnosisTitle, setDiagnosisTitle] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [severity, setSeverity] = useState('Mild');
  const [status, setStatus] = useState('Suspected');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalObservation, setClinicalObservation] = useState('');

  // Section 2: Prescriptions (Rx)
  const [medications, setMedications] = useState<Medication[]>([]);

  // Section 3: Vitals
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [vitalsExpanded, setVitalsExpanded] = useState(false);

  // Section 4: AI Scribe Assistant
  const [aiNotes, setAiNotes] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    const newMeds = [...medications];
    newMeds.splice(index, 1);
    setMedications(newMeds);
  };

  const handleMedicationChange = (
    index: number,
    field: keyof Medication,
    value: string
  ) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;
    setMedications(newMeds);
  };

  const handleAiAutoStructure = async () => {
    if (!aiNotes.trim()) return;
    setIsAiLoading(true);
    setAiError('');

    try {
      const response = await fetch('/api/doctor/ai-scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_notes: aiNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse AI scribe notes.');
      }

      const data = await response.json();
      
      // Auto-fill form fields from nested AI response structure
      if (data.diagnosis) {
        if (data.diagnosis.title) setDiagnosisTitle(data.diagnosis.title);
        if (data.diagnosis.icd_code) setIcdCode(data.diagnosis.icd_code);
        if (data.diagnosis.severity) setSeverity(data.diagnosis.severity);
        if (data.diagnosis.clinical_impression) setClinicalObservation(data.diagnosis.clinical_impression);
      }
      
      if (data.symptoms) {
        if (data.symptoms.chief_complaint) setChiefComplaint(data.symptoms.chief_complaint);
      }
      
      if (data.vitals) {
        if (data.vitals.bp) setBloodPressure(data.vitals.bp);
        if (data.vitals.heart_rate) setHeartRate(data.vitals.heart_rate);
        if (data.vitals.temperature) setTemperature(data.vitals.temperature);
        if (data.vitals.spo2) setSpo2(data.vitals.spo2);
        if (data.vitals.weight) setWeight(data.vitals.weight);
        setVitalsExpanded(true);
      }

      if (data.prescriptions && Array.isArray(data.prescriptions)) {
        setMedications(data.prescriptions.map((p: { medication: string; dosage: string; frequency: string; duration: string; instructions: string }) => ({
          name: p.medication || '',
          dosage: p.dosage || '',
          frequency: p.frequency || '',
          duration: p.duration || '',
          instructions: p.instructions || '',
        })));
      }
      
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setAiError(errorObj?.message || 'Error processing notes');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!diagnosisTitle.trim()) {
      alert('Diagnosis Title is required');
      return;
    }

    setIsSubmitting(true);
    
    const events: Array<{ event_type: string; content: Record<string, unknown> }> = [
      {
        event_type: 'diagnosis',
        content: {
          title: diagnosisTitle,
          icd_code: icdCode,
          severity,
          status,
          chief_complaint: chiefComplaint,
          clinical_observation: clinicalObservation,
        },
      },
    ];

    const validMedications = medications.filter(m => m.name.trim() !== '');
    if (validMedications.length > 0) {
      events.push({
        event_type: 'prescription',
        content: {
          medications: validMedications,
        },
      });
    }

    if (bloodPressure || heartRate || temperature || spo2 || weight) {
      events.push({
        event_type: 'note',
        content: {
          title: 'Vitals',
          bp: bloodPressure,
          heart_rate: heartRate,
          temperature,
          spo2,
          weight,
        },
      });
    }

    try {
      const payload = {
        patient_id: patientId,
        contributor_id: contributorId,
        events,
      };

      const response = await fetch('/api/clinical-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit consultation');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj?.message || 'Error submitting consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#1B2B2E]">🩺 Record Consultation</h2>
            <span className="px-2 py-1 text-xs font-medium bg-[#0F4C5C]/10 text-[#0F4C5C] rounded-md">
              {patientCode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#1B2B2E] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 4: AI Scribe Assistant */}
          <section className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              ✨ AI Scribe Assistant
            </h3>
            <textarea
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder="Paste your rough notes here... e.g. 'Pt c/o headache x 3 days, BP 140/90, Tab Amlodipine 5mg OD'"
              className="w-full h-24 p-3 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-500">{aiError}</span>
              <button
                onClick={handleAiAutoStructure}
                disabled={isAiLoading || !aiNotes.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isAiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  '✨ AI Auto-Structure'
                )}
              </button>
            </div>
          </section>

          {/* Section 1: Diagnosis & Clinical Impression */}
          <section>
            <h3 className="text-lg font-semibold text-[#1B2B2E] mb-4 border-b border-[#E2E8F0] pb-2">
              1. Diagnosis & Clinical Impression
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1B2B2E] mb-1">Diagnosis Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={diagnosisTitle}
                  onChange={(e) => setDiagnosisTitle(e.target.value)}
                  placeholder="e.g. Acute Pharyngitis"
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1B2B2E] mb-1">ICD-10 Code</label>
                <input
                  type="text"
                  value={icdCode}
                  onChange={(e) => setIcdCode(e.target.value)}
                  placeholder="e.g. J02.9"
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1B2B2E] mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  >
                    <option>Mild</option>
                    <option>Moderate</option>
                    <option>Severe</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2B2E] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  >
                    <option>Suspected</option>
                    <option>Confirmed</option>
                    <option>Chronic</option>
                    <option>Follow-up</option>
                    <option>Resolved</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1B2B2E] mb-1">Chief Complaint</label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Patient's primary complaint..."
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none resize-none h-20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1B2B2E] mb-1">Clinical Observation / Notes</label>
                <textarea
                  value={clinicalObservation}
                  onChange={(e) => setClinicalObservation(e.target.value)}
                  placeholder="Findings from examination..."
                  className="w-full p-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none resize-none h-24"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Prescriptions (Rx) */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-[#E2E8F0] pb-2">
              <h3 className="text-lg font-semibold text-[#1B2B2E]">2. Prescriptions (Rx)</h3>
              <button
                onClick={handleAddMedication}
                className="px-3 py-1.5 text-sm font-medium text-[#D85A30] bg-[#D85A30]/10 hover:bg-[#D85A30]/20 rounded-lg transition-colors flex items-center gap-1"
              >
                + Add Medication
              </button>
            </div>
            
            <div className="space-y-3">
              {medications.length === 0 ? (
                <p className="text-sm text-[#64748B] italic text-center py-4 border border-dashed border-[#E2E8F0] rounded-xl">
                  No medications added.
                </p>
              ) : (
                medications.map((med, idx) => (
                  <div key={idx} className="relative p-4 border border-[#E2E8F0] rounded-xl bg-gray-50/50">
                    <button
                      onClick={() => handleRemoveMedication(idx)}
                      className="absolute top-2 right-2 p-1 text-[#64748B] hover:text-[#C1121F] rounded-full hover:bg-red-50 transition-colors"
                      title="Remove medication"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pr-6">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Medication</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 500mg"
                          className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Frequency</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                          placeholder="e.g. 1-0-1"
                          className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                          placeholder="e.g. 5 days"
                          className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">Instructions</label>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                          placeholder="After meals"
                          className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section 3: Vitals */}
          <section>
            <div 
              className="flex items-center justify-between cursor-pointer border-b border-[#E2E8F0] pb-2"
              onClick={() => setVitalsExpanded(!vitalsExpanded)}
            >
              <h3 className="text-lg font-semibold text-[#1B2B2E]">3. Vitals (Optional)</h3>
              <button className="text-[#64748B]">
                <svg className={`w-5 h-5 transition-transform ${vitalsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {vitalsExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                    className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">HR (bpm)</label>
                  <input
                    type="text"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="72"
                    className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Temp (°F)</label>
                  <input
                    type="text"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="98.6"
                    className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">SpO2 (%)</label>
                  <input
                    type="text"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="99"
                    className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    className="w-full p-2 text-sm border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E2E8F0] bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !diagnosisTitle.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#0F4C5C] rounded-lg hover:bg-[#0F4C5C]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Consultation'}
          </button>
        </div>

      </div>
    </div>
  );
}
