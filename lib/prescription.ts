/**
 * @file lib/prescription.ts
 *
 * Clinical Prescription Resolution Utilities for MedNotes.
 */

export interface MedicationItem {
  name?: string;
  medication?: string;
  dosage?: string | number;
  frequency?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

/**
 * Resolves the canonical medication name from a medication entry.
 * Follows the application contract:
 * 1. `name` is canonical (used in SOAP consultation plan & payloadBuilder).
 * 2. `medication` is legacy/contributor fallback.
 * 3. Returns 'Unnamed Medication' if missing, null, empty, or malformed.
 */
export function getMedicationName(med?: Record<string, unknown> | null): string {
  if (!med || typeof med !== 'object') {
    return 'Unnamed Medication';
  }

  const name = typeof med.name === 'string' ? med.name.trim() : '';
  if (name) return name;

  const medication = typeof med.medication === 'string' ? med.medication.trim() : '';
  if (medication) return medication;

  return 'Unnamed Medication';
}
