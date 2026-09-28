import React from 'react';
import type { ClinicalEvent } from '@/types/database';
import { TrustTierBadge } from './TrustTierBadge';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import type { BadgeStatus, BadgeLabel } from '@/components/ui/Badge';

interface EventCardProps {
  event: ClinicalEvent;
  readOnly?: boolean; // Unused for now, but good to have if we add edit actions
}

function formatKey(key: string): string {
  if (key === 'icd_code') return 'ICD-10';
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Map severity string to our semantic BadgeStatus
function getSeverityStatus(severity: string | undefined): BadgeStatus {
  const lower = severity?.toLowerCase();
  if (lower === 'critical' || lower === 'high') return 'critical';
  if (lower === 'moderate') return 'abnormal';
  if (lower === 'mild' || lower === 'low') return 'pending';
  return 'confirmed'; // Default generic fallback for OK statuses
}

// Map status string to our semantic BadgeStatus
function getStatusStatus(status: string | undefined): BadgeStatus {
  const lower = status?.toLowerCase();
  if (lower === 'active' || lower === 'pending') return 'pending';
  if (lower === 'resolved' || lower === 'completed') return 'confirmed';
  if (lower === 'worsening' || lower === 'unstable') return 'abnormal';
  return 'pending';
}

/* Diagnosis renderer */
function DiagnosisContent({ content }: { content: Record<string, unknown> }) {
  const diagnosis = content.diagnosis as string | undefined;
  const icd = content.icd_code as string | undefined;
  const severity = (content.severity as string | undefined)?.toLowerCase();
  const status = (content.status as string | undefined)?.toLowerCase();
  const notes = content.notes as string | undefined;

  return (
    <div className="space-y-3">
      {/* Title + badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-lg font-bold text-text-primary">
          {diagnosis || 'Unknown Diagnosis'}
        </h4>
        {severity && (
          <Badge 
            status={getSeverityStatus(severity)} 
            label={severity.charAt(0).toUpperCase() + severity.slice(1) as BadgeLabel} 
          />
        )}
        {status && (
          <Badge 
            status={getStatusStatus(status)} 
            label={status.charAt(0).toUpperCase() + status.slice(1) as BadgeLabel} 
          />
        )}
      </div>

      {icd && (
        <div className="text-sm">
          <span className="font-semibold text-text-muted">ICD-10: </span>
          <span className="text-text-primary tabular-nums">{icd}</span>
        </div>
      )}
      {notes && <p className="text-sm text-text-muted mt-2">{notes}</p>}
    </div>
  );
}

/* Prescription renderer */
function PrescriptionContent({ content }: { content: Record<string, unknown> }) {
  const isMulti = Array.isArray(content.medications);
  if (isMulti) {
    const medications = content.medications as Array<{
      medication: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
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
                  <td className="px-3 py-2 text-text-muted tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{med.medication}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold tabular-nums">
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

  // Fallback: single-drug legacy format
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
            <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold tabular-nums">
              {dosage}
            </span>
          )}
          {frequency && <span className="text-sm text-text-primary">× {frequency}</span>}
          {duration && <span className="text-sm text-text-muted">for {duration}</span>}
        </div>
        {notes && <p className="text-sm text-text-muted italic">{notes}</p>}
      </div>
    );
  }

  return null;
}

/* Vitals renderer */
function VitalsContent({ content }: { content: Record<string, unknown> }) {
  const vitalKeys = [
    { key: 'bp', label: 'BP', unit: 'mmHg', iconName: 'heart' as const },
    { key: 'heart_rate', label: 'HR', unit: 'bpm', iconName: 'heart' as const },
    { key: 'temperature', label: 'Temp', unit: '°F', iconName: 'temperature' as const },
    { key: 'spo2', label: 'SpO2', unit: '%', iconName: 'vitals' as const },
    { key: 'weight', label: 'Weight', unit: 'kg', iconName: 'weight' as const },
  ];

  const hasVitals = vitalKeys.some((v) => content[v.key]);

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
            <div key={v.key} className="bg-primary-light rounded-lg p-3 text-center flex flex-col items-center">
              <Icon name={v.iconName} size={20} className="text-text-muted mb-1" />
              <p className="text-base font-bold text-text-primary mt-1 tabular-nums">
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

/* Main EventCard */
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

  const typeIconName = isDiagnosis
    ? 'diagnosis'
    : isPrescription
      ? 'prescription'
      : isVitalsNote
        ? 'vitals'
        : event.event_type === 'lab_report'
          ? 'lab'
          : event.event_type === 'note'
            ? 'notes'
            : isAiSummary
              ? 'ai'
              : undefined;

  return (
    <div className={`bg-white border shadow-sm rounded-xl overflow-hidden ${borderClass}`}>
      {/* Header */}
      <div className="px-6 py-4 flex flex-row items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-sm font-semibold capitalize text-text-primary flex items-center gap-1.5">
          {typeIconName && <Icon name={typeIconName as IconName} size={16} className="text-primary" />}
          {event.event_type.replace('_', ' ')}
        </h3>
        <TrustTierBadge tier={event.trust_tier} />
      </div>

      {/* Contributor info */}
      {event.contributor && (
        <div className="px-6 pt-2 text-sm text-text-muted">
          Contributor: {event.contributor.type || 'Unknown'}{' '}
          {event.contributor.domain ? `| ${event.contributor.domain}` : ''}
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
      <div className="px-6 py-3 bg-gray-50 text-xs text-text-muted border-t border-border/50 tabular-nums">
        {new Date(event.created_at).toLocaleString()}
      </div>
    </div>
  );
}

export default EventCard;
