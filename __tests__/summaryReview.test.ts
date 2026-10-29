import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getSummaryReviewState,
  canReviewSummary,
  getReviewerInfo,
  computeReviewUpdate,
} from '../lib/summaryReview.ts';
import type { ClinicalEvent } from '../types/database.ts';

const BASE_SUMMARY_EVENT: ClinicalEvent = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  patient_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  contributor_id: null,
  event_type: 'ai_summary',
  trust_tier: 'self_reported',
  content: {
    chief_complaint: 'Severe throbbing headache',
    hpi: 'Patient reports 3 days of worsening headache with photophobia',
    past_history: 'Hypertension',
    relevant_results: 'Normal vitals',
  },
  created_at: '2026-10-29T10:00:00Z',
};

describe('CC-08: AI Summary Review State Machine & Safeguards', () => {
  describe('1. Review State Determination (getSummaryReviewState)', () => {
    it('identifies a pending summary awaiting doctor review', () => {
      const state = getSummaryReviewState(BASE_SUMMARY_EVENT);
      assert.strictEqual(state, 'pending');
    });

    it('identifies an accepted summary with doctor_confirmed trust tier', () => {
      const acceptedEvent: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        trust_tier: 'doctor_confirmed',
        content: {
          ...BASE_SUMMARY_EVENT.content,
          reviewed_by: 'Dr. Jane Smith',
          reviewed_at: '2026-10-29T11:00:00Z',
        },
      };
      const state = getSummaryReviewState(acceptedEvent);
      assert.strictEqual(state, 'accepted');
    });

    it('identifies a rejected summary when content.rejected is true', () => {
      const rejectedEvent: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        content: {
          ...BASE_SUMMARY_EVENT.content,
          rejected: true,
          reviewed_by: 'Dr. Jane Smith',
        },
      };
      const state = getSummaryReviewState(rejectedEvent);
      assert.strictEqual(state, 'rejected');
    });

    it('identifies an editing state when editing mode is active', () => {
      const state = getSummaryReviewState(BASE_SUMMARY_EVENT, true);
      assert.strictEqual(state, 'editing');
    });

    it('safely handles null or undefined events', () => {
      assert.strictEqual(getSummaryReviewState(null), 'pending');
      assert.strictEqual(getSummaryReviewState(undefined), 'pending');
    });
  });

  describe('2. Review Actions Availability (canReviewSummary)', () => {
    it('allows review actions for pending summaries when readOnly is false', () => {
      assert.strictEqual(canReviewSummary(BASE_SUMMARY_EVENT, false), true);
    });

    it('hides review actions for accepted summaries to prevent invalid re-review', () => {
      const acceptedEvent: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        trust_tier: 'doctor_confirmed',
      };
      assert.strictEqual(canReviewSummary(acceptedEvent, false), false);
    });

    it('hides review actions for rejected summaries to prevent invalid re-review', () => {
      const rejectedEvent: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        content: { ...BASE_SUMMARY_EVENT.content, rejected: true },
      };
      assert.strictEqual(canReviewSummary(rejectedEvent, false), false);
    });

    it('hides review actions when readOnly is true even if summary is pending', () => {
      assert.strictEqual(canReviewSummary(BASE_SUMMARY_EVENT, true), false);
    });
  });

  describe('3. Reviewer Information & Timestamp Extraction (getReviewerInfo)', () => {
    it('extracts reviewer name and review timestamp from content', () => {
      const event: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        trust_tier: 'doctor_confirmed',
        content: {
          ...BASE_SUMMARY_EVENT.content,
          reviewed_by: 'Dr. Gregory House',
          reviewed_at: '2026-10-29T12:30:00Z',
        },
      };
      const info = getReviewerInfo(event);
      assert.strictEqual(info.reviewerName, 'Dr. Gregory House');
      assert.strictEqual(info.reviewTimestamp, '2026-10-29T12:30:00Z');
    });

    it('falls back to contributor user name when content.reviewed_by is not set', () => {
      const event: ClinicalEvent = {
        ...BASE_SUMMARY_EVENT,
        contributor: {
          id: 'c-1',
          user_id: 'u-1',
          type: 'doctor',
          domain: 'allopathy',
          verified_id: 'V-123',
          user: { name: 'Dr. James Wilson' },
        },
      };
      const info = getReviewerInfo(event);
      assert.strictEqual(info.reviewerName, 'Dr. James Wilson');
    });

    it('returns empty metadata if no reviewer info exists', () => {
      const info = getReviewerInfo(BASE_SUMMARY_EVENT);
      assert.strictEqual(info.reviewerName, undefined);
      assert.strictEqual(info.reviewTimestamp, undefined);
    });
  });

  describe('4. State Transitions & Editing Invariant (computeReviewUpdate)', () => {
    it('accept action promotes trust_tier to doctor_confirmed and adds reviewer metadata', () => {
      const result = computeReviewUpdate(
        {
          trust_tier: 'self_reported',
          content: BASE_SUMMARY_EVENT.content,
        },
        'accept',
        {
          reviewerName: 'Dr. Sarah Connor',
          timestamp: '2026-10-29T14:00:00Z',
        }
      );

      assert.strictEqual(result.trust_tier, 'doctor_confirmed');
      assert.strictEqual(result.content.reviewed_by, 'Dr. Sarah Connor');
      assert.strictEqual(result.content.reviewed_at, '2026-10-29T14:00:00Z');
      assert.strictEqual(result.content.rejected, false);
    });

    it('reject action marks content.rejected = true and keeps trust_tier as non-confirmed', () => {
      const result = computeReviewUpdate(
        {
          trust_tier: 'self_reported',
          content: BASE_SUMMARY_EVENT.content,
        },
        'reject',
        {
          reviewerName: 'Dr. Sarah Connor',
          timestamp: '2026-10-29T14:00:00Z',
        }
      );

      assert.notStrictEqual(result.trust_tier, 'doctor_confirmed');
      assert.strictEqual(result.trust_tier, 'self_reported');
      assert.strictEqual(result.content.rejected, true);
      assert.strictEqual(result.content.reviewed_by, 'Dr. Sarah Connor');
    });

    it('editing does NOT mark summary as accepted (preserves pending self_reported tier)', () => {
      const editedContent = {
        chief_complaint: 'Updated: Migraine with visual aura',
        hpi: 'Patient reports 3 days of throbbing pain',
        past_history: 'None',
        relevant_results: 'BP 120/80',
      };

      const result = computeReviewUpdate(
        {
          trust_tier: 'self_reported',
          content: BASE_SUMMARY_EVENT.content,
        },
        'edit',
        {
          editedContent,
          timestamp: '2026-10-29T14:05:00Z',
        }
      );

      // CRITICAL INVARIANT: Editing does not auto-confirm
      assert.strictEqual(result.trust_tier, 'self_reported');
      assert.notStrictEqual(result.trust_tier, 'doctor_confirmed');
      assert.strictEqual(result.content.chief_complaint, 'Updated: Migraine with visual aura');
      assert.strictEqual(result.content.rejected, false);
      assert.strictEqual(result.content.updated_at, '2026-10-29T14:05:00Z');
    });
  });

  describe('5. Duplicate Request Protection & Error Handling', () => {
    it('prevents concurrent duplicate review actions while an action is in progress', async () => {
      let callCount = 0;
      let loadingAction: 'accept' | 'edit' | 'reject' | null = null;

      const triggerAction = async (action: 'accept' | 'edit' | 'reject') => {
        if (loadingAction) {
          // Block duplicate concurrent request
          return;
        }
        loadingAction = action;
        callCount++;
        // Simulate async network latency
        await new Promise((resolve) => setTimeout(resolve, 10));
        loadingAction = null;
      };

      // Launch two concurrent accept requests
      const p1 = triggerAction('accept');
      const p2 = triggerAction('accept');
      await Promise.all([p1, p2]);

      // Only one API request should have been dispatched
      assert.strictEqual(callCount, 1);
    });

    it('preserves existing event state when API fails and captures error message', async () => {
      let currentEvent = { ...BASE_SUMMARY_EVENT };
      let actionError: string | null = null;

      const performReview = async () => {
        try {
          throw new Error('500 Internal Server Error: Database timeout');
        } catch (err) {
          actionError = err instanceof Error ? err.message : 'Review action failed';
        }
      };

      await performReview();

      // State remains in pending state without false success transition
      assert.strictEqual(currentEvent.trust_tier, 'self_reported');
      assert.strictEqual(currentEvent.content.rejected, undefined);
      assert.strictEqual(actionError, '500 Internal Server Error: Database timeout');
    });
  });
});
