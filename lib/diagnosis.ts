/**
 * @file lib/diagnosis.ts
 *
 * Clinical Diagnosis Resolution Utilities for MedNotes.
 */

/**
 * Resolves the canonical diagnosis title from clinical event content.
 * Follows the application contract:
 * 1. `title` is canonical (used by SoapWorkspace and ContributorForm).
 * 2. `diagnosis` is legacy/compatibility fallback.
 * 3. Returns 'Clinical Diagnosis' if missing, null, empty, or malformed.
 */
export function getDiagnosisTitle(content?: Record<string, unknown> | null): string {
  if (!content || typeof content !== 'object') {
    return 'Clinical Diagnosis';
  }

  const title = typeof content.title === 'string' ? content.title.trim() : '';
  if (title) return title;

  const diagnosis = typeof content.diagnosis === 'string' ? content.diagnosis.trim() : '';
  if (diagnosis) return diagnosis;

  return 'Clinical Diagnosis';
}
