'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDraft } from '@/lib/useDraft';
import { buildConsultationPayload, SoapState } from '@/lib/payloadBuilder';
import { useDraftContext } from '@/components/ui/GuardedLink';

interface SoapWorkspaceProps {
  patientId: string;
  userId: string;
  onSuccess: () => void;
}

const INITIAL_SOAP: SoapState = {
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

export default function SoapWorkspace({ patientId, userId, onSuccess }: SoapWorkspaceProps) {
  const {
    draftState,
    setDraftState,
    clearDraft,
    isDirty,
    restored,
  } = useDraft<SoapState>(userId, patientId, INITIAL_SOAP, {
    ttlMs: 86400000,
    debounceMs: 1000,
  });

  const { setIsDirty } = useDraftContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Update GuardedLink context when draft dirtiness changes
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false); // cleanup on unmount
  }, [isDirty, setIsDirty]);

  // ICD-10 Search States
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState<{ code: string; description: string }[]>([]);
  const [isIcdSearching, setIsIcdSearching] = useState(false);
  
  // Medications Search States
  const [medQuery, setMedQuery] = useState('');
  const [medResults, setMedResults] = useState<{ name: string; rxcui: string }[]>([]);
  const [isMedSearching, setIsMedSearching] = useState(false);

  // Debounced ICD-10 Search
  useEffect(() => {
    const searchIcd = async () => {
      if (icdQuery.trim().length < 3) {
        setIcdResults([]);
        return;
      }
      setIsIcdSearching(true);
      try {
        const res = await fetch(`/api/reference/icd10?q=${encodeURIComponent(icdQuery)}`);
        const data = await res.json();
        setIcdResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsIcdSearching(false);
      }
    };
    
    const timeoutId = setTimeout(searchIcd, 500);
    return () => clearTimeout(timeoutId);
  }, [icdQuery]);

  // Debounced Medication Search
  useEffect(() => {
    const searchMed = async () => {
      if (medQuery.trim().length < 3) {
        setMedResults([]);
        return;
      }
      setIsMedSearching(true);
      try {
        const res = await fetch(`/api/reference/medications?q=${encodeURIComponent(medQuery)}`);
        const data = await res.json();
        setMedResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsMedSearching(false);
      }
    };
    
    const timeoutId = setTimeout(searchMed, 500);
    return () => clearTimeout(timeoutId);
  }, [medQuery]);

  const handleUpdate = (section: keyof SoapState, field: string, value: unknown) => {
    setDraftState(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof SoapState],
        [field]: value
      }
    }));
  };

  const handleAddMedication = (name: string) => {
    setDraftState(prev => ({
      ...prev,
      plan: {
        ...prev.plan,
        medications: [...prev.plan.medications, { name, dosage: '', frequency: '', duration: '', instructions: '' }]
      }
    }));
    setMedQuery('');
    setMedResults([]);
  };

  const submitGuard = useRef(false);

  const handleSubmit = async () => {
    if (submitGuard.current) return; // double-submit protection
    if (!draftState.assessment.diagnosisTitle.trim()) {
      setError('Diagnosis Title is required');
      return;
    }

    submitGuard.current = true;
    setIsSubmitting(true);
    setError('');

    try {
      const payload = buildConsultationPayload(draftState, patientId);
      
      const response = await fetch('/api/clinical-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit consultation');
      }

      clearDraft();
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Error submitting consultation');
    } finally {
      setIsSubmitting(false);
      submitGuard.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-border p-4 overflow-y-auto">
      {restored && (
        <div className="mb-4 p-2 bg-amber-50 text-amber-800 text-sm rounded-md flex items-center gap-2 border border-amber-200">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Unsaved draft restored.
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20">
          {error}
        </div>
      )}

      <div className="space-y-6 pb-20">
        {/* S - Subjective */}
        <section>
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">S</span>
            Subjective
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Chief Complaint / HPI</label>
              <textarea 
                className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                placeholder="Patient reports..."
                value={draftState.subjective.chiefComplaint}
                onChange={e => handleUpdate('subjective', 'chiefComplaint', e.target.value)}
              />
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* O - Objective */}
        <section>
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">O</span>
            Objective
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">BP</label>
                <input type="text" placeholder="120/80" className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={draftState.objective.bloodPressure} onChange={e => handleUpdate('objective', 'bloodPressure', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">HR</label>
                <input type="text" placeholder="bpm" className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={draftState.objective.heartRate} onChange={e => handleUpdate('objective', 'heartRate', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Temp</label>
                <input type="text" placeholder="°F/°C" className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={draftState.objective.temperature} onChange={e => handleUpdate('objective', 'temperature', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">SpO2</label>
                <input type="text" placeholder="%" className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={draftState.objective.spo2} onChange={e => handleUpdate('objective', 'spo2', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Weight</label>
                <input type="text" placeholder="kg/lbs" className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={draftState.objective.weight} onChange={e => handleUpdate('objective', 'weight', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Clinical Observations / Physical Exam</label>
              <textarea 
                className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                placeholder="Findings..."
                value={draftState.objective.clinicalObservation}
                onChange={e => handleUpdate('objective', 'clinicalObservation', e.target.value)}
              />
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* A - Assessment */}
        <section>
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">A</span>
            Assessment
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Diagnosis Title *</label>
                <input 
                  type="text" 
                  className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={draftState.assessment.diagnosisTitle}
                  onChange={e => handleUpdate('assessment', 'diagnosisTitle', e.target.value)}
                  placeholder="e.g. Essential hypertension"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-text-muted mb-1">ICD-10 Code</label>
                <input 
                  type="text" 
                  className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={icdQuery}
                  onChange={e => {
                    setIcdQuery(e.target.value);
                    if (e.target.value === '') handleUpdate('assessment', 'icdCode', '');
                  }}
                  placeholder={draftState.assessment.icdCode ? `Selected: ${draftState.assessment.icdCode}` : "Search NLM..."}
                />
                {isIcdSearching && <span className="absolute right-3 top-7 text-xs text-text-muted">...</span>}
                {icdResults.length > 0 && icdQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {icdResults.map((r, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                        onClick={() => {
                          handleUpdate('assessment', 'icdCode', r.code);
                          handleUpdate('assessment', 'diagnosisTitle', r.description);
                          setIcdQuery('');
                          setIcdResults([]);
                        }}
                      >
                        <span className="font-mono font-medium text-primary">{r.code}</span> - {r.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Severity</label>
                <select 
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={draftState.assessment.severity}
                  onChange={e => handleUpdate('assessment', 'severity', e.target.value)}
                >
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select 
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={draftState.assessment.status}
                  onChange={e => handleUpdate('assessment', 'status', e.target.value)}
                >
                  <option>Suspected</option>
                  <option>Active</option>
                  <option>Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* P - Plan */}
        <section>
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">P</span>
            Plan & Prescriptions
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-medium text-text-muted mb-1">Search Medication (RxNorm)</label>
              <input 
                type="text" 
                className="w-full border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={medQuery}
                onChange={e => setMedQuery(e.target.value)}
                placeholder="Search medication name..."
              />
              {isMedSearching && <span className="absolute right-3 top-7 text-xs text-text-muted">...</span>}
              {medResults.length > 0 && medQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {medResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                      onClick={() => handleAddMedication(r.name)}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {draftState.plan.medications.length > 0 && (
              <div className="space-y-3 mt-4">
                {draftState.plan.medications.map((med, i) => (
                  <div key={i} className="p-3 bg-primary-light rounded-lg border border-border relative">
                    <button 
                      onClick={() => {
                        const newMeds = [...draftState.plan.medications];
                        newMeds.splice(i, 1);
                        handleUpdate('plan', 'medications', newMeds);
                      }}
                      className="absolute top-2 right-2 text-text-muted hover:text-danger p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="font-semibold text-sm text-primary mb-2">{med.name}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input className="border border-border rounded p-1.5 text-xs" placeholder="Dosage" value={med.dosage} onChange={e => {
                        const newMeds = [...draftState.plan.medications];
                        newMeds[i].dosage = e.target.value;
                        handleUpdate('plan', 'medications', newMeds);
                      }} />
                      <input className="border border-border rounded p-1.5 text-xs" placeholder="Frequency" value={med.frequency} onChange={e => {
                        const newMeds = [...draftState.plan.medications];
                        newMeds[i].frequency = e.target.value;
                        handleUpdate('plan', 'medications', newMeds);
                      }} />
                      <input className="border border-border rounded p-1.5 text-xs" placeholder="Duration" value={med.duration} onChange={e => {
                        const newMeds = [...draftState.plan.medications];
                        newMeds[i].duration = e.target.value;
                        handleUpdate('plan', 'medications', newMeds);
                      }} />
                      <input className="border border-border rounded p-1.5 text-xs" placeholder="Instructions" value={med.instructions} onChange={e => {
                        const newMeds = [...draftState.plan.medications];
                        newMeds[i].instructions = e.target.value;
                        handleUpdate('plan', 'medications', newMeds);
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Sticky footer for submit */}
      <div className="sticky bottom-0 left-0 w-full p-4 bg-white border-t border-border mt-auto flex justify-end items-center gap-3">
        {isDirty && <span className="text-xs text-text-muted italic mr-auto">Unsaved changes...</span>}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !draftState.assessment.diagnosisTitle.trim()}
          className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? 'Saving...' : 'Submit Note'}
        </button>
      </div>
    </div>
  );
}
