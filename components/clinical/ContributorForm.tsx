'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrustTierBadge } from './TrustTierBadge';
import { toast } from 'sonner';
import type { EventType, TrustTier } from '@/types/database';

interface ContributorFormProps {
  contributorId: string;
  contributorType: 'doctor' | 'lab' | 'diagnostic_center';
}

export function ContributorForm({ contributorId, contributorType }: ContributorFormProps) {
  const supabase = createClient();
  const [deidentifiedCode, setDeidentifiedCode] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  
  const [eventType, setEventType] = useState<Exclude<EventType, 'ai_summary'>>('diagnosis');
  const [content, setContent] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trustTier: TrustTier = contributorType === 'doctor' ? 'doctor_confirmed' : 'institution_verified';

  const handleSearchPatient = async () => {
    if (!deidentifiedCode) return;
    setSearchStatus('searching');
    setPatientId(null);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('deidentified_code', deidentifiedCode)
        .single();
      
      if (error || !data) {
        setSearchStatus('not_found');
      } else {
        setPatientId(data.id);
        setSearchStatus('found');
      }
    } catch {
      setSearchStatus('not_found');
    }
  };

  const handleContentChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error('Please search and verify a patient first.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/clinical-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deidentified_code: deidentifiedCode,
          event_type: eventType,
          trust_tier: trustTier,
          content,
          contributor_id: contributorId
        })
      });
      
      if (response.ok) {
        toast.success('Event added successfully.');
        setContent({});
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to add event.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (patientId && !isSubmitting) {
          e.preventDefault();
          // We must trigger the form submission with a mock event
          handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [patientId, isSubmitting, deidentifiedCode, eventType, trustTier, content, contributorId]); // all dependencies of handleSubmit

  const renderContentFields = () => {
    switch (eventType) {
      case 'diagnosis':
        return (
          <>
            <InputField label="Title" value={content.title || ''} onChange={(v) => handleContentChange('title', v)} required />
            <TextareaField label="Description" value={content.description || ''} onChange={(v) => handleContentChange('description', v)} required />
            <InputField label="ICD Code (Optional)" value={content.icd_code || ''} onChange={(v) => handleContentChange('icd_code', v)} />
          </>
        );
      case 'prescription':
        return (
          <>
            <InputField label="Medication" value={content.medication || ''} onChange={(v) => handleContentChange('medication', v)} required />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Dosage" value={content.dosage || ''} onChange={(v) => handleContentChange('dosage', v)} required />
              <InputField label="Frequency" value={content.frequency || ''} onChange={(v) => handleContentChange('frequency', v)} required />
            </div>
            <InputField label="Duration" value={content.duration || ''} onChange={(v) => handleContentChange('duration', v)} required />
            <TextareaField label="Notes (Optional)" value={content.notes || ''} onChange={(v) => handleContentChange('notes', v)} />
          </>
        );
      case 'lab_report':
        return (
          <>
            <InputField label="Test Name" value={content.test_name || ''} onChange={(v) => handleContentChange('test_name', v)} required />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Result" value={content.result || ''} onChange={(v) => handleContentChange('result', v)} required />
              <InputField label="Unit" value={content.unit || ''} onChange={(v) => handleContentChange('unit', v)} required />
            </div>
            <InputField label="Reference Range (Optional)" value={content.reference_range || ''} onChange={(v) => handleContentChange('reference_range', v)} />
            <TextareaField label="Notes (Optional)" value={content.notes || ''} onChange={(v) => handleContentChange('notes', v)} />
          </>
        );
      case 'note':
        return (
          <>
            <InputField label="Title" value={content.title || ''} onChange={(v) => handleContentChange('title', v)} required />
            <TextareaField label="Body" value={content.body || ''} onChange={(v) => handleContentChange('body', v)} required />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-xl p-6 border border-border">
      <h2 className="text-xl font-bold mb-6 text-text-primary">Add Clinical Event</h2>
      
      <div className="mb-6 space-y-2">
        <label className="block text-sm font-medium text-text-primary">Patient De-identified Code</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 p-2 border border-border rounded-lg text-sm"
            value={deidentifiedCode}
            onChange={(e) => setDeidentifiedCode(e.target.value)}
            placeholder="Enter code (e.g. MK-1234)"
          />
          <button 
            type="button"
            onClick={handleSearchPatient}
            disabled={searchStatus === 'searching'}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {searchStatus === 'searching' ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchStatus === 'found' && <p className="text-sm text-success font-medium">Patient found.</p>}
        {searchStatus === 'not_found' && <p className="text-sm text-danger font-medium">Patient not found.</p>}
      </div>

      {patientId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Event Type</label>
              <select 
                className="w-full p-2 border border-border rounded-lg text-sm"
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value as Exclude<EventType, 'ai_summary'>);
                  setContent({});
                }}
              >
                <option value="diagnosis">Diagnosis</option>
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab Report</option>
                <option value="note">Clinical Note</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Trust Tier</label>
              <TrustTierBadge tier={trustTier} />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="font-medium text-text-primary">Event Details</h3>
            {renderContentFields()}
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Event'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, required }: { label: string, value: string, onChange: (v: string) => void, required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input 
        type="text" 
        className="w-full p-2 border border-border rounded-lg text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, required }: { label: string, value: string, onChange: (v: string) => void, required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <textarea 
        className="w-full p-2 border border-border rounded-lg text-sm"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

export default ContributorForm;
