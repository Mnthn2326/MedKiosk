/**
 * @file lib/summaryReview.ts
 *
 * Review state machine, reviewer attribution, and embedding synchronization utilities
 * for AI Summaries in MedNotes.
 */

import type { ClinicalEvent, AiSummaryContent } from '@/types/database';

export type SummaryReviewState = 'pending' | 'accepted' | 'rejected' | 'editing';

/**
 * Derives the canonical review state of an AI summary clinical event.
 */
export function getSummaryReviewState(
  event?: Partial<ClinicalEvent> | null,
  isEditing?: boolean
): SummaryReviewState {
  if (isEditing) return 'editing';
  if (!event) return 'pending';

  const content = (event.content || {}) as Record<string, unknown>;
  if (content.rejected === true) {
    return 'rejected';
  }
  if (event.trust_tier === 'doctor_confirmed') {
    return 'accepted';
  }
  return 'pending';
}

/**
 * Checks whether the summary event is in a pending state that allows doctor review actions.
 * Accepted or rejected summaries are terminal and cannot be re-reviewed.
 */
export function canReviewSummary(
  event?: Partial<ClinicalEvent> | null,
  readOnly = false
): boolean {
  if (readOnly) return false;
  return getSummaryReviewState(event) === 'pending';
}

export interface ReviewerMetadata {
  reviewerName?: string;
  reviewerId?: string;
  reviewTimestamp?: string;
  updatedBy?: string;
  updatedById?: string;
  updatedTimestamp?: string;
  embeddingSynced?: boolean;
  embeddingStale?: boolean;
}

/**
 * Safely extracts reviewer information and timestamps from event metadata.
 */
export function getReviewerInfo(event?: Partial<ClinicalEvent> | null): ReviewerMetadata {
  if (!event) return {};

  const content = (event.content || {}) as Record<string, unknown>;
  const contributor = event.contributor as
    | { user?: { name?: string; id?: string } }
    | undefined;

  const reviewerName =
    (typeof content.reviewed_by === 'string' && content.reviewed_by.trim()) ||
    (typeof content.doctor_name === 'string' && content.doctor_name.trim()) ||
    (typeof contributor?.user?.name === 'string' && contributor.user.name.trim()) ||
    undefined;

  const reviewerId =
    (typeof content.reviewed_by_id === 'string' && content.reviewed_by_id.trim()) ||
    undefined;

  const reviewTimestamp =
    (typeof content.reviewed_at === 'string' && content.reviewed_at.trim()) ||
    undefined;

  const updatedBy =
    (typeof content.updated_by === 'string' && content.updated_by.trim()) ||
    undefined;

  const updatedById =
    (typeof content.updated_by_id === 'string' && content.updated_by_id.trim()) ||
    undefined;

  const updatedTimestamp =
    (typeof content.updated_at === 'string' && content.updated_at.trim()) ||
    undefined;

  const embeddingSynced =
    content.embedding_synced === true
      ? true
      : content.embedding_synced === false
      ? false
      : undefined;

  const embeddingStale =
    content.embedding_stale === true
      ? true
      : content.embedding_stale === false
      ? false
      : content.embedding_synced === true
      ? false
      : undefined;

  return {
    reviewerName: reviewerName || updatedBy,
    reviewerId: reviewerId || updatedById,
    reviewTimestamp: reviewTimestamp || updatedTimestamp,
    updatedBy,
    updatedById,
    updatedTimestamp,
    embeddingSynced,
    embeddingStale,
  };
}

/**
 * Canonical helper formatting AI summary fields into input text for vector embedding generation.
 * Follows the project's established pattern in /api/rag/summary.
 */
export function buildSummaryEmbeddingText(content?: Partial<AiSummaryContent> | null): string {
  if (!content) return '';
  const parts = [
    `Chief Complaint: ${content.chief_complaint || ''}`,
    `HPI: ${content.hpi || ''}`,
    `Past History: ${content.past_history || ''}`,
    `Relevant Results: ${content.relevant_results || ''}`,
  ];
  return parts.join('. ').trim();
}

/**
 * Pure transition logic computing the next state of an AI summary event given a review action.
 * Preserves the original author/contributor identity and synchronizes vector embeddings on edit.
 */
export function computeReviewUpdate(
  existingEvent: {
    trust_tier: string;
    content: Record<string, unknown>;
    contributor_id?: string | null;
  },
  action: 'accept' | 'edit' | 'reject',
  options?: {
    editedContent?: AiSummaryContent;
    reviewerName?: string;
    reviewerId?: string;
    timestamp?: string;
    embedding?: number[] | null;
    embeddingSynced?: boolean;
    embeddingError?: string | null;
  }
): {
  trust_tier: string;
  content: Record<string, unknown>;
  embedding?: string | null;
  contributor_id?: string | null;
} {
  const ts = options?.timestamp || new Date().toISOString();
  const reviewer = options?.reviewerName || 'Doctor';
  const reviewerId = options?.reviewerId;

  // Preserve the original contributor_id
  const originalContributorId = existingEvent.contributor_id ?? null;

  switch (action) {
    case 'accept':
      return {
        trust_tier: 'doctor_confirmed',
        content: {
          ...existingEvent.content,
          rejected: false,
          reviewed_by: reviewer,
          ...(reviewerId ? { reviewed_by_id: reviewerId } : {}),
          reviewed_at: ts,
        },
        contributor_id: originalContributorId,
      };

    case 'edit': {
      const isSynced = options?.embeddingSynced === true;
      const validVector =
        options?.embedding &&
        Array.isArray(options.embedding) &&
        options.embedding.length === 768;

      return {
        // Editing preserves pending review state without auto-accepting
        trust_tier: 'self_reported',
        content: {
          ...(options?.editedContent || existingEvent.content),
          rejected: false,
          updated_at: ts,
          updated_by: reviewer,
          ...(reviewerId ? { updated_by_id: reviewerId } : {}),
          embedding_synced: isSynced,
          embedding_stale: !isSynced,
          ...(isSynced
            ? { embedding_synced_at: ts }
            : {
                embedding_error:
                  options?.embeddingError || 'Embedding synchronization pending or failed',
              }),
        },
        // Update vector if 768 dimensions verified; otherwise clear vector to prevent stale matches
        embedding: isSynced && validVector ? JSON.stringify(options.embedding) : null,
        contributor_id: originalContributorId,
      };
    }

    case 'reject':
      return {
        // Trust tier remains as-is (non-confirmed)
        trust_tier:
          existingEvent.trust_tier === 'doctor_confirmed'
            ? 'self_reported'
            : existingEvent.trust_tier,
        content: {
          ...existingEvent.content,
          rejected: true,
          reviewed_by: reviewer,
          ...(reviewerId ? { reviewed_by_id: reviewerId } : {}),
          reviewed_at: ts,
          embedding_synced: false,
          embedding_stale: true,
        },
        // Invalidate embedding for rejected content so it won't match in RAG
        embedding: null,
        contributor_id: originalContributorId,
      };
  }
}
