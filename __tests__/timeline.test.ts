import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  sortEventsChronologically,
  filterEventsByTier,
  getEventTimestamp,
} from '../lib/timeline.ts';
import type { ClinicalEvent } from '../types/database.ts';

function createEvent(
  id: string,
  createdAt?: string,
  trustTier: ClinicalEvent['trust_tier'] = 'doctor_confirmed',
  eventType: ClinicalEvent['event_type'] = 'diagnosis'
): ClinicalEvent {
  return {
    id,
    patient_id: 'pat-001',
    contributor_id: 'contrib-001',
    event_type: eventType,
    trust_tier: trustTier,
    content: { title: `Event ${id}` },
    created_at: createdAt as unknown as string,
  };
}

describe('CC-05: Clinical Timeline Chronological Ordering & Resolution', () => {
  test('sorts events received out of chronological order (newest first by default)', () => {
    const eventOld = createEvent('evt-1', '2026-01-10T10:00:00Z');
    const eventRecent = createEvent('evt-2', '2026-03-15T15:30:00Z');
    const eventMiddle = createEvent('evt-3', '2026-02-20T12:00:00Z');

    const input = [eventOld, eventRecent, eventMiddle];
    const sorted = sortEventsChronologically(input);

    assert.deepStrictEqual(
      sorted.map((e) => e.id),
      ['evt-2', 'evt-3', 'evt-1'],
      'Should sort newest to oldest: March -> Feb -> Jan'
    );
  });

  test('intertwines mixed trust tiers strictly by chronological date (not by tier buckets)', () => {
    const acuteDoctorNote = createEvent('evt-doc-recent', '2026-04-10T09:00:00Z', 'doctor_confirmed');
    const verifiedLabReport = createEvent('evt-lab', '2026-04-08T14:00:00Z', 'institution_verified');
    const patientUploadedScan = createEvent('evt-upload', '2026-04-05T11:00:00Z', 'patient_uploaded');
    const selfReportedSymptom = createEvent('evt-self', '2026-04-01T08:00:00Z', 'self_reported');
    const olderDoctorConsult = createEvent('evt-doc-old', '2026-03-25T10:00:00Z', 'doctor_confirmed');

    // Input shuffled across tiers
    const input = [selfReportedSymptom, olderDoctorConsult, acuteDoctorNote, patientUploadedScan, verifiedLabReport];
    const sorted = sortEventsChronologically(input);

    const expectedOrder = [
      'evt-doc-recent', // Apr 10
      'evt-lab',        // Apr 8
      'evt-upload',     // Apr 5
      'evt-self',       // Apr 1
      'evt-doc-old',    // Mar 25
    ];

    assert.deepStrictEqual(
      sorted.map((e) => e.id),
      expectedOrder,
      'Timeline must reflect true chronological progression of illness across all tiers'
    );
  });

  test('handles equal timestamps deterministically using event id as tie-breaker', () => {
    const eventA = createEvent('evt-A', '2026-05-01T12:00:00Z');
    const eventB = createEvent('evt-B', '2026-05-01T12:00:00Z');

    const sortedDesc = sortEventsChronologically([eventA, eventB], 'desc');
    const sortedAsc = sortEventsChronologically([eventA, eventB], 'asc');

    assert.strictEqual(sortedDesc[0].id, 'evt-B');
    assert.strictEqual(sortedDesc[1].id, 'evt-A');

    assert.strictEqual(sortedAsc[0].id, 'evt-A');
    assert.strictEqual(sortedAsc[1].id, 'evt-B');
  });

  test('handles missing or undefined timestamps safely without crashing', () => {
    const validEvent = createEvent('evt-valid', '2026-06-01T10:00:00Z');
    const missingTimeEvent = createEvent('evt-missing', undefined);

    const sorted = sortEventsChronologically([missingTimeEvent, validEvent], 'desc');

    assert.strictEqual(sorted[0].id, 'evt-valid', 'Valid timestamp should appear before missing timestamp');
    assert.strictEqual(sorted[1].id, 'evt-missing');
    assert.strictEqual(getEventTimestamp(missingTimeEvent), 0);
  });

  test('handles invalid date strings deterministically', () => {
    const validEvent = createEvent('evt-valid', '2026-06-01T10:00:00Z');
    const corruptedDateEvent = createEvent('evt-corrupted', 'invalid-iso-date-string');

    assert.strictEqual(getEventTimestamp(corruptedDateEvent), 0);

    const sorted = sortEventsChronologically([corruptedDateEvent, validEvent], 'desc');
    assert.strictEqual(sorted[0].id, 'evt-valid');
    assert.strictEqual(sorted[1].id, 'evt-corrupted');
  });

  test('supports both sort directions: newest-first (desc) and oldest-first (asc)', () => {
    const evt1 = createEvent('e1', '2026-01-01T00:00:00Z');
    const evt2 = createEvent('e2', '2026-06-01T00:00:00Z');

    const desc = sortEventsChronologically([evt1, evt2], 'desc');
    assert.deepStrictEqual(desc.map((e) => e.id), ['e2', 'e1']);

    const asc = sortEventsChronologically([evt1, evt2], 'asc');
    assert.deepStrictEqual(asc.map((e) => e.id), ['e1', 'e2']);
  });

  test('does not mutate the original input array', () => {
    const evt1 = createEvent('e1', '2026-01-01T00:00:00Z');
    const evt2 = createEvent('e2', '2026-06-01T00:00:00Z');
    const original = [evt1, evt2];
    const originalCopy = [...original];

    sortEventsChronologically(original, 'desc');

    assert.strictEqual(original[0], originalCopy[0], 'Original array index 0 must remain unchanged');
    assert.strictEqual(original[1], originalCopy[1], 'Original array index 1 must remain unchanged');
  });

  test('filters events by trust tier while maintaining chronological sort order', () => {
    const docEvent1 = createEvent('doc-1', '2026-05-10T10:00:00Z', 'doctor_confirmed');
    const labEvent = createEvent('lab-1', '2026-05-08T10:00:00Z', 'institution_verified');
    const docEvent2 = createEvent('doc-2', '2026-05-05T10:00:00Z', 'doctor_confirmed');

    const allSorted = sortEventsChronologically([docEvent2, labEvent, docEvent1]);

    const onlyDoctor = filterEventsByTier(allSorted, 'doctor_confirmed');
    assert.strictEqual(onlyDoctor.length, 2);
    assert.deepStrictEqual(onlyDoctor.map((e) => e.id), ['doc-1', 'doc-2']);

    const allFilter = filterEventsByTier(allSorted, 'all');
    assert.strictEqual(allFilter.length, 3);
  });
});
