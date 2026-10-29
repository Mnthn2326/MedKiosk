/**
 * @file lib/canvasAccess.ts
 *
 * Domain logic and authorization utilities for patient canvas access control (AUTH-03).
 * Enforces server-side doctor-patient access grants, revocation handling,
 * and data isolation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CanvasAccessGrant {
  id?: string;
  patient_id: string;
  doctor_id: string;
  access_level: 'read' | 'read_write' | 'emergency';
  revoked: boolean;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientRegistryItem {
  id: string;
  deidentified_code: string;
  gender: string | null;
  dob: string | null;
}

/**
 * Checks whether an access grant is currently active and valid.
 * A grant is inactive if revoked is true or revoked_at has passed.
 */
export function isGrantActive(
  grant: Partial<CanvasAccessGrant> | null | undefined,
  now = new Date()
): boolean {
  if (!grant || typeof grant !== 'object') return false;
  if (grant.revoked) return false;

  if (grant.revoked_at) {
    const revokedTime = new Date(grant.revoked_at).getTime();
    if (isNaN(revokedTime) || revokedTime <= now.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Filters a list of grants to include only active, non-revoked grants.
 * Pure function: does not mutate the input array.
 */
export function filterActiveGrants(
  grants: CanvasAccessGrant[] | null | undefined,
  now = new Date()
): CanvasAccessGrant[] {
  if (!grants || !Array.isArray(grants)) return [];
  return grants.filter((g) => isGrantActive(g, now));
}

/**
 * Extracts a deduplicated list of authorized patient UUIDs from active grants.
 */
export function extractAuthorizedPatientIds(
  grants: CanvasAccessGrant[] | null | undefined,
  now = new Date()
): string[] {
  const active = filterActiveGrants(grants, now);
  const ids = new Set<string>();
  for (const grant of active) {
    if (grant.patient_id) {
      ids.add(grant.patient_id);
    }
  }
  return Array.from(ids);
}

/**
 * Verifies whether a doctor has an active, non-revoked access grant for a specific patient.
 */
export async function verifyDoctorPatientAccess(
  supabase: SupabaseClient,
  doctorUserId: string,
  patientId: string
): Promise<boolean> {
  if (!doctorUserId || !patientId) return false;

  try {
    const { data: grants, error } = await supabase
      .from('canvas_access')
      .select('id, patient_id, doctor_id, access_level, revoked, revoked_at')
      .eq('doctor_id', doctorUserId)
      .eq('patient_id', patientId)
      .eq('revoked', false)
      .limit(1);

    if (error || !grants || grants.length === 0) {
      return false;
    }

    return isGrantActive(grants[0] as CanvasAccessGrant);
  } catch {
    return false;
  }
}

/**
 * Retrieves the list of patients that the authenticated doctor is explicitly authorized to view.
 */
export async function getAuthorizedPatientsForDoctor(
  supabase: SupabaseClient,
  doctorUserId: string
): Promise<PatientRegistryItem[]> {
  if (!doctorUserId) return [];

  try {
    // 1. Fetch non-revoked access grants for this doctor
    const { data: grants, error: grantError } = await supabase
      .from('canvas_access')
      .select('id, patient_id, doctor_id, access_level, revoked, revoked_at')
      .eq('doctor_id', doctorUserId)
      .eq('revoked', false);

    if (grantError || !grants || grants.length === 0) {
      return [];
    }

    // 2. Filter active grants
    const authorizedPatientIds = extractAuthorizedPatientIds(
      grants as CanvasAccessGrant[]
    );

    if (authorizedPatientIds.length === 0) {
      return [];
    }

    // 3. Query only authorized patients returning minimal registry fields
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, deidentified_code, gender, dob')
      .in('id', authorizedPatientIds);

    if (patientError || !patients) {
      return [];
    }

    return patients as PatientRegistryItem[];
  } catch {
    return [];
  }
}
