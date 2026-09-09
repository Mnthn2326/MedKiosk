import React from 'react';
import type { ClinicalEvent } from '@/types/database';
import { TrustTierBadge } from './TrustTierBadge';

interface EventCardProps {
  event: ClinicalEvent;
  readOnly?: boolean;
}

/* ── Severity badge color mapping ── */
const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  severe: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  suspected: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-teal-100 text-teal-700',
  chronic: 'bg-purple-100 text-purple-700',
  'follow-up': 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

/* ── Helpers ── */
const formatKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function SmallBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
      {label}
    </span>
  );
}

/* ── Diagnosis renderer ── */
function DiagnosisContent({ content }: { content: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const icdCode = content.icd_code as string | undefined;
  const severity = (content.severity as string | undefined)?.toLowerCase();
  const status = (content.status as string | undefined)?.toLowerCase();
  const chiefComplaint = content.chief_complaint as string | undefined;
  const clinicalObs = content.clinical_observation as string | undefined;
  const symptomsDuration = content.symptoms_duration as string | undefined;
  const description = content.description as string | undefined;

  return (
    <div className="space-y-3">
      {/* Title + badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {title && <span className="text-base font-semibold text-text-primary">{title}</span>}
        {icdCode && (
          <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-semibold">
            ICD-10: {icdCode}
          </span>
        )}
        {severity && (
          <SmallBadge label={severity} colorClass={SEVERITY_COLORS[severity] || 'bg-gray-100 text-gray-600'} />
        )}
        {status && (
          <SmallBadge label={status} colorClass={STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'} />
        )}
      </div>

      {chiefComplaint && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chief Complaint</span>
          <p className="text-sm text-text-primary mt-0.5">{chiefComplaint}</p>
        </div>
      )}
      {symptomsDuration && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Duration</span>
          <p className="text-sm text-text-primary mt-0.5">{symptomsDuration}</p>
        </div>
      )}
      {description && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Description</span>
          <p className="text-sm text-text-primary mt-0.5">{description}</p>
        </div>
      )}
      {clinicalObs && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Clinical Observation</span>
          <p className="text-sm text-text-primary mt-0.5">{clinicalObs}</p>
        </div>
      )}
    </div>
  );
}

/* ── Prescription renderer ── */
interface Medication {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

function PrescriptionContent({ content }: { content: Record<string, unknown> }) {
  const medications = content.medications as Medication[] | undefined;

  // If medications array exists, render table
  if (medications && Array.isArray(medications) && medications.length > 0) {
    return (
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Rx — {medications.length} Medication{medications.length > 1 ? 's' : ''}
        </span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/5 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-text-muted rounded-tl-lg">#</th>
                <th className="px-3 py-2 text-xs font-semibold text-text-muted">Medication</th>
                <th className="px-3 py-2 text-xs font-semibold text-text-muted">Dosage</th>
                <th className="px-3 py-2 text-xs font-semibold text-text-muted">Frequency</th>
                <th className="px-3 py-2 text-xs font-semibold text-text-muted">Duration</th>
                <th className="px-3 py-2 text-xs font-semibold text-text-muted rounded-tr-lg">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med, idx) => (
                <tr key={idx} className="border-b border-border/30 last:border-0">
                  <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{med.medication}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                      {med.dosage}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary">{med.frequency}</td>
                  <td className="px-3 py-2 text-text-primary">{med.duration}</td>
                  <td className="px-3 py-2 text-text-muted italic">{med.instructions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback: single-drug legacy format (medication, dosage, frequency, duration, notes)
  if (content.medication) {
    const dosage = content.dosage ? String(content.dosage) : '';
    const frequency = content.frequency ? String(content.frequency) : '';
    const duration = content.duration ? String(content.duration) : '';
    const notes = content.notes ? String(content.notes) : '';
    return (
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Rx</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text-primary">{String(content.medication)}</span>
          {dosage && (
            <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
              {dosage}
            </span>
          )}
          {frequency && <span className="text-sm text-text-primary">· {frequency}</span>}
          {duration && <span className="text-sm text-text-muted">for {duration}</span>}
        </div>
        {notes && <p className="text-sm text-text-muted italic">{notes}</p>}
      </div>
    );
  }

  return null;
}

/* ── Vitals renderer ── */
function VitalsContent({ content }: { content: Record<string, unknown> }) {
  const vitalKeys = [
    { key: 'bp', label: 'BP', unit: 'mmHg', icon: '🫀' },
    { key: 'heart_rate', label: 'HR', unit: 'bpm', icon: '💓' },
    { key: 'temperature', label: 'Temp', unit: '°F', icon: '🌡️' },
    { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁' },
    { key: 'weight', label: 'Weight', unit: 'kg', icon: '⚖️' },
  ];

  const hasVitals = vitalKeys.some((v) => content[v.key]);

  // Check if this is a vitals note (title === 'Vitals')
  const isVitalsNote = (content.title as string)?.toLowerCase() === 'vitals';

  if (!isVitalsNote && !hasVitals) return null;

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vitals</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {vitalKeys.map((v) => {
          const val = content[v.key] as string | undefined;
          if (!val) return null;
          return (
            <div key={v.key} className="bg-primary-light rounded-lg p-3 text-center">
              <span className="text-lg">{v.icon}</span>
              <p className="text-base font-bold text-text-primary mt-1">
                {val}
                <span className="text-xs font-normal text-text-muted ml-1">{v.unit}</span>
              </p>
              <p className="text-xs text-text-muted">{v.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main EventCard ── */
export function EventCard({ event, readOnly: _readOnly = false }: EventCardProps) {
  const isAiSummary = event.event_type === 'ai_summary';
  const isDiagnosis = event.event_type === 'diagnosis';
  const isPrescription = event.event_type === 'prescription';
  const isVitalsNote =
    event.event_type === 'note' &&
    (event.content.title as string)?.toLowerCase() === 'vitals';

  const borderClass = isAiSummary
    ? 'border-l-4 border-accent'
    : isDiagnosis
      ? 'border-l-4 border-primary'
      : isPrescription
        ? 'border-l-4 border-success'
        : 'border-border';

  const typeIcon = isDiagnosis
    ? '🩺'
    : isPrescription
      ? '💊'
      : isVitalsNote
        ? '📊'
        : event.event_type === 'lab_report'
          ? '🧪'
          : event.event_type === 'note'
            ? '📝'
            : '';

  return (
    <div className={`bg-white border shadow-sm rounded-xl overflow-hidden ${borderClass}`}>
      {/* Header */}
      <div className="px-6 py-4 flex flex-row items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-sm font-semibold capitalize text-text-primary flex items-center gap-1.5">
          {typeIcon && <span>{typeIcon}</span>}
          {event.event_type.replace('_', ' ')}
        </h3>
        <TrustTierBadge tier={event.trust_tier} />
      </div>

      {/* Contributor info */}
      {event.contributor && (
        <div className="px-6 pt-2 text-sm text-text-muted">
          Contributor: {event.contributor.type || 'Unknown'}{' '}
          {event.contributor.domain ? `• ${event.contributor.domain}` : ''}
          {event.contributor.user?.name ? ` — ${event.contributor.user.name}` : ''}
        </div>
      )}

      {/* Content body — smart rendering by event_type */}
      <div className="px-6 py-4">
        {isDiagnosis ? (
          <DiagnosisContent content={event.content} />
        ) : isPrescription ? (
          <PrescriptionContent content={event.content} />
        ) : isVitalsNote ? (
          <VitalsContent content={event.content} />
        ) : (
          /* Default: generic key-value rendering */
          <div className="space-y-2 text-sm">
            {Object.entries(event.content).map(([key, value]) => {
              if (key === 'rejected') return null;
              // If the value is an array or object, JSON-stringify it
              const display =
                typeof value === 'object' && value !== null
                  ? JSON.stringify(value, null, 2)
                  : String(value);
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="font-medium text-text-muted w-1/3">{formatKey(key)}:</span>
                  <span className="text-text-primary flex-1 whitespace-pre-wrap">{display}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer timestamp */}
      <div className="px-6 py-3 bg-gray-50 text-xs text-text-muted border-t border-border/50">
        {new Date(event.created_at).toLocaleString()}
      </div>
    </div>
  );
}

export default EventCard;
