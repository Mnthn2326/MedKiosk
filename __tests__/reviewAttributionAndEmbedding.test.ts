import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeReviewUpdate,
  buildSummaryEmbeddingText,
  getReviewerInfo,
} from '../lib/summaryReview.ts';
import { reviewSchema } from '../lib/validations/index.ts';
import type { ClinicalEvent } from '../types/database.ts';

const ORIGINAL_CONTRIBUTOR_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
const PATIENT_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

const EXISTING_EVENT: ClinicalEvent = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  patient_id: PATIENT_ID,
  contributor_id: ORIGINAL_CONTRIBUTOR_ID,
  event_type: 'ai_summary',
  trust_tier: 'self_reported',
  content: {
    chief_complaint: 'Initial headache complaint',
    hpi: 'Patient reports 2 days of mild headache',
    past_history: 'None',
    relevant_results: 'Normal vitals',
  },
  created_at: '2026-10-29T10:00:00Z',
};

describe('CC-09: Reviewer Attribution & Vector Embedding Synchronization', () => {
  describe('1. Reviewer Attribution & Contributor Identity Preservation', () => {
    it('preserves the original author/contributor identity when accepted', () => {
      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'accept',
        {
          reviewerName: 'Dr. Jane Smith',
          reviewerId: 'doc-user-123',
          timestamp: '2026-10-29T15:00:00Z',
        }
      );

      // Original contributor ID is preserved
      assert.strictEqual(result.contributor_id, ORIGINAL_CONTRIBUTOR_ID);
      // Reviewer attribution is stored in content
      assert.strictEqual(result.content.reviewed_by, 'Dr. Jane Smith');
      assert.strictEqual(result.content.reviewed_by_id, 'doc-user-123');
      assert.strictEqual(result.content.reviewed_at, '2026-10-29T15:00:00Z');
      assert.strictEqual(result.trust_tier, 'doctor_confirmed');
    });

    it('preserves the original author/contributor identity when edited', () => {
      const editedContent = {
        chief_complaint: 'Updated: Migraine with aura',
        hpi: 'Patient reports visual disturbances',
        past_history: 'Family history of migraine',
        relevant_results: 'Normal fundoscopy',
      };

      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'edit',
        {
          editedContent,
          reviewerName: 'Dr. John Doe',
          reviewerId: 'doc-user-456',
          timestamp: '2026-10-29T15:30:00Z',
          embedding: Array.from({ length: 768 }, (_, i) => i * 0.001),
          embeddingSynced: true,
        }
      );

      assert.strictEqual(result.contributor_id, ORIGINAL_CONTRIBUTOR_ID);
      assert.strictEqual(result.content.updated_by, 'Dr. John Doe');
      assert.strictEqual(result.content.updated_by_id, 'doc-user-456');
      assert.strictEqual(result.content.updated_at, '2026-10-29T15:30:00Z');
      // Preserves pending self_reported tier
      assert.strictEqual(result.trust_tier, 'self_reported');
    });

    it('preserves the original author/contributor identity when rejected', () => {
      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'reject',
        {
          reviewerName: 'Dr. Jane Smith',
          reviewerId: 'doc-user-123',
          timestamp: '2026-10-29T15:00:00Z',
        }
      );

      assert.strictEqual(result.contributor_id, ORIGINAL_CONTRIBUTOR_ID);
      assert.strictEqual(result.content.rejected, true);
      assert.strictEqual(result.content.reviewed_by, 'Dr. Jane Smith');
      assert.strictEqual(result.content.reviewed_by_id, 'doc-user-123');
    });

    it('extracts reviewer and editor metadata via getReviewerInfo', () => {
      const eventWithEditor = {
        ...EXISTING_EVENT,
        content: {
          ...EXISTING_EVENT.content,
          updated_by: 'Dr. Gregory House',
          updated_by_id: 'doc-house-1',
          updated_at: '2026-10-29T16:00:00Z',
          embedding_synced: true,
        },
      };

      const info = getReviewerInfo(eventWithEditor);
      assert.strictEqual(info.reviewerName, 'Dr. Gregory House');
      assert.strictEqual(info.reviewerId, 'doc-house-1');
      assert.strictEqual(info.reviewTimestamp, '2026-10-29T16:00:00Z');
      assert.strictEqual(info.embeddingSynced, true);
      assert.strictEqual(info.embeddingStale, false);
    });
  });

  describe('2. Vector Embedding Synchronization on Content Edits', () => {
    it('builds canonical summary embedding input text', () => {
      const text = buildSummaryEmbeddingText({
        chief_complaint: 'Severe throbbing headache',
        hpi: '3 days duration',
        past_history: 'Hypertension',
        relevant_results: 'BP 140/90',
      });

      assert.strictEqual(
        text,
        'Chief Complaint: Severe throbbing headache. HPI: 3 days duration. Past History: Hypertension. Relevant Results: BP 140/90'
      );
    });

    it('successfully updates embedding with verified 768 dimensions', () => {
      const dummy768Vector = Array.from({ length: 768 }, (_, i) => Math.sin(i));

      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'edit',
        {
          editedContent: {
            chief_complaint: 'New complaint',
            hpi: 'New HPI',
            past_history: 'None',
            relevant_results: 'None',
          },
          reviewerName: 'Dr. Smith',
          embedding: dummy768Vector,
          embeddingSynced: true,
        }
      );

      assert.strictEqual(result.content.embedding_synced, true);
      assert.strictEqual(result.content.embedding_stale, false);
      assert.notStrictEqual(result.embedding, null);
      if (result.embedding) {
        const parsed = JSON.parse(result.embedding);
        assert.strictEqual(parsed.length, 768);
      }
    });

    it('clears stale vector embedding and flags failure when embedding generation fails', () => {
      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'edit',
        {
          editedContent: {
            chief_complaint: 'New complaint',
            hpi: 'New HPI',
            past_history: 'None',
            relevant_results: 'None',
          },
          reviewerName: 'Dr. Smith',
          embedding: null, // failed generation
          embeddingSynced: false,
          embeddingError: 'API timeout during embedding generation',
        }
      );

      // Stale vector must be cleared so pgvector never matches against old text
      assert.strictEqual(result.embedding, null);
      assert.strictEqual(result.content.embedding_synced, false);
      assert.strictEqual(result.content.embedding_stale, true);
      assert.strictEqual(
        result.content.embedding_error,
        'API timeout during embedding generation'
      );
    });

    it('clears stale vector if embedding dimension does not match 768', () => {
      const invalidDimensionalVector = Array.from({ length: 512 }, () => 0.1); // 512 instead of 768

      const result = computeReviewUpdate(
        EXISTING_EVENT,
        'edit',
        {
          editedContent: {
            chief_complaint: 'New complaint',
            hpi: 'New HPI',
            past_history: 'None',
            relevant_results: 'None',
          },
          reviewerName: 'Dr. Smith',
          embedding: invalidDimensionalVector,
          embeddingSynced: false,
          embeddingError: 'Invalid vector dimensionality: expected 768, got 512',
        }
      );

      assert.strictEqual(result.embedding, null);
      assert.strictEqual(result.content.embedding_synced, false);
      assert.strictEqual(result.content.embedding_stale, true);
    });
  });

  describe('3. Security & Validation Regression Checks', () => {
    it('validates reviewSchema for accept, edit, and reject', () => {
      const validAccept = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'accept',
      });
      assert.strictEqual(validAccept.success, true);

      const validEdit = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'edit',
        edited_content: { chief_complaint: 'Updated' },
      });
      assert.strictEqual(validEdit.success, true);

      const validReject = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'reject',
      });
      assert.strictEqual(validReject.success, true);
    });

    it('rejects edit action without edited_content', () => {
      const invalidEdit = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'edit',
      });
      assert.strictEqual(invalidEdit.success, false);
      if (!invalidEdit.success) {
        assert.ok(
          invalidEdit.error.issues.some((i) => i.message.includes('edited_content is required'))
        );
      }
    });

    it('rejects unsupported actions', () => {
      const unsupported = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'archive',
      });
      assert.strictEqual(unsupported.success, false);
    });

    it('does not allow browser to override authenticated reviewer identity in schema', () => {
      // Any client-passed reviewer_id or doctor_id is stripped by reviewSchema
      const payloadWithSpoofedId = reviewSchema.safeParse({
        event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'accept',
        reviewer_id: 'spoofed-attacker-id',
      });
      assert.strictEqual(payloadWithSpoofedId.success, true);
      if (payloadWithSpoofedId.success) {
        // reviewer_id is not part of the schema output
        assert.strictEqual((payloadWithSpoofedId.data as any).reviewer_id, undefined);
      }
    });
  });
});
